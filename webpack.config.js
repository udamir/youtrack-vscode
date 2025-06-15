// @ts-check
const path = require("node:path")

/** @type {import('webpack').Configuration} */
const config = {
  target: "node", // VS Code extensions run in a Node.js-context
  mode: "none", // this leaves the source code as close as possible to the original
  entry: "./src/extension.ts", // the entry point of this extension
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode", // the vscode-module is created on-the-fly and must be excluded
    // Add other modules that don't need to be bundled
    "node-fetch": "commonjs node-fetch",
  },
  resolve: {
    extensions: [".ts", ".js"], // support ts and js files
    fallback: {
      // Provide polyfills for Node.js core modules
      path: false,
      fs: false,
      os: false,
      zlib: false,
      crypto: false,
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
  devtool: "nosources-source-map",
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
  node: {
    // Don't attempt to polyfill or mock Node.js globals
    global: false,
    __filename: false,
    __dirname: false,
  },
}

module.exports = config
