import { beforeEach, describe, expect, it, vi } from "vitest";

// Replace the real API with fakes: these tests check the store's logic, not the network.
vi.mock("../api/vaultdesk", () => ({
  authApi: { login: vi.fn(), me: vi.fn(), register: vi.fn() },
  calendarApi: { summary: vi.fn() },
}));

import { tokenStore } from "../api/client";
import { authApi, calendarApi } from "../api/vaultdesk";
import { useAuthStore } from "./authStore";
import { useSummaryStore } from "./summaryStore";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  useAuthStore.setState({ status: "loading", user: null });
  useSummaryStore.setState({ counts: null });
});

describe("authStore", () => {
  it("login saves the tokens and the user", async () => {
    authApi.login.mockResolvedValue({ access: "a", refresh: "r" });
    authApi.me.mockResolvedValue({ username: "demo", is_staff: false });

    await useAuthStore.getState().login("demo", "secret");

    expect(useAuthStore.getState()).toMatchObject({ status: "authenticated", user: { username: "demo" } });
    expect(tokenStore.get()).toEqual({ access: "a", refresh: "r" });
  });

  it("restoreSession without saved tokens becomes anonymous without calling the API", async () => {
    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().status).toBe("anonymous");
    expect(authApi.me).not.toHaveBeenCalled();
  });

  it("restoreSession logs out when the saved token is rejected", async () => {
    tokenStore.set({ access: "old", refresh: "old" });
    authApi.me.mockRejectedValue(new Error("401"));

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().status).toBe("anonymous");
    expect(tokenStore.get()).toBeNull();
  });

  it("logs out when the API client reports an expired session", () => {
    useAuthStore.setState({ status: "authenticated", user: { username: "demo" } });

    window.dispatchEvent(new Event("vaultdesk:logout"));

    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", user: null });
  });
});

describe("summaryStore", () => {
  it("loads badge counts automatically after login", async () => {
    authApi.login.mockResolvedValue({ access: "a", refresh: "r" });
    authApi.me.mockResolvedValue({ username: "demo" });
    calendarApi.summary.mockResolvedValue({ my_upcoming: 3, open_issues: 2, pending_approvals: null });

    await useAuthStore.getState().login("demo", "secret");

    await vi.waitFor(() => expect(useSummaryStore.getState().counts).toEqual({
      my_upcoming: 3, open_issues: 2, pending_approvals: null,
    }));
  });

  it("does not call the API for guests", async () => {
    useAuthStore.setState({ status: "anonymous" });
    await useSummaryStore.getState().refresh();
    expect(calendarApi.summary).not.toHaveBeenCalled();
    expect(useSummaryStore.getState().counts).toBeNull();
  });
});
