---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - /Users/jmichaeldean/Downloads/PRECISE_PPF_TeenAssent_Template_27Oct2021 (2).pdf
date: 2026-02-02
author: Mikey
---

# Product Brief: bmad-simple-app

## Executive Summary

bmad-simple-app addresses a critical bottleneck in clinical trial implementation: the creation of Informed Consent Forms (ICF) from clinical protocols. Currently, research coordinators spend weeks in back-and-forth iterations with principal investigators to produce compliant, accurate ICFs - a process that can delay trial timelines by up to ten weeks. This application uses AI to generate section-by-section ICF drafts from uploaded protocols, enabling coordinators to review, edit, or regenerate each section before final approval. By producing medically accurate content on the first pass, the tool reduces ICF creation time from weeks to hours while maintaining the human oversight and accountability required in regulated clinical research.

---

## Core Vision

### Problem Statement

Clinical trial implementation is delayed by the manual, iterative process of creating Informed Consent Forms. Research coordinators - who excel at regulatory compliance and patient-facing communication but lack medical training - must translate sophisticated clinical protocols into ICF documents. Principal investigators must review these drafts but are time-constrained, creating bottlenecks where coordinators wait days or weeks for feedback on medical accuracy issues they cannot self-identify.

### Problem Impact

- Trial timelines delayed by up to ten weeks for ICF creation alone
- Research coordinators stuck in frustrating reminder cycles with busy PIs
- PI time consumed by detailed reviews that could be quick verifications
- Competitive disadvantage for coordinating centers without efficient processes
- Ultimately: delayed patient enrollment and slower advancement of clinical research

### Why Existing Solutions Fall Short

No purpose-built tools exist for AI-assisted ICF generation. The process remains manual industry-wide. While foundation models like Claude can produce generic informed consent language through chat interfaces, they fail in this regulated context because:
- Feeding entire protocols causes context degradation ("context rot"), reducing accuracy for specific sections
- No mechanism for section-by-section human review and approval
- No source attribution to eliminate hallucination concerns
- No workflow integration for coordinator-PI collaboration

### Proposed Solution

An application that accepts clinical protocol uploads and generates ICF sections using RAG-based retrieval to focus the model on section-relevant protocol content. The system uses a fixed section structure following established regulatory standards, with conditional inclusion of sample storage and genetic research sections based on protocol content detection. Participant age ranges specified in the protocol determine signature page configuration (adult consent vs. parent permission with teen assent). Site-specific sections are generated with placeholders for institutional data such as PI contact information and IRB details.

**Draft Outline Review:** Before full generation, the AI analyzes the protocol and proposes an ICF structure - identifying which sections to include and which optional sections (sample storage, genetic research) are required. The coordinator reviews and confirms this outline before proceeding.

**Section-by-Section Generation:** The research coordinator reviews each generated section with options to approve, edit, or regenerate. The AI focuses on medically-accurate content translation from the protocol, while regulatory boilerplate and patient-facing tone refinements remain within the coordinator's expertise.

**Final Approval:** Once all sections are approved, the complete ICF is saved locally or emailed directly to the principal investigator for signature approval before IRB submission.

### Human Accountability Model

The application operates within a regulated framework where the research coordinator and principal investigator bear full responsibility for the final ICF - identical to their accountability when drafting manually. The AI accelerates initial draft creation; human expertise ensures accuracy.

- The coordinator has read the protocol and can identify if the AI misinterprets content
- The PI is an expert on the protocol (often helped write it) and can catch missed risks or inaccuracies
- Any hallucinations or errors are corrected through human editing
- The humans are responsible for the final document, not the AI

### Approval Workflow

- **Section-level approval tracking** - records who approved each section, date, and timestamp
- **Draft outline confirmation** - coordinator approves proposed ICF structure before full generation
- **PI signature gate** - final ICF requires principal investigator signature approval before IRB submission
- **IRB-ready documentation** - complete audit trail of generation, review, and approval decisions

### Scope Boundaries

- **In scope:** Initial ICF generation from clinical protocol
- **Out of scope:** Ongoing ICF maintenance, protocol amendment handling, ICF revision management (handled manually outside the application)

### Key Differentiators

