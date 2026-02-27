"""
storage.py — handles file saving and retrieval.
Local by default, swap to S3 for production.
"""
import os
import uuid
import shutil
import logging
from pathlib import Path
from fastapi import UploadFile
from app.core.config import settings

logger = logging.getLogger(__name__)


def _local_dir() -> Path:
    path = Path(settings.STORAGE_LOCAL_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_upload(file: UploadFile, user_id: str) -> tuple[str, str]:
    """
    Save uploaded file. Returns (storage_path, original_filename).
    storage_path is local path or S3 key.
    """
    ext = Path(file.filename).suffix.lower()
    safe_name = f"{user_id}/{uuid.uuid4()}{ext}"

    if settings.STORAGE_BACKEND == "s3":
        return await _save_s3(file, safe_name), file.filename
    else:
        return await _save_local(file, safe_name), file.filename


async def _save_local(file: UploadFile, key: str) -> str:
    dest = _local_dir() / key
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    logger.info(f"Saved file locally: {dest}")
    return str(dest)


async def _save_s3(file: UploadFile, key: str) -> str:
    """Upload to S3-compatible storage (AWS S3 / Cloudflare R2 / Supabase Storage)."""
    try:
        import boto3
        s3 = boto3.client("s3", region_name=settings.AWS_REGION)
        s3.upload_fileobj(file.file, settings.AWS_BUCKET, key)
        logger.info(f"Saved file to S3: s3://{settings.AWS_BUCKET}/{key}")
        return key
    except Exception as e:
        logger.error(f"S3 upload failed: {e}")
        raise


def load_file_path(storage_path: str) -> str:
    """Return local file path (for local backend) or download from S3."""
    if settings.STORAGE_BACKEND == "s3":
        # Download to temp file
        import boto3, tempfile
        s3 = boto3.client("s3", region_name=settings.AWS_REGION)
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=Path(storage_path).suffix)
        s3.download_fileobj(settings.AWS_BUCKET, storage_path, tmp)
        return tmp.name
    return storage_path
