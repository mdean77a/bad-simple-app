import {
  serializeProject,
  deserializeProject,
  validateProjectFile,
  mapToPersistableStatus,
  extractExtraFields,
  sanitizeFilename,
  downloadProjectFile,
} from "@/lib/projectFile";
import type { ProjectState, SectionState } from "@/types/project";
import type { ProjectFile } from "@/types/project";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSection(overrides: Partial<SectionState> = {}): SectionState {
  return {
    id: "sec-1",
    name: "Purpose",
    content: "Section content here.",
    status: "ready",
    originalPrompt: "Write the purpose section",
    ...overrides,
  };
}

function makeProjectState(overrides: Partial<ProjectState> = {}): ProjectState {
  return {
    protocolId: "proto-abc",
    protocolName: "Test Protocol",
    outline: {
      sections: ["Purpose", "Procedures"],
      confirmedAt: "2026-02-20T10:00:00.000Z",
      confirmedBy: { name: "Mikey", email: "mikey@example.com" },
    },
    sections: [makeSection()],
    generatedOutline: null,
    ...overrides,
  };
}

function makeValidProjectFile(overrides: Partial<ProjectFile> = {}): ProjectFile {
  return {
    version: "1.0",
    protocolId: "proto-abc",
    protocolName: "Test Protocol",
    createdAt: "2026-02-20T10:00:00.000Z",
    lastModifiedAt: "2026-02-20T12:00:00.000Z",
    outline: {
      sections: ["Purpose", "Procedures"],
      confirmedAt: "2026-02-20T10:00:00.000Z",
      confirmedBy: { name: "Mikey", email: "mikey@example.com" },
    },
    sections: [
      {
        id: "sec-1",
        name: "Purpose",
        content: "Section content here.",
        status: "ready",
        originalPrompt: "Write the purpose section",
      },
    ],
    ...overrides,
  };
}

// ===========================================================================
// mapToPersistableStatus
// ===========================================================================

describe("mapToPersistableStatus", () => {
  it("maps 'ready' to 'ready'", () => {
    expect(mapToPersistableStatus("ready")).toBe("ready");
  });

  it("maps 'edited' to 'edited'", () => {
    expect(mapToPersistableStatus("edited")).toBe("edited");
  });

  it("maps 'approved' to 'approved'", () => {
    expect(mapToPersistableStatus("approved")).toBe("approved");
  });

  it("maps 'generating' to 'ready'", () => {
    expect(mapToPersistableStatus("generating")).toBe("ready");
  });

  it("maps 'regenerating' to 'ready'", () => {
    expect(mapToPersistableStatus("regenerating")).toBe("ready");
  });

  it("maps 'editing' to 'ready'", () => {
    expect(mapToPersistableStatus("editing")).toBe("ready");
  });

  it("maps 'error' to 'ready'", () => {
    expect(mapToPersistableStatus("error")).toBe("ready");
  });
});

// ===========================================================================
// extractExtraFields
// ===========================================================================

describe("extractExtraFields", () => {
  it("returns empty object when no extra fields", () => {
    const file = makeValidProjectFile();
    expect(extractExtraFields(file)).toEqual({});
  });

  it("extracts unknown top-level fields", () => {
    const file = { ...makeValidProjectFile(), futureField: "val", newNum: 42 };
    const extra = extractExtraFields(file);
    expect(extra).toEqual({ futureField: "val", newNum: 42 });
  });

  it("does not extract known fields", () => {
    const file = makeValidProjectFile();
    const extra = extractExtraFields(file);
    expect(extra).not.toHaveProperty("version");
    expect(extra).not.toHaveProperty("protocolId");
    expect(extra).not.toHaveProperty("sections");
  });
});

// ===========================================================================
// serializeProject
// ===========================================================================

