from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    org_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ReportRequest(BaseModel):
    upload_id: Optional[str] = None
    model_name: str
    model_version: Optional[str] = None
    org_name: Optional[str] = None
    use_case: Optional[str] = None
    deploy_env: str = "production"
    training_data: Optional[str] = None
    oversight_policy: Optional[str] = None
    incident_policy: Optional[str] = None
    framework: str = "all"
    bias_score: Optional[float] = None
    hallucination_score: Optional[float] = None
    toxicity_score: Optional[float] = None
    robustness_score: Optional[float] = None
    explainability_score: Optional[float] = None
    data_leakage_score: Optional[float] = None
    drift_score: Optional[float] = None


class RiskMetrics(BaseModel):
    bias: float
    hallucination: float
    toxicity: float
    robustness: float
    explainability: float
    data_leakage: float
    drift: float


class ReportResponse(BaseModel):
    id: str
    model_name: Optional[str]
    org_name: Optional[str]
    use_case: Optional[str]
    overall_risk: str
    readiness_pct: int
    metrics: RiskMetrics
    full_report: Any
    created_at: datetime

    class Config:
        from_attributes = True


class ReportListItem(BaseModel):
    id: str
    model_name: Optional[str]
    org_name: Optional[str]
    overall_risk: str
    readiness_pct: int
    created_at: datetime

    class Config:
        from_attributes = True
