import { useEffect, useMemo, useState } from "react";
import { captureLandingEvent } from "../lib/posthog";

const DEFAULT_NUMBER = "393296849150";
const VALID_NUMBERS = new Set(["393913616734", "393296849150", "393924727326"]);

function getPhoneFromUrl() {
  if (typeof window === "undefined") return DEFAULT_NUMBER;

  const value = new URLSearchParams(window.location.search).get("phone") || "";
  const clean = value.replace(/\D/g, "");

  return VALID_NUMBERS.has(clean) ? clean : DEFAULT_NUMBER;
}

function formatItalianNumber(value: string) {
  const local = value.startsWith("39") ? value.slice(2) : value;
  return `+39 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export default function WhatsAppFallback() {
  const phone = useMemo(getPhoneFromUrl, []);
  const [copied, setCopied] = useState(false);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}`;
  const appUrl = `whatsapp://send?phone=${phone}`;

  useEffect(() => {
    captureLandingEvent("whatsapp_fallback_view", {
      whatsapp_number_international: phone,
      pathname: "/whatsapp",
    });
  }, [phone]);

  async function copyNumber() {
    await navigator.clipboard.writeText(formatItalianNumber(phone));
    setCopied(true);
    captureLandingEvent("whatsapp_fallback_copy", {
      whatsapp_number_international: phone,
      pathname: "/whatsapp",
    });
  }

  function trackOpen(method: string) {
    captureLandingEvent("whatsapp_open_attempt", {
      method,
      whatsapp_number_international: phone,
      pathname: "/whatsapp",
    });
  }

  return (
    <main className="min-h-screen text-white bg-[#03070d] flex items-center justify-center px-5 py-10">
      <div className="absolute inset-0 opacity-60 pointer-events-none" style={{
        background:
          "radial-gradient(circle at 50% 0%, rgba(59,130,246,0.20), transparent 34%), radial-gradient(circle at 20% 80%, rgba(34,197,94,0.12), transparent 28%), #03070d",
      }} />
      <section className="relative w-full max-w-[520px] border border-white/10 bg-white/[0.045] backdrop-blur-md rounded-2xl p-7 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <p className="text-[0.72rem] tracking-[0.18em] uppercase text-sky-200/75 mb-3">
          Interstellar Trading
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
          Contattaci su WhatsApp
        </h1>
        <p className="text-white/70 leading-relaxed mb-6">
          TikTok a volte blocca l'apertura automatica di WhatsApp. Puoi aprirlo da qui oppure copiare il numero.
        </p>

        <div className="rounded-xl border border-white/10 bg-black/25 p-4 mb-5">
          <span className="block text-xs uppercase tracking-[0.14em] text-white/45 mb-2">Numero</span>
          <strong className="text-2xl tracking-wide">{formatItalianNumber(phone)}</strong>
        </div>

        <div className="grid gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackOpen("api_whatsapp")}
            className="text-center rounded-xl px-5 py-4 font-semibold bg-[#25d366] text-white transition-colors hover:bg-[#1fb85a]"
          >
            Apri WhatsApp
          </a>
          <a
            href={appUrl}
            onClick={() => trackOpen("whatsapp_app")}
            className="text-center rounded-xl px-5 py-4 font-semibold border border-white/12 text-white/85 transition-colors hover:border-white/25 hover:text-white"
          >
            Prova ad aprire l'app
          </a>
          <button
            type="button"
            onClick={copyNumber}
            className="rounded-xl px-5 py-4 font-semibold border border-white/12 text-white/85 transition-colors hover:border-white/25 hover:text-white"
          >
            {copied ? "Numero copiato" : "Copia numero"}
          </button>
        </div>

        <a href="/" className="block mt-6 text-sm text-white/45 hover:text-white/75">
          Torna alla pagina
        </a>
      </section>
    </main>
  );
}
