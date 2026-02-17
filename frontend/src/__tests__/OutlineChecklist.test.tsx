import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OutlineChecklist } from "@/components/outline/OutlineChecklist";
import { OutlineSection } from "@/lib/api";

const mockSections: OutlineSection[] = [
  {
    sectionName: "Purpose of the Study",
    category: "standard",
    isConditional: false,
    defaultChecked: true,
    detectionReason: null,
  },
  {
    sectionName: "Study Procedures",
    category: "standard",
    isConditional: false,
    defaultChecked: true,
    detectionReason: null,
  },
  {
    sectionName: "Genetic Research",
    category: "conditional",
    isConditional: true,
    defaultChecked: true,
    detectionReason: "detected: genetic sample collection",
  },
  {
    sectionName: "HIV Testing",
    category: "conditional",
    isConditional: true,
    defaultChecked: false,
    detectionReason: null,
  },
  {
    sectionName: "Adult Consent",
    category: "signature",
    isConditional: true,
    defaultChecked: true,
    detectionReason: "detected: participants ages 18-65",
  },
];

function buildCheckedState(
  sections: OutlineSection[]
): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  sections.forEach((s) => {
    state[s.sectionName] = s.defaultChecked;
  });
  return state;
}

describe("OutlineChecklist", () => {
  it("renders category headers", () => {
    render(
      <OutlineChecklist
        sections={mockSections}
        checkedState={buildCheckedState(mockSections)}
        onToggle={jest.fn()}
      />
    );

    expect(screen.getByText("Standard Sections")).toBeInTheDocument();
    expect(screen.getByText("Conditional Sections")).toBeInTheDocument();
    expect(screen.getByText("Signature Pages")).toBeInTheDocument();
  });

  it("renders section names", () => {
    render(
      <OutlineChecklist
        sections={mockSections}
        checkedState={buildCheckedState(mockSections)}
        onToggle={jest.fn()}
      />
    );

    expect(screen.getByText("Purpose of the Study")).toBeInTheDocument();
    expect(screen.getByText("Study Procedures")).toBeInTheDocument();
    expect(screen.getByText("Genetic Research")).toBeInTheDocument();
    expect(screen.getByText("HIV Testing")).toBeInTheDocument();
    expect(screen.getByText("Adult Consent")).toBeInTheDocument();
  });

  it("initializes checkboxes from checkedState", () => {
    render(
      <OutlineChecklist
        sections={mockSections}
        checkedState={buildCheckedState(mockSections)}
        onToggle={jest.fn()}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(5);

    // Purpose of the Study — defaultChecked: true
    expect(checkboxes[0]).toBeChecked();
    // Study Procedures — defaultChecked: true
    expect(checkboxes[1]).toBeChecked();
    // Genetic Research — defaultChecked: true
    expect(checkboxes[2]).toBeChecked();
    // HIV Testing — defaultChecked: false
    expect(checkboxes[3]).not.toBeChecked();
    // Adult Consent — defaultChecked: true
    expect(checkboxes[4]).toBeChecked();
  });

  it("calls onToggle when checkbox is clicked", async () => {
    const onToggle = jest.fn();

    render(
      <OutlineChecklist
        sections={mockSections}
        checkedState={buildCheckedState(mockSections)}
        onToggle={onToggle}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[3]); // HIV Testing

    expect(onToggle).toHaveBeenCalledWith("HIV Testing");
  });

  it("shows detection reason for sections that have one", () => {
    render(
      <OutlineChecklist
        sections={mockSections}
        checkedState={buildCheckedState(mockSections)}
        onToggle={jest.fn()}
      />
    );

    expect(
      screen.getByText("detected: genetic sample collection")
    ).toBeInTheDocument();
    expect(
      screen.getByText("detected: participants ages 18-65")
    ).toBeInTheDocument();
  });

  it("does not show detection reason when null", () => {
    render(
      <OutlineChecklist
        sections={mockSections}
        checkedState={buildCheckedState(mockSections)}
        onToggle={jest.fn()}
      />
    );

    // Purpose of the Study has no detection reason
    const purposeLabel = screen.getByText("Purpose of the Study");
    const container = purposeLabel.closest("label");
    // Should only have the section name span, no <p> for detection reason
    expect(container?.querySelectorAll("p")).toHaveLength(0);
  });

  it("groups sections by category in correct order", () => {
    render(
      <OutlineChecklist
        sections={mockSections}
        checkedState={buildCheckedState(mockSections)}
        onToggle={jest.fn()}
      />
    );

    const legends = screen.getAllByRole("group");
    expect(legends).toHaveLength(3);

    // Check order via fieldset legends
    const legendTexts = legends.map(
      (fieldset) => fieldset.querySelector("legend")?.textContent
    );
    expect(legendTexts).toEqual([
      "Standard Sections",
      "Conditional Sections",
      "Signature Pages",
    ]);
  });

  it("checkboxes are keyboard accessible", async () => {
    const onToggle = jest.fn();

    render(
      <OutlineChecklist
        sections={mockSections}
        checkedState={buildCheckedState(mockSections)}
        onToggle={onToggle}
      />
    );

    // Tab to the first checkbox and press Space
    await userEvent.tab();
    await userEvent.keyboard(" ");

    expect(onToggle).toHaveBeenCalledWith("Purpose of the Study");
  });

  it("renders form with accessible label", () => {
    render(
      <OutlineChecklist
        sections={mockSections}
        checkedState={buildCheckedState(mockSections)}
        onToggle={jest.fn()}
      />
    );

    expect(screen.getByRole("form")).toHaveAttribute(
      "aria-label",
      "Outline checklist"
    );
  });
});
