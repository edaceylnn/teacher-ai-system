import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordPage from "./ResetPasswordPage";
import { api } from "../api";

vi.mock("../api", () => ({
  api: { confirmPasswordReset: vi.fn() },
}));

describe("ResetPasswordPage", () => {
  it("shows an error and does not call the API when the two passwords don't match", async () => {
    render(<ResetPasswordPage token="abc" onDone={vi.fn()} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Yeni parola"), "demo12345new");
    await user.type(screen.getByLabelText("Yeni parola (tekrar)"), "different1");
    await user.click(screen.getByRole("button", { name: /parolayı güncelle/i }));

    expect(screen.getByText("Parolalar eşleşmiyor.")).toBeInTheDocument();
    expect(api.confirmPasswordReset).not.toHaveBeenCalled();
  });

  it("confirms the reset with the token and shows the success state", async () => {
    api.confirmPasswordReset.mockResolvedValue(null);
    render(<ResetPasswordPage token="abc" onDone={vi.fn()} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Yeni parola"), "demo12345new");
    await user.type(screen.getByLabelText("Yeni parola (tekrar)"), "demo12345new");
    await user.click(screen.getByRole("button", { name: /parolayı güncelle/i }));

    expect(api.confirmPasswordReset).toHaveBeenCalledWith("abc", "demo12345new");
    expect(await screen.findByText(/parolan güncellendi/i)).toBeInTheDocument();
  });
});
