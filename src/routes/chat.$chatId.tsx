import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Send,
  Code2,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Brain,
  FileCode2,
} from "lucide-react";
import { readPending, clearPending } from "@/lib/chat-store";
import { parseFiles, stripFileBlocks, type ParsedFile } from "@/lib/parse-files";

export const Route = createFileRoute("/chat/$chatId")({
  head: () => ({
    meta: [{ title: "XZAFE AIcode — Preview" }],
  }),
  component: ChatPage,
  errorComponent: ({ error, reset }) => (
    <div className="fixed inset-0 flex items-center justify-center bg-black text-white p-6">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="text-lg font-semibold">Algo falhou</h1>
        <p className="text-white/50 text-sm">{error.message || "Erro inesperado."}</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold"
          >
            Tentar de novo
          </button>
          <Link to="/" className="px-4 py-2 rounded-xl bg-white/10 text-sm font-semibold">
            Início
          </Link>
        </div>
      </div>
    </div>
  ),
});

function getMessageText(msg: UIMessage): string {
  return msg.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

const STARTER_APP = `export default function App() {
  return (
    <main className="starter-screen">
      <div className="starter-mark">XZ</div>
      <h1>Gerando sua interface…</h1>
      <p>O preview local aparece aqui quando os arquivos ficarem prontos.</p>
    </main>
  );
}
`;

const STARTER_CSS = `* { box-sizing: border-box; }
html, body, #root { width: 100%; min-height: 100%; margin: 0; }
body { font-family: Arial, Helvetica, sans-serif; background: #080808; color: #f8fafc; }
.starter-screen { min-height: 100vh; display: grid; place-items: center; align-content: center; gap: 14px; padding: 32px; text-align: center; background: radial-gradient(circle at 50% 20%, #292524, #080808 55%); }
.starter-mark { width: 56px; height: 56px; border: 1px solid rgba(255,255,255,.2); border-radius: 18px; display: grid; place-items: center; font-weight: 900; letter-spacing: .08em; background: rgba(255,255,255,.08); }
.starter-screen h1 { margin: 0; font-size: 24px; }
.starter-screen p { margin: 0; max-width: 360px; color: rgba(255,255,255,.62); }
`;

function canonicalFilePath(path: string) {
  const clean = path.replace(/^\.\//, "").replace(/^\/+/, "").trim();
  if (/^app\.(jsx?|tsx?)$/i.test(clean)) return "App.jsx";
  if (/^styles?\.css$/i.test(clean) || /^src\/styles?\.css$/i.test(clean)) return "styles.css";
  return clean.replace(/\.js$/i, ".jsx");
}

function normalizeParsedFiles(files: ParsedFile[]) {
  const byPath = new Map<string, string>();
  for (const file of files) {
    const path = canonicalFilePath(file.path);
    if (path && !/^(package\.json|index\.html|index\.[jt]sx?)$/i.test(path)) {
      byPath.set(path, file.content);
    }
  }
  if (!byPath.has("App.jsx")) byPath.set("App.jsx", STARTER_APP);
  if (!byPath.has("styles.css")) byPath.set("styles.css", STARTER_CSS);

  return Array.from(byPath, ([path, content]) => ({ path, content })).sort((a, b) => {
    const order = (path: string) => (path === "App.jsx" ? 0 : path === "styles.css" ? 1 : 2);
    return order(a.path) - order(b.path) || a.path.localeCompare(b.path);
  });
}

function filesSignature(files: ParsedFile[]) {
  return files.map((file) => `${file.path}:${file.content}`).join("\n---file---\n");
}

function getFile(files: ParsedFile[], path: string) {
  return files.find((file) => file.path.toLowerCase() === path.toLowerCase())?.content ?? "";
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeForStyle(value: string) {
  return value.replace(/<\/style/gi, "<\\/style");
}

function escapeForScript(value: string) {
  return value.replace(/<\/script/gi, "<\\/script");
}

function collectReactBindings(source: string) {
  const declarations: string[] = [];
  source.replace(/import\s+([^;]+?)\s+from\s+["']react["'];?/g, (_match, spec: string) => {
    const trimmed = spec.trim();
    const destructured = trimmed.match(/\{([^}]+)\}/)?.[1];
    const defaultName = trimmed.split(",")[0]?.trim();
    const namespaceName = trimmed.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)/)?.[1];

    if (namespaceName && namespaceName !== "React") declarations.push(`const ${namespaceName} = React;`);
    if (defaultName && !defaultName.startsWith("{") && !defaultName.startsWith("*") && defaultName !== "React") {
      declarations.push(`const ${defaultName} = React;`);
    }
    if (destructured) {
      const names = destructured
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
          const [name, alias] = item.split(/\s+as\s+/);
          return alias ? `${name.trim()}: ${alias.trim()}` : name.trim();
        })
        .join(", ");
      if (names) declarations.push(`const { ${names} } = React;`);
    }
    return "";
  });
  return declarations.join("\n");
}

