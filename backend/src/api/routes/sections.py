import json

from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from src.services.llm_factory import LLMConfigError
from src.services.section_generator import SectionGenerationError, generate_section_stream
from src.services.vector_store import VectorStoreError

router = APIRouter()


class SectionRequest(BaseModel):
    id: str
    name: str


class GenerateSectionsRequest(BaseModel):
    protocolId: str
    sections: list[SectionRequest]


def _sse_event(event: str, data: dict) -> str:
    """Format a single SSE event."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/generate")
async def generate_sections_endpoint(request: GenerateSectionsRequest):
    """Stream section generation results as Server-Sent Events."""
    if not request.protocolId.strip():
        return _validation_error("protocolId is required")

    if not request.sections:
        return _validation_error("sections list must not be empty")

    async def event_generator():
        for section in request.sections:
            yield _sse_event(
                "section_start",
                {"sectionId": section.id, "name": section.name},
            )

            try:
                async for chunk in generate_section_stream(
                    request.protocolId, section.name
                ):
                    yield _sse_event(
                        "section_chunk",
                        {"sectionId": section.id, "content": chunk},
                    )

                yield _sse_event(
                    "section_complete",
                    {"sectionId": section.id, "status": "ready"},
                )
            except VectorStoreError as exc:
                yield _sse_event(
                    "section_error",
                    {
                        "sectionId": section.id,
                        "status": "error",
                        "message": str(exc),
                    },
                )
            except (LLMConfigError, SectionGenerationError) as exc:
                yield _sse_event(
                    "section_error",
                    {
                        "sectionId": section.id,
                        "status": "error",
                        "message": str(exc),
                    },
                )

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
