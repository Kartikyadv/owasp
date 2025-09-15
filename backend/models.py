from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    target_url = Column(String)
    status = Column(String)
    zap_scan_id = Column(String, index=True)
    user_id = Column(Integer, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

class Issue(Base):
    __tablename__ = "issues"

    id = Column(String, primary_key=True, index=True)
    scan_id = Column(String, index=True)
    name = Column(String)
    severity = Column(String)
    confidence = Column(String)
    url = Column(String)
    description = Column(Text)
    remediation = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
