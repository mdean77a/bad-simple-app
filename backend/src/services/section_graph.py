import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from typing import Annotated, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from src.services.llm_factory import LLMConfigError, get_chat_model
from src.services.section_definitions import get_boilerplate
from src.services.vector_store import VectorStoreError, search_protocol

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are an expert clinical research writer specializing in Informed Consent Forms (ICFs).

Your task is to write a specific section of an ICF based on clinical trial protocol content.

Instructions:
- Write clear, accessible language appropriate for research participants
- Use plain language — avoid jargon or explain technical terms when necessary
- Be thorough but concise
- Base your content strictly on the protocol information provided below
- Do NOT invent study details not present in the protocol

Write the section content directly. Do not include the section title as a heading — \
just write the body text for the section."""


def _merge_dicts(a: dict, b: dict) -> dict:
    """Merge two dicts, with b overriding a."""
    return {**a, **b}


class SectionResult(TypedDict):
    content: str
    status: str  # "ready" or "error"
    error: str | None


class SectionGraphState(TypedDict):
    results: Annotated[dict[str, SectionResult], _merge_dicts]


def _sse_event(event: str, data: dict) -> str:
    """Format a single SSE event."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _extract_chunk_text(chunk) -> str:
    """Extract text content from an AIMessageChunk."""
    if isinstance(chunk.content, str):
        return chunk.content
    if isinstance(chunk.content, list):
        parts = []
        for block in chunk.content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "".join(parts)
    return ""


def _build_messages(section_name: str, context: str) -> list:
    """Build the prompt messages for section generation."""
    return [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(
            content=(
                f'Write the "{section_name}" section of an Informed Consent Form.\n\n'
                f"Relevant protocol content:\n\n{context}"
            )
        ),
    ]


MAX_RETRIES = 3


REGENERATE_SYSTEM_PROMPT = """\
You are an expert clinical research writer specializing in Informed Consent Forms (ICFs).

You are revising a specific section of an ICF. You will be given:
1. The relevant clinical trial protocol content for reference
2. The current version of the section
3. Revision guidance from a reviewer

Instructions:
- Revise the section based on the reviewer's guidance
- Keep the content grounded in the protocol — do NOT invent study details
- Write clear, accessible language appropriate for research participants
- Use plain language — avoid jargon or explain technical terms when necessary

Write the revised section content directly. Do not include the section title as a heading — \
just write the body text for the section."""


async def stream_section_regenerate(
    protocol_id: str,
    section_id: str,
    section_name: str,
    current_content: str,
    guidance: str | None = None,
    provider: str | None = None,
    model_name: str | None = None,
) -> AsyncGenerator[str, None]:
    """Yield SSE events for regenerating a single section.

    Retrieves protocol context via RAG, builds a revision prompt with the
    current content and reviewer guidance, and streams the LLM response
    token-by-token.  Retries up to MAX_RETRIES times on transient failures;
    re-raises VectorStoreError and LLMConfigError immediately.
    """
    yield _sse_event("section_start", {"sectionId": section_id, "name": section_name})

    try:
        model = get_chat_model(provider=provider, model=model_name)
    except LLMConfigError as exc:
        yield _sse_event(
            "section_error",
            {"sectionId": section_id, "status": "error", "message": str(exc)},
        )
        return

    try:
        chunks = await asyncio.to_thread(
            search_protocol, protocol_id, section_name, k=20
        )
    except VectorStoreError as exc:
        yield _sse_event(
            "section_error",
            {"sectionId": section_id, "status": "error", "message": str(exc)},
        )
        return

    if not chunks:
        yield _sse_event(
            "section_error",
            {
                "sectionId": section_id,
                "status": "error",
                "message": "No relevant protocol content found",
            },
        )
        return

    context = "\n\n---\n\n".join(chunks)
    human_content = (
        f'Revise the "{section_name}" section of an Informed Consent Form.\n\n'
        f"Relevant protocol content:\n\n{context}\n\n"
        f"Current version of this section:\n\n{current_content}"
    )
    if guidance:
        human_content += f"\n\nReviewer guidance:\n{guidance}"
    else:
        human_content += "\n\nPlease improve the clarity and quality of this section."

    messages = [
        SystemMessage(content=REGENERATE_SYSTEM_PROMPT),
        HumanMessage(content=human_content),
    ]

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async for chunk in model.astream(messages):
                text = _extract_chunk_text(chunk)
                if text:
                    yield _sse_event(
                        "section_chunk",
                        {"sectionId": section_id, "content": text},
                    )
            yield _sse_event(
                "section_complete", {"sectionId": section_id, "status": "ready"}
            )
            return
        except (VectorStoreError, LLMConfigError):
            raise
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Section regeneration attempt %d/%d failed for '%s': %s",
                attempt,
                MAX_RETRIES,
                section_name,
                exc,
            )

    yield _sse_event(
        "section_error",
        {
            "sectionId": section_id,
            "status": "error",
            "message": f"Regeneration failed after {MAX_RETRIES} attempts: {last_error}",
        },
    )


