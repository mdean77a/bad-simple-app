import logging
from collections.abc import AsyncGenerator

from langchain.agents import create_agent
from langchain_core.messages import AIMessageChunk
from langchain_core.tools import tool

from src.services.llm_factory import LLMConfigError, get_chat_model
from src.services.vector_store import VectorStoreError, search_protocol

logger = logging.getLogger(__name__)


class SectionGenerationError(Exception):
    """Raised when section generation fails after retries."""


MAX_RETRIES = 3

SYSTEM_PROMPT = """\
You are an expert clinical research writer specializing in Informed Consent Forms (ICFs).

Your task is to write a specific section of an ICF based on clinical trial protocol content.

Instructions:
- Write clear, accessible language appropriate for research participants
- Use plain language — avoid jargon or explain technical terms when necessary
- Be thorough but concise
- Base your content strictly on the protocol information retrieved
- Do NOT invent study details not present in the protocol
- Use the search tool to retrieve relevant protocol content before writing

Write the section content directly. Do not include the section title as a heading — \
just write the body text for the section.
"""


def _build_user_message(section_name: str) -> str:
    """Build the user message requesting generation of a specific section."""
    return (
        f'Write the "{section_name}" section of an Informed Consent Form. '
        f"First, search for relevant protocol content about this topic, "
        f"then write the section based on what you find."
    )


async def generate_section_stream(
    protocol_id: str,
    section_name: str,
    provider: str | None = None,
    model_name: str | None = None,
) -> AsyncGenerator[str, None]:
    """Stream generated content for a single ICF section.

    Uses a LangGraph ReAct agent with a RAG retrieval tool to generate
    section content based on the indexed protocol.

    Yields content strings as they are generated.

    Raises:
        VectorStoreError: If RAG retrieval fails.
        LLMConfigError: If LLM is not configured.
        SectionGenerationError: If generation fails after MAX_RETRIES attempts.
    """
    model = get_chat_model(provider=provider, model=model_name)

    @tool
    def search_protocol_chunks(query: str) -> str:
        """Retrieve relevant protocol chunks from the vector database for ICF section generation."""
        try:
            chunks = search_protocol(protocol_id, query, k=20)
            if not chunks:
                return "No relevant content found for this query."
            return "\n\n---\n\n".join(chunks)
        except VectorStoreError:
            raise
        except Exception as exc:
            raise VectorStoreError(f"Protocol search failed: {exc}") from exc

    agent = create_agent(
        model=model,
        tools=[search_protocol_chunks],
        system_prompt=SYSTEM_PROMPT,
    )

    user_message = _build_user_message(section_name)
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async for msg, metadata in agent.astream(
                {"messages": [{"role": "user", "content": user_message}]},
                stream_mode="messages",
            ):
                if not isinstance(msg, AIMessageChunk):
                    continue
                # Skip tool call chunks
                if msg.tool_calls or msg.tool_call_chunks:
                    continue
                # Handle string content (typical)
                if isinstance(msg.content, str) and msg.content:
                    yield msg.content
                # Handle list-of-blocks content (Anthropic format)
                elif isinstance(msg.content, list):
                    for block in msg.content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            text = block.get("text", "")
                            if text:
                                yield text
            return
        except (VectorStoreError, LLMConfigError):
            raise
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Section generation attempt %d/%d failed for '%s': %s",
                attempt,
                MAX_RETRIES,
                section_name,
                exc,
            )

    raise SectionGenerationError(
        f"Section generation failed after {MAX_RETRIES} attempts: {last_error}"
    )
