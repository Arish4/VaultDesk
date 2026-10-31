// Global login state with Zustand: no Provider needed, components subscribe with a selector
// and only re-render when the slice they picked changes.
import { create } from "zustand";
import { tokenStore } from "../api/client";
import { authApi } from "../api/vaultdesk";

export const useAuthStore = create((set, get) => ({
  status: "loading", // loading | authenticated | anonymous
  user: null,

  /** On app start: if tokens are saved, ask the API who we are. */
  async restoreSession() {
    if (!tokenStore.get()) {
      set({ status: "anonymous", user: null });
      return;
    }
    try {
      set({ status: "authenticated", user: await authApi.me() });
    } catch {
      get().logout();
    }
  },

  async login(username, password) {
    tokenStore.set(await authApi.login(username, password));
    set({ status: "authenticated", user: await authApi.me() });
  },

  async register({ username, email, password }) {
    await authApi.register({ username, email, password });
    await get().login(username, password);
  },

  logout() {
    tokenStore.clear();
    set({ status: "anonymous", user: null });
  },
}));

// The API client fires this event when the refresh token is no longer valid.
// (An event instead of an import keeps client.js independent of the store.)
window.addEventListener("vaultdesk:logout", () => useAuthStore.getState().logout());
