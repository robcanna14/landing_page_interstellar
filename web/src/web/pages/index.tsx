import { useEffect, useRef, useState } from "react";
import { captureLandingEvent } from "../lib/posthog";

const IS_SSR = typeof window === "undefined";

const WHATSAPP_NUMBERS = ["3913616734", "3296849150", "3924727326"];

function openWhatsApp() {
  if (IS_SSR) return;
  const n = WHATSAPP_NUMBERS[Math.floor(Math.random() * WHATSAPP_NUMBERS.length)];
  captureLandingEvent("whatsapp_click", {
    whatsapp_number: n,
    pathname: window.location.pathname,
  });
  window.open(`https://wa.me/${n}`, "_blank");
}

/* ────────────────────────────────────────────
   STAR FIELD  — original v1 style
──────────────────────────────────────────── */
function StarField() {
  if (IS_SSR) return null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const stars: { x: number; y: number; r: number; o: number; speed: number }[] = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 169; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.1 + 0.15,
        o: Math.random(),
        speed: Math.random() * 0.00624 + 0.00156,
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.o += s.speed;
        if (s.o > 1) s.o = 0;
        const opacity = Math.abs(Math.sin(s.o * Math.PI));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 228, 240, ${opacity * 1.47})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.68 }} />;
}

/* ────────────────────────────────────────────
   SCAN LINE — original v1
──────────────────────────────────────────── */
function ScanLine() {
  return <div className="scan-line" />;
}

/* ────────────────────────────────────────────
   LOGO AURA — canvas-based spatial chaos
──────────────────────────────────────────── */
function LogoAura({ size = 96 }: { size?: number }) {
  if (IS_SSR) return null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const margin = 32;
    const S = size + margin * 2;
    canvas.width = S; canvas.height = S;
    const cx = S / 2, cy = S / 2, r = size / 2;

    // Spectrum — 6 hues as [r,g,b]
    const spectrum = [
      [251,191,36],  // amber
      [251,146,60],  // orange
      [248,113,113], // red
      [192,132,252], // violet
      [96,165,250],  // blue
      [34,211,238],  // cyan
    ];

    // Single slowly drifting hue index (float)
    let hueT = 0;
    let animId: number;
    // Opacity breathes on a slow sine
    let t = 0;

    const lerpColor = (a: number[], b: number[], f: number) =>
      a.map((v, i) => Math.round(v + (b[i] - v) * f));

    const draw = () => {
      t += 0.0042;   // drives the opacity breath — one full cycle ~2100 frames ~35s
      hueT += 0.00112; // advances hue wheel — very slow, one full spectrum ~7800 frames ~130s

      ctx.clearRect(0, 0, S, S);

      // Pick blended color from spectrum wheel
      const idx = hueT % 1 * spectrum.length;
      const i0 = Math.floor(idx) % spectrum.length;
      const i1 = (i0 + 1) % spectrum.length;
      const [rr, gg, bb] = lerpColor(spectrum[i0], spectrum[i1], idx - Math.floor(idx));

      // Gently oscillating opacity (0.40–0.62 range) — boosted ~30%
      const breathe = 0.66 + Math.sin(t) * 0.14;

      // Single unified radial glow — centered, no position offset
      // Layer 1: tight core ring at logo edge
      const g1 = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r + 18);
      g1.addColorStop(0,   `rgba(${rr},${gg},${bb},${(breathe * 0.72).toFixed(3)})`);
      g1.addColorStop(0.4, `rgba(${rr},${gg},${bb},${(breathe * 0.30).toFixed(3)})`);
      g1.addColorStop(1,   `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, S, S);

      // Layer 2: wider soft bloom
      const g2 = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r + margin);
      g2.addColorStop(0,   `rgba(${rr},${gg},${bb},0)`);
      g2.addColorStop(0.3, `rgba(${rr},${gg},${bb},${(breathe * 0.23).toFixed(3)})`);
      g2.addColorStop(1,   `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, S, S);

      // Cut out logo disc cleanly
      ctx.globalCompositeOperation = "destination-out";
      const cut = ctx.createRadialGradient(cx, cy, r * 0.78, cx, cy, r * 0.96);
      cut.addColorStop(0, "rgba(0,0,0,1)");
      cut.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cut;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [size]);

  const margin = 32;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: -margin, left: -margin,
        width: size + margin * 2,
        height: size + margin * 2,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

