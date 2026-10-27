import { defineConfig } from "vite";

export default defineConfig({
  // A stable origin keeps IndexedDB saves in the same browser database.
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 5173, strictPort: true },
});
