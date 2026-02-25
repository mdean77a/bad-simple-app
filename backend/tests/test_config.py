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
