"""
/reports — generate, list, retrieve, and delete audit reports.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.orm import Report, Upload
from app.models.schemas import ReportRequest, ReportResponse, ReportListItem, RiskMetrics
from app.services.claude_service import generate_ai_analysis
from app.services.report_builder import build_report, risk_level

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    body: ReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a full audit report.
    - If upload_id provided: uses real computed scores from uploaded file
    - If manual scores provided: uses those directly
    - Always calls Claude API for AI analysis
    """
    scores = {}

    # ── Get scores from upload or manual input ────────────────────────────────
    row_count = 0

    if body.upload_id:
        # Load scores from a previous upload
        result = await db.execute(
            select(Upload).where(Upload.id == body.upload_id, Upload.user_id == current_user["id"])
        )
        upload = result.scalar_one_or_none()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")

        # Re-run scoring from stored file
        import pandas as pd
        from app.services.scoring import compute_all_scores
        from app.services.storage import load_file_path

        try:
            file_path = load_file_path(upload.storage_path)
            ext = upload.filename.lower().split(".")[-1]
            df = pd.read_csv(file_path) if ext == "csv" else pd.read_json(file_path)
            scores = compute_all_scores(df)
            row_count = len(df)
        except Exception as e:
            logger.error(f"Failed to re-score from file: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to process uploaded file: {str(e)}")

    else:
        # Use manually provided scores
        scores = {
            "bias":           body.bias_score          or 0.3,
            "hallucination":  body.hallucination_score or 0.3,
            "toxicity":       body.toxicity_score      or 0.1,
            "robustness":     body.robustness_score    or 0.3,
            "explainability": body.explainability_score or 0.4,
            "data_leakage":   body.data_leakage_score  or 0.2,
            "drift":          body.drift_score         or 0.25,
        }

    # ── Claude AI analysis ────────────────────────────────────────────────────
    system_info = {
        "model_name":      body.model_name,
        "model_version":   body.model_version,
        "org_name":        body.org_name,
        "use_case":        body.use_case,
        "deploy_env":      body.deploy_env,
        "training_data":   body.training_data,
        "oversight_policy": body.oversight_policy,
        "incident_policy": body.incident_policy,
        "framework":       body.framework,
    }

    ai_analysis = await generate_ai_analysis(scores, system_info)

    # ── Build full report ─────────────────────────────────────────────────────
    full_report = build_report(scores, system_info, ai_analysis, row_count)

    avg_score   = sum(scores.values()) / len(scores)
    overall     = risk_level(avg_score)
    readiness   = round((1 - avg_score) * 100)

    # ── Save to database ──────────────────────────────────────────────────────
    report = Report(
        user_id=current_user["id"],
        model_name=body.model_name,
        model_version=body.model_version,
        org_name=body.org_name,
        use_case=body.use_case,
        deploy_env=body.deploy_env,
        framework=body.framework,
        bias_score=scores["bias"],
        hallucination_score=scores["hallucination"],
        toxicity_score=scores["toxicity"],
        robustness_score=scores["robustness"],
        explainability_score=scores["explainability"],
        data_leakage_score=scores["data_leakage"],
        drift_score=scores["drift"],
        overall_risk=overall,
        readiness_pct=readiness,
        full_report=full_report,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return _to_response(report)


@router.get("/", response_model=List[ReportListItem])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all reports for the current user, newest first."""
    result = await db.execute(
        select(Report)
        .where(Report.user_id == current_user["id"])
        .order_by(Report.created_at.desc())
    )
    return [
        ReportListItem(
            id=r.id,
            model_name=r.model_name,
            org_name=r.org_name,
            overall_risk=r.overall_risk,
            readiness_pct=r.readiness_pct,
            created_at=r.created_at,
        )
        for r in result.scalars().all()
    ]


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == current_user["id"])
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return _to_response(report)


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == current_user["id"])
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()
    return {"deleted": report_id}


def _to_response(report: Report) -> ReportResponse:
    return ReportResponse(
        id=report.id,
        model_name=report.model_name,
        org_name=report.org_name,
        use_case=report.use_case,
        overall_risk=report.overall_risk or "UNKNOWN",
        readiness_pct=report.readiness_pct or 0,
        metrics=RiskMetrics(
            bias=report.bias_score or 0,
            hallucination=report.hallucination_score or 0,
            toxicity=report.toxicity_score or 0,
            robustness=report.robustness_score or 0,
            explainability=report.explainability_score or 0,
            data_leakage=report.data_leakage_score or 0,
            drift=report.drift_score or 0,
        ),
        full_report=report.full_report,
        created_at=report.created_at,
    )
