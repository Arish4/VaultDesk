// Small UI state shared by the top bar and the pages.
import { create } from "zustand";

interface UiState {
  search: string;
  setSearch: (search: string) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  search: "",
  setSearch: (search) => set({ search }),
}));
