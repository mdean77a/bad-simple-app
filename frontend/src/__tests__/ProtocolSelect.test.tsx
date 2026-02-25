import { render, screen, fireEvent } from "@testing-library/react";
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
    acronym: "DBS",
    indexedAt: "2026-02-03T14:30:00+00:00",
  },
  {
    protocolId: "protocol_cardiac_20260201",
    protocolName: "Cardiac Trial",
    acronym: "CRT",
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

  it("shows trigger button with placeholder after loading", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);

    render(<ProtocolSelect />);

    const button = await screen.findByLabelText("Select a protocol");
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveTextContent("Select a protocol...");
  });

  it("opens dropdown and shows protocols with acronym, name, and date", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);

    render(<ProtocolSelect />);

    const button = await screen.findByLabelText("Select a protocol");
    fireEvent.click(button);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("DBS");
    expect(options[0]).toHaveTextContent("Diabetes Study");
    expect(options[1]).toHaveTextContent("CRT");
    expect(options[1]).toHaveTextContent("Cardiac Trial");
  });

  it("shows absolute date in dropdown items", async () => {
    mockFetchProtocols.mockResolvedValue([
      {
        protocolId: "test",
        protocolName: "Test Protocol",
        acronym: "TST",
        indexedAt: "2026-02-24T18:06:00+00:00",
      },
    ]);

    render(<ProtocolSelect />);

    const button = await screen.findByLabelText("Select a protocol");
    fireEvent.click(button);

    const option = screen.getByRole("option");
    // Should contain absolute date parts (month, day, year, time)
    expect(option.textContent).toMatch(/Feb/);
    expect(option.textContent).toMatch(/24/);
    expect(option.textContent).toMatch(/2026/);
    expect(option.textContent).toMatch(/at/);
  });

  it("shows disabled button with 'No protocols uploaded yet' when empty", async () => {
    mockFetchProtocols.mockResolvedValue([]);

    render(<ProtocolSelect />);

    const button = await screen.findByLabelText("Select a protocol");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("No protocols uploaded yet");
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

  it("calls onSelectionChange when an item is selected", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);
    const onSelectionChange = jest.fn();

    render(<ProtocolSelect onSelectionChange={onSelectionChange} />);

    const button = await screen.findByLabelText("Select a protocol");
    fireEvent.click(button);

    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]);

    expect(onSelectionChange).toHaveBeenCalledWith(
      "protocol_diabetes_20260203"
    );
  });

  it("shows selected protocol acronym and name in trigger button", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);

    render(<ProtocolSelect />);

    const button = await screen.findByLabelText("Select a protocol");
    fireEvent.click(button);

    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]);

    expect(button).toHaveTextContent("DBS");
    expect(button).toHaveTextContent("Diabetes Study");
  });

  it("disables button when disabled prop is true", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);

    render(<ProtocolSelect disabled />);

    const button = await screen.findByLabelText("Select a protocol");
    expect(button).toBeDisabled();
  });

  it("closes dropdown on outside click", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);

    render(<ProtocolSelect />);

    const button = await screen.findByLabelText("Select a protocol");
    fireEvent.click(button);

    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes dropdown after selection", async () => {
    mockFetchProtocols.mockResolvedValue(mockProtocols);

    render(<ProtocolSelect />);

    const button = await screen.findByLabelText("Select a protocol");
    fireEvent.click(button);

    const options = screen.getAllByRole("option");
    fireEvent.click(options[1]);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
