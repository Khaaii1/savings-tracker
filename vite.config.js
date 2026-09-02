import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This repo is deployed at https://khaaii1.github.io/savings-tracker/, so
// every built asset URL needs the "/savings-tracker/" prefix baked in —
// otherwise the browser requests /assets/index-xxxx.js from the domain
// root, gets a 404, and the page renders blank with no visible error.
//
// Vite's local dev server (`npm run dev`) ignores `base` for serving, so
// this doesn't affect local development. It only affects `vite build`.
// Override at build time if needed, e.g. for a different repo name:
//   VITE_BASE=/my-repo/ npm run build
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/savings-tracker/",
});
