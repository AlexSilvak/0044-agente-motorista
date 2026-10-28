import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" é necessário para o Capacitor carregar os arquivos localmente.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "www", emptyOutDir: true },
});
