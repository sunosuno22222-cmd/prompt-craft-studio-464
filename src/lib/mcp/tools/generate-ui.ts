import { defineTool } from "@lovable.dev/mcp-js";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/system-prompt";

export default defineTool({
  name: "generate_ui",
  title: "Generate UI",
  description:
    "Generate a complete, self-contained React UI (App.jsx + styles.css) from a prompt using XZAFE AIcode. Returns the raw model output containing <file path=\"...\">...</file> blocks.",
  inputSchema: {
    prompt: z.string().min(1).describe("What UI to build."),
    framework: z.string().optional().describe("Target framework. Defaults to React."),
    style: z.string().optional().describe("Visual style. Defaults to Minimalist."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ prompt, framework, style }) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return {
        content: [{ type: "text", text: "GROQ_API_KEY is not configured on the server." }],
        isError: true,
      };
    }

    const groq = createGroq({ apiKey });
    const { text } = await generateText({
      model: groq("openai/gpt-oss-120b"),
      system: buildSystemPrompt(framework ?? "React", style ?? "Minimalist"),
      prompt,
    });

    return { content: [{ type: "text", text }] };
  },
});
