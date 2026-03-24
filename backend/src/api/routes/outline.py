import asyncio

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.services.llm_factory import LLMConfigError
from src.services.rag_pipeline import OutlineGenerationError, generate_outline
from src.services.vector_store import VectorStoreError

router = APIRouter()


class GenerateOutlineRequest(BaseModel):
    protocolId: str
    provider: str | None = None
    model: str | None = None


@router.post("/generate")
async def generate_outline_endpoint(request: GenerateOutlineRequest) -> dict:
    """Generate a proposed ICF outline from an indexed protocol."""
    if not request.protocolId.strip():
        return _validation_error("protocolId is required")

    try:
        sections = await asyncio.to_thread(
            generate_outline, request.protocolId,
            provider=request.provider, model_name=request.model,
        )
    except VectorStoreError as exc:
        return _vector_db_error(str(exc))
    except (OutlineGenerationError, LLMConfigError) as exc:
        return _llm_error(str(exc))

    return {
        "protocolId": request.protocolId,
        "sections": sections,
    }


def _validation_error(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "detail": detail},
    )


def _vector_db_error(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=502,
        content={"code": "VECTOR_DB_ERROR", "detail": detail},
    )


def _llm_error(detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=502,
        content={"code": "LLM_ERROR", "detail": detail},
    )
