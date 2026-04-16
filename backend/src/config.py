from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    cors_origins: list[str] = ["http://localhost:3000"]
    cors_origin_regex: str | None = (
        r"https://bad-simple.*\.vercel\.app"
        r"|http://(192\.168|10)\.\d+\.\d+(:\d+)?"
    )

    llm_provider: str = "anthropic"
    llm_model: str = "claude-sonnet-4-6"
    anthropic_api_key: str | None = None

    # Local LLM (dev only — LM Studio via ChatOpenAI interface)
    enable_local_llm: bool = False
    local_llm_base_url: str = "http://localhost:1234/v1"

    qdrant_url: str = ""
    qdrant_api_key: str | None = None
    openai_api_key: str | None = None  # Used for embeddings AND OpenAI LLM provider

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


settings = Settings()
