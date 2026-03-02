import type {
  ProjectState,
  SectionStatus,
  PersistableStatus,
  ProjectFile,
} from "@/types/project";

const CURRENT_VERSION = "1.0";

/**
 * Sanitizes a string for use as a filename.
 * Replaces spaces with underscores, removes unsafe characters, and trims length.
 */
export function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 100);
  return sanitized || "project";
}

/**
 * Serializes the current project state and triggers a browser file download.
 * Uses URL.createObjectURL + anchor element pattern.
 */
export function downloadProjectFile(
  project: ProjectState,
  createdAt?: string
): void {
  const projectFile = serializeProject(project, createdAt);
  const jsonString = JSON.stringify(projectFile, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(project.protocolName || project.protocolId)}_ICF.json`;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PERSISTABLE_STATUSES: PersistableStatus[] = ["ready", "edited", "approved"];

const KNOWN_TOP_LEVEL_KEYS = new Set([
  "version",
  "protocolId",
  "protocolName",
  "createdAt",
  "lastModifiedAt",
  "outline",
  "sections",
]);

/**
 * Maps a runtime SectionStatus to a persistable status.
 * Transient states (generating, regenerating, editing, error) become "ready".
 */
export function mapToPersistableStatus(status: SectionStatus): PersistableStatus {
  if (PERSISTABLE_STATUSES.includes(status as PersistableStatus)) {
    return status as PersistableStatus;
  }
  return "ready";
}

/**
 * Extracts unknown (non-standard) top-level fields from a ProjectFile.
 * Used for forward compatibility — preserve fields added by future versions.
 */
export function extractExtraFields(
  file: Record<string, unknown>
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const key of Object.keys(file)) {
    if (!KNOWN_TOP_LEVEL_KEYS.has(key)) {
      extra[key] = file[key];
    }
  }
  return extra;
}

/**
 * Serializes in-memory ProjectState to a ProjectFile for saving to disk.
 * Pass an existing `createdAt` when re-saving to preserve the original timestamp.
 * Pass `existingFile` to preserve unknown fields from a future version (forward compatibility).
 */
export function serializeProject(
  project: ProjectState,
  createdAt?: string,
  existingFile?: Record<string, unknown>
): ProjectFile {
  const now = new Date().toISOString();
  const extraFields = existingFile ? extractExtraFields(existingFile) : {};

  return {
    ...extraFields,
    version: CURRENT_VERSION,
    protocolId: project.protocolId,
    protocolName: project.protocolName,
    createdAt: createdAt ?? now,
    lastModifiedAt: now,
    outline: project.outline
      ? {
          sections: project.outline.sections,
          confirmedAt: project.outline.confirmedAt,
          confirmedBy: { ...project.outline.confirmedBy },
        }
      : undefined,
    sections: project.sections.map((s) => {
      const section: ProjectFile["sections"][number] = {
        id: s.id,
        name: s.name,
        content: s.content,
        status: mapToPersistableStatus(s.status),
        originalPrompt: s.originalPrompt,
      };
      if (s.approval) {
        section.approval = { ...s.approval };
      }
      if (s.category) {
        section.category = s.category;
      }
      return section;
    }),
  };
}

/**
 * Deserializes a ProjectFile back into the runtime ProjectState.
 * `generatedOutline` is always null — it's a transient UI cache.
 */
export function deserializeProject(file: ProjectFile): ProjectState {
  return {
    protocolId: file.protocolId,
    protocolName: file.protocolName,
    outline: file.outline
      ? {
          sections: file.outline.sections,
          confirmedAt: file.outline.confirmedAt,
          confirmedBy: { ...file.outline.confirmedBy },
        }
      : null,
    sections: file.sections.map((s) => ({
      id: s.id,
      name: s.name,
      content: s.content,
      status: s.status,
      originalPrompt: s.originalPrompt,
      ...(s.approval ? { approval: { ...s.approval } } : {}),
      ...(s.category ? { category: s.category } : {}),
    })),
    generatedOutline: null,
  };
}

/**
 * Reads a File object, parses JSON, validates, and deserializes to ProjectState.
 * Throws on invalid JSON or validation failure. Returns warnings for version mismatch.
 */
export async function readProjectFile(
  file: File
): Promise<{ project: ProjectState; warnings?: string[] }> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid project file: not valid JSON");
  }

  const validation = validateProjectFile(parsed);
  if (!validation.valid) {
    throw new Error(
      `Invalid project file: ${validation.errors.join("; ")}`
    );
  }

  const project = deserializeProject(parsed as ProjectFile);
  return {
    project,
    ...(validation.warnings?.length ? { warnings: validation.warnings } : {}),
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validates a parsed JSON value as a ProjectFile.
 * Accepts `unknown` so callers can pass raw JSON.parse() output directly.
 * Collects all errors rather than failing on the first.
 * Unknown fields are accepted (forward compatibility).
 */
export function validateProjectFile(
  data: unknown
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { valid: false, errors: ["Input must be a JSON object"] };
  }

  const obj = data as Record<string, unknown>;

  // Required top-level fields
  if (!obj.version || typeof obj.version !== "string") {
    errors.push('Missing required field: "version"');
  }
  if (!obj.protocolId || typeof obj.protocolId !== "string") {
    errors.push('Missing required field: "protocolId"');
  }
  if (typeof obj.protocolName !== "string") {
    errors.push('Missing required field: "protocolName"');
  }
  if (!("sections" in obj)) {
    errors.push('Missing required field: "sections"');
  } else if (!Array.isArray(obj.sections)) {
    errors.push('"sections" must be an array');
  } else {
    // Validate each section
    const sections = obj.sections as Record<string, unknown>[];
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const missing: string[] = [];
      if (!s.id || typeof s.id !== "string") missing.push("id");
      if (!s.name || typeof s.name !== "string") missing.push("name");
      if (typeof s.content !== "string") missing.push("content");
      if (typeof s.originalPrompt !== "string") missing.push("originalPrompt");
      if (!s.status || typeof s.status !== "string") {
        missing.push("status");
      } else if (!PERSISTABLE_STATUSES.includes(s.status as PersistableStatus)) {
        errors.push(
          `section[${i}]: invalid status "${s.status}" (must be ready, edited, or approved)`
        );
      }
      if (missing.length > 0) {
        errors.push(`section[${i}]: missing required fields: ${missing.join(", ")}`);
      }
    }
  }

  // Version warning
  if (
    typeof obj.version === "string" &&
    obj.version !== CURRENT_VERSION
  ) {
    warnings.push(
      `Unrecognized version "${obj.version}" (current: ${CURRENT_VERSION}). File will be loaded with best effort.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
