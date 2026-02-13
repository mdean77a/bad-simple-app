import { checkHealth, API_BASE_URL } from "@/lib/api";

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
