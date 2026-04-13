import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


def fetch_events(server_url: str, username: str, password: str, time_min: datetime, time_max: datetime) -> list:
    """Fetch events from Apple Calendar via CalDAV."""
    try:
        import caldav
        from caldav.elements import dav, cdav

        client = caldav.DAVClient(
            url=server_url,
            username=username,
            password=password,
        )
        principal = client.principal()
        calendars = principal.calendars()

        events = []
        for calendar in calendars:
            try:
                cal_events = calendar.date_search(
                    start=time_min,
                    end=time_max,
                    expand=True,
                )
                for event in cal_events:
                    try:
                        vevent = event.vobject_instance.vevent
                        dtstart = vevent.dtstart.value
                        dtend = getattr(vevent, "dtend", None)

                        if hasattr(dtstart, "date"):
                            start_str = dtstart.isoformat()
                        else:
                            start_str = datetime.combine(dtstart, datetime.min.time()).isoformat()

                        if dtend is None:
                            end_str = start_str
                        elif hasattr(dtend.value, "date"):
                            end_str = dtend.value.isoformat()
                        else:
                            end_str = datetime.combine(dtend.value, datetime.max.time()).isoformat()

                        all_day = not hasattr(dtstart, "hour")

                        events.append({
                            "title": str(vevent.summary.value) if hasattr(vevent, "summary") else "(제목 없음)",
                            "description": str(vevent.description.value) if hasattr(vevent, "description") else "",
                            "start_time": start_str,
                            "end_time": end_str,
                            "all_day": all_day,
                            "location": str(vevent.location.value) if hasattr(vevent, "location") else "",
                            "external_id": str(vevent.uid.value) if hasattr(vevent, "uid") else None,
                            "color": "#FF9500",
                            "calendar_source": "apple",
                        })
                    except Exception as e:
                        logger.warning(f"Failed to parse CalDAV event: {e}")
                        continue
            except Exception as e:
                logger.warning(f"Failed to fetch calendar {calendar}: {e}")
                continue

        return events

    except ImportError:
        logger.error("caldav library not installed")
        return []
    except Exception as e:
        logger.error(f"Apple Calendar fetch error: {e}")
        return []


def test_connection(server_url: str, username: str, password: str) -> bool:
    try:
        import caldav
        client = caldav.DAVClient(url=server_url, username=username, password=password)
        principal = client.principal()
        return True
    except Exception as e:
        logger.error(f"CalDAV connection test failed: {e}")
        return False
