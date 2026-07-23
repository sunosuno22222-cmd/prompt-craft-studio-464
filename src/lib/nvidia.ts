import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// DeepSeek V4 Pro (1.6T params MoE, 49B ativos, contexto de 1M tokens).
// Docs: https://docs.api.nvidia.com/nim/reference/deepseek-ai-deepseek-v4-pro
export const NVIDIA_MODEL_ID = "thinkingmachines/inkling";

export function createNvidiaProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "nvidia",
    baseURL: "https://integrate.api.nvidia.com/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
