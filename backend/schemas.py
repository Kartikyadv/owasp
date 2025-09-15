from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ScanResponse(BaseModel):
    id: str
    name: str
    target_url: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None

class IssueResponse(BaseModel):
    id: str
    scan_id: str
    name: str
    severity: str
    confidence: str
    url: str
    description: str
    remediation: str
    created_at: datetime

class ScanRequest(BaseModel):
    target_url: str
    scan_name: Optional[str] = None

class StatsResponse(BaseModel):
    total_scans: int
    total_issues: int
    high_severity: int
    medium_severity: int
    low_severity: int
    info_severity: int
    recent_scans: int
