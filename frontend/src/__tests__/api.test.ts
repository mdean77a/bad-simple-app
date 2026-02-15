import { checkHealth, uploadProtocol, ApiError, API_BASE_URL } from "@/lib/api";

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
