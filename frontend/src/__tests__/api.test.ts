import { checkHealth, uploadProtocol, fetchProtocols, generateOutline, ApiError, API_BASE_URL } from "@/lib/api";

describe("API_BASE_URL", () => {
  it("defaults to localhost:8000 when env var is not set", () => {
    expect(API_BASE_URL).toBe("http://localhost:8000");
  });
});

describe("checkHealth", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns health data on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "ok" }),
    });

    const result = await checkHealth();

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/health`
    );
    expect(result).toEqual({ status: "ok" });
  });

  it("throws on non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(checkHealth()).rejects.toThrow("Health check failed: 503");
  });

  it("throws on network error", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(checkHealth()).rejects.toThrow("Failed to fetch");
  });
});

describe("ApiError", () => {
  it("stores code and detail", () => {
    const err = new ApiError("VALIDATION_ERROR", "File must be a PDF");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.detail).toBe("File must be a PDF");
    expect(err.message).toBe("File must be a PDF");
    expect(err.name).toBe("ApiError");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("uploadProtocol", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("sends FormData with file and acronym on success", async () => {
    const mockResponse = {
      protocolId: "test_123",
      protocolName: "test",
      acronym: "THAPCA",
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const file = new File(["pdf content"], "test.pdf", {
      type: "application/pdf",
    });
    const result = await uploadProtocol(file, "THAPCA");

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/protocols/upload`,
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      })
    );

    const sentFormData = (global.fetch as jest.Mock).mock.calls[0][1]
      .body as FormData;
    expect(sentFormData.get("file")).toBeTruthy();
    expect(sentFormData.get("acronym")).toBe("THAPCA");
  });

  it("throws ApiError with code and detail on API error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () =>
        Promise.resolve({
          code: "VALIDATION_ERROR",
          detail: "File must have a .pdf extension",
        }),
    });

    const file = new File(["not a pdf"], "test.txt", {
      type: "text/plain",
    });

    await expect(uploadProtocol(file, "TESTT")).rejects.toThrow(ApiError);
    try {
      await uploadProtocol(file, "TESTT");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("VALIDATION_ERROR");
      expect((err as ApiError).detail).toBe(
        "File must have a .pdf extension"
      );
    }
  });

  it("uses fallback code and detail when error body has empty fields", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const file = new File(["data"], "test.pdf", {
      type: "application/pdf",
    });

    try {
      await uploadProtocol(file, "TESTT");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("UNKNOWN_ERROR");
      expect((err as ApiError).detail).toBe("Upload failed");
    }
  });

  it("throws generic Error when response body is not JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });

    const file = new File(["data"], "test.pdf", {
      type: "application/pdf",
    });

    await expect(uploadProtocol(file, "TESTT")).rejects.toThrow(
      "Upload failed: 500"
    );
  });

  it("throws on network error", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));

    const file = new File(["data"], "test.pdf", {
      type: "application/pdf",
    });

    await expect(uploadProtocol(file, "TESTT")).rejects.toThrow(
      "Failed to fetch"
    );
  });
});

describe("generateOutline", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("sends POST with protocolId and returns outline on success", async () => {
    const mockResponse = {
      protocolId: "protocol_test_123",
      sections: [
        {
          sectionName: "Purpose of the Study",
          category: "standard",
          isConditional: false,
          defaultChecked: true,
          detectionReason: null,
        },
      ],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await generateOutline("protocol_test_123");

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/outline/generate`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocolId: "protocol_test_123" }),
      })
    );
  });

  it("throws ApiError with code and detail on API error", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () =>
        Promise.resolve({
          code: "LLM_ERROR",
          detail: "Model returned invalid JSON",
        }),
    });

    await expect(generateOutline("protocol_test_123")).rejects.toThrow(
      ApiError
    );
    try {
      await generateOutline("protocol_test_123");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("LLM_ERROR");
      expect((err as ApiError).detail).toBe("Model returned invalid JSON");
    }
  });

  it("uses fallback code and detail when error body has empty fields", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.resolve({}),
    });

    try {
      await generateOutline("protocol_test_123");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("UNKNOWN_ERROR");
      expect((err as ApiError).detail).toBe("Outline generation failed");
    }
  });

  it("throws generic Error when response body is not JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new SyntaxError("Unexpected token")),
    });

    await expect(generateOutline("protocol_test_123")).rejects.toThrow(
      "Outline generation failed: 500"
    );
  });

  it("throws on network error", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(generateOutline("protocol_test_123")).rejects.toThrow(
      "Failed to fetch"
    );
  });
});

describe("fetchProtocols", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns protocol list on success", async () => {
    const mockProtocols = [
      {
        protocolId: "protocol_diabetes_20260203",
        protocolName: "Diabetes Study",
        indexedAt: "2026-02-03T14:30:00+00:00",
      },
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProtocols),
    });

    const result = await fetchProtocols();

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/protocols/`,
      { cache: "no-store" }
    );
    expect(result).toEqual(mockProtocols);
  });

  it("throws on non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });

    await expect(fetchProtocols()).rejects.toThrow(
      "Failed to fetch protocols: 502"
    );
  });

  it("throws on network error", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchProtocols()).rejects.toThrow("Failed to fetch");
  });
});
