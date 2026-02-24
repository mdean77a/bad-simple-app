import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmButton } from "@/components/outline/ConfirmButton";

describe("ConfirmButton", () => {
  it("renders the Confirm Outline button", () => {
    render(
      <ConfirmButton disabled={false} hasNoSelections={false} onClick={jest.fn()} />
    );

    expect(
      screen.getByRole("button", { name: "Confirm outline and begin generation" })
    ).toBeInTheDocument();
    expect(screen.getByText("Confirm Outline")).toBeInTheDocument();
  });

  it("calls onClick when clicked and not disabled", async () => {
    const onClick = jest.fn();
    render(
      <ConfirmButton disabled={false} hasNoSelections={false} onClick={onClick} />
    );

    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(
      <ConfirmButton disabled={true} hasNoSelections={false} onClick={jest.fn()} />
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("does not call onClick when disabled", async () => {
    const onClick = jest.fn();
    render(
      <ConfirmButton disabled={true} hasNoSelections={false} onClick={onClick} />
    );

    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows helper text when hasNoSelections is true", () => {
    render(
      <ConfirmButton disabled={true} hasNoSelections={true} onClick={jest.fn()} />
    );

    expect(
      screen.getByText("Select at least one section to continue")
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not show helper text when hasNoSelections is false", () => {
    render(
      <ConfirmButton disabled={false} hasNoSelections={false} onClick={jest.fn()} />
    );

    expect(
      screen.queryByText("Select at least one section to continue")
    ).not.toBeInTheDocument();
  });

  it("has aria-describedby linked to helper text when hasNoSelections", () => {
    render(
      <ConfirmButton disabled={true} hasNoSelections={true} onClick={jest.fn()} />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-describedby", "confirm-helper");
    expect(screen.getByText("Select at least one section to continue")).toHaveAttribute(
      "id",
      "confirm-helper"
    );
  });

  it("does not have aria-describedby when hasNoSelections is false", () => {
    render(
      <ConfirmButton disabled={false} hasNoSelections={false} onClick={jest.fn()} />
    );

    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("aria-describedby");
  });
});
