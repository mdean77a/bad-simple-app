import re
import time

from fastapi import APIRouter, UploadFile

from src.services.pdf_processor import PDFProcessingError, extract_text_from_pdf

router = APIRouter()


def _generate_protocol_id(filename: str) -> str:
    """Generate a protocol ID from filename + timestamp."""
    name = filename.rsplit(".", 1)[0] if "." in filename else filename
    sanitized = re.sub(r"[^a-zA-Z0-9_-]", "_", name).strip("_")
    timestamp = int(time.time() * 1000)
    return f"{sanitized}_{timestamp}"


@router.post("/upload")
async def upload_protocol(file: UploadFile) -> dict:
    """Upload a clinical protocol PDF and extract its text content."""
    filename = file.filename or "unknown.pdf"

    if not filename.lower().endswith(".pdf"):
        return _validation_error("File must have a .pdf extension")

    if file.content_type and file.content_type != "application/pdf":
        return _validation_error("File must be a PDF (application/pdf)")

    file_bytes = await file.read()

    try:
        text_content, page_count = extract_text_from_pdf(file_bytes)
    except PDFProcessingError as exc:
        return _pdf_parse_error(str(exc))

    protocol_name = filename.rsplit(".", 1)[0] if "." in filename else filename

    return {
        "protocolId": _generate_protocol_id(filename),
        "protocolName": protocol_name,
        "textContent": text_content,
        "pageCount": page_count,
    }


def _validation_error(detail: str) -> dict:
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "detail": detail},
    )


def _pdf_parse_error(detail: str) -> dict:
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=422,
        content={"code": "PDF_PARSE_ERROR", "detail": detail},
    )
