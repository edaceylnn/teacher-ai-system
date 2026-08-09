import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, getAuthToken, setAuthToken } from "./api";

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("api request handling", () => {
  beforeEach(() => {
    setAuthToken(null);
  });

  it("retries a request once after a silent refresh when it gets a 401", async () => {
    setAuthToken("expired-token");
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ access_token: "new-token", teacher_id: 1, full_name: "Eda", email: "eda@example.com" }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, full_name: "Eda" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await api.getCurrentTeacher();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh");
    expect(result).toEqual({ id: 1, full_name: "Eda" });
    expect(getAuthToken()).toBe("new-token");

    vi.unstubAllGlobals();
  });

  it("does not retry more than once and clears the token when refresh also fails", async () => {
    setAuthToken("expired-token");
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.getCurrentTeacher()).rejects.toThrow("Oturum süresi doldu");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getAuthToken()).toBeNull();

    vi.unstubAllGlobals();
  });

  it("formats a FastAPI validation error array into a readable message", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: [{ msg: "Value error, Password must contain at least one digit" }] }), {
        status: 422,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.requestPasswordReset("eda@example.com")).rejects.toThrow(
      "Value error, Password must contain at least one digit",
    );

    vi.unstubAllGlobals();
  });

  it("treats a 202 Accepted with no body as success rather than a parse error", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.requestPasswordReset("eda@example.com")).resolves.toBeNull();

    vi.unstubAllGlobals();
  });
});
