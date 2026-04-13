from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import models
from database import get_db

router = APIRouter(prefix="/api/events", tags=["events"])


class EventCreate(BaseModel):
    title: str
    description: str = ""
    start_time: datetime
    end_time: datetime
    all_day: bool = False
    color: str = "#6366F1"
    location: str = ""
    calendar_source: str = "local"


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = None
    color: Optional[str] = None
    location: Optional[str] = None


class AttachmentOut(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    is_paper: bool
    summary: str
    summary_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class EventOut(BaseModel):
    id: int
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    all_day: bool
    color: str
    location: str
    calendar_source: str
    external_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    attachments: List[AttachmentOut] = []

    class Config:
        from_attributes = True


@router.get("", response_model=List[EventOut])
def list_events(
    start: Optional[str] = Query(None),
    end: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Event)
    if start:
        query = query.filter(models.Event.end_time >= datetime.fromisoformat(start))
    if end:
        query = query.filter(models.Event.start_time <= datetime.fromisoformat(end))
    return query.order_by(models.Event.start_time).all()


@router.post("", response_model=EventOut, status_code=201)
def create_event(payload: EventCreate, db: Session = Depends(get_db)):
    event = models.Event(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/{event_id}", response_model=EventOut)
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, key, value)
    event.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()
