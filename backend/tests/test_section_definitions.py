import dataclasses

from src.services.section_definitions import (
    ALL_SECTIONS,
    CONDITIONAL_SECTIONS,
    SIGNATURE_SECTIONS,
    STANDARD_SECTIONS,
    SectionDef,
    get_boilerplate,
)


# --- get_boilerplate() returns correct values ---


def test_get_boilerplate_conditional_sections():
    """get_boilerplate returns None for each conditional section (LLM-generated)."""
    for section_def in CONDITIONAL_SECTIONS:
        result = get_boilerplate(section_def.name)
        assert result is None, f"Expected None for conditional section '{section_def.name}'"


def test_get_boilerplate_signature_sections():
    """get_boilerplate returns non-None for each signature section."""
    for section_def in SIGNATURE_SECTIONS:
        result = get_boilerplate(section_def.name)
        assert result is not None, f"Expected boilerplate for '{section_def.name}'"
        assert isinstance(result, str)
        assert len(result) > 0


def test_get_boilerplate_standard_sections_return_none():
    """get_boilerplate returns None for each standard section."""
    for section_def in STANDARD_SECTIONS:
        result = get_boilerplate(section_def.name)
        assert result is None, f"Expected None for standard section '{section_def.name}'"


def test_get_boilerplate_unknown_section_returns_none():
    """get_boilerplate returns None for an unknown section name."""
    assert get_boilerplate("Nonexistent Section") is None


def test_get_boilerplate_specific_conditional_names():
    """Verify specific conditional section names return None (LLM-generated)."""
    for name in ["Genetic Research", "Sample Storage", "HIV Testing"]:
        assert get_boilerplate(name) is None


def test_get_boilerplate_specific_signature_names():
    """Verify specific signature section names return boilerplate."""
    for name in ["Adult Consent", "Teen Assent", "Parent/Guardian Permission"]:
        assert get_boilerplate(name) is not None


# --- boilerplate_text field values on section lists ---


def test_all_conditional_sections_have_no_boilerplate():
    """Every CONDITIONAL_SECTIONS entry has no boilerplate_text (LLM-generated)."""
    for section_def in CONDITIONAL_SECTIONS:
        assert section_def.boilerplate_text is None, (
            f"CONDITIONAL_SECTIONS entry '{section_def.name}' should not have boilerplate_text"
        )


def test_all_signature_sections_have_boilerplate():
    """Every SIGNATURE_SECTIONS entry has boilerplate_text set."""
    for section_def in SIGNATURE_SECTIONS:
        assert section_def.boilerplate_text is not None, (
            f"SIGNATURE_SECTIONS entry '{section_def.name}' missing boilerplate_text"
        )


def test_all_standard_sections_have_no_boilerplate():
    """Every STANDARD_SECTIONS entry has boilerplate_text as None."""
    for section_def in STANDARD_SECTIONS:
        assert section_def.boilerplate_text is None, (
            f"STANDARD_SECTIONS entry '{section_def.name}' should not have boilerplate_text"
        )


# --- SectionDef field ordering ---


def test_boilerplate_text_is_last_field():
    """boilerplate_text must be the last field on SectionDef (frozen dataclass ordering)."""
    fields = dataclasses.fields(SectionDef)
    assert fields[-1].name == "boilerplate_text"


def test_section_def_field_count():
    """SectionDef should have exactly 3 fields."""
    fields = dataclasses.fields(SectionDef)
    assert len(fields) == 3


def test_section_def_field_order():
    """Fields should be: name, detection_guidance, boilerplate_text."""
    fields = dataclasses.fields(SectionDef)
    assert [f.name for f in fields] == ["name", "detection_guidance", "boilerplate_text"]
