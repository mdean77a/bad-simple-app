# Story 9.4: Persist Vendor/Model in Project File

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **research coordinator**,
I want **my vendor and model choice saved in the project file**,
So that **when I reopen a project, it remembers which AI provider I was using**.

## Acceptance Criteria

1. **Given** I have selected OpenAI as the vendor and gpt-5.1 as the model, **When** I save the project, **Then** the project file includes `"llmProvider": "openai"` and `"llmModel": "gpt-5.1"` (FR47)
2. **Given** I open a saved project that has `llmProvider` and `llmModel` fields, **When** the project loads, **Then** the ProjectProvider state has the saved provider and model (FR47)
3. **Given** I open a saved project from before Epic 9 (no `llmProvider`/`llmModel` fields), **When** the project loads, **Then** the vendor defaults to "anthropic" and model defaults to "claude-sonnet-4-6" and no error is shown (backward compatibility)
4. **Given** the project file version, **When** saving with vendor/model fields, **Then** the version is `"1.1"`

## Tasks / Subtasks

- [ ] Task 1: Add `llmProvider` and `llmModel` to `ProjectFile` type in `types/project.ts`
- [ ] Task 2: Update `CURRENT_VERSION` to `"1.1"` and add to `KNOWN_TOP_LEVEL_KEYS` in `projectFile.ts`
- [ ] Task 3: Update `serializeProject()` to include `llmProvider`/`llmModel`
- [ ] Task 4: Update `deserializeProject()` to read `llmProvider`/`llmModel` with defaults
- [ ] Task 5: Add tests for save/load with vendor/model, backward compatibility with v1.0 files

## References

- [Source: frontend/src/lib/projectFile.ts — serialize/deserialize]
- [Source: frontend/src/types/project.ts — ProjectFile type]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 9.4]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