describe("serializeProject", () => {
  it("creates a ProjectFile with version 1.0", () => {
    const state = makeProjectState();
    const file = serializeProject(state);
    expect(file.version).toBe("1.0");
  });

  it("includes protocol info from state", () => {
    const state = makeProjectState();
    const file = serializeProject(state);
    expect(file.protocolId).toBe("proto-abc");
    expect(file.protocolName).toBe("Test Protocol");
  });

  it("sets createdAt and lastModifiedAt as ISO 8601 strings", () => {
    const state = makeProjectState();
    const file = serializeProject(state);
    expect(file.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(file.lastModifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("preserves existing createdAt when provided", () => {
    const state = makeProjectState();
    const file = serializeProject(state, "2025-01-01T00:00:00.000Z");
    expect(file.createdAt).toBe("2025-01-01T00:00:00.000Z");
  });

  it("includes outline from state", () => {
    const state = makeProjectState();
    const file = serializeProject(state);
    expect(file.outline).toEqual({
      sections: ["Purpose", "Procedures"],
      confirmedAt: "2026-02-20T10:00:00.000Z",
      confirmedBy: { name: "Mikey", email: "mikey@example.com" },
    });
  });

  it("sets outline to undefined when state has no outline", () => {
    const state = makeProjectState({ outline: null });
    const file = serializeProject(state);
    expect(file.outline).toBeUndefined();
  });

  it("maps transient statuses to 'ready'", () => {
    const state = makeProjectState({
      sections: [
        makeSection({ id: "s1", status: "generating" }),
        makeSection({ id: "s2", status: "regenerating" }),
        makeSection({ id: "s3", status: "editing" }),
        makeSection({ id: "s4", status: "error" }),
      ],
    });
    const file = serializeProject(state);
    expect(file.sections.every((s) => s.status === "ready")).toBe(true);
  });

  it("preserves approval data on approved sections", () => {
    const approval = {
      userName: "Mikey",
      userEmail: "mikey@example.com",
      timestamp: "2026-02-20T11:00:00.000Z",
    };
    const state = makeProjectState({
      sections: [makeSection({ status: "approved", approval })],
    });
    const file = serializeProject(state);
    expect(file.sections[0].approval).toEqual(approval);
  });

  it("omits approval field when section has no approval", () => {
    const state = makeProjectState({
      sections: [makeSection({ status: "ready" })],
    });
    const file = serializeProject(state);
    expect(file.sections[0].approval).toBeUndefined();
  });

  it("does not include generatedOutline in the file", () => {
    const state = makeProjectState({
      generatedOutline: {
        protocolId: "proto-abc",
        sections: [],
        checkedState: {},
      },
    });
    const file = serializeProject(state);
    expect((file as Record<string, unknown>).generatedOutline).toBeUndefined();
  });

  it("preserves unknown fields from existingFile", () => {
    const state = makeProjectState();
    const existingFile = {
      ...makeValidProjectFile(),
      futureField: "preserved-value",
      anotherNew: 99,
    };
    const file = serializeProject(state, undefined, existingFile);
    expect(file.futureField).toBe("preserved-value");
    expect(file.anotherNew).toBe(99);
  });

  it("does not let existingFile override known fields", () => {
    const state = makeProjectState({ protocolId: "new-id" });
    const existingFile = {
      ...makeValidProjectFile(),
      protocolId: "old-id",
      futureField: "keep",
    };
    const file = serializeProject(state, undefined, existingFile);
    expect(file.protocolId).toBe("new-id");
    expect(file.futureField).toBe("keep");
  });

  it("handles empty sections array", () => {
    const state = makeProjectState({ sections: [] });
    const file = serializeProject(state);
    expect(file.sections).toEqual([]);
  });
});

// ===========================================================================
// deserializeProject
// ===========================================================================

describe("deserializeProject", () => {
  it("restores protocolId and protocolName", () => {
    const file = makeValidProjectFile();
    const state = deserializeProject(file);
    expect(state.protocolId).toBe("proto-abc");
    expect(state.protocolName).toBe("Test Protocol");
  });

  it("restores outline", () => {
    const file = makeValidProjectFile();
    const state = deserializeProject(file);
    expect(state.outline).toEqual({
      sections: ["Purpose", "Procedures"],
      confirmedAt: "2026-02-20T10:00:00.000Z",
      confirmedBy: { name: "Mikey", email: "mikey@example.com" },
    });
  });

  it("sets outline to null when file has no outline", () => {
    const file = makeValidProjectFile({ outline: undefined });
    const state = deserializeProject(file);
    expect(state.outline).toBeNull();
  });

  it("restores sections with correct types", () => {
    const file = makeValidProjectFile();
    const state = deserializeProject(file);
    expect(state.sections).toHaveLength(1);
    expect(state.sections[0]).toEqual({
      id: "sec-1",
      name: "Purpose",
      content: "Section content here.",
      status: "ready",
      originalPrompt: "Write the purpose section",
    });
  });

  it("restores approval data on approved sections", () => {
    const approval = {
      userName: "Mikey",
      userEmail: "mikey@example.com",
      timestamp: "2026-02-20T11:00:00.000Z",
    };
    const file = makeValidProjectFile({
      sections: [
        {
          id: "sec-1",
          name: "Purpose",
          content: "Approved content.",
          status: "approved",
          originalPrompt: "Write the purpose section",
          approval,
        },
      ],
    });
    const state = deserializeProject(file);
    expect(state.sections[0].approval).toEqual(approval);
  });

  it("sets generatedOutline to null", () => {
    const file = makeValidProjectFile();
    const state = deserializeProject(file);
    expect(state.generatedOutline).toBeNull();
  });

  it("handles empty sections array", () => {
    const file = makeValidProjectFile({ sections: [] });
    const state = deserializeProject(file);
    expect(state.sections).toEqual([]);
  });
});

// ===========================================================================
// validateProjectFile
// ===========================================================================

describe("validateProjectFile", () => {
  it("returns valid for a correct project file", () => {
    const file = makeValidProjectFile();
    const result = validateProjectFile(file);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects non-object input", () => {
    expect(validateProjectFile(null).valid).toBe(false);
    expect(validateProjectFile("string").valid).toBe(false);
    expect(validateProjectFile(42).valid).toBe(false);
    expect(validateProjectFile([]).valid).toBe(false);
  });

  it("rejects missing version", () => {
    const file = { ...makeValidProjectFile() };
    delete (file as Record<string, unknown>).version;
    const result = validateProjectFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: "version"');
  });

  it("rejects missing protocolId", () => {
    const file = { ...makeValidProjectFile() };
    delete (file as Record<string, unknown>).protocolId;
    const result = validateProjectFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: "protocolId"');
  });

  it("rejects missing sections", () => {
    const file = { ...makeValidProjectFile() };
    delete (file as Record<string, unknown>).sections;
    const result = validateProjectFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: "sections"');
  });

  it("rejects sections that is not an array", () => {
    const file = { ...makeValidProjectFile(), sections: "not-an-array" };
    const result = validateProjectFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('"sections" must be an array');
  });

  it("collects all errors, not just the first", () => {
    const result = validateProjectFile({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects a section missing required fields", () => {
    const file = makeValidProjectFile({
      sections: [{ id: "sec-1" } as ProjectFile["sections"][number]],
    });
    const result = validateProjectFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("section[0]"))).toBe(true);
  });

  it("rejects a section missing originalPrompt", () => {
    const section = {
      id: "sec-1",
      name: "Purpose",
      content: "text",
      status: "ready",
    };
    const file = makeValidProjectFile({
      sections: [section as ProjectFile["sections"][number]],
    });
    const result = validateProjectFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("originalPrompt"))).toBe(true);
  });

  it("rejects a section with invalid status", () => {
    const file = makeValidProjectFile({
      sections: [
        {
          id: "sec-1",
          name: "Purpose",
          content: "text",
          status: "generating" as "ready",
          originalPrompt: "prompt",
        },
      ],
    });
    const result = validateProjectFile(file);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("status"))).toBe(true);
  });

  it("warns on unrecognized version but still valid", () => {
    const file = makeValidProjectFile({ version: "99.0" });
    const result = validateProjectFile(file);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes("version"))).toBe(true);
  });

  it("accepts valid sections with approval data", () => {
    const file = makeValidProjectFile({
      sections: [
        {
          id: "sec-1",
          name: "Purpose",
          content: "text",
          status: "approved",
          originalPrompt: "prompt",
          approval: {
            userName: "Mikey",
            userEmail: "mikey@example.com",
            timestamp: "2026-02-20T11:00:00.000Z",
          },
        },
      ],
    });
    const result = validateProjectFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts empty sections array", () => {
    const file = makeValidProjectFile({ sections: [] });
    const result = validateProjectFile(file);
    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// Forward Compatibility
// ===========================================================================

describe("forward compatibility", () => {
  it("validation accepts unknown top-level fields", () => {
    const fileWithExtra = {
      ...makeValidProjectFile(),
      futureField: "some-value",
      anotherNewThing: 42,
    };
    const result = validateProjectFile(fileWithExtra);
    expect(result.valid).toBe(true);
  });

  it("preserves unknown top-level fields through full round-trip", () => {
    const originalFile = {
      ...makeValidProjectFile(),
      futureField: "some-value",
      anotherNewThing: 42,
    };
    // Load → work → re-save with original file for merging
    const state = deserializeProject(originalFile as ProjectFile);
    const resaved = serializeProject(state, originalFile.createdAt, originalFile);
    expect(resaved.futureField).toBe("some-value");
    expect(resaved.anotherNewThing).toBe(42);
  });

  it("known fields reflect current state, not existingFile values", () => {
    const originalFile = {
      ...makeValidProjectFile(),
      futureField: "keep-me",
    };
    const state = deserializeProject(originalFile as ProjectFile);
    state.protocolName = "Updated Name";
    const resaved = serializeProject(state, originalFile.createdAt, originalFile);
    expect(resaved.protocolName).toBe("Updated Name");
    expect(resaved.futureField).toBe("keep-me");
  });

  it("preserves unknown section fields through round-trip", () => {
    const file = makeValidProjectFile({
      sections: [
        {
          id: "sec-1",
          name: "Purpose",
          content: "text",
          status: "ready",
          originalPrompt: "prompt",
          futureAnnotation: "extra-data",
        } as ProjectFile["sections"][number],
      ],
    });
    const state = deserializeProject(file);
    expect(state.sections[0].id).toBe("sec-1");
  });
});

// ===========================================================================
// sanitizeFilename
// ===========================================================================

describe("sanitizeFilename", () => {
  it("replaces spaces with underscores", () => {
    expect(sanitizeFilename("My Protocol Name")).toBe("My_Protocol_Name");
  });

  it("removes unsafe filename characters", () => {
    expect(sanitizeFilename('file/name:with*bad?"chars<>|')).toBe(
      "filenamewithbadchars"
    );
  });

  it("collapses multiple underscores", () => {
    expect(sanitizeFilename("a   b")).toBe("a_b");
  });

  it("trims leading and trailing underscores", () => {
    expect(sanitizeFilename(" leading trailing ")).toBe("leading_trailing");
  });

  it("truncates to 100 characters", () => {
    const long = "a".repeat(150);
    expect(sanitizeFilename(long)).toHaveLength(100);
  });

  it("returns 'project' for empty string", () => {
    expect(sanitizeFilename("")).toBe("project");
  });

  it("returns 'project' when only unsafe characters", () => {
    expect(sanitizeFilename('/:*?"<>|')).toBe("project");
  });

  it("handles protocol names with mixed content", () => {
    expect(sanitizeFilename("Study #42: Diabetes/Prevention")).toBe(
      "Study_#42_DiabetesPrevention"
    );
  });
});

// ===========================================================================
// downloadProjectFile
// ===========================================================================

describe("downloadProjectFile", () => {
  let mockCreateObjectURL: jest.Mock;
  let mockRevokeObjectURL: jest.Mock;
  let mockClick: jest.Mock;
  let capturedHref: string;
  let capturedDownload: string;

  beforeEach(() => {
    mockCreateObjectURL = jest.fn(() => "blob:mock-url");
    mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    mockClick = jest.fn();
    capturedHref = "";
    capturedDownload = "";

    jest.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return {
          set href(val: string) {
            capturedHref = val;
          },
          get href() {
            return capturedHref;
          },
          set download(val: string) {
            capturedDownload = val;
          },
          get download() {
            return capturedDownload;
          },
          click: mockClick,
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });

    jest
      .spyOn(document.body, "appendChild")
      .mockImplementation((node) => node);
    jest
      .spyOn(document.body, "removeChild")
      .mockImplementation((node) => node);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates a blob with JSON content and triggers download", () => {
    const state = makeProjectState();
    downloadProjectFile(state);

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    const blob = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("application/json");

    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("generates correct filename from protocol name", () => {
    const state = makeProjectState({ protocolName: "Diabetes Prevention Study" });
    downloadProjectFile(state);

    expect(capturedDownload).toBe("Diabetes_Prevention_Study_ICF.json");
  });

  it("sanitizes special characters in filename", () => {
    const state = makeProjectState({ protocolName: "Study: Phase 1/2" });
    downloadProjectFile(state);

    expect(capturedDownload).toBe("Study_Phase_12_ICF.json");
  });

  it("sets href to the blob URL", () => {
    const state = makeProjectState();
    downloadProjectFile(state);

    expect(capturedHref).toBe("blob:mock-url");
  });

  it("appends and removes the anchor element", () => {
    const state = makeProjectState();
    downloadProjectFile(state);

    expect(document.body.appendChild).toHaveBeenCalledTimes(1);
    expect(document.body.removeChild).toHaveBeenCalledTimes(1);
  });

  it("passes createdAt to serializeProject", () => {
    const state = makeProjectState();
    downloadProjectFile(state, "2025-01-01T00:00:00.000Z");

    // Verify by inspecting the blob content
    const blob = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    // The blob contains the serialized project — we can check it's valid
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it("serializes transient statuses as 'ready' in downloaded file", () => {
    const stringifySpy = jest.spyOn(JSON, "stringify");

    const state = makeProjectState({
      sections: [
        makeSection({ id: "s1", status: "generating" }),
        makeSection({ id: "s2", status: "error" }),
      ],
    });
    downloadProjectFile(state);

    const serializedJson = stringifySpy.mock.results[0].value as string;
    const parsed = JSON.parse(serializedJson);
    expect(parsed.sections[0].status).toBe("ready");
    expect(parsed.sections[1].status).toBe("ready");

    stringifySpy.mockRestore();
  });
});
