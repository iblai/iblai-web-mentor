import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";
import babel from "@rollup/plugin-babel";

export default {
  input: "./src/index.ts",
  output: [
    {
      file: "./dist/iblai-web-mentor.esm.js",
      format: "esm", // For modern module systems
      sourcemap: true,
    },
    {
      file: "./dist/iblai-web-mentor.cjs.js",
      format: "cjs", // For Node.js compatibility
      sourcemap: true,
    },
    {
      file: "./dist/iblai-web-mentor.umd.js",
      format: "umd", // Universal module for global use
      name: "MentorAI", // Global variable name for <script> inclusion
      sourcemap: true,
    },
  ],
  plugins: [
    resolve(), // Resolve node_modules
    commonjs(), // Support CommonJS modules
    typescript({
      tsconfig: "./tsconfig.json", // Path to your TypeScript config
    }),
    babel({
      babelHelpers: "bundled",
      exclude: "node_modules/**",
      presets: [
        [
          "@babel/preset-env",
          {
            targets: "> 0.25%, not dead",
            modules: false,
          },
        ],
      ],
    }),
    terser(), // Minify the final output
  ],
  external: ["react", "react-dom", "zone.js"], // Mark React, Angular, or other dependencies as external
};
