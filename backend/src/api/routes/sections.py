from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from src.services.section_definitions import get_boilerplate
from src.services.section_graph import stream_section_regenerate, stream_sections_parallel

router = APIRouter()


class SectionRequest(BaseModel):
    id: str
    name: str


class GenerateSectionsRequest(BaseModel):
    protocolId: str
    sections: list[SectionRequest]
    provider: str | None = None
    model: str | None = None


class RegenerateSectionRequest(BaseModel):
    protocolId: str
    sectionId: str
    sectionName: str
    currentContent: str
    guidance: str | None = None
    provider: str | None = None
    model: str | None = None


@router.post("/generate")
async def generate_sections_endpoint(request: GenerateSectionsRequest):
    """Stream section generation results as Server-Sent Events."""
    if not request.protocolId.strip():
        return _validation_error("protocolId is required")

    if not request.sections:
        return _validation_error("sections list must not be empty")

    async def event_generator():
        sections_input = [{"id": s.id, "name": s.name} for s in request.sections]
        async for event_str in stream_sections_parallel(
            request.protocolId, sections_input,
            provider=request.provider, model_name=request.model,
        ):
            yield event_str

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/regenerate")
async def regenerate_section_endpoint(request: RegenerateSectionRequest):
    """Stream section regeneration results as Server-Sent Events."""
    if not request.protocolId.strip():
        return _validation_error("protocolId is required")

    if not request.sectionName.strip():
        return _validation_error("sectionName is required")

    if get_boilerplate(request.sectionName) is not None:
        return _validation_error(
            f"Cannot regenerate boilerplate section: {request.sectionName}"
        )

    async def event_generator():
        async for event_str in stream_section_regenerate(
            protocol_id=request.protocolId,
            section_id=request.sectionId,
            section_name=request.sectionName,
            current_content=request.currentContent,
            guidance=request.guidance,
            provider=request.provider,
            model_name=request.model,
        ):
            yield event_str

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


def _validation_error(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "detail": detail},
    )
