import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id:               Mapped[str]      = mapped_column(String, primary_key=True, default=new_uuid)
    email:            Mapped[str]      = mapped_column(String, unique=True, nullable=False)
    hashed_password:  Mapped[str]      = mapped_column(String, nullable=False)
    org_name:         Mapped[str]      = mapped_column(String, nullable=True)
    plan:             Mapped[str]      = mapped_column(String, default="starter")
    is_active:        Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:       Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reports:          Mapped[list["Report"]] = relationship("Report", back_populates="user")
    uploads:          Mapped[list["Upload"]] = relationship("Upload", back_populates="user")


class Upload(Base):
    __tablename__ = "uploads"
    id:           Mapped[str]      = mapped_column(String, primary_key=True, default=new_uuid)
    user_id:      Mapped[str]      = mapped_column(String, ForeignKey("users.id"), nullable=False)
    filename:     Mapped[str]      = mapped_column(String, nullable=False)
    storage_path: Mapped[str]      = mapped_column(String, nullable=False)
    row_count:    Mapped[int]      = mapped_column(Integer, default=0)
    created_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user:         Mapped["User"]   = relationship("User", back_populates="uploads")


class Report(Base):
    __tablename__ = "reports"
    id:                   Mapped[str]      = mapped_column(String, primary_key=True, default=new_uuid)
    user_id:              Mapped[str]      = mapped_column(String, ForeignKey("users.id"), nullable=False)
    model_name:           Mapped[str]      = mapped_column(String, nullable=True)
    model_version:        Mapped[str]      = mapped_column(String, nullable=True)
    org_name:             Mapped[str]      = mapped_column(String, nullable=True)
    use_case:             Mapped[str]      = mapped_column(String, nullable=True)
    deploy_env:           Mapped[str]      = mapped_column(String, nullable=True)
    framework:            Mapped[str]      = mapped_column(String, default="all")
    bias_score:           Mapped[float]    = mapped_column(Float, nullable=True)
    hallucination_score:  Mapped[float]    = mapped_column(Float, nullable=True)
    toxicity_score:       Mapped[float]    = mapped_column(Float, nullable=True)
    robustness_score:     Mapped[float]    = mapped_column(Float, nullable=True)
    explainability_score: Mapped[float]    = mapped_column(Float, nullable=True)
    data_leakage_score:   Mapped[float]    = mapped_column(Float, nullable=True)
    drift_score:          Mapped[float]    = mapped_column(Float, nullable=True)
    overall_risk:         Mapped[str]      = mapped_column(String, nullable=True)
    readiness_pct:        Mapped[int]      = mapped_column(Integer, nullable=True)
    full_report:          Mapped[dict]     = mapped_column(JSON, nullable=True)
    pdf_path:             Mapped[str]      = mapped_column(String, nullable=True)
    created_at:           Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user:                 Mapped["User"]   = relationship("User", back_populates="reports")