function stripModuleSyntax(source: string) {
  return source
    .replace(/import\s+[^;]+?\s+from\s+["']react["'];?\n?/g, "")
    .replace(/import\s+["'][^"']+\.css["'];?\n?/g, "")
    .replace(/import\s+[^;]+?\s+from\s+["'][^"']+["'];?\n?/g, "")
    .replace(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/g, "function $1")
    .replace(/export\s+default\s+function\s*\(/g, "function __default__(")
    .replace(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/g, "")
    .replace(/export\s+default\s+/g, "const __default__ = ")
    .replace(/export\s+\{[^}]+\};?/g, "")
    .replace(/export\s+(const|let|var|function|class)\s+/g, "$1 ");
}

function prepareCombinedSource(files: ParsedFile[]) {
  const app = getFile(files, "App.jsx") || STARTER_APP;
  const others = files.filter(
    (f) => f.path !== "App.jsx" && !/\.css$/i.test(f.path),
  );
  const reactBindings = collectReactBindings([app, ...others.map((o) => o.content)].join("\n"));
  const combined = [
    reactBindings,
    ...others.map((o) => `// ---- ${o.path} ----\n${stripModuleSyntax(o.content)}`),
    `// ---- App.jsx ----\n${stripModuleSyntax(app)}`,
  ].join("\n\n");
  return combined;
}

function buildPreviewDocument(files: ParsedFile[]) {
  const css = getFile(files, "styles.css") || STARTER_CSS;
  const prepared = prepareCombinedSource(files);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>${escapeForStyle(css)}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/plain" id="__app_src">${escapeForScript(prepared)}</script>
    <script>
      (function(){
        var showError = function(err){
          var msg = String(err && (err.stack || err.message) || err).replace(/[&<>]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; });
          document.getElementById('root').innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;background:#080808;color:#fff;font-family:Arial,sans-serif;padding:24px"><div style="max-width:560px"><h1 style="font-size:18px;margin:0 0 8px">Erro no preview</h1><pre style="white-space:pre-wrap;color:#fb7185;background:rgba(255,255,255,.06);padding:14px;border-radius:12px;overflow:auto">' + msg + '</pre></div></main>';
        };
        window.addEventListener('error', function(e){ showError(e.error || e.message); });
        try {
          var src = document.getElementById('__app_src').textContent;
          var out = Babel.transform(src, { presets: [['react', { runtime: 'classic' }], ['typescript', { onlyRemoveTypeImports: true, ignoreExtensions: true }]], plugins: ['syntax-jsx'], filename: 'App.tsx' }).code;
          (new Function('React', 'ReactDOM', out + '\\nif (typeof App === "undefined") throw new Error("App.jsx precisa exportar um componente App como default."); ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));'))(window.React, window.ReactDOM);
        } catch(err) { showError(err); }
      })();
    </script>
  </body>
</html>`;
}


function LocalPreview({ files, nonce }: { files: ParsedFile[]; nonce: number }) {
  const srcDoc = useMemo(() => buildPreviewDocument(files), [files]);
  return (
    <iframe
      key={nonce}
      title="Preview local"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      srcDoc={srcDoc}
      className="h-full w-full border-0 bg-white"
    />
  );
}

const IDLE_STATUSES = [
  "Saudando…",
  "Analisando o pedido…",
  "Planejando componentes…",
  "Definindo estrutura…",
  "Escolhendo paleta…",
  "Preparando arquivos…",
];

function deriveStatus(text: string, tick: number): string {
  const opens = [...text.matchAll(/<file\s+path=["']([^"']+)["']\s*>/g)];
  const closes = [...text.matchAll(/<\/file>/g)];
  if (opens.length === 0) return IDLE_STATUSES[tick % IDLE_STATUSES.length];
  if (opens.length > closes.length) {
    return `Gerando ${opens[opens.length - 1][1]}…`;
  }
  return `Finalizando ${opens[opens.length - 1][1]}…`;
}

function StatusBubble({ text }: { text: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 900);
    return () => clearInterval(id);
  }, []);
  const status = deriveStatus(text, tick);
  return (
    <div className="inline-flex items-center gap-2.5 rounded-2xl bg-white/[0.05] border border-white/10 px-3.5 py-2">
      <Brain className="w-4 h-4 text-io-blue animate-pulse" />
      <span key={status} className="text-sm text-white/80 font-medium animate-in fade-in duration-300">
        {status}
      </span>
    </div>
  );
}



function CodeViewer({ files }: { files: ParsedFile[] }) {
  const [selected, setSelected] = useState(files[0]?.path ?? "App.jsx");
  const selectedFile = files.find((file) => file.path === selected) ?? files[0];

  useEffect(() => {
    if (!files.some((file) => file.path === selected)) setSelected(files[0]?.path ?? "App.jsx");
  }, [files, selected]);

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#070707]">
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 p-2">
        {files.map((file) => (
          <button
            key={file.path}
            type="button"
            onClick={() => setSelected(file.path)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
              selectedFile?.path === file.path ? "bg-white text-black" : "bg-white/10 text-white/65"
            }`}
          >
            {file.path}
          </button>
        ))}
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed text-white/80">
        <code>{selectedFile?.content ?? ""}</code>
      </pre>
    </div>
  );
}

