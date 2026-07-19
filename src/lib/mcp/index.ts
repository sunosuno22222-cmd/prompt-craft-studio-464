import { defineMcp } from "@lovable.dev/mcp-js";
import generateUiTool from "./tools/generate-ui";

export default defineMcp({
  name: "xzafe-aicode-mcp",
  title: "XZAFE AIcode",
  version: "0.1.0",
  instructions:
    "Tools for XZAFE AIcode. Use `generate_ui` to produce a self-contained React app (App.jsx + styles.css) from a natural-language prompt.",
  tools: [generateUiTool],
});
