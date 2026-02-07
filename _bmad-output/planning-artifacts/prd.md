---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-bmad-simple-app-2026-02-02.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
workflowType: 'prd'
classification:
  projectType: web_app
  domain: healthcare
  complexity: high
  projectContext: greenfield
---

# Product Requirements Document - bmad-simple-app

**Author:** Mikey
**Date:** 2026-02-03

## Executive Summary

**Vision:** Transform clinical trial ICF creation from a weeks-long manual drafting process into a hours-long AI-assisted review workflow, enabling research coordinators to produce PI-ready documents with minimal revision cycles.

**Differentiator:** First RAG-based LLM application purpose-built for clinical trial ICF generation. Combines AI engineering with deep domain expertise (100+ trial implementations) and regulatory accountability understanding. The technology is invisible to users; the productivity gain is not.

**Target Users:**
- **Primary:** Research Coordinators at the Data Coordinating Center (DCC)
- **Secondary:** DCC supervisors and staff who review ICFs before PI submission
- **Downstream:** Principal Investigators who approve final ICFs (do not interact with application directly)

**Core Value Proposition:** AI-generated ICF drafts of sufficient quality that PIs approve with minimal revision, reducing end-to-end time from protocol receipt to IRB submission from weeks to days.

## Success Criteria

### User Success

**Primary User (Research Coordinator):**
- End-to-end cycle time from protocol receipt to IRB-ready ICF reduced from up to 10 weeks to hours/days
- PI approval on first submission with minimal or no revisions
- Elimination of frustrating reminder cycles waiting for PI feedback on draft quality issues
- Increased capacity to manage concurrent trial startups without proportional time increase
- Confidence in generated drafts sufficient to send directly to PI without extensive manual revision

**Downstream User (Principal Investigator):**
- Receives high-quality drafts requiring quick verification rather than detailed correction
- Time spent on ICF review reduced from extensive revision to confirmation of accuracy

### Business Success

- Contribute to reducing overall clinical trial startup timeline (ICF creation is one component of broader ~1 year → 2 month goal)
- Demonstrate innovation leadership in clinical trial operations
- Self-sustaining operation with tool maintenance costs budgeted into clinical trial budgets
- Faster turnaround strengthens competitive position for sponsor partnerships

### Technical Success

- Reliable PDF protocol processing and RAG-based retrieval
- Consistent, high-quality section generation across diverse protocol types
- System stability for production use by DCC coordinators

### Measurable Outcomes

| Metric | Baseline | Target |
|--------|----------|--------|
| Protocol receipt → IRB-ready ICF | Up to 10 weeks | Hours to days |
| PI revision rounds required | Multiple | Minimal (0-1) |
| First-pass PI approval rate | N/A | Majority approved with minor/no changes |
| Coordinator manual drafting time | ~1 week | Eliminated (review time only) |

## Product Scope

### MVP - Minimum Viable Product

**Core Capabilities:**
- Protocol upload (PDF format)
- Selection from previously uploaded protocols
- AI-generated outline with automatic detection of conditional sections (sample storage, genetic research, teen assent)
- Coordinator outline review with checklist (check/uncheck to include/exclude sections)
- Section-by-section generation after outline confirmation
- Section review options: approve, edit directly, or regenerate with guidance
- Simple authentication (name + email for approval attribution)
- Open saved project from landing page ("Continue Saved Project" button)
- Save project to local file from dashboard page
- Export final ICF: save locally (PDF, Markdown, or DOCX)
- Section approval tracking (user, date, time) printed as final ICF page

### Growth Features (Post-MVP)

- Authorization and access control (API token management)
- Additional protocol formats beyond PDF
- Site initiation checklist and other derivative documents
- Enhanced integration with external tools (e.g., LangSmith for traceability)

### Vision (Future)

- Comprehensive clinical trial document generation platform
- Multiple derivative artifact types from single protocol upload
- Protocol amendment and ICF revision management
- Potential licensing to other data coordinating centers and CROs
- Integration with clinical trial management systems