- **Section-by-section generation with human-in-the-loop approval** - meets regulatory requirements for oversight in clinical research
- **RAG architecture** - prevents context rot by retrieving section-specific protocol content rather than processing the entire document
- **Source attribution** - citations back to protocol sections support human review and catch potential issues
- **Intelligent conditional sections** - automatically detects sample storage and genetic research requirements from protocol and includes relevant sections in correct order
- **Draft outline review** - human-in-the-loop confirmation of ICF structure before full generation
- **Comprehensive audit trail** - section-level approval tracking with timestamps for regulatory documentation
- **Domain expertise** - built by a coordinating center with 100+ trial implementations, not generic AI tooling
- **First-mover advantage** - no competing solutions exist; AI engineering talent is scarce in clinical trials, creating a multi-year replication barrier
- **Standard ICF structure** - fixed section ordering follows regulatory standards, with signature page variations based on participant population

---

## Target Users

### Primary Users

**Research Coordinator (Primary User)**

Research coordinators at academic data coordinating centers who manage ICF creation across multiple clinical trials. These professionals have deep expertise in clinical trial operations, informed consent requirements, and IRB regulatory compliance. They prepare IRB applications and understand what makes a compliant, effective consent document.

**Key Characteristics:**
- Experienced in clinical trial workflows and regulatory requirements
- Skilled at reading and understanding complex clinical protocols
- NOT expected to have AI prompt engineering skills
- Work across multiple trials simultaneously (NIH-funded, pharmaceutical, medical device)

**Current Pain:**
- Manually writing an ICF takes approximately one week for an experienced coordinator
- Initial drafts often require multiple revision cycles with busy PIs
- Poor-quality drafts waste PI time and extend timelines by weeks
- No existing tools bridge the gap between their domain expertise and AI capabilities

**Success Vision:**
- Generate a high-quality ICF draft in one to two minutes instead of one week
- Produce drafts excellent enough for first-pass PI approval
- Maintain control over the document through outline review and section-by-section approval
- Never need to write sophisticated AI prompts or understand LLM mechanics

### Secondary Users

**Principal Investigator (Downstream Customer)**

The PI receives the completed ICF draft for review and signature approval before IRB submission. They do not interact with the application directly. As protocol experts (often having written or contributed to the protocol), PIs can quickly verify medical accuracy when provided with a high-quality first draft. Their primary need is receiving drafts that require minimal correction.

**Research Sponsors & Enrolling Institutions (Trust Stakeholders)**

While not direct users, sponsors (NIH, pharmaceutical companies, device manufacturers) and enrolling clinical sites are customers of the data coordinating center. They need confidence that AI-assisted ICF generation maintains accuracy and regulatory compliance. This requires:
- Clear documentation of how AI is used in the process
- Source attribution demonstrating content derives from the protocol
- Audit trails showing human review and approval at each step

### User Journey

**1. Protocol Receipt & Understanding**
Coordinator receives funded protocol and reads it thoroughly to understand the study design, procedures, risks, and participant population.

**2. Protocol Upload or Selection**
Coordinator either uploads the protocol to the application or selects from a list of previously uploaded protocols.

**3. Outline Review & Correction**
Application analyzes the protocol and proposes an ICF outline identifying required sections. Coordinator reviews and provides natural language corrections (e.g., "delete the genetics section", "we will need a teen assent signature page") until the outline matches their requirements.

**4. Section-by-Section Generation & Review**
Application generates all ICF sections. Coordinator reviews each section individually with options to:
- Approve the section as-is
- Edit the content directly
- Regenerate the section with guidance

**5. Final Assembly & Export**
Once all sections are approved, coordinator exports the complete ICF by:
- Saving locally to their computer
- Emailing directly to the PI or other stakeholders

**6. PI Review & Approval**
PI receives the draft ICF (protocol already in hand), reviews for medical accuracy, and provides signature approval for IRB submission.

---

## Success Metrics

### User Success Metrics

**Research Coordinator Experience:**
- ICF draft generation time reduced from one week to one-two minutes
- Reduced revision cycles with principal investigators
- Decreased frustration from PI reminder cycles and waiting periods
- Increased capacity to handle concurrent trial startups

**Quality Indicators:**
- PI approval rate on first ICF submission (target: majority approved with minor or no changes)
- IRB acceptance without modification requests related to AI-generated content
- Coordinator confidence in generated drafts (willing to send to PI without extensive manual revision)

### Business Objectives

