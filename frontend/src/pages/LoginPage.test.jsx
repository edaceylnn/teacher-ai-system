import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./LoginPage";
import { api } from "../api";

vi.mock("../api", () => ({
  api: { requestPasswordReset: vi.fn() },
}));

describe("LoginPage", () => {
  it("submits the current form values via onLogin", async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginPage error="" onLogin={onLogin} setError={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: /giriş yap/i }));

    expect(onLogin).toHaveBeenCalledWith({ email: "eda@example.com", password: "demo12345" });
  });

  it("shows an error message passed in from the parent", () => {
    render(<LoginPage error="Invalid email or password" onLogin={vi.fn()} setError={vi.fn()} />);

    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
  });

  it("switches to forgot-password mode and requests a reset link", async () => {
    api.requestPasswordReset.mockResolvedValue(null);
    render(<LoginPage error="" onLogin={vi.fn()} setError={vi.fn()} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Parolamı unuttum" }));
    expect(screen.getByRole("heading", { name: "Parolamı Unuttum" })).toBeInTheDocument();

    // The email field carries over the value already entered on the login form.
    expect(screen.getByLabelText("E-posta")).toHaveValue("eda@example.com");
    await user.click(screen.getByRole("button", { name: /sıfırlama bağlantısı gönder/i }));

    expect(api.requestPasswordReset).toHaveBeenCalledWith("eda@example.com");
    expect(
      await screen.findByText("Bu e-posta sistemde kayıtlıysa, sıfırlama bağlantısı gönderildi."),
    ).toBeInTheDocument();
  });
});
