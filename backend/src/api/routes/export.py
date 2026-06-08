"""Export route – POST /api/v1/export/"""

import asyncio
from typing import Literal

from fastapi import APIRouter
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from src.services.export_service import (
    ExportError,
    assemble_markdown,
    build_approval_tracking,
    convert_markdown_to_docx,
    convert_markdown_to_pdf,
)
from src.services.section_definitions import SIGNATURE_SECTIONS

router = APIRouter()


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class ExportSection(BaseModel):
    id: str
    name: str
    content: str


class ExportApproval(BaseModel):
    sectionId: str
    userName: str
    userEmail: str
    timestamp: str


class ExportRequest(BaseModel):
    sections: list[ExportSection]
    approvals: list[ExportApproval]
    format: Literal["md", "pdf", "docx"]
    protocolName: str
    llmProvider: str | None = None
    llmModel: str | None = None


# ---------------------------------------------------------------------------
# Content types & extensions
# ---------------------------------------------------------------------------

_CONTENT_TYPES: dict[str, str] = {
    "md": "text/markdown; charset=utf-8",
    "pdf": "application/pdf",
    "docx": (
        "application/vnd.openxmlformats-officedocument"
        ".wordprocessingml.document"
    ),
}


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/")
async def export_document(req: ExportRequest):
    """Export an ICF document in the requested format."""
    if not req.sections:
        return _validation_error("At least one section is required")

    protocol_name = req.protocolName.strip()
    if not protocol_name:
        return _validation_error("protocolName must not be empty")

    sections = [
        {"id": s.id, "name": s.name, "content": s.content}
        for s in req.sections
    ]

    signature_names = {s.name for s in SIGNATURE_SECTIONS}
    md_content = assemble_markdown(sections, protocol_name, page_break_before=signature_names)

    approvals = [
        {
            "sectionId": a.sectionId,
            "userName": a.userName,
            "timestamp": a.timestamp,
        }
        for a in req.approvals
    ]
    tracking = build_approval_tracking(
        approvals, sections, req.llmProvider, req.llmModel
    )
    if tracking:
        md_content = md_content + "\n" + tracking

    fmt = req.format
    try:
        if fmt == "md":
            body = md_content.encode("utf-8")
        elif fmt == "pdf":
            body = await asyncio.to_thread(convert_markdown_to_pdf, md_content)
        else:  # docx
            body = await asyncio.to_thread(convert_markdown_to_docx, md_content)
    except ExportError as exc:
        return _export_error(str(exc))

    filename = f"{protocol_name}_ICF.{fmt}"

    return Response(
        content=body,
        media_type=_CONTENT_TYPES[fmt],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ---------------------------------------------------------------------------
# Error helpers
# ---------------------------------------------------------------------------


def _validation_error(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "detail": detail},
    )


def _export_error(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=502,
        content={"code": "EXPORT_ERROR", "detail": detail},
    )
