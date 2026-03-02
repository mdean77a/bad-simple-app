"""ICF section definitions and ordering.

Sections are returned to the frontend in the order they appear here.
To reorder sections, move entries within their category list.
To add a new section, append to the appropriate category list.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class SectionDef:
    """Definition of an ICF section."""

    name: str
    detection_guidance: str
    boilerplate_text: str | None = None


# --- Standard Sections (always included, defaultChecked=true) ---

STANDARD_SECTIONS: list[SectionDef] = [
    SectionDef(
        name="Purpose of the Study",
        detection_guidance="Always include in ICF",
    ),
    SectionDef(
        name="Study Procedures",
        detection_guidance="Always include in ICF",
    ),
    SectionDef(
        name="Risks and Discomforts",
        detection_guidance="Always include in ICF",
    ),
    SectionDef(
        name="Benefits",
        detection_guidance="Always include in ICF",
    ),
    SectionDef(
        name="Alternatives",
        detection_guidance="Always include in ICF",
    ),
    SectionDef(
        name="Confidentiality",
        detection_guidance="Always include in ICF",
    ),
    SectionDef(
        name="Costs and Compensation",
        detection_guidance="Always include in ICF",
    ),
    SectionDef(
        name="Voluntary Participation",
        detection_guidance="Always include in ICF",
    ),
    SectionDef(
        name="Contact Information",
        detection_guidance="Always include in ICF",
    ),
]

# --- Conditional Sections (include only if detected in protocol) ---

CONDITIONAL_SECTIONS: list[SectionDef] = [
    SectionDef(
        name="Genetic Research",
        detection_guidance=(
            "Include if protocol mentions genetic testing, DNA, "
            "genomic analysis, or genetic sample collection"
        ),
        boilerplate_text="[Boilerplate placeholder for Genetic Research]",
    ),
    SectionDef(
        name="Sample Storage",
        detection_guidance=(
            "Include if protocol mentions biobanking, sample/tissue storage, "
            "or future use of biological samples"
        ),
        boilerplate_text="[Boilerplate placeholder for Sample Storage]",
    ),
    SectionDef(
        name="HIV Testing",
        detection_guidance=(
            "Include if protocol mentions HIV testing or HIV status determination"
        ),
        boilerplate_text="[Boilerplate placeholder for HIV Testing]",
    ),
]

# --- Signature Pages (based on participant age ranges) ---

SIGNATURE_SECTIONS: list[SectionDef] = [
    SectionDef(
        name="Adult Consent",
        detection_guidance=(
            "Include (defaultChecked=true) if protocol includes "
            "adult participants (18+)"
        ),
        boilerplate_text="[Boilerplate placeholder for Adult Consent]",
    ),
    SectionDef(
        name="Teen Assent",
        detection_guidance=(
            "Include (defaultChecked=true) if protocol includes "
            "participants ages 12-17. IMPORTANT: If the protocol enrolls "
            "minors (under 18) and does NOT exclude 12-17 year olds, "
            "Teen Assent IS needed — 'under 18' includes teens."
        ),
        boilerplate_text="[Boilerplate placeholder for Teen Assent]",
    ),
    SectionDef(
        name="Parent/Guardian Permission",
        detection_guidance=(
            "Include (defaultChecked=true) if protocol includes "
            "any minor participants (under 18)"
        ),
        boilerplate_text="[Boilerplate placeholder for Parent/Guardian Permission]",
    ),
]

# Full ordered list — this controls the output order
ALL_SECTIONS: list[tuple[str, SectionDef]] = (
    [("standard", s) for s in STANDARD_SECTIONS]
    + [("conditional", s) for s in CONDITIONAL_SECTIONS]
    + [("signature", s) for s in SIGNATURE_SECTIONS]
)

_BOILERPLATE_MAP: dict[str, str] = {
    section_def.name: section_def.boilerplate_text
    for _category, section_def in ALL_SECTIONS
    if section_def.boilerplate_text is not None
}


def get_boilerplate(section_name: str) -> str | None:
    """Return boilerplate text for a section, or None if it's LLM-generated."""
    return _BOILERPLATE_MAP.get(section_name)
