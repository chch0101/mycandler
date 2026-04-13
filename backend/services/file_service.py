import os
import io
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def extract_text_from_file(file_path: str, mime_type: str) -> str:
    """Extract readable text from uploaded file."""
    try:
        if mime_type == "application/pdf" or file_path.endswith(".pdf"):
            return _extract_pdf(file_path)
        elif mime_type in ("text/plain",) or file_path.endswith(".txt"):
            return _extract_text(file_path)
        elif mime_type in ("text/markdown",) or file_path.endswith(".md"):
            return _extract_text(file_path)
        elif file_path.endswith(".docx") or mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return _extract_docx(file_path)
        else:
            # Try reading as plain text
            return _extract_text(file_path)
    except Exception as e:
        logger.error(f"Text extraction failed for {file_path}: {e}")
        return ""


def _extract_pdf(file_path: str) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        texts = []
        for page in reader.pages[:50]:  # limit to first 50 pages
            text = page.extract_text()
            if text:
                texts.append(text)
        return "\n\n".join(texts)
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""


def _extract_text(file_path: str) -> str:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception as e:
        logger.error(f"Text file read error: {e}")
        return ""


def _extract_docx(file_path: str) -> str:
    try:
        import docx
        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        logger.warning("python-docx not installed, cannot extract DOCX")
        return ""
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return ""


def get_mime_type(filename: str) -> str:
    import mimetypes
    mime, _ = mimetypes.guess_type(filename)
    return mime or "application/octet-stream"


def is_supported_for_summary(mime_type: str, filename: str) -> bool:
    supported = [
        "application/pdf",
        "text/plain",
        "text/markdown",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    ext_supported = [".pdf", ".txt", ".md", ".docx"]
    return mime_type in supported or any(filename.lower().endswith(e) for e in ext_supported)
