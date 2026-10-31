// Sidebar badge counts. Any page can call refresh() after an action that changes them
// (booking, cancelling, approving, reporting) without passing callbacks down through props.
import { create } from "zustand";
import { calendarApi } from "../api/vaultdesk";
import { useAuthStore } from "./authStore";

export const useSummaryStore = create((set) => ({
  counts: null, // { my_upcoming, open_issues, pending_approvals }

  async refresh() {
    if (useAuthStore.getState().status !== "authenticated") {
      set({ counts: null });
      return;
    }
    try {
      set({ counts: await calendarApi.summary() });
    } catch {
      // Badges are a nice-to-have: a failed refresh must never break the page.
    }
  },
}));

// Reload the badges whenever someone logs in or out.
useAuthStore.subscribe((state, previous) => {
  if (state.status !== previous.status) useSummaryStore.getState().refresh();
});