**Operational Efficiency:**
- Contribute to reducing overall clinical trial startup time from approximately one year to two months
- Enable coordinators to manage more concurrent trial startups without proportional time increase
- Establish repeatable, quality-controlled process for AI-assisted document generation

**Competitive Advantage:**
- Faster turnaround attracts sponsors seeking efficient data coordinating center partnerships
- Demonstrate innovation leadership in clinical trial operations
- Build internal expertise in AI-assisted clinical research workflows

**Sustainability Model:**
- Tool maintenance and improvement costs budgeted into clinical trial budgets
- Self-sustaining operation without requiring external commercialization
- Future potential for licensing to other institutions (not a launch requirement)

### Key Performance Indicators

**MVP Validation KPIs:**
- Number of ICFs successfully generated and approved by PI
- Stakeholder satisfaction (coordinator, DCC staff, PI feedback on output quality)
- Iteration cycles required: context management adjustments needed before stakeholder acceptance

**Quality KPIs:**
- First-pass PI approval rate (percentage of ICFs approved without major revisions)
- Time from protocol receipt to PI-approved ICF draft
- Source attribution accuracy (citations correctly reference protocol sections)

**Strategic KPIs:**
- Reduction in overall trial startup timeline attributable to ICF process improvement
- Platform extensibility validated (architecture supports adding future document types such as site initiation checklists)

### MVP Success Threshold

The MVP is validated when:
- DCC coordinators, staff, and PIs have critiqued outputs and provided feedback
- Context management has been refined (prompt optimization, PDF processing, retrieval accuracy)
- All DCC stakeholders are satisfied with ICF draft quality
- The tool reliably produces drafts that PIs approve with minimal revision

---

## MVP Scope

### Core Features

**Protocol Upload & Processing**
- Upload clinical protocol document (PDF format only)
- Process protocol into vector database for RAG-based retrieval
- No persistent storage of original protocol documents required

**Outline Generation & Review**
- AI analyzes protocol to propose ICF structure with required sections
- Automatic detection of conditional sections (sample storage, genetic research, teen assent)
- Coordinator reviews proposed outline
- Natural language corrections to adjust outline (e.g., "delete the genetics section", "we will need a teen assent signature page")

**Section-by-Section Generation & Review**
- Generate all ICF sections after outline approval
- Coordinator reviews each section individually
- Options for each section: approve as-is, edit directly, or regenerate with guidance
- Standard ICF structure with fixed section ordering

**Export & Delivery**
- Save completed ICF locally to coordinator's computer
- Email ICF directly to PI or other stakeholders

**Authentication**
- Simple login with user name and email address
- No complex authorization for MVP (access control deferred)

**Approval Tracking**
- Record section approvals: logged-in user's name, date, and time for each section
- Approval record printed as final page of ICF document (following last signature page)

### Out of Scope for MVP

**Deferred Protocol Features**
- Multiple protocol formats (MVP supports PDF only)
- Protocol amendment handling
- Protocol versioning
- Protocol document storage/library management

**Deferred ICF Features**
- Ongoing ICF maintenance after initial creation
- ICF revision management
- Multiple ICF templates (MVP uses standard structure only)

**Deferred Technical Features**
- Authorization and access control (API token management)
- Source attribution/traceability within generated content (handled externally via LangSmith or similar)
- Advanced user management and role-based permissions

**Deferred Business Features**
- Other derivative documents (site initiation checklist, etc.)
- Multi-institution support
- Licensing or commercialization features

### MVP Success Criteria

The MVP is considered successful when:
- Coordinators can generate complete ICF drafts from uploaded protocols
- Generated drafts are high enough quality for first-pass PI approval with minimal revision
- DCC coordinators, staff, and PIs have reviewed outputs and confirmed satisfaction
- Context management (prompts, PDF processing, retrieval) has been refined based on stakeholder feedback
- Approval tracking produces acceptable regulatory documentation

### Future Vision

**Near-Term Enhancements (Post-MVP)**
- Authorization and access control to manage API token consumption
- Additional derivative documents starting with site initiation checklist
- Enhanced traceability integration with LangSmith or similar tools
- Support for protocol amendments and ICF revisions

**Long-Term Platform Vision**
- Comprehensive clinical trial document generation platform
- Multiple derivative artifact types from single protocol upload
- Potential licensing to other data coordinating centers and CROs
- Integration with clinical trial management systems
- Multi-institution deployment with centralized administration
