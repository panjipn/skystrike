import { defineConfig } from "vite";

// Relative base so the same build works on GitHub Pages project sites
// (/<repo>/) and when opened from a plain static folder at a booth.
export default defineConfig({ base: "./" });
