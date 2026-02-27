"""
/upload — accepts client's model output CSV or JSON,
runs the real scoring engine, stores the file, returns computed scores.
"""
import io
import json
import logging
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.orm import Upload
from app.services.scoring import compute_all_scores
from app.services.storage import save_upload

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a CSV or JSON file of model outputs.
    Returns computed risk scores immediately.

    Expected CSV columns (any subset works):
      decision, confidence, ground_truth, response,
      gender, race, age, prompt, explanation
    """
    filename = file.filename or ""
    ext = filename.lower().split(".")[-1]

    if ext not in ("csv", "json"):
        raise HTTPException(status_code=400, detail="Only CSV and JSON files are supported")

    # Read file content
    content = await file.read()

    # Parse into DataFrame
    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(content))
        else:
            data = json.loads(content)
            df = pd.DataFrame(data if isinstance(data, list) else [data])
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse file: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=422, detail="File contains no data rows")

    logger.info(f"Uploaded file: {filename}, rows: {len(df)}, cols: {list(df.columns)}")

    # Run the real scoring engine
    scores = compute_all_scores(df)

    # Save file to storage
    file.file = io.BytesIO(content)   # reset file pointer
    file.filename = filename
    storage_path, _ = await save_upload(file, current_user["id"])

    # Save upload record to DB
    upload_record = Upload(
        user_id=current_user["id"],
        filename=filename,
        storage_path=storage_path,
        row_count=len(df),
    )
    db.add(upload_record)
    await db.commit()
    await db.refresh(upload_record)

    return {
        "upload_id":   upload_record.id,
        "filename":    filename,
        "row_count":   len(df),
        "columns":     list(df.columns),
        "scores":      scores,
        "message":     f"Successfully processed {len(df)} rows. Scores computed from real data.",
    }


@router.get("/sample-csv")
def sample_csv():
    """Return a sample CSV structure clients can use to test."""
    return {
        "description": "Upload a CSV with these columns. All columns are optional — include what you have.",
        "required_for": {
            "bias_score":         ["decision", "gender/race/age"],
            "hallucination_score": ["decision", "ground_truth"],
            "toxicity_score":      ["response (text output of the model)"],
            "robustness_score":    ["confidence"],
            "drift_score":         ["confidence (rows in chronological order)"],
        },
        "sample_rows": [
            {
                "prompt": "Should this loan be approved?",
                "response": "Based on the applicant's financial profile, I recommend approval.",
                "decision": "approved",
                "confidence": 0.91,
                "ground_truth": "approved",
                "gender": "male",
                "race": "white",
                "age": 34,
                "income": 55000,
                "loan_amount": 10000,
            },
            {
                "prompt": "Should this loan be approved?",
                "response": "The applicant does not meet our lending criteria.",
                "decision": "rejected",
                "confidence": 0.43,
                "ground_truth": "approved",
                "gender": "female",
                "race": "black",
                "age": 35,
                "income": 54000,
                "loan_amount": 10000,
            },
        ]
    }