def _make_section_node(protocol_id, section_id, section_name, model, node_results):
    """Create a graph node function for a single section."""

    async def node_fn(state: SectionGraphState) -> dict:
        try:
            chunks = await asyncio.to_thread(
                search_protocol, protocol_id, section_name, k=20
            )
            if not chunks:
                node_results[section_id] = {
                    "content": "",
                    "status": "error",
                    "error": "No relevant protocol content found",
                }
                return {"results": {section_id: node_results[section_id]}}

            context = "\n\n---\n\n".join(chunks)
            messages = _build_messages(section_name, context)

            content_parts: list[str] = []
            async for chunk in model.astream(messages):
                text = chunk.content if isinstance(chunk.content, str) else ""
                if text:
                    content_parts.append(text)
            content = "".join(content_parts)
            node_results[section_id] = {
                "content": content,
                "status": "ready",
                "error": None,
            }
            return {"results": {section_id: node_results[section_id]}}
        except (VectorStoreError, LLMConfigError) as exc:
            node_results[section_id] = {
                "content": "",
                "status": "error",
                "error": str(exc),
            }
            return {"results": {section_id: node_results[section_id]}}
        except Exception as exc:
            logger.warning("Section node '%s' failed: %s", section_name, exc)
            node_results[section_id] = {
                "content": "",
                "status": "error",
                "error": str(exc),
            }
            return {"results": {section_id: node_results[section_id]}}

    return node_fn


def build_section_graph(protocol_id, sections, model, node_results):
    """Build a LangGraph StateGraph with fan-out for parallel section generation."""
    builder = StateGraph(SectionGraphState)
    for section in sections:
        node_fn = _make_section_node(
            protocol_id, section["id"], section["name"], model, node_results
        )
        builder.add_node(section["name"], node_fn)
        builder.add_edge(START, section["name"])
        builder.add_edge(section["name"], END)
    return builder.compile()


async def stream_sections_parallel(
    protocol_id: str,
    sections: list[dict],
    provider: str | None = None,
    model_name: str | None = None,
) -> AsyncGenerator[str, None]:
    """Yield formatted SSE event strings for all sections in parallel.

    Boilerplate sections (conditional/signature) are emitted instantly.
    LLM sections use a LangGraph StateGraph with fan-out for parallel generation.
    """
    # Split into boilerplate vs LLM sections
    boilerplate_sections: list[tuple[dict, str]] = []
    llm_sections: list[dict] = []
    for s in sections:
        bp = get_boilerplate(s["name"])
        if bp is not None:
            boilerplate_sections.append((s, bp))
        else:
            llm_sections.append(s)

    # Emit boilerplate sections instantly
    for s, bp_text in boilerplate_sections:
        yield _sse_event(
            "section_start", {"sectionId": s["id"], "name": s["name"]}
        )
        yield _sse_event(
            "section_chunk",
            {"sectionId": s["id"], "content": bp_text},
        )
        yield _sse_event(
            "section_complete", {"sectionId": s["id"], "status": "ready"}
        )

    # If no LLM sections, we're done
    if not llm_sections:
        return

    try:
        model = get_chat_model(provider=provider, model=model_name)
    except LLMConfigError as exc:
        for s in llm_sections:
            yield _sse_event(
                "section_start", {"sectionId": s["id"], "name": s["name"]}
            )
            yield _sse_event(
                "section_error",
                {"sectionId": s["id"], "status": "error", "message": str(exc)},
            )
        return

    node_results: dict[str, dict] = {}
    graph = build_section_graph(protocol_id, llm_sections, model, node_results)
    name_to_id = {s["name"]: s["id"] for s in llm_sections}

    # Emit section_start for LLM sections upfront
    for s in llm_sections:
        yield _sse_event(
            "section_start", {"sectionId": s["id"], "name": s["name"]}
        )

    # Stream graph execution — token chunks from parallel LLM calls
    completed_sections: set[str] = set()

    async for event in graph.astream_events({"results": {}}, version="v2"):
        if event["event"] == "on_chat_model_stream":
            node_name = event.get("metadata", {}).get("langgraph_node")
            if node_name and node_name in name_to_id:
                text = _extract_chunk_text(event["data"]["chunk"])
                if text:
                    yield _sse_event(
                        "section_chunk",
                        {"sectionId": name_to_id[node_name], "content": text},
                    )

        # Check if any section just completed
        node_name = event.get("metadata", {}).get("langgraph_node")
        if node_name and node_name in name_to_id:
            section_id = name_to_id[node_name]
            if section_id not in completed_sections and section_id in node_results:
                completed_sections.add(section_id)
                result = node_results[section_id]
                if result.get("status") == "ready":
                    yield _sse_event(
                        "section_complete",
                        {"sectionId": section_id, "status": "ready"},
                    )
                else:
                    yield _sse_event(
                        "section_error",
                        {
                            "sectionId": section_id,
                            "status": "error",
                            "message": result.get("error", "Section not processed"),
                        },
                    )

    # Safety net: emit for any LLM sections not caught during streaming
    for s in llm_sections:
        if s["id"] not in completed_sections:
            result = node_results.get(s["id"], {})
            if result.get("status") == "ready":
                yield _sse_event(
                    "section_complete", {"sectionId": s["id"], "status": "ready"}
                )
            else:
                yield _sse_event(
                    "section_error",
                    {
                        "sectionId": s["id"],
                        "status": "error",
                        "message": result.get("error", "Section not processed"),
                    },
                )
