import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { createNvidiaProvider, NVIDIA_MODEL_ID } from "@/lib/nvidia";

interface ChatBody {
  messages?: UIMessage[];
  framework?: string;
  style?: string;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.NVIDIA_API_KEY;
        if (!apiKey) {
          return new Response("Missing NVIDIA_API_KEY", { status: 500 });
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

        const nvidia = createNvidiaProvider(apiKey);
        const model = nvidia(NVIDIA_MODEL_ID);

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
