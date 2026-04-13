import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
CLIENT_SECRETS_FILE = os.path.join(os.path.dirname(__file__), "..", "google_credentials.json")


def get_auth_url(redirect_uri: str) -> dict:
    try:
        from google_auth_oauthlib.flow import Flow

        if not os.path.exists(CLIENT_SECRETS_FILE):
            return {"error": "google_credentials.json 파일이 없습니다. Google Cloud Console에서 OAuth2 자격증명을 다운로드하세요."}

        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            redirect_uri=redirect_uri,
        )
        auth_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )
        return {"auth_url": auth_url, "state": state}
    except Exception as e:
        return {"error": str(e)}


def exchange_code(code: str, redirect_uri: str, state: str) -> dict:
    try:
        from google_auth_oauthlib.flow import Flow

        flow = Flow.from_client_secrets_file(
            CLIENT_SECRETS_FILE,
            scopes=SCOPES,
            state=state,
            redirect_uri=redirect_uri,
        )
        flow.fetch_token(code=code)
        credentials = flow.credentials
        return {
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "scopes": list(credentials.scopes) if credentials.scopes else [],
        }
    except Exception as e:
        return {"error": str(e)}


def fetch_events(credentials_dict: dict, time_min: datetime, time_max: datetime, calendar_id: str = "primary") -> list:
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(
            token=credentials_dict.get("token"),
            refresh_token=credentials_dict.get("refresh_token"),
            token_uri=credentials_dict.get("token_uri"),
            client_id=credentials_dict.get("client_id"),
            client_secret=credentials_dict.get("client_secret"),
            scopes=credentials_dict.get("scopes"),
        )

        service = build("calendar", "v3", credentials=creds)
        events_result = service.events().list(
            calendarId=calendar_id,
            timeMin=time_min.isoformat() + "Z",
            timeMax=time_max.isoformat() + "Z",
            singleEvents=True,
            orderBy="startTime",
            maxResults=500,
        ).execute()

        items = events_result.get("items", [])
        events = []
        for item in items:
            start = item.get("start", {})
            end = item.get("end", {})

            start_dt = start.get("dateTime") or (start.get("date") + "T00:00:00")
            end_dt = end.get("dateTime") or (end.get("date") + "T23:59:59")

            events.append({
                "title": item.get("summary", "(제목 없음)"),
                "description": item.get("description", ""),
                "start_time": start_dt,
                "end_time": end_dt,
                "all_day": "date" in start,
                "location": item.get("location", ""),
                "external_id": item.get("id"),
                "color": "#4285F4",
                "calendar_source": "google",
            })
        return events

    except Exception as e:
        logger.error(f"Google Calendar fetch error: {e}")
        return []


def list_calendars(credentials_dict: dict) -> list:
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(
            token=credentials_dict.get("token"),
            refresh_token=credentials_dict.get("refresh_token"),
            token_uri=credentials_dict.get("token_uri"),
            client_id=credentials_dict.get("client_id"),
            client_secret=credentials_dict.get("client_secret"),
            scopes=credentials_dict.get("scopes"),
        )
        service = build("calendar", "v3", credentials=creds)
        result = service.calendarList().list().execute()
        return [
            {"id": c["id"], "name": c.get("summary", c["id"]), "color": c.get("colorId", "#4285F4")}
            for c in result.get("items", [])
        ]
    except Exception as e:
        logger.error(f"Google Calendar list error: {e}")
        return []
