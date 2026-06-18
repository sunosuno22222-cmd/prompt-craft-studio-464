import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Sparkles, LayoutPanelLeft, Palette } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { RainbowBackground } from "./rainbow-background";
import { newChatId, savePending } from "@/lib/chat-store";

type CategoryId = "landing" | "dashboard" | "app";

const templateCategories: { id: CategoryId; label: string }[] = [
  { id: "landing", label: "Landing Pages" },
  { id: "dashboard", label: "Dashboards" },
  { id: "app", label: "Web Apps" },
];

const templates: Record<CategoryId, { title: string; desc: string; prompt: string }[]> = {
  landing: [
    {
      title: "SaaS Product Hero",
      desc: "Modern landing page with gradient hero, features grid, and waitlist form.",
      prompt:
        "Generate a modern SaaS landing page with a hero section, feature highlights, and an email waitlist form.",
    },
    {
      title: "Creator Portfolio",
      desc: "Minimalist dark-mode portfolio for showing off design or photo work.",
      prompt: "Create a dark mode minimalist portfolio website with a bento grid layout for projects.",
    },
  ],
  dashboard: [
    {
      title: "Analytics Overview",
      desc: "User engagement metrics with charts and recent activity log.",
      prompt:
        "Generate a dashboard interface showing user analytics, revenue charts, and a recent activity log.",
    },
    {
      title: "Project Kanban",
      desc: "Interactive kanban board to manage tasks across different columns.",
      prompt: "Create a task management dashboard featuring a drag-and-drop Kanban board layout.",
    },
  ],
  app: [
    {
      title: "Messaging Interface",
      desc: "Chat application layout with sidebar contacts and message thread.",
      prompt: "Generate a chat interface with a contact list sidebar and a main messaging view.",
    },
    {
      title: "E-Commerce Checkout",
      desc: "Multi-step checkout flow including cart summary and payment details.",
      prompt: "Create an e-commerce checkout page with an order summary card and payment input fields.",
    },
  ],
};

export function HomeScreen() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [targetFramework, setTargetFramework] = useState("React");
  const [targetStyle, setTargetStyle] = useState("Minimalist");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>("landing");

  const handleGenerate = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;
    setIsGenerating(true);
    const id = newChatId();
    savePending(id, {
      prompt: trimmed,
      framework: targetFramework,
      style: targetStyle,
      createdAt: Date.now(),
    });
    void navigate({ to: "/chat/$chatId", params: { chatId: id } });
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-white overflow-hidden font-sans select-none flex flex-col">
      <RainbowBackground />

      <div className="relative z-10 w-full h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-12 p-6 md:p-16">
          <header className="flex justify-start">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="font-bold tracking-widest uppercase text-[10px] sm:text-xs text-white/90">
                XZAFE AIcode
              </span>
            </div>
          </header>

          <section className="space-y-8">
            <div className="text-center space-y-3 mb-10 select-none">
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white/95 leading-[1.15]"
              >
                Generate a <span className="text-gradient-io">web interface</span>
              </motion.h1>
              <p className="text-white/50 text-sm md:text-base font-medium">powered by XZAFE</p>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="relative group/box">
                <div className="absolute -inset-1 bg-gradient-to-r from-io-blue/10 via-io-green/10 to-io-yellow/10 rounded-[1.5rem] blur opacity-30 group-focus-within/box:opacity-50 transition duration-1000" />
                <div className="relative bg-[#0d0d0d]/85 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] p-4 flex flex-col gap-3 group-focus-within/box:border-white/20 transition-all duration-300">
                  <textarea
                    rows={2}
                    placeholder="I want a website that..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleGenerate();
                      }
                    }}
                    className="w-full bg-transparent p-2 text-sm md:text-base font-normal text-white/90 focus:outline-none placeholder:text-white/20 resize-none min-h-[50px] leading-relaxed"
                  />

                  <div className="flex flex-wrap items-center justify-between border-t border-white/5 pt-3 mt-1.5 gap-4">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <div className="flex-1 sm:flex-none flex items-center gap-2 bg-white/[0.04] border border-white/5 rounded-full px-3 py-1.5 hover:bg-white/[0.08] transition-all focus-within:ring-2 focus-within:ring-io-blue focus-within:border-transparent">
                        <LayoutPanelLeft className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        <select
                          value={targetFramework}
                          onChange={(e) => setTargetFramework(e.target.value)}
                          className="w-full sm:w-auto bg-transparent border-none text-[11px] font-bold text-white/70 focus:outline-none focus:ring-0 cursor-pointer appearance-none uppercase tracking-wider pr-1"
                        >
                          <option value="React" className="bg-neutral-900 text-white">React + Tailwind</option>
                          <option value="Vanilla" className="bg-neutral-900 text-white">HTML / CSS</option>
                          <option value="NextJS" className="bg-neutral-900 text-white">Next.js</option>
                        </select>
                      </div>

                      <div className="flex-1 sm:flex-none flex items-center gap-2 bg-white/[0.04] border border-white/5 rounded-full px-3 py-1.5 hover:bg-white/[0.08] transition-all focus-within:ring-2 focus-within:ring-io-blue focus-within:border-transparent">
                        <Palette className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        <select
                          value={targetStyle}
                          onChange={(e) => setTargetStyle(e.target.value)}
                          className="w-full sm:w-auto bg-transparent border-none text-[11px] font-bold text-white/70 focus:outline-none focus:ring-0 cursor-pointer appearance-none uppercase tracking-wider pr-1"
                        >
                          <option value="Minimalist" className="bg-neutral-900 text-white">Minimalist</option>
                          <option value="Cyberpunk" className="bg-neutral-900 text-white">Dark & Tech</option>
                          <option value="Playful" className="bg-neutral-900 text-white">Playful & Vibrant</option>
                          <option value="Corporate" className="bg-neutral-900 text-white">Corporate Clean</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isGenerating || !prompt.trim()}
                      className="w-full sm:w-auto px-6 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-white rounded-full font-bold uppercase tracking-wider text-[11px] transition-all inline-flex items-center justify-center gap-2 group cursor-pointer shadow-lg shadow-black/30"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          Opening…
                        </>
                      ) : (
                        <>
                          Generate Interface
                          <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 text-[11px] text-white/30">
                <div className="flex items-center gap-2 font-medium">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#fbbc04]/80 animate-pulse shadow-[0_0_6px_rgba(251,188,4,0.5)]" />
                  <span>
                    Generations take <strong className="text-white/60 font-bold">seconds</strong> to design.
                  </span>
                </div>
              </div>
            </form>

            <div className="bg-[#0e0e0e]/50 border border-white/5 rounded-[1.5rem] p-5 flex flex-col gap-4 backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">
                    Try a template
                  </span>
                </div>
                <div className="flex gap-1 p-0.5 bg-white/[0.03] border border-white/5 rounded-full shrink-0 flex-wrap">
                  {templateCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-white text-black font-extrabold shadow-sm"
                          : "text-white/55 hover:text-white/85"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {templates[selectedCategory].map((tmpl) => (
                  <button
                    key={tmpl.title}
                    type="button"
                    onClick={() => {
                      setPrompt(tmpl.prompt);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={isGenerating}
                    className="text-left p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] active:bg-white/[0.06] transition-all duration-200 group relative overflow-hidden cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white/90 group-hover:text-white transition-colors">
                        {tmpl.title}
                      </span>
                      <span className="text-xs text-white/30 group-hover:text-white/70 transition-transform group-hover:translate-x-0.5 font-bold">
                        →
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-1 font-medium leading-relaxed group-hover:text-white/75 transition-colors">
                      {tmpl.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
