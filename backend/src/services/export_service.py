"""Export service – assemble and convert ICF documents."""

import io
import re


class ExportError(Exception):
    """Raised when export processing fails."""


# ---------------------------------------------------------------------------
# Markdown assembly
# ---------------------------------------------------------------------------


def assemble_markdown(
    sections: list[dict[str, str]],
    protocol_name: str,
) -> str:
    """Assemble sections into a complete Markdown document.

    Each section dict must have ``name`` and ``content`` keys.
    """
    parts: list[str] = [f"# {protocol_name}", "", "**Informed Consent Form**", ""]

    for section in sections:
        parts.append(f"## {section['name']}")
        parts.append("")
        parts.append(section["content"])
        parts.append("")

    return "\n".join(parts)


# ---------------------------------------------------------------------------
# PDF conversion (weasyprint – lazy-imported for testability)
# ---------------------------------------------------------------------------

_PDF_CSS = """\
body {
    font-family: serif;
    font-size: 12pt;
    line-height: 1.6;
    max-width: 7in;
    margin: 0 auto;
    padding: 0.5in;
}
h1 {
    text-align: center;
    font-size: 20pt;
    margin-bottom: 0.5em;
}
h2 {
    font-size: 16pt;
    margin-top: 1.5em;
    page-break-after: avoid;
}
h3 {
    font-size: 14pt;
    margin-top: 1em;
    page-break-after: avoid;
}
table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
}
th, td {
    border: 1px solid #999;
    padding: 6px 10px;
    text-align: left;
}
th {
    background-color: #f0f0f0;
}
hr {
    page-break-after: always;
    border: none;
}
"""


def convert_markdown_to_pdf(md_content: str) -> bytes:
    """Convert Markdown content to PDF bytes."""
    try:
        import markdown as md_lib  # noqa: F811
        from weasyprint import HTML
    except ImportError as exc:
        raise ExportError(
            f"PDF export requires weasyprint and markdown packages: {exc}"
        ) from exc

    try:
        html_body = md_lib.markdown(
            md_content,
            extensions=["tables", "fenced_code", "sane_lists"],
        )
        html_doc = (
            f"<html><head>"
            f"<meta charset='utf-8'/>"
            f"<style>{_PDF_CSS}</style>"
            f"</head><body>{html_body}</body></html>"
        )
        return HTML(string=html_doc).write_pdf()
    except Exception as exc:
        raise ExportError(f"PDF conversion failed: {exc}") from exc


# ---------------------------------------------------------------------------
# DOCX conversion (python-docx – lazy-imported for testability)
# ---------------------------------------------------------------------------


def convert_markdown_to_docx(md_content: str) -> bytes:
    """Convert Markdown content to DOCX bytes."""
    try:
        from docx import Document
        from docx.shared import Pt
    except ImportError as exc:
        raise ExportError(
            f"DOCX export requires python-docx package: {exc}"
        ) from exc

    try:
        doc = Document()
        style = doc.styles["Normal"]
        style.font.name = "Calibri"
        style.font.size = Pt(11)

        _build_docx(doc, md_content)

        buf = io.BytesIO()
        doc.save(buf)
        return buf.getvalue()
    except ExportError:
        raise
    except Exception as exc:
        raise ExportError(f"DOCX conversion failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Internal helpers (no library imports needed – work on passed objects)
# ---------------------------------------------------------------------------

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+)$")
_BULLET_RE = re.compile(r"^[-*]\s+(.+)$")
_NUMBERED_RE = re.compile(r"^\d+\.\s+(.+)$")
_HRULE_RE = re.compile(r"^-{3,}\s*$")
_INLINE_RE = re.compile(r"(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*.+?\*)")


def _build_docx(doc, md_content: str) -> None:  # noqa: ANN001
    """Walk Markdown lines and populate a python-docx *Document*."""
    lines = md_content.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # Horizontal rule → page break
        if _HRULE_RE.match(stripped):
            doc.add_page_break()
            i += 1
            continue

        # Heading
        m = _HEADING_RE.match(stripped)
        if m:
            level = min(len(m.group(1)), 4)
            doc.add_heading(m.group(2), level=level)
            i += 1
            continue

        # Bullet list item
        m = _BULLET_RE.match(stripped)
        if m:
            p = doc.add_paragraph(style="List Bullet")
            _add_runs(p, m.group(1))
            i += 1
            continue

        # Numbered list item
        m = _NUMBERED_RE.match(stripped)
        if m:
            p = doc.add_paragraph(style="List Number")
            _add_runs(p, m.group(1))
            i += 1
            continue

        # Regular paragraph – accumulate consecutive non-special lines
        para_lines = [stripped]
        i += 1
        while i < len(lines):
            nxt = lines[i].strip()
            if (
                not nxt
                or _HEADING_RE.match(nxt)
                or _BULLET_RE.match(nxt)
                or _NUMBERED_RE.match(nxt)
                or _HRULE_RE.match(nxt)
            ):
                break
            para_lines.append(nxt)
            i += 1

        p = doc.add_paragraph()
        _add_runs(p, " ".join(para_lines))


def _add_runs(paragraph, text: str) -> None:  # noqa: ANN001
    """Add text with bold / italic inline formatting to a paragraph."""
    parts = _INLINE_RE.split(text)
    for part in parts:
        if not part:
            continue
        if part.startswith("***") and part.endswith("***"):
            run = paragraph.add_run(part[3:-3])
            run.bold = True
            run.italic = True
        elif part.startswith("**") and part.endswith("**"):
            run = paragraph.add_run(part[2:-2])
            run.bold = True
        elif part.startswith("*") and part.endswith("*"):
            run = paragraph.add_run(part[1:-1])
            run.italic = True
        else:
            paragraph.add_run(part)
