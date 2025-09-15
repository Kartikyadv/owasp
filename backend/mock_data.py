from datetime import datetime, timedelta
from schemas import ScanResponse, IssueResponse
import random

def get_mock_scans():
    """Generate mock scan data for UI preview"""
    scans = []
    base_time = datetime.now() - timedelta(days=30)
    
    scan_names = [
        "E-commerce Security Scan",
        "API Endpoint Assessment",
        "Authentication Bypass Test",
        "SQL Injection Scan",
        "XSS Vulnerability Check",
        "CSRF Protection Test",
        "File Upload Security",
        "Session Management Audit",
        "Input Validation Test",
        "Authorization Check",
        "OWASP Top 10 Scan",
        "Mobile API Security",
        "GraphQL Security Test",
        "JWT Token Analysis",
        "CORS Configuration Check"
    ]
    
    targets = [
        "https://example.com",
        "https://api.example.com",
        "https://shop.example.com",
        "https://admin.example.com",
        "https://mobile-api.example.com"
    ]
    
    statuses = ["completed", "running", "failed", "queued"]
    
    for i in range(15):
        created_at = base_time + timedelta(days=random.randint(0, 30))
        completed_at = created_at + timedelta(hours=random.randint(1, 8)) if random.choice([True, False]) else None
        
        scans.append(ScanResponse(
            id=f"scan_{i+1:03d}",
            name=random.choice(scan_names),
            target_url=random.choice(targets),
            status=random.choice(statuses),
            created_at=created_at,
            completed_at=completed_at
        ))
    
    return scans

def get_mock_issues():
    """Generate mock issue data for UI preview"""
    issues = []
    base_time = datetime.now() - timedelta(days=30)
    
    issue_types = [
        "SQL Injection",
        "Cross-site scripting (XSS)",
        "Cross-site request forgery (CSRF)",
        "Insecure direct object references",
        "Security misconfiguration",
        "Sensitive data exposure",
        "Missing function level access control",
        "Using components with known vulnerabilities",
        "Unvalidated redirects and forwards",
        "Broken authentication",
        "Session fixation",
        "Information disclosure",
        "Path traversal",
        "Command injection",
        "XML external entity (XXE)",
        "Server-side request forgery (SSRF)",
        "Insecure deserialization",
        "Insufficient logging and monitoring"
    ]
    
    severities = ["high", "medium", "low", "info"]
    confidences = ["certain", "firm", "tentative"]
    
    descriptions = {
        "SQL Injection": "The application appears to be vulnerable to SQL injection attacks. User input is not properly sanitized before being included in SQL queries.",
        "Cross-site scripting (XSS)": "The application reflects user input without proper encoding, potentially allowing attackers to execute malicious scripts.",
        "Cross-site request forgery (CSRF)": "The application does not implement proper CSRF protection, allowing attackers to perform unauthorized actions.",
        "Insecure direct object references": "The application exposes references to internal objects without proper authorization checks.",
        "Security misconfiguration": "The application or server has been configured in an insecure manner.",
        "Sensitive data exposure": "The application may be exposing sensitive information to unauthorized users."
    }
    
    remediations = {
        "SQL Injection": "Use parameterized queries or prepared statements. Implement input validation and sanitization.",
        "Cross-site scripting (XSS)": "Implement proper output encoding and input validation. Use Content Security Policy (CSP).",
        "Cross-site request forgery (CSRF)": "Implement CSRF tokens for all state-changing operations.",
        "Insecure direct object references": "Implement proper authorization checks for all object access.",
        "Security misconfiguration": "Review and harden server and application configurations.",
        "Sensitive data exposure": "Implement proper access controls and data encryption."
    }
    
    urls = [
        "https://example.com/login",
        "https://example.com/api/users",
        "https://example.com/admin/dashboard",
        "https://example.com/search",
        "https://example.com/profile",
        "https://example.com/api/orders",
        "https://example.com/upload",
        "https://example.com/reset-password"
    ]
    
    for i in range(247):
        issue_type = random.choice(issue_types)
        severity = random.choices(severities, weights=[5, 35, 55, 5])[0]  # Weighted distribution
        
        issues.append(IssueResponse(
            id=f"issue_{i+1:03d}",
            scan_id=f"scan_{random.randint(1, 15):03d}",
            name=issue_type,
            severity=severity,
            confidence=random.choice(confidences),
            url=random.choice(urls),
            description=descriptions.get(issue_type, "Security vulnerability detected."),
            remediation=remediations.get(issue_type, "Review and fix the identified security issue."),
            created_at=base_time + timedelta(days=random.randint(0, 30))
        ))
    
    return issues
