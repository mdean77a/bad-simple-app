import { render, screen, fireEvent } from "@testing-library/react";
import { LlmSettings } from "@/components/dashboard/LlmSettings";

describe("LlmSettings", () => {
  const defaultModels = {
    anthropic: ["claude-sonnet-4-6"],
    openai: ["gpt-5.1", "gpt-5.1-mini-2025-04-14"],
  };
  const defaultProps = {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    providers: ["anthropic", "openai"],
    models: defaultModels,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders provider dropdown with available options", () => {
    render(<LlmSettings {...defaultProps} />);

    const select = screen.getByTestId("provider-select");
    expect(select).toBeInTheDocument();

    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent("Anthropic");
    expect(options[1]).toHaveTextContent("OpenAI");
  });

  it("renders model dropdown for anthropic", () => {
    render(<LlmSettings {...defaultProps} />);

    const modelSelect = screen.getByTestId("model-select");
    expect(modelSelect).toBeInTheDocument();

    const options = modelSelect.querySelectorAll("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("claude-sonnet-4-6");
  });

  it("renders model dropdown for openai", () => {
    render(
      <LlmSettings {...defaultProps} provider="openai" model="gpt-5.1" />
    );

    const modelSelect = screen.getByTestId("model-select");
    const options = modelSelect.querySelectorAll("option");
    expect(options).toHaveLength(defaultModels.openai.length);
    expect(options[0]).toHaveTextContent("gpt-5.1");
  });

  it("hides model dropdown and shows note for local provider", () => {
    render(
      <LlmSettings
        {...defaultProps}
        provider="local"
        model=""
        providers={["anthropic", "openai", "local"]}
      />
    );

    expect(screen.queryByTestId("model-select")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Uses whatever model LM Studio is serving/)
    ).toBeInTheDocument();
  });

  it("calls onChange with new provider and its first model when vendor changes", () => {
    render(<LlmSettings {...defaultProps} />);

    fireEvent.change(screen.getByTestId("provider-select"), {
      target: { value: "openai" },
    });

    expect(defaultProps.onChange).toHaveBeenCalledWith("openai", "gpt-5.1");
  });

  it("calls onChange with current provider and new model when model changes", () => {
    render(
      <LlmSettings {...defaultProps} provider="openai" model="gpt-5.1" />
    );

    fireEvent.change(screen.getByTestId("model-select"), {
      target: { value: "gpt-5.1-mini-2025-04-14" },
    });

    expect(defaultProps.onChange).toHaveBeenCalledWith(
      "openai",
      "gpt-5.1-mini-2025-04-14"
    );
  });

  it("renders only available providers", () => {
    render(<LlmSettings {...defaultProps} providers={["anthropic"]} />);

    const select = screen.getByTestId("provider-select");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Anthropic");
  });

  it("includes local option when present in providers", () => {
    render(
      <LlmSettings
        {...defaultProps}
        providers={["anthropic", "openai", "local"]}
      />
    );

    const select = screen.getByTestId("provider-select");
    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(3);
    expect(options[2]).toHaveTextContent("Local (LM Studio)");
  });

  it("calls onChange with empty model when switching to local", () => {
    render(
      <LlmSettings
        {...defaultProps}
        providers={["anthropic", "openai", "local"]}
      />
    );

    fireEvent.change(screen.getByTestId("provider-select"), {
      target: { value: "local" },
    });

    expect(defaultProps.onChange).toHaveBeenCalledWith("local", "");
  });

  it("preserves stale model value when not in models list", () => {
    render(
      <LlmSettings
        {...defaultProps}
        provider="anthropic"
        model="claude-sonnet-3-old"
      />
    );

    const modelSelect = screen.getByTestId("model-select");
    const options = modelSelect.querySelectorAll("option");
    expect(options[0]).toHaveTextContent("claude-sonnet-3-old");
    expect((modelSelect as HTMLSelectElement).value).toBe("claude-sonnet-3-old");
  });

  it("shows fallback note when no models available for non-local provider", () => {
    render(
      <LlmSettings
        {...defaultProps}
        provider="anthropic"
        model=""
        models={{}}
      />
    );

    expect(screen.queryByTestId("model-select")).not.toBeInTheDocument();
    expect(
      screen.getByText(/No models available for this provider/)
    ).toBeInTheDocument();
  });
});
