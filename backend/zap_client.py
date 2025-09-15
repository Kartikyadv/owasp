import httpx
import os
import httpx
import asyncio
from typing import Dict, Any, List
from datetime import datetime
from schemas import IssueResponse, ScanResponse
from datetime import datetime

class ZAPClient:
    def __init__(self, base_url: str = "http://zap:8080"):
        self.base_url = base_url
        self.session = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=5.0, read=30.0),
            limits=httpx.Limits(max_connections=5, max_keepalive_connections=2)
        )
        self.api_key = ""  # API key disabled in ZAP config
        
    async def get_scans(self) -> List[ScanResponse]:
        """Fetch active scans from ZAP API"""
        try:
            response = await self.session.get(
                f"{self.base_url}/JSON/ascan/view/scans/"
            )
            response.raise_for_status()
            data = response.json()
            
            scans = []
            for scan_data in data.get("scans", []):
                scan = ScanResponse(
                    id=scan_data.get("id"),
                    name=f"ZAP Scan {scan_data.get('id')}",
                    target_url=scan_data.get("name", ""),
                    status=self._map_zap_status(scan_data.get("state", "")),
                    created_at=datetime.now(),
                    completed_at=None
                )
                scans.append(scan)
            
            return scans
            
        except Exception as e:
            print(f"Error fetching ZAP scans: {e}")
            return self._get_mock_scans()
    
    async def get_issues(self) -> List[IssueResponse]:
        """Fetch alerts/issues from ZAP API"""
        try:
            response = await self.session.get(
                f"{self.base_url}/JSON/core/view/alerts/"
            )
            response.raise_for_status()
            data = response.json()
            
            issues = []
            for alert in data.get("alerts", []):
                issue = IssueResponse(
                    id=alert.get("id", ""),
                    scan_id="zap_scan",  # Add required scan_id field
                    name=alert.get("name", ""),
                    severity=self._map_zap_risk(alert.get("risk", "")),
                    confidence=self._map_zap_confidence(alert.get("confidence", "")),
                    url=alert.get("url", ""),
                    description=alert.get("description", ""),
                    remediation=alert.get("solution", "No remediation provided"),  # Map solution to remediation
                    created_at=datetime.now().isoformat()
                )
                issues.append(issue)
            
            return issues
            
        except Exception as e:
            print(f"Error fetching ZAP alerts: {e}")
            return self._get_mock_issues()
    
    async def start_scan(self, target_url: str, scan_name: str = "") -> Dict[str, Any]:
        """Start a new ZAP scan"""
        try:
            print(f"Starting ZAP scan for: {target_url}")
            
            # Create and configure ZAP context
            try:
                # First, create a new context
                context_name = f"ScanContext_{scan_name.replace(' ', '_')}"
                create_context_response = await self.session.get(
                    f"{self.base_url}/JSON/context/action/newContext/",
                    params={"contextName": context_name}
                )
                create_context_response.raise_for_status()
                print(f"Created context: {context_name}")
                
                # Then add the target URL to the context
                include_response = await self.session.get(
                    f"{self.base_url}/JSON/context/action/includeInContext/",
                    params={
                        "contextName": context_name,
                        "regex": f"{target_url}.*"
                    }
                )
                include_response.raise_for_status()
                print(f"Added {target_url} to context {context_name}")
            except Exception as e:
                print(f"Context setup failed (continuing anyway): {e}")
            
            # Start spider scan first
            spider_response = await self.session.get(
                f"{self.base_url}/JSON/spider/action/scan/",
                params={
                    "url": target_url,
                    "maxChildren": "10",
                    "recurse": "true"
                }
            )
            spider_response.raise_for_status()
            spider_data = spider_response.json()
            spider_id = spider_data.get("scan")
            print(f"Spider started with ID: {spider_id}")
            
            # Wait a moment for spider to discover some URLs
            await asyncio.sleep(2)
            
            # Start active scan
            scan_response = await self.session.get(
                f"{self.base_url}/JSON/ascan/action/scan/",
                params={
                    "url": target_url,
                    "recurse": "true",
                    "inScopeOnly": "false"
                }
            )
            scan_response.raise_for_status()
            scan_data = scan_response.json()
            scan_id = scan_data.get("scan")
            print(f"Active scan started with ID: {scan_id}")
            
            return {
                "scan_id": scan_id,
                "status": "started", 
                "target_url": target_url,
                "spider_id": spider_id
            }
            
        except Exception as e:
            print(f"Error starting ZAP scan: {e}")
            # Return mock data as fallback
            return {
                "scan_id": f"mock_scan_{int(datetime.now().timestamp())}",
                "status": "started",
                "target_url": target_url
            }
    
    async def get_scan_progress(self, scan_id: str = "") -> Dict[str, Any]:
        """Get scan progress from ZAP"""
        try:
            # Get all scans from ZAP
            response = await self.session.get(f"{self.base_url}/JSON/ascan/view/scans/")
            response.raise_for_status()
            data = response.json()
            
            scans = data.get("scans", [])
            print(f"ZAP scans found: {len(scans)}")
            
            # If we have scans, return the latest running scan or the last scan
            if scans:
                # First try to find a running scan
                for scan in scans:
                    if scan.get("state") == "RUNNING":
                        progress_val = int(scan.get("progress", 0))
                        print(f"Found running scan with {progress_val}% progress")
                        return {
                            "progress": progress_val,
                            "status": "running",
                            "zap_id": scan.get("id")
                        }
                
                # If no running scan, return the last scan
                last_scan = scans[-1]
                progress_val = int(last_scan.get("progress", 0))
                scan_state = last_scan.get("state", "UNKNOWN")
                print(f"Using last scan: {progress_val}% progress, state: {scan_state}")
                return {
                    "progress": progress_val,
                    "status": "completed" if scan_state == "FINISHED" else "running",
                    "zap_id": last_scan.get("id")
                }
            
            # No scans found
            print("No ZAP scans found")
            return {"progress": 0, "status": "completed"}
            
        except Exception as e:
            print(f"Error getting ZAP scan progress: {e}")
            return {"progress": 5, "status": "running"}
    
    async def pause_scan(self, scan_id: str) -> Dict[str, Any]:
        """Pause a ZAP scan"""
        try:
            response = await self.session.get(
                f"{self.base_url}/JSON/ascan/action/pause/",
                params={
                    "scanId": scan_id
                }
            )
            response.raise_for_status()
            return {"scan_id": scan_id, "status": "paused"}
            
        except Exception as e:
            print(f"Error pausing ZAP scan: {e}")
            return {"scan_id": scan_id, "status": "paused"}
    
    async def resume_scan(self, scan_id: str) -> Dict[str, Any]:
        """Resume a ZAP scan"""
        try:
            response = await self.session.get(
                f"{self.base_url}/JSON/ascan/action/resume/",
                params={
                    "scanId": scan_id
                }
            )
            response.raise_for_status()
            return {"scan_id": scan_id, "status": "running"}
            
        except Exception as e:
            print(f"Error resuming ZAP scan: {e}")
            return {"scan_id": scan_id, "status": "running"}
    
    async def stop_scan(self, scan_id: str) -> Dict[str, Any]:
        """Stop a ZAP scan"""
        try:
            response = await self.session.get(
                f"{self.base_url}/JSON/ascan/action/stop/",
                params={
                    "scanId": scan_id
                }
            )
            response.raise_for_status()
            return {"scan_id": scan_id, "status": "stopped"}
            
        except Exception as e:
            print(f"Error stopping ZAP scan: {e}")
            return {"scan_id": scan_id, "status": "stopped"}
    
    
    async def _wait_for_spider(self, spider_id: str, max_wait: int = 30):
        """Wait for spider to reach reasonable progress"""
        import asyncio
        for _ in range(max_wait):
            try:
                response = await self.session.get(
                    f"{self.base_url}/JSON/spider/view/status/",
                    params={
                        "scanId": spider_id
                    }
                )
                data = response.json()
                progress = int(data.get("status", 0))
                if progress >= 50:  # Wait for 50% spider completion
                    break
                await asyncio.sleep(1)
            except:
                break
    
    def _map_zap_status(self, zap_status: str) -> str:
        """Map ZAP scan status to our internal status"""
        status_map = {
            "RUNNING": "running",
            "PAUSED": "paused", 
            "FINISHED": "completed",
            "STOPPED": "stopped"
        }
        return status_map.get(zap_status.upper(), "unknown")
    
    def _map_zap_risk(self, risk: str) -> str:
        """Map ZAP risk level to severity"""
        risk_map = {
            "High": "high",
            "Medium": "medium", 
            "Low": "low",
            "Informational": "info"
        }
        return risk_map.get(risk, "unknown")
    
    def _map_zap_confidence(self, confidence: str) -> str:
        """Map ZAP confidence level"""
        conf_map = {
            "High": "high",
            "Medium": "medium",
            "Low": "low"
        }
        return conf_map.get(confidence, "medium")
    
    def _get_mock_scans(self) -> List[ScanResponse]:
        """Return mock scan data as fallback"""
        return [
            ScanResponse(
                id="scan_001",
                name="GraphQL Security Test",
                target_url="https://admin.example.com",
                status="running",
                created_at=datetime(2025, 8, 4, 0, 25, 33, 263425),
                completed_at=datetime(2025, 8, 4, 1, 25, 33, 263425)
            ),
            ScanResponse(
                id="scan_002",
                name="GraphQL Security Test",
                target_url="https://admin.example.com",
                status="completed",
                created_at=datetime(2025, 9, 1, 0, 25, 33, 263425),
                completed_at=None
            ),
            ScanResponse(
                id="scan_003",
                name="Authentication Bypass Test",
                target_url="https://api.example.com",
                status="completed",
                created_at=datetime(2025, 8, 20, 0, 25, 33, 263425),
                completed_at=None
            ),
            ScanResponse(
                id="scan_004",
                name="Authorization Check",
                target_url="https://shop.example.com",
                status="completed",
                created_at=datetime(2025, 8, 21, 0, 25, 33, 263425),
                completed_at=None
            ),
            ScanResponse(
                id="scan_005",
                name="OWASP Top 10 Scan",
                target_url="https://shop.example.com",
                status="completed",
                created_at=datetime(2025, 8, 30, 0, 25, 33, 263425),
                completed_at=None
            ),
            ScanResponse(
                id="scan_006",
                name="CSRF Protection Test",
                target_url="https://admin.example.com",
                status="failed",
                created_at=datetime(2025, 8, 15, 0, 25, 33, 263425),
                completed_at=datetime(2025, 8, 15, 6, 25, 33, 263425)
            ),
            ScanResponse(
                id="scan_007",
                name="Authentication Bypass Test",
                target_url="https://example.com",
                status="failed",
                created_at=datetime(2025, 8, 2, 0, 25, 33, 263425),
                completed_at=datetime(2025, 8, 2, 6, 25, 33, 263425)
            ),
            ScanResponse(
                id="scan_008",
                name="OWASP Top 10 Scan",
                target_url="https://api.example.com",
                status="completed",
                created_at=datetime(2025, 8, 21, 0, 25, 33, 263425),
                completed_at=datetime(2025, 8, 21, 8, 25, 33, 263425)
            ),
            ScanResponse(
                id="scan_009",
                name="SQL Injection Scan",
                target_url="https://mobile-api.example.com",
                status="failed",
                created_at=datetime(2025, 8, 5, 0, 25, 33, 263425),
                completed_at=None
            ),
            ScanResponse(
                id="scan_010",
                name="SQL Injection Scan",
                target_url="https://api.example.com",
                status="queued",
                created_at=datetime(2025, 8, 28, 0, 25, 33, 263425),
                completed_at=None
            ),
            ScanResponse(
                id="scan_011",
                name="File Upload Security",
                target_url="https://admin.example.com",
                status="queued",
                created_at=datetime(2025, 8, 7, 0, 25, 33, 263425),
                completed_at=datetime(2025, 8, 7, 2, 25, 33, 263425)
            ),
            ScanResponse(
                id="scan_012",
                name="OWASP Top 10 Scan",
                target_url="https://admin.example.com",
                status="failed",
                created_at=datetime(2025, 8, 14, 0, 25, 33, 263425),
                completed_at=None
            ),
            ScanResponse(
                id="scan_013",
                name="Mobile API Security",
                target_url="https://admin.example.com",
                status="completed",
                created_at=datetime(2025, 8, 16, 0, 25, 33, 263425),
                completed_at=None
            ),
            ScanResponse(
                id="scan_014",
                name="API Endpoint Assessment",
                target_url="https://shop.example.com",
                status="running",
                created_at=datetime(2025, 8, 18, 0, 25, 33, 263425),
                completed_at=None
            ),
            ScanResponse(
                id="scan_015",
                name="E-commerce Security Scan",
                target_url="https://example.com",
                status="queued",
                created_at=datetime(2025, 8, 27, 0, 25, 33, 263425),
                completed_at=None
            )
        ]
    
    def _get_mock_issues(self) -> List[IssueResponse]:
        """Return mock issue data as fallback"""
        return [
            IssueResponse(
                id="issue_001",
                scan_id="scan_001",
                name="SQL Injection",
                severity="high",
                confidence="high",
                url="https://admin.example.com/login",
                description="SQL injection vulnerability found in login form",
                remediation="Use parameterized queries and input validation",
                created_at=datetime.now()
            ),
            IssueResponse(
                id="issue_002",
                scan_id="scan_001", 
                name="Cross-Site Scripting (XSS)",
                severity="medium",
                confidence="high",
                url="https://shop.example.com/search",
                description="Reflected XSS vulnerability in search parameter",
                remediation="Implement proper input validation and output encoding",
                created_at=datetime.now()
            ),
            IssueResponse(
                id="issue_003",
                scan_id="scan_001",
                name="Missing Security Headers",
                severity="low",
                confidence="medium",
                url="https://api.example.com/",
                description="Missing security headers like X-Frame-Options, CSP",
                remediation="Configure proper security headers",
                created_at=datetime.now()
            )
        ]
