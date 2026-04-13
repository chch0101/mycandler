import os
import uuid
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import aiofiles
import models
from database import get_db
from services import file_service, gemma_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["files"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


async def process_attachment_summary(attachment_id: int, db_session_factory):
    """Background task: extract text and generate AI summary."""
    db = db_session_factory()
    try:
        attachment = db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()
        if not attachment:
            return

        attachment.summary_status = "processing"
        db.commit()

        # Extract text
        text = file_service.extract_text_from_file(attachment.file_path, attachment.file_type)
        attachment.extracted_text = text[:50000]  # store up to 50k chars

        # Detect paper
        is_paper = gemma_service.is_academic_paper(text) if text else False
        attachment.is_paper = is_paper

        # Generate summary
        if text and file_service.is_supported_for_summary(attachment.file_type, attachment.original_filename):
            summary = gemma_service.generate_summary(text, is_paper, attachment.original_filename)
            attachment.summary = summary
            attachment.summary_status = "done"
        else:
            attachment.summary = "이 파일 형식은 텍스트 추출을 지원하지 않습니다."
            attachment.summary_status = "done"

        db.commit()
        logger.info(f"Summary generated for attachment {attachment_id}")

    except Exception as e:
        logger.error(f"Summary processing error for {attachment_id}: {e}")
        try:
            attachment = db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()
            if attachment:
                attachment.summary_status = "error"
                attachment.summary = f"요약 생성 중 오류가 발생했습니다: {str(e)}"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/{event_id}/upload")
async def upload_file(
    event_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="파일 크기가 50MB를 초과합니다.")

    # Generate unique filename
    ext = os.path.splitext(file.filename or "file")[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(contents)

    mime_type = file_service.get_mime_type(file.filename or "")

    attachment = models.Attachment(
        event_id=event_id,
        filename=unique_name,
        original_filename=file.filename or unique_name,
        file_path=file_path,
        file_type=mime_type,
        file_size=len(contents),
        summary_status="pending",
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    # Queue background summarization
    from database import SessionLocal
    background_tasks.add_task(process_attachment_summary, attachment.id, SessionLocal)

    return {
        "id": attachment.id,
        "filename": attachment.filename,
        "original_filename": attachment.original_filename,
        "file_type": attachment.file_type,
        "file_size": attachment.file_size,
        "summary_status": attachment.summary_status,
    }


@router.get("/{attachment_id}/download")
def download_file(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="File not found")
    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(
        attachment.file_path,
        filename=attachment.original_filename,
        media_type=attachment.file_type,
    )


@router.get("/{attachment_id}/summary")
def get_summary(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="File not found")
    return {
        "id": attachment.id,
        "summary": attachment.summary,
        "summary_status": attachment.summary_status,
        "is_paper": attachment.is_paper,
        "original_filename": attachment.original_filename,
    }


@router.delete("/{attachment_id}", status_code=204)
def delete_file(attachment_id: int, db: Session = Depends(get_db)):
    attachment = db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        if os.path.exists(attachment.file_path):
            os.remove(attachment.file_path)
    except Exception:
        pass
    db.delete(attachment)
    db.commit()
