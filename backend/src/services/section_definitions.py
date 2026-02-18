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
    ),
    SectionDef(
        name="Sample Storage",
        detection_guidance=(
            "Include if protocol mentions biobanking, sample/tissue storage, "
            "or future use of biological samples"
        ),
    ),
    SectionDef(
        name="HIV Testing",
        detection_guidance=(
            "Include if protocol mentions HIV testing or HIV status determination"
        ),
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
    ),
    SectionDef(
        name="Teen Assent",
        detection_guidance=(
            "Include (defaultChecked=true) if protocol includes "
            "participants ages 12-17. IMPORTANT: If the protocol enrolls "
            "minors (under 18) and does NOT exclude 12-17 year olds, "
            "Teen Assent IS needed — 'under 18' includes teens."
        ),
    ),
    SectionDef(
        name="Parent/Guardian Permission",
        detection_guidance=(
            "Include (defaultChecked=true) if protocol includes "
            "any minor participants (under 18)"
        ),
    ),
]

# Full ordered list — this controls the output order
ALL_SECTIONS: list[tuple[str, SectionDef]] = (
    [("standard", s) for s in STANDARD_SECTIONS]
    + [("conditional", s) for s in CONDITIONAL_SECTIONS]
    + [("signature", s) for s in SIGNATURE_SECTIONS]
)
