// Small UI state shared by the top bar and the pages.
import { create } from "zustand";

export const useUiStore = create((set) => ({
  search: "",
  setSearch: (search) => set({ search }),
}));