/* ────────────────────────────────────────────
   SCROLL REVEAL
──────────────────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(IS_SSR); // SSR: start visible so content is in HTML
  useEffect(() => {
    if (IS_SSR) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "", style = {} }: { children: React.ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(22px)",
        transition: `opacity 0.7s cubic-bezier(.4,0,.2,1) ${delay}ms, transform 0.7s cubic-bezier(.4,0,.2,1) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────
   NEON SPOTLIGHT — random start each cycle
──────────────────────────────────────────── */
// Three highlights 120° apart with organic per-highlight intensity fluctuation
function NeonSpotlight() {
  // Two divs: glow (blurred) + core (sharp) — exact visual match to first neon strip.
  // JS shifts background-position each rAF frame and picks a new random start offset
  // each cycle so the energy flow never consistently originates from the same point.
  const glowRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    const core = coreRef.current;
    if (!glow || !core) return;

    // Strip gradient — identical to first neon strip
    const GRAD = "linear-gradient(90deg,#f59e0b,#f97316,#ef4444,#a855f7,#3b82f6,#06b6d4,#f59e0b)";
    glow.style.background = GRAD;
    glow.style.backgroundSize = "200% 100%";
    core.style.background = GRAD;
    core.style.backgroundSize = "200% 100%";

    // Glow breathe: opacity oscillates 0.55→0.85 like ist-beam-glow (4s)
    const GLOW_MIN = 0.55, GLOW_MAX = 0.85, GLOW_PERIOD = 4000;

    const DURATION = 5667; // 6800 ÷ 1.2 — +20% speed
    let startTime: number | null = null;
    // Random offset 0–100% of cycle, chosen fresh each cycle
    let cycleOffset = Math.random();
    let prevCycle = 0;
    let raf: number;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const t = now - startTime;

      // Detect new cycle → new random start offset
      const cycle = Math.floor(t / DURATION);
      if (cycle !== prevCycle) {
        cycleOffset = Math.random();
        prevCycle = cycle;
      }

      // progress 0→1 within this cycle, shifted by random offset
      const raw = (t % DURATION) / DURATION;
      const progress = (raw + cycleOffset) % 1;

      // background-position: 0%→200% maps to one full gradient scroll
      const pos = `${(progress * 200).toFixed(2)}% 50%`;
      glow.style.backgroundPosition = pos;
      core.style.backgroundPosition = pos;

      // Glow opacity breathe (same as ist-beam-glow 4s ease-in-out)
      const breath = Math.sin(2 * Math.PI * (t % GLOW_PERIOD) / GLOW_PERIOD - Math.PI / 2);
      const base = GLOW_MIN + (GLOW_MAX - GLOW_MIN) * (breath * 0.5 + 0.5);

      // Irregular brightness surges: three sines at incommensurable periods.
      // They rarely align, but when they do they briefly constructively interfere
      // → short, unpredictable opacity spikes of +0.10–0.18 above base.
      // Individually each wave is gentle; combined peaks feel like energy bursts.
      const surge =
        0.055 * Math.sin(2 * Math.PI * t / 7300) +
        0.045 * Math.sin(2 * Math.PI * t / 4370 + 1.1) +
        0.035 * Math.sin(2 * Math.PI * t / 2810 + 2.7);
      // Only add positive surges (never dim below base), cap at +0.20
      const surgeAdd = Math.max(0, Math.min(surge, 0.20));
      const opacity = Math.min(base + surgeAdd, 1.0);
      glow.style.opacity = opacity.toFixed(3);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {/* Blurred glow layer — matches strip diffuse layer */}
      <div ref={glowRef} className="neon-border-glow" />
      {/* Sharp core layer — matches strip core beam */}
      <div ref={coreRef} className="neon-border-core" />
    </>
  );
}

/* ────────────────────────────────────────────
   WHATSAPP BUTTON
──────────────────────────────────────────── */
function WAButton({ label = "Scrivici su WhatsApp", size = "md", ghost = false }: {
  label?: string; size?: "md" | "lg"; ghost?: boolean;
}) {
  const pad = size === "lg" ? "px-8 py-4 text-[0.95rem]" : "px-6 py-3.5 text-sm";
  if (ghost) {
    return (
      <button onClick={openWhatsApp}
        className={`inline-flex items-center gap-2.5 font-semibold rounded-xl cursor-pointer transition-all duration-200 ${pad}`}
        style={{ border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.6)", background: "transparent" }}
        onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "rgba(255,255,255,0.28)"; b.style.color = "#fff"; }}
        onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "rgba(255,255,255,0.14)"; b.style.color = "rgba(255,255,255,0.6)"; }}
      >
        <WAIcon /> {label}
      </button>
    );
  }
  return (
    <button onClick={openWhatsApp}
      className={`inline-flex items-center gap-2.5 font-semibold rounded-xl cursor-pointer border-0 transition-all duration-200 ${pad}`}
      style={{ background: "#25d366", color: "#fff" }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#1fb85a"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#25d366"; }}
    >
      <WAIcon /> {label}
    </button>
  );
}

function WAIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ────────────────────────────────────────────
   SECTION LABEL
──────────────────────────────────────────── */
function Label({ children, color = "#7c9cbf" }: { children: React.ReactNode; color?: string }) {
  return (
    <p style={{ fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color, marginBottom: "1rem" }}>
      {children}
    </p>
  );
}

