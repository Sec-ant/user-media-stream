import { defineConfig } from "vite";
import { dependencies } from "./package.json";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: "./src/index.ts",
      },
      formats: ["es"],
      fileName: (_, entryName) => `${entryName}.js`,
    },
    outDir: "dist/es",
    rollupOptions: {
      external: [
        ...Object.keys(dependencies).map(
          (dep) => new RegExp(`^${escapeRegExp(dep)}(\/|$)`),
        ),
      ],
      output: {
        manualChunks: (id) => {
          if (/webrtc-adapter\/dist\/utils/.test(id)) {
            return "shim-utils";
          }
          if (/webrtc-adapter\/dist\/chrome/.test(id)) {
            return "shim-chrome";
          }
          if (/webrtc-adapter\/dist\/firefox/.test(id)) {
            return "shim-firefox";
          }
          if (/webrtc-adapter\/dist\/safari/.test(id)) {
            return "shim-safari";
          }
        },
        chunkFileNames: "[name]-[hash].js",
      },
    },
  },
});

function escapeRegExp(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
