from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List
import models
from database import get_db
from services import google_calendar, apple_calendar

router = APIRouter(prefix="/api/sync", tags=["calendar-sync"])

REDIRECT_URI = "http://localhost:3000/auth/google/callback"


class GoogleAuthRequest(BaseModel):
    redirect_uri: str = REDIRECT_URI


class GoogleCallbackRequest(BaseModel):
    code: str
    state: str
    redirect_uri: str = REDIRECT_URI


class AppleCalendarRequest(BaseModel):
    server_url: str = "https://caldav.icloud.com"
    username: str
    password: str
    name: str = "Apple Calendar"


class SyncRequest(BaseModel):
    sync_id: int
    days_back: int = 30
    days_forward: int = 60


@router.get("/google/auth-url")
def google_auth_url(redirect_uri: str = Query(default=REDIRECT_URI)):
    result = google_calendar.get_auth_url(redirect_uri)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/google/callback")
def google_callback(payload: GoogleCallbackRequest, db: Session = Depends(get_db)):
    creds = google_calendar.exchange_code(payload.code, payload.redirect_uri, payload.state)
    if "error" in creds:
        raise HTTPException(status_code=400, detail=creds["error"])

    sync = models.CalendarSync(
        type="google",
        name="Google Calendar",
        credentials=creds,
        is_active=True,
    )
    db.add(sync)
    db.commit()
    db.refresh(sync)
    return {"id": sync.id, "message": "Google Calendar 연결 완료"}


@router.post("/apple/connect")
def apple_connect(payload: AppleCalendarRequest, db: Session = Depends(get_db)):
    ok = apple_calendar.test_connection(payload.server_url, payload.username, payload.password)
    if not ok:
        raise HTTPException(status_code=400, detail="CalDAV 연결에 실패했습니다. URL, 아이디, 앱 비밀번호를 확인해주세요.")

    existing = db.query(models.CalendarSync).filter(
        models.CalendarSync.type == "apple",
        models.CalendarSync.credentials["username"].astext == payload.username,
    ).first()

    if existing:
        existing.credentials = {
            "server_url": payload.server_url,
            "username": payload.username,
            "password": payload.password,
        }
        existing.name = payload.name
        existing.is_active = True
        db.commit()
        return {"id": existing.id, "message": "Apple Calendar 업데이트 완료"}

    sync = models.CalendarSync(
        type="apple",
        name=payload.name,
        credentials={
            "server_url": payload.server_url,
            "username": payload.username,
            "password": payload.password,
        },
        is_active=True,
    )
    db.add(sync)
    db.commit()
    db.refresh(sync)
    return {"id": sync.id, "message": "Apple Calendar 연결 완료"}


@router.post("/run")
def run_sync(payload: SyncRequest, db: Session = Depends(get_db)):
    sync = db.query(models.CalendarSync).filter(models.CalendarSync.id == payload.sync_id).first()
    if not sync:
        raise HTTPException(status_code=404, detail="Sync configuration not found")

    now = datetime.utcnow()
    time_min = now - timedelta(days=payload.days_back)
    time_max = now + timedelta(days=payload.days_forward)

    events_data = []
    if sync.type == "google":
        events_data = google_calendar.fetch_events(sync.credentials, time_min, time_max)
    elif sync.type == "apple":
        creds = sync.credentials
        events_data = apple_calendar.fetch_events(
            creds["server_url"], creds["username"], creds["password"], time_min, time_max
        )

    imported = 0
    for event_data in events_data:
        existing = db.query(models.Event).filter(
            models.Event.external_id == event_data["external_id"],
            models.Event.calendar_source == event_data["calendar_source"],
        ).first()

        start_dt = datetime.fromisoformat(event_data["start_time"].replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(event_data["end_time"].replace("Z", "+00:00"))

        # Make naive datetime for SQLite
        if start_dt.tzinfo:
            start_dt = start_dt.replace(tzinfo=None)
        if end_dt.tzinfo:
            end_dt = end_dt.replace(tzinfo=None)

        if existing:
            existing.title = event_data["title"]
            existing.description = event_data["description"]
            existing.start_time = start_dt
            existing.end_time = end_dt
            existing.all_day = event_data["all_day"]
            existing.location = event_data["location"]
        else:
            event = models.Event(
                title=event_data["title"],
                description=event_data["description"],
                start_time=start_dt,
                end_time=end_dt,
                all_day=event_data["all_day"],
                location=event_data["location"],
                color=event_data["color"],
                calendar_source=event_data["calendar_source"],
                external_id=event_data["external_id"],
            )
            db.add(event)
            imported += 1

    sync.last_synced = now
    db.commit()

    return {
        "message": f"동기화 완료: {imported}개 신규, {len(events_data) - imported}개 업데이트",
        "total": len(events_data),
        "imported": imported,
    }


@router.get("/list")
def list_syncs(db: Session = Depends(get_db)):
    syncs = db.query(models.CalendarSync).all()
    return [
        {
            "id": s.id,
            "type": s.type,
            "name": s.name,
            "is_active": s.is_active,
            "last_synced": s.last_synced,
        }
        for s in syncs
    ]


@router.delete("/{sync_id}", status_code=204)
def delete_sync(sync_id: int, db: Session = Depends(get_db)):
    sync = db.query(models.CalendarSync).filter(models.CalendarSync.id == sync_id).first()
    if not sync:
        raise HTTPException(status_code=404, detail="Sync not found")
    db.delete(sync)
    db.commit()
