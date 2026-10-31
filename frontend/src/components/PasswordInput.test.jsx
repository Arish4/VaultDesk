import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("hides the password until the eye button is pressed", () => {
    render(<PasswordInput value="secret" onChange={() => {}} />);
    const input = screen.getByDisplayValue("secret");
    expect(input.getAttribute("type")).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input.getAttribute("type")).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input.getAttribute("type")).toBe("password");
  });

  it("warns when Caps Lock is on", () => {
    render(<PasswordInput value="" onChange={() => {}} />);
    const input = screen.getByLabelText("Password");
    // modifierCapsLock sets what event.getModifierState("CapsLock") returns in jsdom.
    fireEvent.keyUp(input, { key: "A", modifierCapsLock: true });
    expect(screen.queryByText("Caps Lock is on")).not.toBeNull();
  });
});