## User Journeys

### Journey 1: Sarah Creates a New ICF (Happy Path)

**Opening Scene:**
Sarah is a research coordinator at the DCC who just received the final protocol for a new NIH-funded diabetes prevention trial. She's read through the 87-page protocol and understands the study design - a 3-arm randomized trial with blood draws at baseline and 6 months, plus optional genetic sample collection. She has three other trials in startup and can't afford to spend a week manually drafting this ICF.

**Rising Action:**
Sarah logs into the application with her name and email. She uploads the protocol PDF. The system processes it and presents a proposed ICF outline as a checklist - it has correctly detected that genetic sample collection is optional and has that section pre-checked. Sarah notices the teen assent signature page isn't checked even though the study includes 16-17 year olds, so she checks that box to include it. The outline updates to show the teen assent section will be generated.

She confirms the outline and the system generates all sections. She works through them one by one - the Purpose section is excellent, she approves it. The Risks section missed one of the injection site reactions mentioned on page 34 of the protocol, so she edits it directly. The Genetic Research section is awkwardly worded, so she regenerates it with guidance: "Make this more reassuring - emphasize that genetic participation is optional and won't affect study participation."

**Climax:**
After two hours of focused review, Sarah has approved all sections. She's confident this draft is solid - something she never would have achieved in a week of manual writing. She emails the complete ICF directly to Dr. Martinez, the PI.

**Resolution:**
Dr. Martinez reviews the ICF that evening. He makes two minor word choice changes and signs off. Sarah submits to the IRB the next day - a process that used to take 6-8 weeks is done in 2 days.

**Capabilities Revealed:**
- Protocol upload and processing
- Intelligent outline generation with conditional section detection
- Outline checklist with check/uncheck to include/exclude sections
- Section-by-section generation
- Approve/edit/regenerate workflow
- Direct section editing
- Local export (PDF, Markdown, DOCX)

---

### Journey 2: Maria Resumes Her Colleague's Work

**Opening Scene:**
Maria is a senior coordinator at the DCC. Her colleague Tom started working on an ICF for a medical device trial last week but had to take unexpected medical leave. The trial sponsor is asking for a timeline update, and Maria needs to pick up where Tom left off.

**Rising Action:**
Maria checks Tom's shared network folder where he saves his work-in-progress files. She finds "DeviceTrial_ICF.proj" and copies it to her local machine. She logs into the application with her name and email, clicks "Continue Saved Project," and opens Tom's file. She sees that Tom completed the outline review and approved 6 of 12 sections before stopping. The approval tracking shows exactly which sections Tom approved and when.

Maria reviews Tom's approved sections to familiarize herself with his approach. She then continues with section 7, the Risks section. She checks her email, finds the sponsor's clarification about device malfunction rates, and edits the section directly with the correct percentage.

**Climax:**
Maria completes the remaining sections, making sure the document maintains consistent tone with Tom's earlier work. She saves the project file, which now shows her approval timestamps on the later sections.

**Resolution:**
When Tom returns, he can open the project file and see the complete audit trail - his approvals on sections 1-6, Maria's on sections 7-12. The supervisor reviews and sends to the PI. The sponsor gets their timeline answer: ICF will be submitted to IRB this week.

**Capabilities Revealed:**
- Save work in progress to local file
- Open and resume partial work from file
- Approval tracking with user attribution (stored in project file)
- File sharing via standard methods (network folder, email)

**Scope Note:** This journey describes sequential file handoff (one user at a time). Real-time collaboration and file conflict resolution are out of scope for MVP.

---

### Journey 3: Dr. Chen Reviews Before PI Submission

**Opening Scene:**
Dr. Chen is the Associate Director of the DCC and supervises the coordinator team. Before any ICF goes to a PI, she does a quality review. She's received notification that coordinator James has completed an ICF for a complex oncology trial.

