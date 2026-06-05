import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Сборка в ОДИН самодостаточный index.html (JS, CSS и картинки встроены).
// Такой файл можно скачать и открыть двойным кликом офлайн, без веб-сервера.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
  build: {
    target: "es2020",
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000, // встраиваем все ассеты (в т.ч. фон) в HTML
    chunkSizeWarningLimit: 5000,
  },
  server: {
    host: true,
    port: 5173,
  },
});
