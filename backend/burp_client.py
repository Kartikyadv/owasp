import httpx
import os
from typing import List, Optional
from schemas import ScanResponse, IssueResponse
from datetime import datetime

class BurpSuiteClient:
    def __init__(self, base_url: str = "http://burpsuite:1337"):
        self.base_url = base_url
        self.session = httpx.AsyncClient(timeout=30.0)
        self.api_key = os.getenv("BURP_API_KEY", "")
        
    async def get_scans(self) -> List[ScanResponse]:
        """Fetch scans from Burp Suite API"""
        async with self.session as client:
            try:
                response = await client.get(
                    f"{self.base_url}/v0.1/scan",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                response.raise_for_status()
                data = response.json()
                
                scans = []
                for scan_data in data.get("scans", []):
                    scans.append(ScanResponse(
                        id=scan_data["id"],
                        name=scan_data.get("name", "Unknown Scan"),
                        target_url=scan_data.get("target_url", ""),
                        status=scan_data.get("status", "unknown"),
                        created_at=datetime.fromisoformat(scan_data.get("created_at", datetime.now().isoformat())),
                        completed_at=datetime.fromisoformat(scan_data["completed_at"]) if scan_data.get("completed_at") else None
                    ))
                return scans
            except Exception as e:
                print(f"Error fetching scans from Burp Suite: {e}")
                raise
    
    async def get_issues(self, severity: Optional[str] = None, scan_id: Optional[str] = None) -> List[IssueResponse]:
        """Fetch issues from Burp Suite API"""
        async with httpx.AsyncClient() as client:
            try:
                params = {}
                if severity:
                    params["severity"] = severity
                if scan_id:
                    params["scan_id"] = scan_id
                    
                response = await client.get(
                    f"{self.base_url}/v0.1/scan/issues",
                    params=params,
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                response.raise_for_status()
                data = response.json()
                
                issues = []
                for issue_data in data.get("issues", []):
                    issues.append(IssueResponse(
                        id=issue_data["id"],
                        scan_id=issue_data.get("scan_id", ""),
                        name=issue_data.get("name", "Unknown Issue"),
                        severity=issue_data.get("severity", "info"),
                        confidence=issue_data.get("confidence", "certain"),
                        url=issue_data.get("url", ""),
                        description=issue_data.get("description", ""),
                        remediation=issue_data.get("remediation", ""),
                        created_at=datetime.fromisoformat(issue_data.get("created_at", datetime.now().isoformat()))
                    ))
                return issues
            except Exception as e:
                print(f"Error fetching issues from Burp Suite: {e}")
                raise
    
    async def get_stats(self) -> dict:
        """Fetch statistics from Burp Suite API"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/v0.1/scan/stats",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Error fetching stats from Burp Suite: {e}")
                raise
