export default {
  input: "src/index.js",
  output: {
    file: "dist/mentor-ai.js",
    format: "iife",
    name: "MentorAI",
  },
  plugins: [resolve(), terser()],
};
