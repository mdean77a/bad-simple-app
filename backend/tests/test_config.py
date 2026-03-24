from src.config import Settings


def test_parse_cors_origins_from_comma_string():
    """parse_cors_origins splits a comma-separated string into a list."""
    s = Settings(cors_origins="http://localhost:3000,http://localhost:3001")
    assert s.cors_origins == ["http://localhost:3000", "http://localhost:3001"]


def test_parse_cors_origins_strips_whitespace():
    """parse_cors_origins strips whitespace around each origin."""
    s = Settings(cors_origins="http://localhost:3000 , http://localhost:3001")
    assert s.cors_origins == ["http://localhost:3000", "http://localhost:3001"]


def test_parse_cors_origins_from_list():
    """parse_cors_origins passes through a list unchanged."""
    s = Settings(cors_origins=["http://localhost:3000"])
    assert s.cors_origins == ["http://localhost:3000"]


def test_enable_local_llm_defaults_false():
    """enable_local_llm defaults to False."""
    s = Settings()
    assert s.enable_local_llm is False


def test_local_llm_base_url_default():
    """local_llm_base_url defaults to LM Studio default."""
    s = Settings()
    assert s.local_llm_base_url == "http://localhost:1234/v1"


def test_local_llm_fields_from_env(monkeypatch):
    """enable_local_llm and local_llm_base_url can be set via env vars."""
    monkeypatch.setenv("ENABLE_LOCAL_LLM", "true")
    monkeypatch.setenv("LOCAL_LLM_BASE_URL", "http://custom:5678/v1")
    s = Settings()
    assert s.enable_local_llm is True
    assert s.local_llm_base_url == "http://custom:5678/v1"
