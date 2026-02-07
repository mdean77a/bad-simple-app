# Sprint Change Proposal: Simplify Storage Architecture

**Date:** 2026-02-04
**Author:** Mikey (with BMAD Correct Course workflow)
**Status:** Approved

---

## Section 1: Issue Summary

### Problem Statement

The current architecture specifies PostgreSQL database storage and multi-user project access for an application that will be used by a single coordinator at a time, working locally. This introduces unnecessary infrastructure complexity (database hosting, migrations, session management) without delivering proportional value.

### Discovery Context

Identified during planning review before implementation began. The product owner recognized that the actual use case—coordinator saves work locally, restores from local files, no concurrent access—doesn't require shared persistent storage.

### Scope of Change

**Simplification of:**
- Storage architecture (PostgreSQL → local file system)
- User identity management (server-side sessions → client-side state)

**Unchanged:**
- Core AI generation workflow
- RAG pipeline and vector database
- Section review/approve/edit/regenerate flow
- Export functionality (PDF, Word, Markdown)

---

## Section 2: Impact Analysis

### Epic Impact

| Epic Area | Impact Level | Summary |
|-----------|--------------|---------|
| Authentication & Session | **Simplify** | Remove server-side sessions; client-side name+email only |
| Protocol Management | None | Unchanged |
| ICF Outline Management | None | Unchanged |
| Section Generation & Review | None | Unchanged |
| Project Management | **Major Modify** | Replace DB storage with local file save/load |
| Approval Tracking | **Simplify** | Store in project file; display on final ICF page |
| Export & Delivery | **Minor Modify** | Add "Save Project" alongside existing exports |
| UI/Responsive | **Minor Modify** | Add "Continue Saved Project" button to landing page |

### Artifact Conflicts

| Artifact | Conflict Level | Changes Required |
|----------|----------------|------------------|
| PRD | Medium | Modify 8 FRs, remove 2 FRs, update 4 NFRs, update Journey 2 |
| Architecture | **High** | Remove PostgreSQL, simplify sessions, new file storage pattern |
| UX Design | Medium | Remove project list, add file picker flow, add Save Project button |
| Infrastructure | Low | Simplification only (remove database setup) |

### Technical Impact

**Removed Components:**
- PostgreSQL database (local Docker + Render hosted)
- Server-side session management
- Database migrations (Alembic)
- SQLAlchemy models
- docker-compose.yml

**Added Components:**
- In-memory project state service
- Project file JSON format
- Save/load API endpoints
- File picker integration (frontend)

---

## Section 3: Recommended Approach

### Selected Path: Direct Adjustment

Update planning documents to reflect simplified architecture before implementation begins.

### Rationale

| Factor | Assessment |
|--------|------------|
| Implementation effort | **Reduced** - Less infrastructure to build |
| Timeline impact | **Positive** - Faster to implement |
| Technical risk | **Reduced** - No database = fewer failure points |
| Complexity | **Reduced** - Simpler architecture |
| Infrastructure cost | **Reduced** - No database hosting fees |
| Core value delivery | **Unchanged** - Same AI generation capability |
| User experience | **Simplified** - Familiar file save/open pattern |

### Trade-offs Accepted

| Trade-off | Mitigation |
|-----------|------------|
| No central project list | Users manage files like Word/Excel documents (familiar pattern) |
| No multi-user simultaneous access | Not needed per requirements; file sharing via network/email |
| No automatic cloud backup | Users responsible for file backup (standard for local files) |

---

## Section 4: Detailed Change Proposals

### PRD Changes

#### FR25-30 (Project Management)

**OLD:**
- FR25: Coordinator can save an ICF project in progress at any point
- FR26: Coordinator can view a list of all saved ICF projects
- FR27: Coordinator can resume a previously saved ICF project
- FR28: Any logged-in user can open and continue work on any saved project
- FR29: Coordinator can start a new ICF project
- FR30: Coordinator can choose between starting a new project or continuing an existing project upon login

**NEW:**
- FR25: Coordinator can save an ICF project in progress to a local file at any point
- FR26: [REMOVED - No central project list; users manage project files via file system]
- FR27: Coordinator can open and resume a previously saved ICF project file
- FR28: [REMOVED - Single-user model; no multi-user project access required]
- FR29: Coordinator can start a new ICF project by selecting or uploading a protocol
- FR30: Coordinator can continue a saved project by clicking "Continue Saved Project" and selecting a file from their local system

#### NFR Changes

**OLD:**
- NFR2: Section generation streams text with < 100ms latency...
- NFR3: Project save/load operations complete within 20 seconds
- NFR7: Project data stored in shared persistent storage to enable multi-user access
- NFR8: Session auto-logout after 3 minutes of inactivity following ICF download
- NFR12: Auto-save triggers after each section approval or edit
- NFR13: Users can resume from last auto-saved state after unexpected interruption

**NEW:**
- NFR2: Section generation begins streaming within 10 seconds of request; once streaming starts, text chunks arrive with minimal latency
- NFR3: Project save/load operations complete within 5 seconds (local file I/O)
- NFR7: [REMOVED - No shared persistent storage; projects saved as local files]
- NFR8: [REMOVED - No server-side session timeout needed]
- NFR12: Project state automatically maintained in memory during session (transparent to user)
- NFR13: Users can save project to local file from the dashboard page and resume later by opening that file

