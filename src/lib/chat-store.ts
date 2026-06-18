// Lightweight localStorage-backed pending-prompt store.
// Used to pass the initial prompt from the home page to the chat page
// without putting potentially long text in the URL.

const KEY_PREFIX = "xzafe:pending:";

export interface PendingPrompt {
  prompt: string;
  framework: string;
  style: string;
  createdAt: number;
}

export function savePending(id: string, data: PendingPrompt) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_PREFIX + id, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function readPending(id: string): PendingPrompt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPrompt;
  } catch {
    return null;
  }
}

export function clearPending(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_PREFIX + id);
  } catch {
    // ignore
  }
}

export function newChatId(): string {
  // Crypto.randomUUID is available in modern browsers + Workers
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
