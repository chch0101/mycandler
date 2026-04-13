import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers import events, files, calendar_sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="MyCandler API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(files.router)
app.include_router(calendar_sync.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.on_event("startup")
async def startup():
    logger.info("MyCandler API server started")
    os.makedirs(os.path.join(os.path.dirname(__file__), "data", "uploads"), exist_ok=True)