**Rising Action:**
Dr. Chen logs in and opens James's completed project. She sees all sections show as approved by James. She reads through the document sequentially, focusing on the sections she knows are typically problematic: Risks, Alternatives, and the Genetic Research section.

In the Alternatives section, she notices the language is too technical for a patient-facing document. She edits it directly to simplify the wording. The system tracks that Dr. Chen modified this section after James's initial approval.

**Climax:**
Dr. Chen is satisfied with the quality. She saves her changes and emails the ICF to the PI with a note that it's ready for signature review.

**Resolution:**
The PI receives a polished document that has been through two levels of DCC review. The audit trail on the final page shows: James approved all sections on Monday, Dr. Chen modified and re-approved the Alternatives section on Tuesday.

**Capabilities Revealed:**
- Supervisor review workflow
- Edit previously approved sections
- Updated approval tracking showing modification history
- Quality gate before PI submission

---

### Journey 4: Principal Investigator Review (Downstream)

**Opening Scene:**
Dr. Martinez receives an email from Sarah with the ICF attached for his diabetes prevention trial. He's between clinic patients and has 20 minutes before his next appointment.

**Rising Action:**
Dr. Martinez opens the ICF on his tablet. He's intimately familiar with the protocol - he helped write it. He scans the Purpose and Procedures sections; they accurately reflect the study design. He pays close attention to the Risks section since he knows patient safety language is critical.

He notices one risk is understated - the protocol mentions "rare but serious allergic reactions" but the ICF just says "allergic reactions may occur." He marks this for Sarah to strengthen.

**Climax:**
In 15 minutes, Dr. Martinez has reviewed the entire document. The quality is high enough that he only has one substantive comment. He replies to Sarah's email with his feedback.

**Resolution:**
Sarah makes the edit, regenerates just the Risks section with guidance to emphasize severity, and sends back to Dr. Martinez. He approves. Total time from protocol receipt to PI-approved ICF: 3 days.

**Capabilities Revealed:**
- Document quality sufficient for quick PI review
- Ability to regenerate single sections based on PI feedback
- (Note: PI does not interact with application directly; coordinator emails ICF manually)

---

### Journey Requirements Summary

| Capability | Journey 1 | Journey 2 | Journey 3 | Journey 4 |
|------------|:---------:|:---------:|:---------:|:---------:|
| Protocol upload | ✓ | | | |
| Protocol selection (previously uploaded) | ✓ | | | |
| Intelligent outline generation | ✓ | | | |
| Outline checklist (check/uncheck sections) | ✓ | | | |
| Section generation | ✓ | | | |
| Section approve/edit/regenerate | ✓ | ✓ | ✓ | |
| Direct section editing | ✓ | ✓ | ✓ | |
| Save project to local file | ✓ | ✓ | ✓ | |
| Open project from local file | | ✓ | ✓ | |
| Approval tracking (user, date, time) | ✓ | ✓ | ✓ | |
| Local export (PDF, Markdown, DOCX) | ✓ | | ✓ | |

## Domain-Specific Requirements

### Regulatory Status

**FDA Classification:** Not applicable. This application is a document generation tool that produces drafts for human review and approval. It does not diagnose, treat, or make clinical recommendations. No FDA software classification or approval pathway required.

**HIPAA:** Not applicable. Clinical protocols do not contain Protected Health Information (PHI). Protocols describe study design, procedures, and risks - not individual patient data.

### Data Confidentiality

**Protocol Documents:**
- Clinical protocols are confidential/proprietary materials
- Original protocol PDF documents are not persistently stored by the application
- Protocol text is chunked and embedded; chunks and embedding vectors are stored in the vector database
- Vector database (for RAG retrieval) is secured via API key access
- DCC staff manage vector database externally, including deletion of older protocol collections
- Adequate security provided through API key authentication

### Accountability Model

