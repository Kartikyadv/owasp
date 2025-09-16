from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import os
import time
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

from database import get_db, init_db
from models import User, Scan, Issue
from sqlalchemy.orm import Session
from schemas import UserCreate, UserLogin, ScanResponse, IssueResponse, ScanRequest
from auth import verify_cognito_token, get_user_info_from_cognito_token
from zap_client import ZAPClient
from mock_data import get_mock_scans, get_mock_issues

load_dotenv()

app = FastAPI(title="ZAP Security Dashboard API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"Validation error on {request.method} {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )

security = HTTPBearer()
zap_client = ZAPClient(os.getenv("ZAP_API_URL", "http://zap:8090"))

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
async def root():
    return {"message": "OWASP ZAP Security Dashboard API"}

# Cognito authentication endpoints - these are now handled by the parent codelens project
# We only need to verify tokens passed from the parent project

@app.get("/auth/redirect")
async def auth_redirect(token: str = None):
    """
    Redirect endpoint to handle authentication from parent codelens project
    This endpoint receives the Cognito token and redirects to the frontend with the token
    """
    if not token:
        raise HTTPException(status_code=400, detail="Token parameter is required")
    
    # Verify the token is valid
    user_info = get_user_info_from_cognito_token(token)
    if user_info is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Redirect to frontend auth redirect route with token
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3001")
    redirect_url = f"{frontend_url}/auth/redirect?token={token}"
    
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=redirect_url)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        print(f"Received Cognito token: {token[:20]}..." if token else "No token received")
        
        # Verify the Cognito token
        user_info = get_user_info_from_cognito_token(token)
        if user_info is None:
            print("Cognito token verification failed")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate Cognito credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        print(f"Cognito token verified for user: {user_info.get('sub')} ({user_info.get('email')})")
        return user_info
    except Exception as e:
        print(f"Cognito authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate Cognito credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/scans", response_model=list[ScanResponse])
