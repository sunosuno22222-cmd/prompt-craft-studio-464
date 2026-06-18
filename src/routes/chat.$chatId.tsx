import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Send, Sparkles, Code2, Eye, Loader2 } from "lucide-react";
import { readPending, clearPending } from "@/lib/chat-store";
import { parseFiles, stripFileBlocks, type ParsedFile } from "@/lib/parse-files";

export const Route = createFileRoute("/chat/$chatId")({
  head: () => ({
    meta: [{ title: "XZAFE AIcode — Generating" }],
  }),
  component: ChatPage,
});

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");
}

const STARTER_APP = `export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white">
      <div className="text-center space-y-3">
        <div className="text-5xl">✨</div>
        <h1 className="text-xl font-semibold">Generating your interface…</h1>
        <p className="text-white/50 text-sm">The preview will appear here.</p>
      </div>
    </div>
  );
}
`;

const SANDPACK_INDEX = `import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(<App />);
`;

const SANDPACK_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-neutral-950 text-white">
    <div id="root"></div>
  </body>
</html>
`;

const SANDPACK_STYLES = `/* Tailwind is loaded via CDN in index.html. Add custom CSS here. */
html, body { margin: 0; padding: 0; }
`;

function ChatPage() {
  const { chatId } = useParams({ from: "/chat/$chatId" });
  const [framework, setFramework] = useState("React");
  const [style, setStyle] = useState("Minimalist");
  const [view, setView] = useState<"preview" | "code">("preview");
  const [composer, setComposer] = useState("");
  const initialPromptRef = useRef<string | null>(null);
  const sentInitialRef = useRef(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Read the pending prompt from localStorage once on mount.
  useEffect(() => {
    const pending = readPending(chatId);
    if (pending) {
      initialPromptRef.current = pending.prompt;
      setFramework(pending.framework);
      setStyle(pending.style);
    }
  }, [chatId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ framework, style }),
      }),
    [framework, style],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
  });

  // Auto-send the initial prompt exactly once.
  useEffect(() => {
    if (sentInitialRef.current) return;
    const initial = initialPromptRef.current;
    if (!initial) return;
    sentInitialRef.current = true;
    void sendMessage({ text: initial });
    clearPending(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  // Auto-scroll on new messages / streaming.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";

  // Pull files from the most recent assistant message that has any.
  // Only recompute when not streaming, to avoid remounting Sandpack on every token.
  const [stableFiles, setStableFiles] = useState<ParsedFile[]>([]);
  useEffect(() => {
    if (isLoading) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role !== "assistant") continue;
      const files = parseFiles(getMessageText(m));
      if (files.length > 0) {
        setStableFiles(files);
        return;
      }
    }
  }, [isLoading, messages]);

  const latestFiles = stableFiles;

  const sandpackFiles = useMemo(() => {
    const files: Record<string, { code: string; hidden?: boolean; active?: boolean }> = {
      "/index.js": { code: SANDPACK_INDEX, hidden: true },
      "/public/index.html": { code: SANDPACK_HTML, hidden: true },
      "/styles.css": { code: SANDPACK_STYLES },
    };
    let hasApp = false;
    for (const f of latestFiles) {
      const cleaned = f.path.replace(/^\.\//, "").replace(/^\/+/, "");
      const sandpackPath = "/" + cleaned;
      if (/^\/?app\.(js|jsx|tsx?)$/i.test(sandpackPath)) {
        files["/App.js"] = { code: f.content, active: true };
        hasApp = true;
      } else {
        files[sandpackPath] = { code: f.content };
      }
    }
    if (!hasApp) {
      files["/App.js"] = { code: STARTER_APP, active: true };
    }
    return files;
  }, [latestFiles]);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = composer.trim();
    if (!trimmed || isLoading) return;
    setComposer("");
    void sendMessage({ text: trimmed });
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 backdrop-blur-md bg-black/60 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            New
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="font-bold tracking-widest uppercase text-[10px] text-white/80">
              XZAFE AIcode
            </span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[11px] text-white/40 font-medium">
          <Sparkles className="w-3 h-3" />
          <span>{framework}</span>
          <span>·</span>
          <span>{style}</span>
        </div>
      </header>

      {/* Main split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] min-h-0">
        {/* Chat panel */}
        <section className="flex flex-col min-h-0 border-r border-white/10 bg-[#0a0a0a]">
          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
            {messages.length === 0 && (
              <div className="text-center text-white/40 text-sm pt-10">
                Starting…
              </div>
            )}
            {messages.map((m) => {
              const text = getMessageText(m);
              const display = m.role === "assistant" ? stripFileBlocks(text) : text;
              return (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-white text-black text-sm font-medium shadow-lg"
                        : "max-w-[95%] text-white/90 text-sm leading-relaxed"
                    }
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10">
                        <ReactMarkdown>{display || "…"}</ReactMarkdown>
                        {parseFiles(text).length > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-io-green/90">
                            <Code2 className="w-3 h-3" />
                            {parseFiles(text).length} file
                            {parseFiles(text).length === 1 ? "" : "s"} generated
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{display}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{status === "submitted" ? "Thinking…" : "Generating code…"}</span>
              </div>
            )}
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error.message || "Something went wrong. Try again."}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-white/10 p-3 bg-black/60 backdrop-blur"
          >
            <div className="relative flex items-end gap-2 bg-white/[0.04] border border-white/10 rounded-2xl p-2 focus-within:border-white/25 transition-colors">
              <textarea
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as FormEvent);
                  }
                }}
                rows={1}
                placeholder="Ask for changes…"
                className="flex-1 bg-transparent resize-none text-sm text-white/90 placeholder:text-white/30 focus:outline-none px-2 py-1.5 max-h-32"
              />
              <button
                type="submit"
                disabled={!composer.trim() || isLoading}
                className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Preview panel */}
        <section className="flex flex-col min-h-0 bg-neutral-950">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
            <div className="flex gap-1 p-0.5 bg-white/[0.04] border border-white/10 rounded-full">
              <button
                type="button"
                onClick={() => setView("preview")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                  view === "preview" ? "bg-white text-black" : "text-white/60 hover:text-white"
                }`}
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => setView("code")}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                  view === "code" ? "bg-white text-black" : "text-white/60 hover:text-white"
                }`}
              >
                <Code2 className="w-3 h-3" />
                Code
              </button>
            </div>
            <span className="text-[10px] text-white/30 font-medium">
              {latestFiles.length === 0 ? "Awaiting generation" : `${latestFiles.length} file(s)`}
            </span>
          </div>

          <div className="flex-1 min-h-0">
            <Sandpack
              key={view}
              template="react"
              theme="dark"
              files={sandpackFiles}
              options={{
                showNavigator: false,
                showTabs: view === "code",
                showLineNumbers: true,
                editorHeight: "100%",
                editorWidthPercentage: view === "code" ? 100 : 0,
                showConsole: false,
              }}
              customSetup={{
                dependencies: {
                  react: "^18.0.0",
                  "react-dom": "^18.0.0",
                },
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
