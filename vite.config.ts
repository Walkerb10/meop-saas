import { defineConfig, normalizePath } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // ElevenLabs React SDK depends on these worklets for mic audio processing
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(
            path.resolve(
              __dirname,
              "node_modules/@elevenlabs/client/worklets/audioConcatProcessor.js"
            )
          ),
          dest: ".",
        },
        {
          src: normalizePath(
            path.resolve(
              __dirname,
              "node_modules/@elevenlabs/client/worklets/rawAudioProcessor.js"
            )
          ),
          dest: ".",
        },
      ],
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