**Human Responsibility:**
- Research coordinator and principal investigator bear 100% responsibility for the final ICF
- AI accelerates draft creation; human expertise ensures accuracy
- No additional liability considerations beyond standard DCC operations
- IRB review provides additional oversight before patient use

### Domain Requirements Summary

| Concern | Status | Implication |
|---------|--------|-------------|
| FDA approval | Not required | No regulatory submission process |
| HIPAA compliance | Not applicable | No PHI handling requirements |
| Protocol confidentiality | Required | API key security for vector database |
| Audit trail for regulators | Minimal | Section approval tracking is sufficient |
| Clinical validation | Not required | Human review replaces clinical validation |

## Innovation & Novel Patterns

### Detected Innovation Areas

**User-Focused Innovation:**
The core innovation is enabling clinical research professionals to benefit from AI without requiring AI expertise. Research coordinators, DCC staff, and PIs interact with a familiar document workflow - not prompts, parameters, or AI configuration. The technology is invisible; the productivity gain is not.

**Domain-Specific Application:**
First application of RAG-based LLM generation to clinical trial ICF creation. No competing tools exist in this space. The multi-year replication barrier comes from the combination of:
- AI engineering expertise (scarce in clinical research organizations)
- Deep domain knowledge (100+ trial implementations)
- Understanding of regulatory accountability requirements

**Accountability-First Design:**
Unlike generic AI document tools, this application is designed around the regulatory reality that humans bear 100% responsibility for the final document. Section-by-section approval, direct editing capability, and approval tracking are features driven by this accountability model.

### Technology Evolution Strategy

The application benefits from LLM improvements over time. Model selection is a configuration decision, not an architectural constraint. As models improve, output quality improves without application changes.

### Validation Approach

**Primary Validation:** User acceptance and enthusiasm from DCC coordinators, staff, and PIs. The tool succeeds when users prefer it over manual drafting.

**Technical Validation:** RAG pipeline optimization (using tools like RAGAS) and PDF processing refinement are performed outside the application and incorporated as improvements. The application owns the PDF processing and vector storage; optimization methodology is a separate concern.

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| PDF structure complexity (figures, tables) | Tested with 12+ protocols successfully; future PDF processing improvements can be incorporated |
| AI quality insufficient for specific protocol | Coordinator can directly edit any section; regenerate with guidance |
| Total generation failure | Fallback to manual ICF drafting (current process) |
| Model limitations | Swap in improved models as they become available |

## Web Application Specific Requirements

### Project-Type Overview

This is a Multi-Page Application (MPA) with a key interactive single-page experience for the section-by-section ICF review workflow. The application is an internal tool for DCC staff, not a public-facing website.

### Browser Support

| Browser | Support Level |
|---------|---------------|
| Chrome | Fully supported |
| Safari | Fully supported |
| Firefox | Not required |
| Edge | Not required |

Testing and QA will focus on Chrome and Safari only.

### Responsive Design

The application must support three device categories:

| Device | Use Case |
|--------|----------|
| Desktop | Primary workstation use for full ICF creation workflow |
| Tablet | Review and editing on the go (e.g., iPad) |
| Phone | Quick access for review, status checks |

UI components must adapt appropriately across screen sizes. The section-by-section workflow page should be usable on all three device types.

### Performance Targets

See Non-Functional Requirements (NFR1-NFR4) for specific, measurable performance criteria.

**Implementation Notes:**
- PDF processing uses PyMuPDF or equivalent for text extraction, chunking, embedding, vector storage
- Section generation streams in parallel with real-time UI updates

**Future Consideration:** If more sophisticated PDF processing (e.g., Docling) is needed for complex documents with figures/tables, this would require external processing (5-10 min, GPU) and the coordinator would select from pre-processed protocols.

### SEO Strategy

Not applicable. This is an internal tool accessed directly by DCC staff via bookmarked URL or internal links. No search engine discoverability required.

### Accessibility

