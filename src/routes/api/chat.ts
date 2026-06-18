import { createFileRoute } from "@tanstack/react-router";
import { createGroq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { buildSystemPrompt } from "@/lib/system-prompt";

interface ChatBody {
  messages?: UIMessage[];
  framework?: string;
  style?: string;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          return new Response("Missing GROQ_API_KEY", { status: 500 });
        }

        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const groq = createGroq({ apiKey });
        const model = groq("openai/gpt-oss-120b");

        const result = streamText({
          model,
          system: buildSystemPrompt(body.framework ?? "React", body.style ?? "Minimalist"),
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
