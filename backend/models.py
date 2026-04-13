from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    all_day = Column(Boolean, default=False)
    color = Column(String(20), default="#6366F1")
    location = Column(String(500), default="")
    calendar_source = Column(String(50), default="local")  # local, google, apple
    external_id = Column(String(500), nullable=True)
    recurrence = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    attachments = relationship("Attachment", back_populates="event", cascade="all, delete-orphan")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, default=0)
    is_paper = Column(Boolean, default=False)
    extracted_text = Column(Text, default="")
    summary = Column(Text, default="")
    summary_status = Column(String(20), default="pending")  # pending, processing, done, error
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("Event", back_populates="attachments")


class CalendarSync(Base):
    __tablename__ = "calendar_syncs"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(20), nullable=False)  # google, apple
    name = Column(String(200), default="")
    credentials = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    last_synced = Column(DateTime, nullable=True)
    calendar_id = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