No formal WCAG compliance requirements for MVP. Standard web development best practices will be followed, but no specific accessibility certification or testing is required.

### Technical Constraints

- No native mobile app features required (camera, GPS, push notifications)
- No CLI/command-line interface needed
- No real-time collaboration features (simultaneous editing)
- Session-based authentication (name + email); no persistent user accounts for MVP

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP - prove that AI-generated ICF drafts are high-quality enough for first-pass PI approval. Success is measured by user acceptance and reduced revision cycles, not feature breadth.

**Core Hypothesis:** RAG-based section generation produces content that PIs approve with minimal revision.

**Confidence Level:** 90%+ based on testing with 12+ clinical protocols.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- Journey 1: New ICF creation (happy path)
- Journey 2: Resume/collaborate on existing project
- Journey 3: Supervisor review before PI submission

Note: Journey 4 (PI review) describes downstream workflow context but contributes no application requirements since the PI does not interact with the application directly.

**Must-Have Capabilities:**

| Capability | Rationale |
|------------|-----------|
| Protocol upload (PDF) | Entry point for new protocols |
| Protocol selection (previously uploaded) | Reuse indexed protocols |
| Outline generation with conditional sections | Intelligent structure proposal |
| Outline checklist (check/uncheck sections) | User control over structure |
| Section-by-section generation | Core value delivery |
| Section approve/edit/regenerate | Human-in-the-loop control |
| Regenerate with optional guidance | Steer LLM on regeneration with natural language |
| Direct section editing | Fallback for any AI failure |
| Open saved project (landing page) | Resume previous work |
| Save project to file (dashboard page) | Multi-session workflow support |
| Section approval tracking | Accountability documentation |
| Export final ICF (PDF, Markdown, DOCX) | Output delivery |
| Simple authentication (name + email) | User identification for approval tracking |

### Post-MVP Features

**Phase 2 (Growth):**

- Authorization and access control (API token management)
- Additional protocol formats beyond PDF
- Enhanced PDF processing for complex documents (figures, tables)

**Phase 3 (Expansion):**

- Site initiation checklist and other derivative documents
- Protocol amendment and ICF revision management
- Potential licensing to other DCCs and CROs
- Integration with clinical trial management systems

### Risk Mitigation Strategy

**Technical Risks:**

- Primary: RAG quality → Mitigated by 12+ protocol tests (90%+ confidence), direct editing fallback
- Secondary: PDF complexity → Current approach works; future processing improvements can be incorporated

**Market Risks:**

- Minimal: Internal tool for known users with direct feedback loop
- Validation: User acceptance and enthusiasm from DCC staff

**Resource Risks:**

- Clear MVP boundaries prevent scope creep
- Phased roadmap allows incremental delivery
- Fallback: manual ICF process remains available

## Functional Requirements

### Authentication & Session Management

- FR1: User can log in by entering their name and email address
- FR2: User can log out and end their session
- FR3: System identifies and tracks actions by the logged-in user's name

### Protocol Management

- FR4: Coordinator can upload a clinical protocol in PDF format
- FR5: System can extract text from an uploaded PDF protocol; if extraction fails or PDF is corrupted, system displays a user-facing error message
- FR6: System can chunk, embed, and index protocol content for intelligent retrieval; embeddings are stored in vector database (original PDF is not persistently stored)
- FR7: Coordinator can view a list of protocols that have been indexed in the vector database
- FR8: Coordinator can select a previously indexed protocol for ICF generation

### ICF Outline Management

- FR9: System can generate a proposed ICF outline from a selected protocol
- FR10: System can detect and include conditional sections (sample storage, genetic research) based on protocol content; detected sections are pre-checked in the outline
- FR11: System can detect participant age ranges and configure appropriate signature pages (adult consent, teen assent, parent permission)
- FR12: Coordinator can review the proposed ICF outline as a checklist before generation
- FR13: Coordinator can check or uncheck sections in the outline checklist to include or exclude them from generation
- FR14: System updates the outline based on coordinator's checklist selections
- FR15: Coordinator can confirm the outline checklist to proceed with section generation