async def get_scans(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get scans from database
        db_scans = db.query(Scan).order_by(Scan.created_at.desc()).all()
        
        scans = []
        for db_scan in db_scans:
            scan_response = ScanResponse(
                id=str(db_scan.id),
                name=db_scan.name,
                target_url=db_scan.target_url,
                status=db_scan.status,
                created_at=db_scan.created_at,
                completed_at=db_scan.completed_at
            )
            scans.append(scan_response)
        
        return scans
    except Exception as e:
        print(f"Error fetching scans from database: {e}")
        return get_mock_scans()

@app.get("/issues", response_model=list[IssueResponse])
async def get_issues(
    severity: str = None,
    scan_id: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get real issues from ZAP
        issues = await zap_client.get_issues()
        
        # Filter by severity if specified
        if severity:
            issues = [issue for issue in issues if issue.severity == severity.lower()]
            
        return issues
    except Exception as e:
        print(f"Error connecting to ZAP: {e}")
        mock_issues = get_mock_issues()
        if severity:
            mock_issues = [issue for issue in mock_issues if issue.severity.lower() == severity.lower()]
        if scan_id:
            mock_issues = [issue for issue in mock_issues if issue.scan_id == scan_id]
        return mock_issues

@app.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    try:
        stats = await burp_client.get_stats()
        return stats
    except Exception:
        # Mock stats
        return {
            "total_scans": 15,
            "total_issues": 247,
            "high_severity": 12,
            "medium_severity": 89,
            "low_severity": 146,
            "info_severity": 0,
            "recent_scans": 3
        }

@app.post("/scans/start")
async def start_scan(
    request: Request,
    scan_request: ScanRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        print(f"Starting scan for target: {scan_request.target_url}")
        print(f"Scan name: {scan_request.scan_name}")
        print(f"User: {current_user}")
        
        # Check if there's already a running or recent scan for this target
        existing_scan = db.query(Scan).filter(
            Scan.target_url == scan_request.target_url,
            Scan.status.in_(["running", "paused"])
        ).first()
        
        if existing_scan:
            return {
                "error": "A scan is already running for this target",
                "existing_scan_id": existing_scan.id,
                "status": existing_scan.status
            }
        
        # Check for completed scans with same name and target (prevent exact duplicates)
        duplicate_scan = db.query(Scan).filter(
            Scan.target_url == scan_request.target_url,
            Scan.name == (scan_request.scan_name or "ZAP Security Scan"),
            Scan.status == "completed"
        ).first()
        
        if duplicate_scan:
            return {
                "error": "A scan with this name and target already exists",
                "existing_scan_id": duplicate_scan.id,
                "message": "Please use a different scan name or target URL"
            }
        
        # Start ZAP scan
        zap_result = await zap_client.start_scan(scan_request.target_url, scan_request.scan_name)
        
        # Use the real ZAP scan ID if available, otherwise generate one
        zap_scan_id = zap_result.get("scan_id", f"scan_{int(datetime.now().timestamp())}")
        
        # Generate unique database ID
        import uuid
        db_scan_id = str(uuid.uuid4())
        
        # Save scan to database
        db_scan = Scan(
            id=db_scan_id,
            name=scan_request.scan_name or "ZAP Security Scan",
            target_url=scan_request.target_url,
            status="running",
            zap_scan_id=str(zap_scan_id),
            user_id=1  # Default user for now
        )
        db.add(db_scan)
        db.commit()
        db.refresh(db_scan)
        
        scan_response = {
            "scan_id": db_scan_id,
            "status": "started",
            "scan": {
                "id": db_scan_id,
                "name": scan_request.scan_name or "ZAP Security Scan",
                "targetUrl": scan_request.target_url,
                "status": "running",
                "progress": 5,
                "startedAt": datetime.now().isoformat() + "Z",
                "estimatedTimeRemaining": "45m",
                "issuesFound": 0
            },
            "zap_result": zap_result
        }
        
        return scan_response
        
    except Exception as e:
        print(f"Error starting scan: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=422, detail=f"Failed to start scan: {str(e)}")

@app.get("/scans/active")
async def get_active_scans(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get active scans from database
        db_scans = db.query(Scan).filter(Scan.status.in_(["running", "paused"])).all()
        
        active_scans = []
        
        # Get real-time progress from ZAP for all scans
        try:
            zap_progress = await zap_client.get_scan_progress("")  # Empty string to get all scans
        except Exception as e:
            print(f"Error getting ZAP scan progress: {e}")
            zap_progress = {"progress": 5, "status": "running"}
        
        for scan in db_scans:
            # Use ZAP progress if available, otherwise use defaults
            if isinstance(zap_progress, dict):
                progress = zap_progress.get("progress", 5)
                status = zap_progress.get("status", scan.status)
            else:
                progress = 5
                status = scan.status
            
            active_scans.append({
                "id": scan.id,
                "name": scan.name,
                "targetUrl": scan.target_url,
                "status": status,
                "progress": progress,
                "startTime": scan.created_at.isoformat() + "Z",
                "estimatedCompletion": (scan.created_at + timedelta(minutes=45)).isoformat() + "Z",
                "issuesFound": 0,  # Will be updated when we implement issue counting
                "currentPhase": "Vulnerability scanning"
            })
        
        return active_scans
        
    except Exception as e:
        print(f"Error fetching active scans: {e}")
        return []

@app.get("/scans/completed")
async def get_completed_scans(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Mock completed scans data
    completed_scans = [
        {
            "id": "scan_003",
            "name": "Authentication Security Review",
            "targetUrl": "https://auth.example.com",
            "completedAt": "2025-08-31T23:45:00Z",
            "duration": "2h 15m",
            "totalIssues": 18,
            "severityCounts": {
                "critical": 2,
                "high": 5,
                "medium": 8,
                "low": 3,
                "info": 0
            }
        },
        {
            "id": "scan_004",
            "name": "Mobile API Assessment",
            "targetUrl": "https://mobile-api.example.com",
            "completedAt": "2025-08-31T20:30:00Z",
            "duration": "1h 45m",
            "totalIssues": 7,
            "severityCounts": {
                "critical": 0,
                "high": 1,
                "medium": 4,
                "low": 2,
                "info": 0
            }
        }
    ]
    return completed_scans

@app.post("/scans/{scan_id}/pause")
async def pause_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    return {"scan_id": scan_id, "status": "paused"}

@app.post("/scans/{scan_id}/resume")
async def resume_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    return {"scan_id": scan_id, "status": "resumed"}

@app.post("/scans/{scan_id}/stop")
async def stop_scan(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        result = await zap_client.stop_scan(scan_id)
        return result
    except Exception as e:
        logger.error(f"Error stopping scan: {e}")
        raise HTTPException(status_code=500, detail="Failed to stop scan")

@app.get("/scans/{scan_id}/progress")
async def get_scan_progress(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        progress = await zap_client.get_scan_progress(scan_id)
        return {"scan_id": scan_id, "progress": progress}
    except Exception as e:
        logger.error(f"Error getting scan progress: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scan progress")

@app.get("/export/{format}")
async def export_data(
    format: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if format not in ["csv", "json"]:
        raise HTTPException(status_code=400, detail="Format must be 'csv' or 'json'")
    
    try:
        issues = await zap_client.get_issues()
    except Exception:
        issues = get_mock_issues()
    
    if format == "json":
        from fastapi.responses import Response
        import json
        content = json.dumps([issue.dict() for issue in issues], indent=2)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=security_issues.json"}
        )
    else:
        # Return CSV file response
        from fastapi.responses import Response
        import io
        import csv
        
        output = io.StringIO()
        if issues:
            fieldnames = issues[0].dict().keys()
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for issue in issues:
                writer.writerow(issue.dict())
        
        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=security_issues.csv"}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
