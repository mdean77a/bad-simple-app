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

  it("renders idle state with drop zone and browse button", () => {
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

  it("shows uploading state when file is dropped", async () => {
    mockUploadProtocol.mockReturnValue(new Promise(() => {})); // never resolves

    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(
      await screen.findByText("Processing protocol...")
    ).toBeInTheDocument();
  });

  it("shows success state with protocol name after upload", async () => {
    mockUploadProtocol.mockResolvedValue({
      protocolId: "test_123",
      protocolName: "My Protocol",
    });

    render(<ProtocolUpload />);

    const dropZone = screen.getByLabelText("Upload protocol PDF");
    const file = new File(["pdf"], "protocol.pdf", {
      type: "application/pdf",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(await screen.findByText("My Protocol")).toBeInTheDocument();
    expect(
      screen.getByText("Protocol uploaded successfully")
    ).toBeInTheDocument();

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeDisabled();
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
    });

    render(<ProtocolUpload />);

    const fileInput = screen.getByTestId("file-input") as HTMLInputElement;
    const file = new File(["pdf"], "selected.pdf", {
      type: "application/pdf",
    });

    await userEvent.upload(fileInput, file);

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

    const errorMsg = await screen.findByText("Bad file");
    expect(errorMsg).toHaveAttribute("aria-live", "assertive");
  });
});
