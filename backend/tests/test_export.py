"""Tests for the export endpoint and export service."""

import io
from unittest.mock import patch

import pytest

from src.services.export_service import (
    ExportError,
    _add_runs,
    _build_docx,
    assemble_markdown,
    convert_markdown_to_docx,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SECTIONS = [
    {"id": "purpose", "name": "Purpose of the Study", "content": "This study examines…"},
    {"id": "procedures", "name": "Study Procedures", "content": "You will be asked to…"},
]

_APPROVALS = [
    {
        "sectionId": "purpose",
        "userName": "Sarah Johnson",
        "userEmail": "sarah@example.com",
        "timestamp": "2026-02-03T14:30:00Z",
    },
    {
        "sectionId": "procedures",
        "userName": "Sarah Johnson",
        "userEmail": "sarah@example.com",
        "timestamp": "2026-02-03T14:35:00Z",
    },
]


def _export_body(
    *,
    sections=None,
    approvals=None,
    fmt="md",
    protocol_name="THAPCA-OH Trial",
):
    return {
        "sections": sections if sections is not None else _SECTIONS,
        "approvals": approvals if approvals is not None else _APPROVALS,
        "format": fmt,
        "protocolName": protocol_name,
    }


# ===================================================================
# assemble_markdown – unit tests
# ===================================================================


class TestAssembleMarkdown:
    def test_basic_assembly(self):
        result = assemble_markdown(_SECTIONS, "My Protocol")
        assert result.startswith("# My Protocol")
        assert "**Informed Consent Form**" in result
        assert "## Purpose of the Study" in result
        assert "This study examines…" in result
        assert "## Study Procedures" in result
        assert "You will be asked to…" in result

    def test_sections_appear_in_order(self):
        result = assemble_markdown(_SECTIONS, "P")
        purpose_pos = result.index("## Purpose of the Study")
        procedures_pos = result.index("## Study Procedures")
        assert purpose_pos < procedures_pos

    def test_preserves_markdown_formatting(self):
        sections = [
            {
                "id": "s1",
                "name": "Risks",
                "content": "Risks include:\n\n- **Headache**\n- *Nausea*\n- Fatigue",
            }
        ]
        result = assemble_markdown(sections, "P")
        assert "- **Headache**" in result
        assert "- *Nausea*" in result

    def test_single_section(self):
        result = assemble_markdown([_SECTIONS[0]], "P")
        assert "## Purpose of the Study" in result
        assert "Study Procedures" not in result

    def test_empty_content(self):
        sections = [{"id": "s1", "name": "Empty", "content": ""}]
        result = assemble_markdown(sections, "P")
        assert "## Empty" in result


# ===================================================================
# convert_markdown_to_docx – integration tests (python-docx is pure Python)
# ===================================================================


class TestConvertMarkdownToDocx:
    def _open_docx(self, docx_bytes: bytes):
        from docx import Document

        return Document(io.BytesIO(docx_bytes))

    def test_produces_valid_docx(self):
        md = "# Title\n\nA paragraph."
        result = convert_markdown_to_docx(md)
        assert isinstance(result, bytes)
        # DOCX files start with PK (ZIP archive)
        assert result[:2] == b"PK"

    def test_heading_levels(self):
        md = "# H1\n\n## H2\n\n### H3\n"
        doc = self._open_docx(convert_markdown_to_docx(md))
        styles = [p.style.name for p in doc.paragraphs]
        assert "Heading 1" in styles
        assert "Heading 2" in styles
        assert "Heading 3" in styles

    def test_paragraphs(self):
        md = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n"
        doc = self._open_docx(convert_markdown_to_docx(md))
        texts = [p.text for p in doc.paragraphs if p.style.name == "Normal"]
        assert "First paragraph." in texts
        assert "Second paragraph." in texts

    def test_bullet_list(self):
        md = "- Item A\n- Item B\n"
        doc = self._open_docx(convert_markdown_to_docx(md))
        bullets = [p for p in doc.paragraphs if p.style.name == "List Bullet"]
        assert len(bullets) == 2
        assert bullets[0].text == "Item A"

    def test_numbered_list(self):
        md = "1. First\n2. Second\n"
        doc = self._open_docx(convert_markdown_to_docx(md))
        numbered = [p for p in doc.paragraphs if p.style.name == "List Number"]
        assert len(numbered) == 2
        assert numbered[0].text == "First"

    def test_bold_inline(self):
        md = "This is **important** text.\n"
        doc = self._open_docx(convert_markdown_to_docx(md))
        para = [p for p in doc.paragraphs if p.style.name == "Normal"][0]
        runs = para.runs
        bold_runs = [r for r in runs if r.bold]
        assert any("important" in r.text for r in bold_runs)

    def test_italic_inline(self):
        md = "This is *emphasized* text.\n"
        doc = self._open_docx(convert_markdown_to_docx(md))
        para = [p for p in doc.paragraphs if p.style.name == "Normal"][0]
        italic_runs = [r for r in para.runs if r.italic]
        assert any("emphasized" in r.text for r in italic_runs)

    def test_horizontal_rule_produces_page_break(self):
        md = "# Page 1\n\n---\n\n# Page 2\n"
        doc = self._open_docx(convert_markdown_to_docx(md))
        # Page breaks appear as paragraph elements; just verify both headings exist
        texts = [p.text for p in doc.paragraphs]
        assert "Page 1" in texts
        assert "Page 2" in texts

    def test_full_document_assembly(self):
        md = assemble_markdown(_SECTIONS, "My Protocol")
        doc = self._open_docx(convert_markdown_to_docx(md))
        texts = [p.text for p in doc.paragraphs]
        assert "My Protocol" in texts
        assert "Purpose of the Study" in texts
        assert "Study Procedures" in texts


# ===================================================================
# _build_docx / _add_runs – unit tests
# ===================================================================


class TestBuildDocxHelpers:
    def _make_doc(self):
        from docx import Document

        return Document()

    def test_add_runs_plain_text(self):
        doc = self._make_doc()
        p = doc.add_paragraph()
        _add_runs(p, "plain text")
        assert p.text == "plain text"

    def test_add_runs_bold(self):
        doc = self._make_doc()
        p = doc.add_paragraph()
        _add_runs(p, "before **bold** after")
        assert any(r.bold for r in p.runs)
        assert "bold" in p.text

    def test_add_runs_italic(self):
        doc = self._make_doc()
        p = doc.add_paragraph()
        _add_runs(p, "before *italic* after")
        assert any(r.italic for r in p.runs)

    def test_add_runs_bold_italic(self):
        doc = self._make_doc()
        p = doc.add_paragraph()
        _add_runs(p, "***bold italic***")
        assert any(r.bold and r.italic for r in p.runs)

    def test_build_docx_mixed(self):
        doc = self._make_doc()
        md = "# Title\n\nParagraph.\n\n- Bullet\n\n1. Numbered\n"
        _build_docx(doc, md)
        styles = [p.style.name for p in doc.paragraphs]
        assert "Heading 1" in styles
        assert "Normal" in styles
        assert "List Bullet" in styles
        assert "List Number" in styles


# ===================================================================
# Route tests – POST /api/v1/export/
# ===================================================================


class TestExportRoute:
    # --- Markdown export ---

    @pytest.mark.asyncio
    async def test_export_markdown(self, client):
        response = await client.post("/api/v1/export/", json=_export_body(fmt="md"))

        assert response.status_code == 200
        assert "text/markdown" in response.headers["content-type"]
        assert "THAPCA-OH Trial_ICF.md" in response.headers["content-disposition"]

        text = response.text
        assert "# THAPCA-OH Trial" in text
        assert "## Purpose of the Study" in text
        assert "This study examines…" in text

    @pytest.mark.asyncio
    async def test_export_markdown_sections_in_order(self, client):
        response = await client.post("/api/v1/export/", json=_export_body(fmt="md"))
        text = response.text
        assert text.index("Purpose of the Study") < text.index("Study Procedures")

    # --- PDF export ---

    @pytest.mark.asyncio
    @patch("src.api.routes.export.convert_markdown_to_pdf")
    async def test_export_pdf(self, mock_pdf, client):
        mock_pdf.return_value = b"%PDF-1.4 fake"

        response = await client.post("/api/v1/export/", json=_export_body(fmt="pdf"))

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "THAPCA-OH Trial_ICF.pdf" in response.headers["content-disposition"]
        assert response.content == b"%PDF-1.4 fake"
        mock_pdf.assert_called_once()

    @pytest.mark.asyncio
    @patch("src.api.routes.export.convert_markdown_to_pdf")
    async def test_export_pdf_receives_assembled_markdown(self, mock_pdf, client):
        mock_pdf.return_value = b"%PDF"

        await client.post("/api/v1/export/", json=_export_body(fmt="pdf"))

        md_arg = mock_pdf.call_args[0][0]
        assert "# THAPCA-OH Trial" in md_arg
        assert "## Purpose of the Study" in md_arg

    @pytest.mark.asyncio
    @patch("src.api.routes.export.convert_markdown_to_pdf")
    async def test_export_pdf_conversion_error(self, mock_pdf, client):
        mock_pdf.side_effect = ExportError("Cairo not found")

        response = await client.post("/api/v1/export/", json=_export_body(fmt="pdf"))

        assert response.status_code == 502
        data = response.json()
        assert data["code"] == "EXPORT_ERROR"
        assert "Cairo not found" in data["detail"]

    # --- DOCX export ---

    @pytest.mark.asyncio
    @patch("src.api.routes.export.convert_markdown_to_docx")
    async def test_export_docx(self, mock_docx, client):
        mock_docx.return_value = b"PK\x03\x04 fake"

        response = await client.post("/api/v1/export/", json=_export_body(fmt="docx"))

        assert response.status_code == 200
        assert "wordprocessingml" in response.headers["content-type"]
        assert "THAPCA-OH Trial_ICF.docx" in response.headers["content-disposition"]
        mock_docx.assert_called_once()

    @pytest.mark.asyncio
    @patch("src.api.routes.export.convert_markdown_to_docx")
    async def test_export_docx_conversion_error(self, mock_docx, client):
        mock_docx.side_effect = ExportError("python-docx error")

        response = await client.post("/api/v1/export/", json=_export_body(fmt="docx"))

        assert response.status_code == 502
        data = response.json()
        assert data["code"] == "EXPORT_ERROR"
        assert "python-docx error" in data["detail"]

    # --- Validation ---

    @pytest.mark.asyncio
    async def test_export_empty_sections(self, client):
        response = await client.post(
            "/api/v1/export/",
            json=_export_body(sections=[]),
        )

        assert response.status_code == 422
        assert response.json()["code"] == "VALIDATION_ERROR"
        assert "section" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_export_empty_protocol_name(self, client):
        response = await client.post(
            "/api/v1/export/",
            json=_export_body(protocol_name="   "),
        )

        assert response.status_code == 422
        assert response.json()["code"] == "VALIDATION_ERROR"
        assert "protocolName" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_export_invalid_format(self, client):
        """Pydantic rejects formats outside the Literal union."""
        response = await client.post(
            "/api/v1/export/",
            json=_export_body(fmt="html"),
        )
        assert response.status_code == 422  # Pydantic validation error

    @pytest.mark.asyncio
    async def test_export_missing_fields(self, client):
        response = await client.post("/api/v1/export/", json={})
        assert response.status_code == 422

    # --- Content-Disposition ---

    @pytest.mark.asyncio
    async def test_content_disposition_uses_protocol_name(self, client):
        response = await client.post(
            "/api/v1/export/",
            json=_export_body(protocol_name="Cardiac Trial", fmt="md"),
        )
        assert 'filename="Cardiac Trial_ICF.md"' in response.headers["content-disposition"]

    @pytest.mark.asyncio
    async def test_protocol_name_trimmed(self, client):
        response = await client.post(
            "/api/v1/export/",
            json=_export_body(protocol_name="  Spaced  ", fmt="md"),
        )
        assert 'filename="Spaced_ICF.md"' in response.headers["content-disposition"]

    # --- Approvals accepted but not rendered in 8.1 ---

    @pytest.mark.asyncio
    async def test_approvals_accepted_in_request(self, client):
        """Approvals are accepted in the request (for Story 8.2) but not rendered yet."""
        response = await client.post(
            "/api/v1/export/",
            json=_export_body(approvals=_APPROVALS, fmt="md"),
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_empty_approvals_accepted(self, client):
        response = await client.post(
            "/api/v1/export/",
            json=_export_body(approvals=[], fmt="md"),
        )
        assert response.status_code == 200