### Section Generation & Review

- FR16: System can generate all ICF sections in parallel after outline confirmation; generation streams to UI in real-time
- FR17: Coordinator can view all sections on a single page and navigate freely between them; per-section controls (approve, edit, regenerate) are disabled while that section is still generating
- FR18: Coordinator can approve a section as-is
- FR19: Coordinator can directly edit any section content
- FR20: Coordinator can request regeneration of a section
- FR21: Coordinator can provide optional natural language guidance when requesting regeneration; guidance is appended to the original generation prompt
- FR22: System can regenerate a section using relevant protocol content and the original prompt
- FR23: System can regenerate a section incorporating coordinator's guidance appended to the original prompt
- FR24: Coordinator can see the status of each section (generating, ready, editing, edited, approved, error)
- FR24a: If section generation fails (LLM error, network failure, vector DB unreachable), section displays error status with explanation and a Retry button

### Project Management

- FR25: Coordinator can save an ICF project in progress to a local file (save is disabled while any section is generating)
- FR26: [REMOVED - No central project list; users manage project files via file system]
- FR27: Coordinator can open and resume a previously saved ICF project file
- FR28: [REMOVED - Single-user model; no multi-user project access required]
- FR29: Coordinator can start a new ICF project by selecting or uploading a protocol
- FR30: Coordinator can continue a saved project by clicking "Continue Saved Project" and selecting a file from their local system

### Approval Tracking

- FR31: System records approval status for each section (approver identity, date, time); last approver is recorded
- FR32: System records when a previously approved section is edited or re-approved, updating the approver to the current user
- FR33: System tracks the identity of the user who most recently approved each section
- FR34: Coordinator can approve all sections at once ("Approve All" button), which records the current user as approver for all sections
- FR35a: Approval tracking serves as internal audit trail to identify who approved each section if errors are found

### Export & Delivery

- FR35: Coordinator can export the completed ICF as a PDF document (derived from Markdown)
- FR36: Coordinator can export the completed ICF as a Markdown file (primary export format, generated by LLM)
- FR37: Coordinator can export the completed ICF as a DOCX (Word) file (derived from Markdown)
- FR38: Coordinator can save the exported ICF locally to their computer (any format)
- FR39: Exported ICF includes an approval tracking page as the final page listing each section with its approval date, time, and approver identity

### User Interface

- FR40: Application displays correctly on desktop computers
- FR41: Application displays correctly on tablets
- FR42: Application displays correctly on phones
- FR43: Section-by-section review workflow is usable on all device types

## Non-Functional Requirements

### Performance

- NFR1: Protocol upload and processing completes within 1 minute
- NFR2: Section generation begins streaming within 10 seconds of request; once streaming starts, text chunks arrive with minimal latency; section completion triggers UI state change
- NFR3: Project save/load operations complete within 5 seconds (local file I/O)
- NFR4: UI interactions (button clicks, navigation, approve/edit actions) respond within 200ms

### Security

- NFR5: All connections use HTTPS
- NFR6: Protocol index access secured via API key
- NFR7: [REMOVED - No shared persistent storage; projects saved as local files]
- NFR8: [REMOVED - No server-side session timeout needed; user controls local session]

### Integration

- NFR9: LLM API requests retry up to 3 times before displaying error to user
- NFR10: Protocol index connection failure prevents section generation; user notified with specific error message
- NFR11: PDF extraction failures display specific error identifying problematic document

### Reliability

- NFR12: Project state automatically maintained in memory during session (transparent to user)
- NFR13: Users can save project to local file from the dashboard page and resume later by opening that file
- NFR14: Save button and autosave are disabled while any section generation is in progress; no mid-generation state recovery is provided
- NFR15: If connection is lost during generation, user must re-trigger generation for incomplete sections after reconnecting
