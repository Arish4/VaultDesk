// Sidebar badge counts. Any page can call refresh() after an action that changes them
// (booking, cancelling, approving, reporting) without passing callbacks down through props.
import { create } from "zustand";
import { calendarApi } from "../api/vaultdesk";
import type { SummaryCounts } from "../types";
import { useAuthStore } from "./authStore";

interface SummaryState {
  counts: SummaryCounts | null;
  refresh: () => Promise<void>;
}

export const useSummaryStore = create<SummaryState>()((set) => ({
  counts: null,

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
