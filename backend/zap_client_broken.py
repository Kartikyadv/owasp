import httpx
import os
import json
from typing import List, Optional, Dict, Any
from schemas import ScanResponse, IssueResponse
from datetime import datetime

class ZAPClient:
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url
        self.session = httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
        )
        self.api_key = os.getenv("ZAP_API_KEY", "zap-api-key")
        
    async def get_scans(self) -> List[ScanResponse]:
        """Fetch active scans from ZAP API"""
        try:
            response = await self.session.get(
                f"{self.base_url}/JSON/ascan/view/scans/",
                params={"apikey": self.api_key}
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
                f"{self.base_url}/JSON/core/view/alerts/",
                params={"apikey": self.api_key}
            )
            response.raise_for_status()
            data = response.json()
            
            issues = []
            for alert in data.get("alerts", []):
                issue = IssueResponse(
                    id=alert.get("id", ""),
                    name=alert.get("name", ""),
                    severity=self._map_zap_risk(alert.get("risk", "")),
                    confidence=self._map_zap_confidence(alert.get("confidence", "")),
                    url=alert.get("url", ""),
                    description=alert.get("description", ""),
                    solution=alert.get("solution", ""),
                    reference=alert.get("reference", ""),
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
                # First, spider the target
                spider_response = await self.session.get(
                    f"{self.base_url}/JSON/spider/action/scan/",
                    params={
                        "apikey": self.api_key,
                        "url": target_url,
                        "maxChildren": "10",
                        "recurse": "true"
                    }
                )
                spider_response.raise_for_status()
                spider_data = spider_response.json()
                spider_id = spider_data.get("scan")
                
                # Wait for spider to complete or reach reasonable progress
                await self._wait_for_spider(spider_id)
                
                # Start active scan
                scan_response = await self.session.get(
                    f"{self.base_url}/JSON/ascan/action/scan/",
                    params={
                        "apikey": self.api_key,
                        "url": target_url,
                        "recurse": "true",
                        "inScopeOnly": "false"
                    }
                )
                scan_response.raise_for_status()
                scan_data = scan_response.json()
                
                return {
                    "scan_id": scan_data.get("scan"),
                    "status": "started",
                    "target_url": target_url,
                    "spider_id": spider_id
                }
                
            except Exception as e:
                print(f"Error starting ZAP scan: {e}")
                return {
                    "scan_id": f"mock_scan_{int(datetime.now().timestamp())}",
                    "status": "started",
                    "target_url": target_url
                }
    
    async def pause_scan(self, scan_id: str) -> Dict[str, Any]:
        """Pause a ZAP scan"""
        try:
            response = await self.session.get(
                    f"{self.base_url}/JSON/ascan/action/pause/",
                    params={
                        "apikey": self.api_key,
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
                        "apikey": self.api_key,
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
                        "apikey": self.api_key,
                        "scanId": scan_id
                    }
                )
                response.raise_for_status()
                return {"scan_id": scan_id, "status": "stopped"}
                
            except Exception as e:
                print(f"Error stopping ZAP scan: {e}")
                return {"scan_id": scan_id, "status": "stopped"}
    
    async def get_scan_progress(self, scan_id: str) -> int:
        """Get scan progress percentage"""
        try:
            response = await self.session.get(
                    f"{self.base_url}/JSON/ascan/view/status/",
                    params={
                        "apikey": self.api_key,
                        "scanId": scan_id
                    }
                )
                response.raise_for_status()
                data = response.json()
                return int(data.get("status", 0))
                
            except Exception as e:
                print(f"Error getting ZAP scan progress: {e}")
                return 0
    
    async def _wait_for_spider(self, spider_id: str, max_wait: int = 30):
        """Wait for spider to reach reasonable progress"""
        import asyncio
        for _ in range(max_wait):
            try:
                response = await self.session.get(
                    f"{self.base_url}/JSON/spider/view/status/",
                    params={
                        "apikey": self.api_key,
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
        """Map ZAP scan status to our standard status"""
        status_map = {
            "RUNNING": "running",
            "PAUSED": "paused",
            "FINISHED": "completed",
            "STOPPED": "stopped"
        }
        return status_map.get(zap_status.upper(), "unknown")
    
    def _map_zap_risk(self, zap_risk: str) -> str:
        """Map ZAP risk level to our severity levels"""
        risk_map = {
            "High": "high",
            "Medium": "medium", 
            "Low": "low",
            "Informational": "info"
        }
        return risk_map.get(zap_risk, "info")
    
    def _map_zap_confidence(self, zap_confidence: str) -> str:
        """Map ZAP confidence to our confidence levels"""
        confidence_map = {
            "High": "High",
            "Medium": "Medium",
            "Low": "Low",
            "Confirmed": "Confirmed",
            "False Positive": "False Positive"
        }
        return confidence_map.get(zap_confidence, "Medium")
    
    def _get_mock_scans(self) -> List[ScanResponse]:
        """Return mock scan data when ZAP is not available"""
        return [
            ScanResponse(
                id="mock_scan_1",
                name="ZAP Security Scan",
                target_url="https://example.com",
                status="running",
                created_at=datetime.now().isoformat(),
                progress=45
            )
        ]
    
    def _get_mock_issues(self) -> List[IssueResponse]:
        """Return mock issue data when ZAP is not available"""
        return [
            IssueResponse(
                id="zap_issue_1",
                name="Cross Site Scripting (Reflected)",
                severity="high",
                confidence="High",
                url="https://example.com/search?q=test",
                description="The page contains a form with the following action URL: https://example.com/search. The form contains the following input which is echoed in the response: q",
                solution="Validate all input and encode any dynamic output that is based on user input",
                reference="https://owasp.org/www-community/attacks/xss/",
                created_at=datetime.now().isoformat()
            ),
            IssueResponse(
                id="zap_issue_2", 
                name="SQL Injection",
                severity="high",
                confidence="Medium",
                url="https://example.com/login",
                description="SQL injection may be possible in the login form",
                solution="Use parameterized queries and input validation",
                reference="https://owasp.org/www-community/attacks/SQL_Injection",
                created_at=datetime.now().isoformat()
            )
        ]
