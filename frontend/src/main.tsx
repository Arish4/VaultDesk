import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { useAuthStore } from "./stores/authStore";
import "./styles.css";

// Zustand stores live outside React, so the session can be restored before the first render.
useAuthStore.getState().restoreSession();

// The "!" tells TypeScript the element exists: index.html always has <div id="root">.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
