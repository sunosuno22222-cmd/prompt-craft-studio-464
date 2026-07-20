import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// DeepSeek V3.1 Terminus é o checkpoint mais recente/forte da família DeepSeek
// disponível no catálogo NVIDIA NIM (não existe "V4 Pro" publicado ainda).
// Docs: https://docs.api.nvidia.com/nim/reference/deepseek-ai-deepseek-v3_1-terminus
export const NVIDIA_MODEL_ID = "deepseek-ai/deepseek-v3.1-terminus";

export function createNvidiaProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "nvidia",
    baseURL: "https://integrate.api.nvidia.com/v1",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
