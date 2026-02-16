import logging
from typing import Literal

from pydantic import BaseModel, Field

from src.services.llm_factory import LLMConfigError, get_chat_model
from src.services.section_definitions import (
    ALL_SECTIONS,
    CONDITIONAL_SECTIONS,
    SIGNATURE_SECTIONS,
    STANDARD_SECTIONS,
)
from src.services.vector_store import VectorStoreError, search_protocol

logger = logging.getLogger(__name__)

SEARCH_QUERY = (
    "clinical trial study design procedures participant eligibility "
    "inclusion criteria age range genetic sample biospecimen storage "
    "HIV testing informed consent"
)


def _build_prompt(context: str) -> str:
    """Build the outline generation prompt from section definitions."""
    standard_list = "\n".join(f"- {s.name}" for s in STANDARD_SECTIONS)
    conditional_list = "\n".join(
        f"- {s.name}: {s.detection_guidance}" for s in CONDITIONAL_SECTIONS
    )
    signature_list = "\n".join(
        f"- {s.name}: {s.detection_guidance}" for s in SIGNATURE_SECTIONS
    )

    ordered_names = ", ".join(f'"{s.name}"' for _, s in ALL_SECTIONS)

    return f"""\
You are an expert in clinical trial Informed Consent Forms (ICFs).

Analyze the following clinical trial protocol excerpts and propose an ICF outline. \
For each section, determine whether it should be included and provide detection \
reasoning for conditional sections.

## Standard Sections
These sections are always included in an ICF. Set defaultChecked=true for all of them:
{standard_list}

## Conditional Sections
Include these ONLY if you detect relevant content in the protocol. \
Set isConditional=true for all of them. Set defaultChecked=true only if detected:
{conditional_list}

## Signature Pages
Determine which signature pages are needed based on participant age ranges. \
Set isConditional=true for all of them:
{signature_list}

For conditional sections and signature pages, provide a brief detectionReason \
explaining what you found in the protocol (e.g., "detected: genetic sample collection \
mentioned in Section 5.2" or "detected: participants ages 16-65").

## Section Order
Return sections in exactly this order: {ordered_names}

## Protocol Excerpts
{context}
"""


class OutlineSection(BaseModel):
    """A single section in the proposed ICF outline."""

    sectionName: str = Field(description="Name of the ICF section")
    category: Literal["standard", "conditional", "signature"] = Field(
        description="Section category"
    )
    isConditional: bool = Field(
        description="Whether this section is conditionally included"
    )
    defaultChecked: bool = Field(
        description="Whether this section should be checked by default"
    )
    detectionReason: str | None = Field(
        default=None,
        description="Reason for inclusion/exclusion of conditional sections",
    )


class OutlineResult(BaseModel):
    """Structured LLM output for outline generation."""

    sections: list[OutlineSection]


class OutlineGenerationError(Exception):
    """Raised when outline generation fails after retries."""


MAX_RETRIES = 3


def _enforce_order(sections: list[dict]) -> list[dict]:
    """Sort sections to match the canonical order from ALL_SECTIONS."""
    order = {s.name: i for i, (_, s) in enumerate(ALL_SECTIONS)}
    return sorted(sections, key=lambda s: order.get(s["sectionName"], 999))


def generate_outline(protocol_id: str) -> list[dict]:
    """Generate an ICF outline from a protocol using RAG.

    Retrieves relevant chunks from Qdrant, sends them to the LLM with
    structured output, and returns the proposed outline sections.

    Sections are returned in the order defined by ALL_SECTIONS.
    Retries up to 3 times on LLM failure (NFR9).

    Raises:
        VectorStoreError: If Qdrant retrieval fails.
        OutlineGenerationError: If LLM fails after all retries.
    """
    chunks = search_protocol(protocol_id, SEARCH_QUERY, k=20)

    if not chunks:
        raise VectorStoreError(
            f"No content found for protocol: {protocol_id}"
        )

    context = "\n\n---\n\n".join(chunks)
    prompt = _build_prompt(context)

    model = get_chat_model()
    structured_model = model.with_structured_output(OutlineResult)

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = structured_model.invoke(prompt)
            sections = [section.model_dump() for section in result.sections]
            return _enforce_order(sections)
        except LLMConfigError:
            raise
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Outline generation attempt %d/%d failed: %s",
                attempt,
                MAX_RETRIES,
                exc,
            )

    raise OutlineGenerationError(
        f"Outline generation failed after {MAX_RETRIES} attempts: {last_error}"
    )
