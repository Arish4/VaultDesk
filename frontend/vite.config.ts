// vitest/config adds the `test` section to the types of the normal Vite config.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the browser calls /api on the Vite server, which forwards to Django.
    proxy: { "/api": process.env.VITE_PROXY_TARGET ?? "http://127.0.0.1:8020" },
  },
  test: {
    environment: "jsdom",
    globals: true, // lets Testing Library clean up the DOM after every test automatically
  },
});
