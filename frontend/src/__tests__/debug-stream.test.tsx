import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DebugStreamPage from "@/app/debug/stream/page";

// Polyfill TextEncoder/TextDecoder for jsdom
const { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder } =
  require("util");
globalThis.TextEncoder = globalThis.TextEncoder || NodeTextEncoder;
globalThis.TextDecoder = globalThis.TextDecoder || NodeTextDecoder;

const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

const originalFetch = globalThis.fetch;

function mockFetchSSE(sseText: string) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(sseText);
  let read = false;

  const mockBody = {
    getReader: () => ({
      read: async () => {
        if (!read) {
          read = true;
          return { done: false, value: encoded };
        }
        return { done: true, value: undefined };
      },
    }),
  };

  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    body: mockBody,
    headers: new Headers({ "content-type": "text/event-stream" }),
  });
}

function mockFetchError(status: number, statusText: string) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    body: null,
    headers: new Headers(),
  });
}

describe("Debug Stream Page", () => {
  beforeEach(() => {
    // Reset search params to empty
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key);
    }
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("renders input fields and generate button", () => {
    render(<DebugStreamPage />);

    expect(screen.getByLabelText("Protocol ID:")).toBeInTheDocument();
    expect(screen.getByLabelText("Section Name:")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate" })
    ).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<DebugStreamPage />);

    expect(
      screen.getByRole("heading", { name: "Debug: Section Streaming" })
    ).toBeInTheDocument();
  });

  it("disables Generate button when inputs are empty", () => {
    render(<DebugStreamPage />);

    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
  });

  it("enables Generate button when both inputs have values", async () => {
    render(<DebugStreamPage />);

    await userEvent.type(
      screen.getByLabelText("Protocol ID:"),
      "protocol_test"
    );
    await userEvent.type(screen.getByLabelText("Section Name:"), "Purpose");

    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });

  it("shows initial placeholder text in output area", () => {
    render(<DebugStreamPage />);

    expect(screen.getByTestId("stream-output")).toHaveTextContent(
      "(no output yet)"
    );
  });

  it("shows initial placeholder text in events area", () => {
    render(<DebugStreamPage />);

    expect(screen.getByTestId("events-log")).toHaveTextContent(
      "(no events yet)"
    );
  });

  it("streams content from SSE response", async () => {
    const sseText =
      'event: section_start\ndata: {"sectionId":"debug-1","name":"Purpose"}\n\n' +
      'event: section_chunk\ndata: {"sectionId":"debug-1","content":"Hello "}\n\n' +
      'event: section_chunk\ndata: {"sectionId":"debug-1","content":"world"}\n\n' +
      'event: section_complete\ndata: {"sectionId":"debug-1","status":"ready"}\n\n';

    mockFetchSSE(sseText);

    render(<DebugStreamPage />);

    await userEvent.type(
      screen.getByLabelText("Protocol ID:"),
      "protocol_test"
    );
    await userEvent.type(screen.getByLabelText("Section Name:"), "Purpose");
    await userEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByTestId("stream-output")).toHaveTextContent(
        /Purpose.*Hello world/
      );
    });
  });

  it("shows error message from SSE error event", async () => {
    const sseText =
      'event: section_start\ndata: {"sectionId":"debug-1","name":"Purpose"}\n\n' +
      'event: section_error\ndata: {"sectionId":"debug-1","status":"error","message":"Connection refused"}\n\n';

    mockFetchSSE(sseText);

    render(<DebugStreamPage />);

    await userEvent.type(
      screen.getByLabelText("Protocol ID:"),
      "protocol_test"
    );
    await userEvent.type(screen.getByLabelText("Section Name:"), "Purpose");
    await userEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByTestId("stream-output")).toHaveTextContent(
        "Connection refused"
      );
    });
  });

  it("shows error when fetch response is not ok", async () => {
    mockFetchError(500, "Internal Server Error");

    render(<DebugStreamPage />);

    await userEvent.type(
      screen.getByLabelText("Protocol ID:"),
      "protocol_test"
    );
    await userEvent.type(screen.getByLabelText("Section Name:"), "Purpose");
    await userEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByTestId("stream-output")).toHaveTextContent(
        "Error: 500 Internal Server Error"
      );
    });
  });

  it("auto-starts streaming when query params are provided", async () => {
    const sseText =
      'event: section_start\ndata: {"sectionId":"sec-1","name":"Purpose"}\n\n' +
      'event: section_chunk\ndata: {"sectionId":"sec-1","content":"Auto content"}\n\n' +
      'event: section_complete\ndata: {"sectionId":"sec-1","status":"ready"}\n\n';

    mockFetchSSE(sseText);

    mockSearchParams.set("protocolId", "protocol_test_123");
    mockSearchParams.set(
      "sections",
      JSON.stringify([{ id: "sec-1", name: "Purpose" }])
    );

    render(<DebugStreamPage />);

    await waitFor(() => {
      expect(screen.getByTestId("stream-output")).toHaveTextContent(
        "Auto content"
      );
    });

    // Verify fetch was called with the right params
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/sections/generate"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          protocolId: "protocol_test_123",
          sections: [{ id: "sec-1", name: "Purpose" }],
        }),
      })
    );
  });

  it("pre-fills protocolId from query params", () => {
    mockSearchParams.set("protocolId", "protocol_prefilled");

    render(<DebugStreamPage />);

    expect(screen.getByLabelText("Protocol ID:")).toHaveValue(
      "protocol_prefilled"
    );
  });

  it("shows Stop button during streaming and handles abort", async () => {
    // Create a stream that never finishes so we can click Stop
    const mockBody = {
      getReader: () => ({
        read: () =>
          new Promise<{ done: boolean; value: undefined }>((_, reject) => {
            // Store reject so abort signal can trigger it
            setTimeout(() => reject(new DOMException("Aborted", "AbortError")), 50);
          }),
      }),
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      body: mockBody,
      headers: new Headers({ "content-type": "text/event-stream" }),
    });

    render(<DebugStreamPage />);

    await userEvent.type(
      screen.getByLabelText("Protocol ID:"),
      "protocol_test"
    );
    await userEvent.type(screen.getByLabelText("Section Name:"), "Purpose");
    await userEvent.click(screen.getByRole("button", { name: "Generate" }));

    // Stop button should appear while streaming
    const stopBtn = await screen.findByRole("button", { name: "Stop" });
    expect(stopBtn).toBeInTheDocument();
    await userEvent.click(stopBtn);

    await waitFor(() => {
      expect(screen.getByTestId("stream-output")).toHaveTextContent(
        "[Aborted]"
      );
    });
  });

  it("handles fetch network error gracefully", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    render(<DebugStreamPage />);

    await userEvent.type(
      screen.getByLabelText("Protocol ID:"),
      "protocol_test"
    );
    await userEvent.type(screen.getByLabelText("Section Name:"), "Purpose");
    await userEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByTestId("stream-output")).toHaveTextContent(
        "Error: TypeError: Failed to fetch"
      );
    });
  });

  it("ignores malformed JSON in SSE data lines", async () => {
    const sseText =
      'event: section_start\ndata: {"sectionId":"debug-1","name":"Purpose"}\n\n' +
      "event: section_chunk\ndata: {INVALID JSON}\n\n" +
      'event: section_chunk\ndata: {"sectionId":"debug-1","content":"valid"}\n\n' +
      'event: section_complete\ndata: {"sectionId":"debug-1","status":"ready"}\n\n';

    mockFetchSSE(sseText);

    render(<DebugStreamPage />);

    await userEvent.type(
      screen.getByLabelText("Protocol ID:"),
      "protocol_test"
    );
    await userEvent.type(screen.getByLabelText("Section Name:"), "Purpose");
    await userEvent.click(screen.getByRole("button", { name: "Generate" }));

    await waitFor(() => {
      expect(screen.getByTestId("stream-output")).toHaveTextContent("valid");
    });
  });

  it("ignores invalid JSON in sections search param", () => {
    mockSearchParams.set("protocolId", "protocol_test");
    mockSearchParams.set("sections", "not-valid-json");

    // Should render without crashing, no auto-start
    render(<DebugStreamPage />);

    expect(screen.getByTestId("stream-output")).toHaveTextContent(
      "(no output yet)"
    );
  });

  it("does not auto-start when only protocolId param is provided", () => {
    mockSearchParams.set("protocolId", "protocol_test");
    // No sections param

    render(<DebugStreamPage />);

    expect(screen.getByTestId("stream-output")).toHaveTextContent(
      "(no output yet)"
    );
  });
});
