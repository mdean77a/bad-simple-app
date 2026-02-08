# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a BMAD (Build, Measure, Analyze, Deliver) framework project. BMAD provides AI-assisted product development workflows through specialized agents and structured processes. The project uses Python 3.13+ with uv for package management.

## Project Structure

- `_bmad/` - BMAD framework installation
  - `core/` - Core BMAD functionality (agents, workflows, resources)
  - `bmm/` - BMM module (Business, Marketing, Management workflows)
  - `_config/` - Manifests and agent customization files
  - `_memory/` - Persistent context storage
- `_bmad-output/` - Generated artifacts (planning-artifacts, implementation-artifacts)

## BMAD Workflows

The framework uses slash commands mapped to workflows in `.claude/commands/`. Key workflows:

**Analysis Phase:**
- `create-product-brief` - Collaborative product vision discovery
- `research` - Market, technical, and domain research

**Planning Phase:**
- `create-prd` - Create/validate/edit PRDs
- `create-ux-design` - UX patterns and design system
- `create-architecture` - System architecture decisions
- `create-epics-and-stories` - Break PRD into implementable stories

**Implementation Phase:**
- `create-story` - Create next user story from epics
- `dev-story` - Execute story implementation
- `code-review` - Adversarial code review
- `sprint-planning` / `sprint-status` - Sprint management

**Quick Flow (lighter process):**
- `quick-spec` - Conversational spec engineering
- `quick-dev` - Flexible development execution

## BMAD Agents

Agents are activated via slash commands (`/bmad-agent-*`). Each has a specific persona:
- `bmad-master` (🧙) - Master orchestrator, main entry point
- `analyst` (📊 Mary) - Business analysis, requirements
- `pm` (📋 John) - Product management, PRD creation
- `architect` (🏗️ Winston) - System architecture
- `dev` (💻 Amelia) - Story implementation
- `sm` (🏃 Bob) - Scrum master, story preparation
- `ux-designer` (🎨 Sally) - UX design
- `tech-writer` (📚 Paige) - Documentation
- `quinn` (🧪) - QA/test automation
- `quick-flow-solo-dev` (🚀 Barry) - Quick flow development

## Working with BMAD

When executing BMAD workflows:
1. Load configuration from `_bmad/*/config.yaml` to get user preferences
2. Follow step files sequentially - never skip or load multiple steps
3. Output artifacts to configured `output_folder` (`_bmad-output/`)
4. Use `communication_language` from config (English by default)
5. Run `/bmad-help` to get guidance on next steps

## Commands

```bash
# Python environment (uses uv)
uv sync                    # Install dependencies
uv run python <script>     # Run Python scripts
```

## Configuration

User settings in `_bmad/core/config.yaml`:
- `user_name`: Mikey
- `communication_language`: English
- `output_folder`: `{project-root}/_bmad-output`

## Development Workflow

### Branching Strategy

- **Always create a new branch before starting any story**
- **Never develop directly on `main`**
- Branch naming: `story-X.Y-short-description` (e.g., `story-1.1-nextjs-setup`)
- **Always use `git merge --no-ff`** to preserve branch history (no fast-forward)

### Testing Requirements

- **Minimum 80% unit test coverage** for both:
  - Python code (backend)
  - TypeScript code (frontend)
- All tests must pass before handoff for review

### Review Process

1. Implement the story
2. Write unit tests meeting coverage requirements
3. Run all tests and confirm passing
4. Summarize files added/modified for user review
5. User reviews and potentially refactors code
6. User gives instructions to push branch

### CI/CD Pipeline

- **Branch push** → Vercel preview build (Render presumably similar)
- **Merge to main** → Production builds in Vercel and Render
- GitHub repo required before first push
