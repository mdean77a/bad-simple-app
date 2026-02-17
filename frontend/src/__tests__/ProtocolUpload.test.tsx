import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProtocolUpload } from "@/components/projects/ProtocolUpload";
import * as api from "@/lib/api";

jest.mock("@/lib/api", () => {
  const actual = jest.requireActual("@/lib/api");
  return {
    ...actual,
    uploadProtocol: jest.fn(),
  };
});
const mockUploadProtocol = api.uploadProtocol as jest.MockedFunction<
  typeof api.uploadProtocol
>;

describe("ProtocolUpload", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders idle state with drop zone, browse button, and acronym input", () => {
    render(<ProtocolUpload />);

    expect(
      screen.getByLabelText("Upload protocol PDF")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/drag and drop your protocol pdf/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /browse files/i })
    ).toBeInTheDocument();
    expect(screen.getByText("PDF files only")).toBeInTheDocument();
    expect(screen.getByLabelText("Protocol Acronym")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g., THAPCA, FLUID, PRECISE")
    ).toBeInTheDocument();
  });

  it("renders upload button disabled when no file selected", () => {
    render(<ProtocolUpload />);

    const uploadBtn = screen.getByRole("button", {
      name: /upload protocol/i,
    });
    expect(uploadBtn).toBeDisabled();
  });

  it("shows dragging state on dragOver", () => {
    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    fireEvent.dragOver(dropZone);

    expect(dropZone).toHaveClass("border-violet-500", "bg-violet-50");
  });

  it("returns to idle state on dragLeave", () => {
    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);

    expect(dropZone).toHaveClass("border-slate-300");
  });

  it("shows selected file name after dropping a file", () => {
    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText("protocol.pdf")).toBeInTheDocument();
    expect(screen.getByText("Change file")).toBeInTheDocument();
  });

  it("enables upload button after file is selected", () => {
    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    const uploadBtn = screen.getByRole("button", {
      name: /upload protocol/i,
    });
    expect(uploadBtn).toBeEnabled();
  });

  it("shows uploading state when upload is triggered", async () => {
    mockUploadProtocol.mockReturnValue(new Promise(() => {})); // never resolves

    render(<ProtocolUpload />);

    // Select file
    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    // Enter acronym
    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "THAPCA");

    // Click upload
    const uploadBtn = screen.getByRole("button", {
      name: /upload protocol/i,
    });
    fireEvent.click(uploadBtn);

    expect(
      await screen.findByText("Processing protocol...")
    ).toBeInTheDocument();
  });

  it("shows success state with protocol name after upload", async () => {
    mockUploadProtocol.mockResolvedValue({
      protocolId: "test_123",
      protocolName: "My Protocol",
      acronym: "THAPCA",
    });

    render(<ProtocolUpload />);

    // Select file
    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    // Enter acronym and upload
    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "THAPCA");
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    expect(await screen.findByText("My Protocol")).toBeInTheDocument();
    expect(
      screen.getByText("Protocol uploaded successfully")
    ).toBeInTheDocument();
  });

  it("passes file and acronym to uploadProtocol", async () => {
    mockUploadProtocol.mockResolvedValue({
      protocolId: "test_123",
      protocolName: "My Protocol",
      acronym: "THAPCA",
    });

    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "THAPCA");
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    await waitFor(() => {
      expect(mockUploadProtocol).toHaveBeenCalledWith(file, "THAPCA");
    });
  });

  it("shows error state with message on API error", async () => {
    mockUploadProtocol.mockRejectedValue(
      new api.ApiError("VALIDATION_ERROR", "File must have a .pdf extension")
    );

    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["txt"], "test.txt", { type: "text/plain" });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "TESTT");
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    expect(
      await screen.findByText("File must have a .pdf extension")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("shows generic error message on unexpected error", async () => {
    mockUploadProtocol.mockRejectedValue(new TypeError("Failed to fetch"));

    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "test.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "TESTT");
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    expect(
      await screen.findByText(
        "An unexpected error occurred. Please try again."
      )
    ).toBeInTheDocument();
  });

  it("returns to idle state when Try Again is clicked", async () => {
    mockUploadProtocol.mockRejectedValue(
      new api.ApiError("PDF_PARSE_ERROR", "Could not read PDF")
    );

    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "test.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "TESTT");
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    const tryAgainBtn = await screen.findByRole("button", {
      name: /try again/i,
    });
    fireEvent.click(tryAgainBtn);

    expect(
      screen.getByLabelText("Upload protocol PDF")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /browse files/i })
    ).toBeInTheDocument();
  });

  it("uploads file when selected via file input", async () => {
    mockUploadProtocol.mockResolvedValue({
      protocolId: "test_456",
      protocolName: "Selected Protocol",
      acronym: "FLUID",
    });

    render(<ProtocolUpload />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["pdf"], "selected.pdf", {
      type: "application/pdf",
    });

    await userEvent.upload(fileInput, file);

    // File should be staged, not uploaded yet
    expect(screen.getByText("selected.pdf")).toBeInTheDocument();

    // Enter acronym and upload
    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "FLUID");
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    expect(
      await screen.findByText("Selected Protocol")
    ).toBeInTheDocument();
  });

  it("has aria-live on error message", async () => {
    mockUploadProtocol.mockRejectedValue(
      new api.ApiError("VALIDATION_ERROR", "Bad file")
    );

    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "test.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "TESTT");
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    const errorMsg = await screen.findByText("Bad file");
    expect(errorMsg).toHaveAttribute("aria-live", "assertive");
  });

  // --- Acronym validation ---

  it("shows validation error when acronym is empty on upload", async () => {
    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "test.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    // Click upload without entering acronym
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    expect(
      screen.getByText("Protocol acronym is required")
    ).toBeInTheDocument();
    expect(mockUploadProtocol).not.toHaveBeenCalled();
  });

  it("shows validation error when acronym is too short", async () => {
    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "test.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "AB");
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    expect(
      screen.getByText("Acronym must be at least 3 characters")
    ).toBeInTheDocument();
    expect(mockUploadProtocol).not.toHaveBeenCalled();
  });

  it("shows validation error when acronym exceeds 20 characters", async () => {
    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "test.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    // Type directly into the acronym state by setting value programmatically
    const acronymInput = screen.getByLabelText("Protocol Acronym");
    fireEvent.change(acronymInput, {
      target: { value: "ABCDEFGHIJKLMNOPQRSTU" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    expect(
      screen.getByText("Acronym must be at most 20 characters")
    ).toBeInTheDocument();
    expect(mockUploadProtocol).not.toHaveBeenCalled();
  });

  it("clears acronym error when user starts typing", async () => {
    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "test.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    // Trigger validation error
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );
    expect(
      screen.getByText("Protocol acronym is required")
    ).toBeInTheDocument();

    // Start typing to clear error
    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "T");

    expect(
      screen.queryByText("Protocol acronym is required")
    ).not.toBeInTheDocument();
  });

  it("shows 3-20 characters hint text", () => {
    render(<ProtocolUpload />);

    expect(screen.getByText("3-20 characters")).toBeInTheDocument();
  });

  it("triggers file input when Browse Files is clicked", () => {
    render(<ProtocolUpload />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const clickSpy = jest.spyOn(fileInput, "click");

    fireEvent.click(screen.getByRole("button", { name: /browse files/i }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("resets selected file when Change file is clicked", () => {
    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText("protocol.pdf")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Change file"));

    expect(screen.queryByText("protocol.pdf")).not.toBeInTheDocument();
    expect(
      screen.getByText(/drag and drop your protocol pdf/i)
    ).toBeInTheDocument();
  });

  // --- disabled prop ---

  it("applies disabled styling when disabled", () => {
    render(<ProtocolUpload disabled />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    expect(dropZone.closest(".opacity-50")).toBeTruthy();
  });

  it("ignores file drop when disabled", () => {
    const onFileChange = jest.fn();
    render(<ProtocolUpload disabled onFileChange={onFileChange} />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFileChange).not.toHaveBeenCalled();
    expect(screen.queryByText("protocol.pdf")).not.toBeInTheDocument();
  });

  it("disables acronym input when disabled", () => {
    render(<ProtocolUpload disabled />);

    expect(screen.getByLabelText("Protocol Acronym")).toBeDisabled();
  });

  // --- onFileChange callback ---

  it("calls onFileChange(true) when file is selected", () => {
    const onFileChange = jest.fn();
    render(<ProtocolUpload onFileChange={onFileChange} />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFileChange).toHaveBeenCalledWith(true);
  });

  it("calls onFileChange(false) when file is cleared", () => {
    const onFileChange = jest.fn();
    render(<ProtocolUpload onFileChange={onFileChange} />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    fireEvent.click(screen.getByText("Change file"));

    expect(onFileChange).toHaveBeenLastCalledWith(false);
  });

  // --- onUploadSuccess callback ---

  it("calls onUploadSuccess with protocolId after successful upload", async () => {
    mockUploadProtocol.mockResolvedValue({
      protocolId: "protocol_test_123",
      protocolName: "My Protocol",
      acronym: "THAPCA",
    });
    const onUploadSuccess = jest.fn();

    render(<ProtocolUpload onUploadSuccess={onUploadSuccess} />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    const acronymInput = screen.getByLabelText("Protocol Acronym");
    await userEvent.type(acronymInput, "THAPCA");
    fireEvent.click(
      screen.getByRole("button", { name: /upload protocol/i })
    );

    await screen.findByText("Protocol uploaded successfully");
    expect(onUploadSuccess).toHaveBeenCalledWith("protocol_test_123");
  });
});
