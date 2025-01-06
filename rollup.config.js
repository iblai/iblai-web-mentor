import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/index.js",
  output: {
    file: "dist/mentor-ai.js",
    format: "iife",
    name: "MentorAI",
    sourcemap: true,
  },
  plugins: [resolve(), terser()],
};