function ChatPage() {
  const { chatId } = useParams({ from: "/chat/$chatId" });
  const [framework, setFramework] = useState("React");
  const [style, setStyle] = useState("Minimalist");
  const [view, setView] = useState<"preview" | "code">("preview");
  const [composer, setComposer] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const initialPromptRef = useRef<string | null>(null);
  const sentInitialRef = useRef(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (sentInitialRef.current) return;
    const initial = initialPromptRef.current;
    if (!initial) return;
    sentInitialRef.current = true;
    void sendMessage({ text: initial });
    clearPending(chatId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";
  const [stableFiles, setStableFiles] = useState<ParsedFile[]>([]);

  useEffect(() => {
    if (isLoading) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== "assistant") continue;
      const parsed = parseFiles(getMessageText(message));
      if (parsed.length > 0) {
        const normalized = normalizeParsedFiles(parsed);
        setStableFiles((current) =>
          filesSignature(current) === filesSignature(normalized) ? current : normalized,
        );
        return;
      }
    }
  }, [isLoading, messages]);

  const latestFiles = stableFiles.length > 0 ? stableFiles : normalizeParsedFiles([]);
  const generatedFileCount = stableFiles.length;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = composer.trim();
    if (!trimmed || isLoading) return;
    setComposer("");
    void sendMessage({ text: trimmed });
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white font-sans">
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/10 backdrop-blur-md bg-black/60 z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Novo
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <span className="font-bold tracking-widest uppercase text-[10px] text-white/80">
              XZAFE AIcode
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-[11px] font-bold uppercase tracking-wider transition-colors"
        >
          {previewOpen ? (
            <>
              <ChevronUp className="w-3 h-3" />
              Fechar preview
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              Abrir preview
              <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      </header>

      <div
        className={`flex-1 grid min-h-0 ${
          previewOpen ? "grid-cols-1 lg:grid-cols-[420px_1fr]" : "grid-cols-1"
        }`}
      >
        <section
          className={`flex flex-col min-h-0 bg-[#0a0a0a] ${
            previewOpen ? "border-r border-white/10 hidden lg:flex" : "flex"
          }`}
        >
          <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
            {messages.length === 0 && (
              <div className="text-center text-white/40 text-sm pt-10">Iniciando…</div>
            )}
            {messages.map((message, idx) => {
              const text = getMessageText(message);
              const isLastAssistant =
                message.role === "assistant" && idx === messages.length - 1;
              const streamingThis = isLastAssistant && isLoading;
              const display = message.role === "assistant" ? stripFileBlocks(text) : text;
              const files = message.role === "assistant" ? parseFiles(text) : [];
              return (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-white text-black text-sm font-medium shadow-lg"
                        : "max-w-[95%] text-white/90 text-sm leading-relaxed space-y-2"
                    }
                  >
                    {message.role === "assistant" ? (
                      streamingThis ? (
                        <StatusBubble text={text} />
                      ) : (
                        <>
                          {display && (
                            <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-pre:hidden prose-code:hidden">
                              <ReactMarkdown>{display}</ReactMarkdown>
                            </div>
                          )}
                          {files.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {files.map((f) => (
                                <button
                                  key={f.path}
                                  type="button"
                                  onClick={() => setPreviewOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] font-semibold text-white/85 transition"
                                >
                                  <FileCode2 className="w-3 h-3 text-io-blue" />
                                  {f.path}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )
                    ) : (
                      <span className="whitespace-pre-wrap">{display}</span>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading &&
              (messages.length === 0 || messages[messages.length - 1].role === "user") && (
                <div className="flex justify-start">
                  <StatusBubble text="" />
                </div>
              )}

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error.message || "Algo deu errado. Tente novamente."}
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
                placeholder="Peça mudanças…"
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

        {previewOpen && (
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
                  Código
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/30 font-medium hidden sm:inline">
                  {generatedFileCount === 0 ? "Aguardando" : `${generatedFileCount} arquivo(s)`}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewNonce((n) => n + 1)}
                  title="Recarregar preview"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {view === "preview" ? (
                <LocalPreview files={latestFiles} nonce={previewNonce} />
              ) : (
                <CodeViewer files={latestFiles} />
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