#### Journey 2 Update

Updated to reflect file-based sharing: Maria gets Tom's project file from shared network folder, opens via "Continue Saved Project" button.

#### MVP Capabilities Update

- Added: "Open saved project from landing page" and "Save project to file from dashboard page"
- Removed: "Project listing and selection" and "Multi-user project access"

---

### Architecture Changes

#### Core Decisions

| Category | Old | New |
|----------|-----|-----|
| Data Persistence | PostgreSQL | Local file system (JSON) |
| Session Management | Server-side in PostgreSQL | Client-side React context |

#### Data Architecture

**Project File Format (JSON):**
```json
{
  "version": "1.0",
  "protocolId": "string",
  "protocolName": "string",
  "createdAt": "ISO8601",
  "lastModifiedAt": "ISO8601",
  "outline": {
    "sections": ["Purpose", "Procedures", ...],
    "confirmedAt": "ISO8601",
    "confirmedBy": { "name": "string", "email": "string" }
  },
  "sections": [
    {
      "id": "string",
      "name": "string",
      "content": "string",
      "status": "generating|ready|approved",
      "approval": {
        "userName": "string",
        "userEmail": "string",
        "timestamp": "ISO8601"
      }
    }
  ]
}
```

#### API Endpoints

**Removed:**
- `POST /api/v1/auth/login` - No server-side sessions
- `POST /api/v1/auth/logout` - No server-side sessions
- `GET /api/v1/projects` - No central project list
- `POST /api/v1/projects` - Implicit on outline generation

**Added:**
- `POST /api/v1/project/load` - Load project from uploaded JSON file
- `GET /api/v1/project/save` - Get current project state as JSON

#### Directory Structure

**Removed:**
- `backend/src/database.py`
- `backend/src/services/session_service.py`
- `backend/src/models/session.py`
- `backend/alembic/` directory
- `docker-compose.yml`

**Added:**
- `backend/src/services/project_state.py` - In-memory state management

---

### UX Design Changes

#### Landing Page

Three user actions (no explicit "New vs Continue" choice):
1. Upload new protocol → New project
2. Select existing protocol from dropdown → New project
3. Click "Continue Saved Project" → File picker → Load existing project

#### Action Bar (Dashboard)

Added "Save Project" button:
- Position: Between "Approve All Sections" and export buttons
- Enabled: Only after all sections have completed generation
- Behavior: Downloads project JSON file to local system

#### Removed Components

- **Project Card** - No central project list
- **Project List** - Users manage files locally

---

## Section 5: Implementation Handoff

### Change Scope Classification

**Moderate** - Document updates across multiple artifacts, but no code rollback needed (pre-implementation timing).

### Handoff Recipients

| Role | Responsibility | Deliverables |
|------|----------------|--------------|
| PM Agent | Update PRD | Revised PRD with updated FRs, NFRs, Journeys |
| Architect Agent | Update Architecture | Revised Architecture with file storage pattern |
| UX Designer Agent | Update UX Specification | Revised UX with new landing page flow, Save button |
| SM Agent | Update Epics/Stories | Revised stories reflecting simplified scope |

### Execution Order

1. PM updates PRD (requirements source of truth)
2. Architect updates Architecture (can parallel with #1)
3. UX Designer updates UX Specification (can parallel with #1)
4. SM updates Epics/Stories (after PRD finalized)

### Success Criteria

- [ ] All planning documents updated with approved changes
- [ ] No references to PostgreSQL, server-side sessions, or multi-user access remain
- [ ] New file-based workflow clearly documented
- [ ] Stories updated to reflect simplified scope
- [ ] Implementation can proceed with clear, consistent guidance

---

## Approval

**Approved by:** Mikey
**Approval date:** 2026-02-04
**Approval method:** Incremental review of each change proposal

---

## Appendix: Change Proposal Log

| # | Document | Section | Status |
|---|----------|---------|--------|
| 1 | PRD | FR25-30 | Approved |
| 2 | PRD | NFR2, NFR3, NFR7, NFR8, NFR12, NFR13 | Approved |
| 3 | PRD | Journey 2 | Approved |
| 4 | PRD | Journey Requirements Summary | Approved |
| 5 | PRD | MVP Scope & Feature Set | Approved |
| 6 | Architecture | Core Decisions Table | Approved |
| 7 | Architecture | Data Architecture | Approved |
| 8 | Architecture | Authentication | Approved |
| 9 | Architecture | API Endpoints | Approved |
| 10 | Architecture | Backend Directory Structure | Approved |
| 11 | Architecture | Root Directory | Approved |
| 12 | Architecture | Service Boundaries & Data Flow | Approved |
| 13 | Architecture | Starter Template & Config | Approved |
| 14 | UX Design | New ICF Creation Flow | Approved |
| 15 | UX Design | Resume/Continue Flow | Approved |
| 16 | UX Design | Project Card (Remove) | Approved |
| 17 | UX Design | Action Bar (Add Save) | Approved |
| 18 | UX Design | Component Roadmap | Approved |
