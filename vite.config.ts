import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

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
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "./src/media-track-shims.d.ts",
          dest: ".",
        },
      ],
    }),
  ],
});