/* ────────────────────────────────────────────
   FAQ
──────────────────────────────────────────── */
const faqs = [
  { q: "C'è qualcosa che devo sapere prima di contattarvi?", a: "Sì.\nIl trading comporta rischi reali e nessuno può garantire risultati.\nPer questo preferiamo essere chiari fin dall'inizio su ciò che possiamo fare e su ciò che non possiamo promettere." },
  { q: "Perché non mostrate screenshot di profitti o testimonianze?", a: "Non perché non esistano.\nNel tempo abbiamo raccolto risultati e testimonianze reali.\nSemplicemente non vogliamo che una persona ci valuti sulla base di uno screenshot.\nPreferiamo che ci conosca, capisca come lavoriamo e si faccia una propria idea." },
  { q: "Perché non prendete tutti come clienti?", a: "Non perché vogliamo lavorare con poche persone a prescindere.\nSemplicemente crediamo che questo servizio non sia adatto a tutti.\nSe percepiamo che una persona non è a suo agio con i rischi che il trading comporta o ha aspettative che non possiamo condividere, preferiamo dirglielo subito.\nVogliamo che una collaborazione sia serena, sostenibile e positiva per entrambe le parti." },
  { q: "Perché non possiamo parlare solo su WhatsApp?", a: "Perché alcune cose si spiegano meglio in pochi minuti di call che in decine di messaggi.\nLa call ci permette di conoscerci meglio, rispondere alle tue domande in modo più chiaro e capire più velocemente se possiamo esserti utili.\nInoltre, non utilizziamo la call per spingerti a prendere decisioni o iniziare una collaborazione sul momento.\nAnzi, siamo i primi a sconsigliare l'inizio di una collaborazione durante la prima call.\nCrediamo che una scelta importante debba essere fatta con calma e consapevolezza.\nSe preferisci scriverci prima, puoi farlo tranquillamente." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${open ? "rgba(100,140,200,0.4)" : "rgba(255,255,255,0.13)"}`,
      background: open ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.03)",
      boxShadow: open ? "0 0 22px rgba(100,150,255,0.09), 0 0 1px rgba(255,255,255,0.10), inset 0 0 40px rgba(255,255,255,0.03)" : "0 0 16px rgba(255,255,255,0.055), 0 0 1px rgba(255,255,255,0.08), inset 0 0 30px rgba(255,255,255,0.02)",
      transition: "border-color .2s, background .2s, box-shadow .2s",
      overflow: "hidden",
    }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "24px 32px", cursor: "pointer", background: "transparent", border: "none", outline: "none" }}>
        <span style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: "1.125rem", letterSpacing: "-0.022em", color: open ? "#fff" : "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>{q}</span>
        <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, background: open ? "rgba(80,120,200,0.2)" : "rgba(255,255,255,0.06)", color: open ? "#90b4e8" : "rgba(255,255,255,0.35)", transition: "all .2s" }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && <div style={{ padding: "0 32px 26px", fontSize: "1rem", lineHeight: 1.82, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>{a.split("\n").map((line, i, arr) => <span key={i}>{line}{i < arr.length - 1 && <br />}</span>)}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────
   COSMOGRAPH — hero visual, elegant orbital
──────────────────────────────────────────── */
function Cosmograph() {
  return (
    <div style={{ position: "relative", width: 320, height: 320, flexShrink: 0 }}>
      <style>{`
        @keyframes spin-a { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-b { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes float-y { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .cosmo-wrap { animation: float-y 11s ease-in-out infinite; }
        .ring-a { animation: spin-a 50s linear infinite; }
        .ring-b { animation: spin-b 34s linear infinite; }
      `}</style>
      <div className="cosmo-wrap" style={{ width: "100%", height: "100%", position: "relative" }}>
        {/* Outer ring */}
        <div className="ring-a" style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(100,160,240,0.09)", boxShadow: "0 0 0 1px rgba(100,160,240,0.03)" }} />
        {/* Mid ring */}
        <div className="ring-b" style={{ position: "absolute", inset: 40, borderRadius: "50%", border: "1px solid rgba(140,100,220,0.10)" }} />
        {/* Glow core */}
        <div style={{
          position: "absolute", inset: 90, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(100,160,240,0.09) 0%, rgba(120,80,200,0.06) 50%, transparent 80%)",
          border: "1px solid rgba(100,160,240,0.14)",
          boxShadow: "0 0 40px rgba(100,160,240,0.06), inset 0 0 30px rgba(120,80,200,0.04)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "0.08em", color: "rgba(180,210,255,0.48)" }}>IST</span>
        </div>
        {/* Orbiting dots — outer ring */}
        {[0, 90, 180, 270].map((deg, i) => (
          <div key={i} className="ring-a" style={{ position: "absolute", inset: 0, borderRadius: "50%" }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: `rotate(${deg}deg) translateX(159px) translateY(-50%)`,
              width: 6, height: 6, borderRadius: "50%",
              background: i % 2 === 0 ? "rgba(120,180,255,0.4)" : "rgba(160,120,240,0.35)",
              boxShadow: i % 2 === 0 ? "0 0 8px rgba(120,180,255,0.25)" : "0 0 8px rgba(160,120,240,0.25)",
            }} />
          </div>
        ))}
        {/* Orbiting dots — mid ring */}
        {[60, 240].map((deg, i) => (
          <div key={i} className="ring-b" style={{ position: "absolute", inset: 40, borderRadius: "50%" }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: `rotate(${deg}deg) translateX(119px) translateY(-50%)`,
              width: 4, height: 4, borderRadius: "50%",
              background: "rgba(200,180,255,0.3)",
              boxShadow: "0 0 6px rgba(200,180,255,0.2)",
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PAGE
═══════════════════════════════════════════ */
export default function Index() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (IS_SSR) return;
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#020408", color: "#fff", fontFamily: "'Inter','Helvetica Neue',system-ui,sans-serif", overflowX: "hidden" as const }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html { height: -webkit-fill-available; }
        body { min-height: 100vh; min-height: -webkit-fill-available; font-family: 'Inter', 'Helvetica Neue', system-ui, sans-serif; font-size: 17px; font-weight: 400; line-height: 1.75; -webkit-font-smoothing: antialiased; moz-osx-font-smoothing: grayscale; }
        h1 { font-family: 'Space Grotesk', 'Helvetica Neue', system-ui, sans-serif; font-weight: 700; font-size: clamp(2.75rem, 5.5vw, 5.0rem); line-height: 1.12; letter-spacing: -0.034em; margin: 0; font-feature-settings: 'ss01' on, 'cv01' on; }
        h2 { font-family: 'Space Grotesk', 'Helvetica Neue', system-ui, sans-serif; font-weight: 700; font-size: clamp(2.0rem, 3.5vw, 3.375rem); line-height: 1.08; letter-spacing: -0.032em; margin: 0; font-feature-settings: 'ss01' on; }
        h3 { font-family: 'Space Grotesk', 'Helvetica Neue', system-ui, sans-serif; font-weight: 600; font-size: 1.0625rem; line-height: 1.5; letter-spacing: -0.018em; margin: 0; }
        /* ── Safe-area / dynamic viewport fixes ── */
        /* Nav: account for notch/status bar in all in-app browsers */
        nav {
          padding-top: env(safe-area-inset-top, 0px) !important;
          height: calc(112px + env(safe-area-inset-top, 0px)) !important;
        }
        /* Hero min-height: use dvh where available, fall back gracefully */
        .hero-section {
          min-height: 100vh; /* fallback */
          min-height: 100dvh; /* dynamic viewport — Chrome 108+, Safari 15.4+, Firefox 101+ */
        }

        @media (max-width: 768px) {
          html, body { font-size: 16px; }
          h1 { font-size: clamp(2.625rem, 10.5vw, 3.25rem); line-height: 1.04; }
          h2 { font-size: clamp(2.0rem, 8vw, 2.5rem); line-height: 1.1; }
          h3 { font-size: 1rem; }
          section { padding-left: 22px !important; padding-right: 22px !important; padding-top: 80px !important; padding-bottom: 80px !important; }
          nav > div { padding-left: 22px !important; padding-right: 22px !important; }
          footer { padding-left: 22px !important; padding-right: 22px !important; }
          .glass-card { padding: 24px !important; }
          .glass-card-accent { padding: 24px !important; }
          .comparison-grid { grid-template-columns: 1fr !important; }
          /* Hero top padding accounts for safe-area + nav height */
          .hero-section {
            padding-top: calc(120px + env(safe-area-inset-top, 0px)) !important;
          }
        }

        /* ── Original v1 nebula blobs ── */
        .nebula-1 {
          position: fixed; top: -20%; left: -10%; width: 80vw; height: 80vw;
          background: radial-gradient(circle, rgba(124,58,237,0.032) 0%, rgba(124,58,237,0.014) 35%, rgba(124,58,237,0.004) 60%, transparent 85%);
          filter: blur(18px);
          pointer-events: none; z-index: 0;
        }
        .nebula-2 {
          position: fixed; bottom: -20%; right: -10%; width: 72vw; height: 72vw;
          background: radial-gradient(circle, rgba(0,212,255,0.016) 0%, rgba(0,212,255,0.007) 35%, rgba(0,212,255,0.002) 60%, transparent 85%);
          filter: blur(22px);
          pointer-events: none; z-index: 0;
        }
        .nebula-3 {
          position: fixed; top: 40%; left: 30%; width: 50vw; height: 50vw;
          background: radial-gradient(circle, rgba(245,158,11,0.016) 0%, rgba(245,158,11,0.006) 40%, transparent 80%);
          filter: blur(24px);
          pointer-events: none; z-index: 0;
        }

        /* ── Grid overlay (original v1) ── */
        .grid-overlay {
          background-image:
            linear-gradient(#ffffff05 1px, transparent 1px),
            linear-gradient(90deg, #ffffff05 1px, transparent 1px);
          background-size: 60px 60px;
        }

        /* ── Scan line (original v1) ── */
        @keyframes scan {
          0% { top: 0%; opacity: 0.28; }
          100% { top: 100%; opacity: 0; }
        }
        .scan-line {
          position: absolute; left: 0; width: 100%; height: 1px;
          background: linear-gradient(90deg, transparent, #00d4ff44, transparent);
          animation: scan 8s linear infinite;
          pointer-events: none; z-index: 1;
        }

        /* ── Glass cards ── */
        .glass-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(80,130,210,0.13);
          border-radius: 16px;
          backdrop-filter: blur(8px);
          transition: border-color .25s;
        }
        .glass-card:hover { border-color: rgba(100,150,220,0.22); }
        .glass-card.gli-altri-card { border-color: rgba(200,40,40,0.55) !important; }

        .glass-card-accent {
          background: rgba(80,110,200,0.06);
          border: 1px solid rgba(100,150,220,0.2);
          border-radius: 16px;
          backdrop-filter: blur(8px);
        }

        /* ── Quote bar ── */
        .quote-bar { border-left: 2px solid rgba(100,150,220,0.4); padding-left: 20px; }

        /* ── Brand ambient mark ── */
        @keyframes ist-beam-shift {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes ist-beam-shift-core {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes ist-beam-glow {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
        @keyframes ist-pulse {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.75; }
        }

        /* logo aura: canvas-driven, no CSS needed */
        @keyframes ist-accent-shift {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        /* Neon border — living energy field */
        .neon-border-card {
          position: relative;
          border-color: transparent !important;
          background-clip: padding-box;
          box-shadow: 0 0 28px rgba(168,85,247,0.18), 0 0 55px rgba(96,165,250,0.12), 0 0 80px rgba(34,211,238,0.07);
          animation: ist-card-aura 11s ease-in-out infinite;
        }
        @keyframes ist-card-aura {
          0%         { box-shadow: 0 0 28px rgba(168,85,247,0.18), 0 0 55px rgba(96,165,250,0.12), 0 0 80px rgba(34,211,238,0.07); }
          18%        { box-shadow: 0 0 32px rgba(251,191,36,0.22), 0 0 60px rgba(251,146,60,0.14), 0 0 90px rgba(168,85,247,0.08); }
          45%        { box-shadow: 0 0 24px rgba(96,165,250,0.20), 0 0 50px rgba(34,211,238,0.13), 0 0 75px rgba(96,165,250,0.07); }
          72%        { box-shadow: 0 0 34px rgba(192,132,252,0.20), 0 0 62px rgba(168,85,247,0.14), 0 0 95px rgba(34,211,238,0.08); }
          100%       { box-shadow: 0 0 28px rgba(168,85,247,0.18), 0 0 55px rgba(96,165,250,0.12), 0 0 80px rgba(34,211,238,0.07); }
        }
        @keyframes ist-border-surge {
          0%        { filter: brightness(1.12) saturate(1.20);  }
          12%       { filter: brightness(1.32) saturate(1.32);  }
          28%       { filter: brightness(1.03) saturate(1.14);  }
          51%       { filter: brightness(1.37) saturate(1.34);  }
          67%       { filter: brightness(1.07) saturate(1.20);  }
          83%       { filter: brightness(1.23) saturate(1.30);  }
          100%      { filter: brightness(1.12) saturate(1.20);  }
        }
        .neon-border-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 17px;
          background: linear-gradient(90deg, #f59e0b, #f97316, #f56565, #b975f5, #3b9ef8, #06c9e8, #f59e0b);
          background-size: 200% 100%;
          animation:
            ist-accent-shift 6.67s linear infinite,
            ist-border-surge 17s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
          opacity: 1;
        }
        /* Neon strip energy flow — glow layer (blurred) */
        .neon-border-glow {
          position: absolute;
          inset: -3px;
          border-radius: 19px;
          pointer-events: none;
          z-index: 0;
          filter: blur(7px);
          opacity: 0.62;
          mask-image: none;
        }
        /* Neon strip energy flow — core layer (sharp) */
        .neon-border-core {
          position: absolute;
          inset: -1px;
          border-radius: 17px;
          pointer-events: none;
          z-index: 0;
          opacity: 0.9;
        }
        @keyframes ist-border-breathe {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 0.72; }
        }
        .neon-border-card::after {
          content: '';
          position: absolute;
          inset: 1px;
          border-radius: 16px;
          background: rgba(8,12,22,0.97);
          pointer-events: none;
          z-index: 1;
        }
        .neon-border-card > * { position: relative; z-index: 2; }

        .neon-divider {
          width: 100%; height: 1px;
          background: linear-gradient(90deg,
            rgba(251,191,36,0.55) 0%,
            rgba(239,68,68,0.45) 16%,
            rgba(168,85,247,0.55) 33%,
            rgba(59,130,246,0.45) 50%,
            rgba(6,182,212,0.55) 66%,
            rgba(239,68,68,0.45) 83%,
            rgba(251,191,36,0.55) 100%
          );
          background-size: 200% 100%;
          animation: ist-accent-shift 22s linear infinite;
          box-shadow: 0 0 8px rgba(168,85,247,0.25), 0 0 20px rgba(96,165,250,0.12);
        }

        .glass-card:hover {
          border-color: rgba(130,170,255,0.22) !important;
          box-shadow: 0 0 20px rgba(100,150,255,0.04);
        }

        /* Gli altri box — red border locked in all states, no blue override */
        .gli-altri-card,
        .gli-altri-card:hover,
        .gli-altri-card:focus,
        .gli-altri-card:focus-visible,
        .gli-altri-card:focus-within,
        .gli-altri-card:active {
          border-color: rgba(200,40,40,0.55) !important;
          outline: none !important;
          outline-offset: 0 !important;
          box-shadow: none !important;
        }
        /* Kill any browser-injected focus ring on this element */
        .gli-altri-card:focus-visible {
          outline: none !important;
        }

        /* ── Ticker ── */
        @keyframes cta-breathe {
          0%,100% {
            box-shadow:
              0 0 45px rgba(60,100,220,0.07), 0 0 90px rgba(60,100,220,0.03),
              0 0 0 1px rgba(80,130,220,0.18),
              0 0 8px rgba(80,130,220,0.1);
          }
          50% {
            box-shadow:
              0 0 65px rgba(200,215,255,0.13), 0 0 130px rgba(200,215,255,0.06), 0 0 190px rgba(180,200,255,0.03),
              0 0 0 1px rgba(190,210,255,0.32),
              0 0 14px rgba(190,210,255,0.13), 0 0 28px rgba(160,185,255,0.07);
          }
        }
        .cta-pulse { animation: cta-breathe 7s ease-in-out infinite; }

        /* ── WA button breathe ── */
        @keyframes wa-breathe {
          0%,100% { box-shadow: 0 0 0px rgba(37,211,102,0); transform: scale(1); }
          50%      { box-shadow: 0 4px 28px rgba(37,211,102,0.32), 0 0 48px rgba(37,211,102,0.14); transform: scale(1.013); }
        }
        .wa-alive { display: inline-block; animation: wa-breathe 3.2s ease-in-out infinite; border-radius: 12px; }

        /* ── Check rows ── */
        .check-row { display: flex; align-items: flex-start; gap: 12px; }
        .check-dot { flex-shrink:0; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.6rem; margin-top:2px; }
        .dot-green { background: rgba(34,197,94,0.12); color: #4ade80; }
        .dot-red   { background: rgba(239,68,68,0.10);  color: #f87171; }

        /* ── Badge ── */
        .badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 5px 14px; border-radius: 100px;
          border: 1px solid rgba(100,150,220,0.25);
          background: rgba(60,100,200,0.08);
          font-size: 0.7rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(160,195,255,0.8);
        }

        /* ── Divider ── */
        .section-divider { width:100%; height:1px; background: rgba(255,255,255,0.05); }
        /* overridden by neon-divider class directly in JSX */

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #020408; }
        ::-webkit-scrollbar-thumb { background: #00d4ff44; border-radius: 2px; }

        @media (max-width: 390px) {
          .hero-section { padding-left: 20px !important; padding-right: 20px !important; }
          .wa-alive button { font-size: 14px; padding-left: 20px; padding-right: 20px; white-space: nowrap; }
        }
        @media (max-width: 320px) {
          .hero-section { padding-left: 16px !important; padding-right: 16px !important; }
          section { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>

      {/* BG layers — original v1 */}
      <div className="nebula-1" />
      <div className="nebula-2" />
      <div className="nebula-3" />
      <StarField />

      {/* ══════════════════════════
          NAV
      ══════════════════════════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        height: 112,
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
        background: scrolled ? "rgba(2,4,8,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        transition: "all .3s",
        display: "flex", alignItems: "center",
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Logo — canvas-driven spatial aura */}
          <div style={{ position: "relative", width: 96, height: 96, display: "inline-block" }}>
            <LogoAura size={96} />
            {/* Logo image */}
            <img src="/logo.jpg" alt="Interstellar" style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              borderRadius: "50%", objectFit: "cover",
              display: "block", zIndex: 2,
            }} />
          </div>
        </div>
      </nav>

      {/* ══════════════════════════
          HERO
      ══════════════════════════ */}
      <section className="grid-overlay hero-section" style={{ position: "relative", zIndex: 10, display: "flex", alignItems: "center", padding: "120px 40px 80px" }}>
        <ScanLine />
        <div style={{ maxWidth: 800, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <Reveal>
              <h1 style={{ marginBottom: "1.5rem", marginTop: "0.5rem", color: "#fff" }}>
                Prima la fiducia.<br />
                <span style={{ color: "rgba(140,185,255,0.82)", fontWeight: 500, letterSpacing: "-0.028em" }}>Poi il trading.</span>
              </h1>
            </Reveal>
            {/* IST neon energy beam */}
            <div style={{ display: "block", margin: "0 auto 2.5rem", width: 220, position: "relative" }}>
              {/* Diffuse glow layer */}
              <div style={{
                position: "absolute",
                top: "50%", left: 0, right: 0,
                transform: "translateY(-50%)",
                height: 12,
                borderRadius: 12,
                background: "linear-gradient(90deg, #f59e0b, #f97316, #ef4444, #a855f7, #3b82f6, #06b6d4, #f59e0b)",
                backgroundSize: "200% 100%",
                filter: "blur(6px)",
                opacity: 0.62,
                animation: "ist-beam-shift 8s linear infinite, ist-beam-glow 4s ease-in-out infinite",
              }} />
              {/* Core beam line */}
              <div style={{
                position: "relative",
                height: 1.5,
                borderRadius: 2,
                background: "linear-gradient(90deg, #fbbf24, #fb923c, #f87171, #c084fc, #60a5fa, #22d3ee, #fbbf24)",
                backgroundSize: "200% 100%",
                animation: "ist-beam-shift 8s linear infinite",
              }} />
            </div>
            <Reveal delay={100}>
              <p style={{ fontSize: "1.1875rem", lineHeight: 1.7, color: "rgba(255,255,255,0.42)", marginBottom: "1.1rem", maxWidth: 660, fontWeight: 400 }}>
                Nel trading circolano molte promesse. Guadagni facili, screenshot di profitti, soluzioni infallibili. Li hai già visti.
              </p>
              <p style={{ fontSize: "1.1875rem", fontWeight: 500, lineHeight: 1.7, color: "rgba(255,255,255,0.78)", marginBottom: "2.5rem", maxWidth: 660 }}>
                Noi partiamo da un presupposto diverso: senza fiducia, il trading non ha basi solide.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <span style={{ display: "inline-block", borderRadius: 12, boxShadow: "0 0 22px rgba(37,211,102,0.28), 0 0 48px rgba(37,211,102,0.11)" }}>
                <WAButton label="Scrivici ora su WhatsApp" size="lg" />
              </span>
            </Reveal>
        </div>

        {/* Bottom fade */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to bottom, transparent, #020408)", pointerEvents: "none" }} />
      </section>

      {/* ══════════════════════════
          TRUST SECTION
      ══════════════════════════ */}
      <section style={{ position: "relative", zIndex: 10, padding: "100px 40px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: "4.5rem" }}>
            <Label>Il punto di partenza</Label>
            <h2 style={{ color: "#fff", marginBottom: "0" }}>
              La fiducia è<br />il fondamento.
            </h2>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
            {[
              { title: "Il problema non è il trading.", text: "Il problema è a chi ti affidi. Abbiamo visto persone perdere soldi non perché avessero fatto qualcosa di sbagliato, ma perché si sono affidate alle persone sbagliate. Chi prometteva molto e consegnava poco. Chi spariva dopo il pagamento. Chi vendeva aspettative invece di trasparenza. Per questo, prima del trading, viene la fiducia." },
              { title: "La fiducia si costruisce partendo dalla trasparenza.", text: "Per questo preferiamo essere chiari fin dal primo contatto. Non ti chiediamo di fidarti sulla parola. Non ti chiediamo di prendere decisioni affrettate. Ti chiediamo solo di parlarci. Poi sarai tu a decidere se siamo le persone giuste a cui affidarti." },
              { title: "Non lavoriamo con chi non siamo convinti di poter aiutare.", text: "Se riteniamo di non poter portare valore reale a qualcuno, lo diciamo apertamente. Preferiamo rinunciare a un cliente piuttosto che creare aspettative che non possiamo mantenere." },
              { title: "Preferiamo pochi rapporti solidi.", text: "Non inseguiamo volumi.\nNon lavoriamo con l'obiettivo di riempire una lista clienti.\nVogliamo costruire rapporti con persone che cercano chiarezza, serietà e un approccio sostenibile nel tempo." },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 60}>
                {/* card index 1 gets subtle neon border accent (~25% of 4) */}
                <div className="glass-card" style={{ padding: 36, height: "100%" }}>
                  <h3 style={{ color: "rgba(255,255,255,0.96)", marginBottom: "0.75rem" }}>{c.title}</h3>
                  <p style={{ fontSize: "1rem", lineHeight: 1.82, color: "rgba(255,255,255,0.38)", fontWeight: 400 }}>{c.text}</p>
                </div>
              </Reveal>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════
          STORY
      ══════════════════════════ */}
      <section id="storia" style={{ position: "relative", zIndex: 10, padding: "110px 40px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Reveal style={{ textAlign: "center", marginBottom: "4.5rem" }}>
            <Label>La nostra storia</Label>
            <h2 style={{ color: "#fff" }}>
              Perché abbiamo<br />fondato Interstellar.
            </h2>
          </Reveal>

          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            {[
              { text: "Interstellar non nasce da un piano su carta.\nNasce dall'esperienza diretta, da anni passati a osservare da vicino questo settore.\nAbbiamo visto cosa funziona.\nMa abbiamo visto anche troppe persone fare promesse che non avrebbero mai mantenuto.", highlight: false },
              { text: "Abbiamo visto persone affidarsi a strutture che non meritavano quella fiducia.\nPromesse non mantenute.\nComunicazione che cambiava da un giorno all'altro.\nSupporto che spariva dopo il pagamento.", highlight: false },
              { text: "A un certo punto abbiamo scelto di costruire qualcosa di diverso.\nQualcosa costruito nel modo in cui avremmo voluto trovarlo noi.", highlight: true },
              { text: "Non siamo perfetti, e non lo pretendiamo.\nMa ci impegniamo a essere coerenti.\nPer noi un cliente non è un numero.\nCrediamo nei rapporti che si costruiscono nel tempo, con presenza, trasparenza e rispetto reciproco.\nMolte delle persone che si affidano a noi restano in contatto ben oltre il semplice rapporto cliente-servizio.\nE diciamo la verità, anche quando non è quella che qualcuno vorrebbe sentirsi dire.", highlight: false },
              { text: "Interstellar esiste perché crediamo che in questo settore si possa lavorare in modo diverso.\nSenza promesse false.\nSenza scorciatoie vendute come certezze.\nSenza sparire quando serve presenza.\nE noi abbiamo scelto di dimostrarlo ogni giorno.", highlight: true },
            ].map((p, i) => (
              <Reveal key={i} delay={i * 55}>
                <p className={p.highlight ? "quote-bar" : ""}
                  style={{ fontSize: "1rem", lineHeight: 1.82, color: p.highlight ? "rgba(255,255,255,0.84)" : "rgba(255,255,255,0.38)", fontWeight: p.highlight ? 500 : 400 }}>
                  {p.text}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ position: "relative", zIndex: 10, padding: "0 40px" }}>
        <div className="neon-divider" style={{ maxWidth: 1180, margin: "0 auto", animationDuration: "10.55s" }} />
      </div>

      {/* ══════════════════════════
          WHY DIFFERENT
      ══════════════════════════ */}
      <section style={{ position: "relative", zIndex: 10, padding: "100px 40px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <Reveal style={{ marginBottom: "4.5rem", textAlign: "center" }}>
            <Label>Il nostro approccio</Label>
            <h2 style={{ color: "#fff" }}>
              Un approccio diverso.
            </h2>
          </Reveal>

          {/* Comparison */}
          <div className="comparison-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 1100, margin: "0 auto 40px" }}>
            {/* Others */}
            <Reveal>
              <div className="glass-card gli-altri-card" style={{ padding: 40, height: "100%", borderColor: "rgba(200,40,40,0.55)", background: "rgba(239,68,68,0.02)", outline: "none" }}>
                <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(248,113,113,0.65)", marginBottom: "1.75rem" }}>Gli altri</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {["Mostrano solo ciò che conviene mostrare", "Promesse di guadagni garantiti", "Pressione commerciale continua", "Promesse che cambiano nel tempo", "Supporto assente dopo il pagamento", "Risposte vaghe alle domande difficili", "Comunicazione costruita per vendere"].map(t => (
                    <div key={t} className="check-row">
                      <span className="check-dot dot-red">✕</span>
                      <span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.65, fontWeight: 400 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Interstellar — primary value card, neon border accent */}
            <Reveal delay={80}>
              <div className="glass-card-accent neon-border-card" style={{ padding: 40, height: "100%" }}>
                <NeonSpotlight />
                <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(130,180,255,0.8)", marginBottom: "1.75rem" }}>Interstellar</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {["Mostriamo la realtà, non solo ciò che conviene", "Chiarezza su rischi e aspettative reali", "Nessuna pressione, mai", "Aspettative chiare fin dal primo giorno", "Supporto presente lungo tutto il percorso", "Risposte dirette, anche alle domande difficili", "Rapporti di qualità, non volumi"].map(t => (
                    <div key={t} className="check-row">
                      <span className="check-dot dot-green">✓</span>
                      <span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.65, fontWeight: 400 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

        </div>
      </section>

      {/* ══════════════════════════
          HOW IT WORKS
      ══════════════════════════ */}
      <section style={{ position: "relative", zIndex: 10, padding: "100px 40px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <Reveal style={{ marginBottom: "4.5rem", textAlign: "center" }}>
            <Label>Come funziona</Label>
            <h2 style={{ color: "#fff", marginBottom: "0.75rem" }}>
              Il primo<br />contatto.
            </h2>
            <p style={{ fontSize: "1.09375rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.75 }}>
              Non stai entrando in un processo di vendita.<br/>Non devi decidere nulla oggi.<br/>Ecco cosa succede concretamente quando ci scrivi.
            </p>
          </Reveal>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { step: "01", title: "Ci scrivi su WhatsApp.", text: "Ci racconti la tua situazione e cosa ti ha portato fin qui.\nValutiamo se possiamo davvero aiutarti.\nSe ha senso approfondire, organizziamo una call per conoscerci meglio.", note: "Parliamo, poi decidiamo." },
              { step: "02", title: "Facciamo una call.", text: "Ci conosciamo meglio.\nTu puoi farci tutte le domande che desideri.\nNoi ti spieghiamo come lavoriamo, rispondiamo con sincerità e ti mettiamo nelle condizioni di valutare serenamente se proseguire oppure no.\nNon utilizziamo finte urgenze, pressioni o metodi pensati per convincerti a prendere decisioni sul momento.\nPer noi non è corretto.", note: "Nessuna decisione sul momento" },
              { step: "03", title: "Ti lasciamo il tuo tempo.", text: "Dopo la call, ti lasciamo il tempo necessario per riflettere.\nNessuna fretta.\nNessuna pressione.\nNon riceverai chiamate, messaggi o solleciti per spingerti a prendere una decisione o fissare un'altra call.\nQuando avrai deciso, saprai sempre come contattarci.\nFino ad allora, rispetteremo il tuo tempo e la tua scelta.", note: "La palla rimane a te" },
              { step: "04", title: "Se decidi di proseguire.", text: "Se deciderai di proseguire, organizzeremo insieme i passi successivi.\nChe avvenga attraverso una nuova call o direttamente su WhatsApp, avrai sempre chiarezza su tutto.\nTi accompagneremo passo dopo passo.\nSe invece deciderai di non proseguire, ti chiederemo semplicemente di comunicarcelo.\nCi aiuterà a chiudere il confronto con la stessa chiarezza e correttezza con cui lo abbiamo iniziato.\nRispetteremo la tua decisione e non ti contatteremo ulteriormente.", note: "Una scelta chiara per entrambi" },
            ].map((s, i, arr) => (
              <Reveal key={s.step} delay={i * 65}>
                <div style={{ display: "flex", gap: 20, paddingBottom: i < arr.length - 1 ? 40 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(80,120,200,0.1)", border: "1px solid rgba(100,150,220,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(130,180,255,0.8)", letterSpacing: "0.05em" }}>{s.step}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ width: 1, flex: 1, marginTop: 8, background: "rgba(255,255,255,0.05)" }} />}
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <h3 style={{ color: "rgba(255,255,255,0.96)", marginBottom: "0.5rem" }}>{s.title}</h3>
                    <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.82, marginBottom: "0.5rem", fontWeight: 400 }}>{s.text}</p>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "rgba(120,170,255,0.6)" }}>{s.note}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <div className="glass-card-accent cta-pulse" style={{ marginTop: 72, padding: 36, textAlign: "center", borderRadius: 16 }}>
              <p style={{ fontSize: "1.0625rem", color: "rgba(255,255,255,0.45)", marginBottom: "1.5rem", fontWeight: 400 }}>Facciamo il primo passo.</p>
              <span className="wa-alive"><WAButton label="Scrivici ora su WhatsApp" size="lg" /></span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Divider ── */}
      <div style={{ position: "relative", zIndex: 10, padding: "0 40px" }}>
        <div className="neon-divider" style={{ maxWidth: 1180, margin: "0 auto", animationDuration: "10.55s" }} />
      </div>

      {/* ══════════════════════════
          FAQ
      ══════════════════════════ */}
      <section style={{ position: "relative", zIndex: 10, padding: "100px 40px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <Reveal style={{ marginBottom: "4rem", textAlign: "center" }}>
            <Label>Domande frequenti</Label>
            <h2 style={{ color: "#fff" }}>
              Domande dirette,<br />risposte chiare.
            </h2>
          </Reveal>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {faqs.map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
          </div>

        </div>
      </section>

      {/* ══════════════════════════
          FOOTER
      ══════════════════════════ */}
      <footer style={{ position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)", padding: "36px 40px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <img src="/logo.jpg" alt="Interstellar" style={{ height: 40, width: 40, borderRadius: "50%", objectFit: "cover", opacity: 0.6, display: "block" }} />
          <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.16)", maxWidth: 500, lineHeight: 1.6, textAlign: "center" }}>
            © 2025 Interstellar Trading. Tutti i diritti riservati. Il trading comporta rischi reali. I risultati passati non sono indicativi di risultati futuri. Opera solo con capitali che puoi permetterti di rischiare.
          </p>
        </div>
      </footer>


    </div>
  );
}
