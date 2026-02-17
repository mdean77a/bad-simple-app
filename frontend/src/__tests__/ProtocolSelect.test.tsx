import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProtocolSelect } from "@/components/projects/ProtocolSelect";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    fetchProtocols: jest.fn(),
  };
});
const mockFetchProtocols = api.fetchProtocols as jest.MockedFunction<
  typeof api.fetchProtocols
>;

const mockProtocols: api.Protocol[] = [
  {
    protocolId: "protocol_diabetes_20260203",
    protocolName: "Diabetes Study",
    indexedAt: "2026-02-03T14:30:00+00:00",
  },
  {
    protocolId: "protocol_cardiac_20260201",
    protocolName: "Cardiac Trial",
    indexedAt: "2026-02-01T10:00:00+00:00",
  },
];

describe("ProtocolSelect", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("shows loading skeleton initially", () => {
    mockFetchProtocols.mockReturnValue(new Promise(() => {}));

    render(<ProtocolSelect />);

    expect(screen.getByLabelText("Loading protocols")).toBeInTheDocument();
  });

  it("shows dropdown with protocols after loading", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);

    render(<ProtocolSelect />);

    const select = await screen.findByLabelText("Select a protocol");
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");

    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("Select a protocol...");
    expect(options[1]).toHaveTextContent("Diabetes Study");
    expect(options[2]).toHaveTextContent("Cardiac Trial");
  });

  it("shows indexed date in each option", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);

    render(<ProtocolSelect />);

    const select = await screen.findByLabelText("Select a protocol");
    const options = select.querySelectorAll("option");
    expect(options[1].textContent).toMatch(/Indexed/);
    expect(options[2].textContent).toMatch(/Indexed/);
  });

  it("shows disabled dropdown with 'No protocols uploaded yet' when empty", async () => {
    mockFetchProtocols.mockResolvedValue([]);

    render(<ProtocolSelect />);

    const select = await screen.findByLabelText("Select a protocol");
    expect(select).toBeDisabled();

    const placeholder = select.querySelector("option");
    expect(placeholder).toHaveTextContent("No protocols uploaded yet");
  });

  it("shows error state on fetch failure", async () => {
    mockFetchProtocols.mockRejectedValue(new Error("Network error"));

    render(<ProtocolSelect />);

    expect(
      await screen.findByText("Failed to load protocols. Please try again.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /retry/i })
    ).toBeInTheDocument();
  });

  it("retries fetch when Retry is clicked", async () => {
    mockFetchProtocols.mockRejectedValueOnce(new Error("Network error"));
    mockFetchProtocols.mockResolvedValueOnce(mockProtocols);

    render(<ProtocolSelect />);

    const retryBtn = await screen.findByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);

    expect(
      await screen.findByLabelText("Select a protocol")
    ).toBeInTheDocument();
    expect(mockFetchProtocols).toHaveBeenCalledTimes(2);
  });

  it("calls onSelectionChange when selection changes", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);
    const onSelectionChange = jest.fn();

    render(<ProtocolSelect onSelectionChange={onSelectionChange} />);

    const select = await screen.findByLabelText("Select a protocol");
    await userEvent.selectOptions(select, "protocol_diabetes_20260203");

    expect(onSelectionChange).toHaveBeenCalledWith("protocol_diabetes_20260203");

    await userEvent.selectOptions(select, "");
    expect(onSelectionChange).toHaveBeenCalledWith(null);
  });

  it("disables dropdown when disabled prop is true", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);

    render(<ProtocolSelect disabled />);

    const select = await screen.findByLabelText("Select a protocol");
    expect(select).toBeDisabled();
  });

  it("formats today's date as 'today'", async () => {
    const now = new Date().toISOString();
    mockFetchProtocols.mockResolvedValue([
      { protocolId: "test", protocolName: "Today Protocol", indexedAt: now },
    ]);

    render(<ProtocolSelect />);

    const select = await screen.findByLabelText("Select a protocol");
    const option = select.querySelectorAll("option")[1];
    expect(option.textContent).toContain("Indexed today");
  });

  it("formats a date 3 days ago as '3 days ago'", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    mockFetchProtocols.mockResolvedValue([
      {
        protocolId: "test",
        protocolName: "Recent Protocol",
        indexedAt: threeDaysAgo,
      },
    ]);

    render(<ProtocolSelect />);

    const select = await screen.findByLabelText("Select a protocol");
    const option = select.querySelectorAll("option")[1];
    expect(option.textContent).toContain("Indexed 3 days ago");
  });

  it("formats yesterday's date as 'yesterday'", async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    mockFetchProtocols.mockResolvedValue([
      {
        protocolId: "test",
        protocolName: "Yesterday Protocol",
        indexedAt: yesterday,
      },
    ]);

    render(<ProtocolSelect />);

    const select = await screen.findByLabelText("Select a protocol");
    const option = select.querySelectorAll("option")[1];
    expect(option.textContent).toContain("Indexed yesterday");
  });
});
