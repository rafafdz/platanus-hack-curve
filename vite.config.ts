import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [TanStackRouterVite({}), react(), tailwind()],
});
