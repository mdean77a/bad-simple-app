import asyncio

from fastapi import APIRouter, Form, UploadFile
from fastapi.responses import JSONResponse

from src.services.pdf_processor import PDFProcessingError, extract_text_from_pdf
from src.services.vector_store import (
    VectorStoreError,
    generate_collection_name,
    index_protocol,
    list_protocols,
)

router = APIRouter()


@router.get("/")
async def get_protocols() -> list[dict]:
    """List all indexed protocols."""
    try:
        protocols = await asyncio.to_thread(list_protocols)
    except VectorStoreError as exc:
        return _vector_db_error(str(exc))
    return protocols


@router.post("/upload")
async def upload_protocol(file: UploadFile, acronym: str = Form(...)) -> dict:
    """Upload a clinical protocol PDF, extract text, and index in vector store."""
    acronym = acronym.strip()
    if len(acronym) < 3 or len(acronym) > 20:
        return _validation_error("Acronym must be between 3 and 20 characters")

    filename = file.filename or "unknown.pdf"

    if not filename.lower().endswith(".pdf"):
        return _validation_error("File must have a .pdf extension")

    if file.content_type and file.content_type != "application/pdf":
        return _validation_error("File must be a PDF (application/pdf)")

    file_bytes = await file.read()

    try:
        text_content, _page_count = extract_text_from_pdf(file_bytes)
    except PDFProcessingError as exc:
        return _pdf_parse_error(str(exc))

    protocol_name = filename.rsplit(".", 1)[0] if "." in filename else filename
    collection_name = generate_collection_name(filename)

    if not text_content.strip():
        return _pdf_parse_error("PDF contains no extractable text")

    try:
        await asyncio.to_thread(
            index_protocol, text_content, collection_name, protocol_name, acronym
        )
    except VectorStoreError as exc:
        return _vector_db_error(str(exc))

    return {
        "protocolId": collection_name,
        "protocolName": protocol_name,
        "acronym": acronym,
    }


def _validation_error(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "detail": detail},
    )


def _pdf_parse_error(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"code": "PDF_PARSE_ERROR", "detail": detail},
    )


def _vector_db_error(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=502,
        content={"code": "VECTOR_DB_ERROR", "detail": detail},
    )
