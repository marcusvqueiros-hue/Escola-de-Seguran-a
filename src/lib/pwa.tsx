import { useEffect, useState } from "react";

/** Aponta o manifesto certo para cada link (avaliação ou painel) e registra o service worker. */
export function iniciarPWA() {
  const painel = location.pathname.startsWith("/painel");
  const add = (rel: string, href: string) => {
    const l = document.createElement("link");
    l.rel = rel;
    l.href = href;
    document.head.appendChild(l);
  };
  add("manifest", painel ? "/manifest-painel.webmanifest" : "/manifest.webmanifest");
  add("apple-touch-icon", "/icons/apple-touch-icon.png");
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
}

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

let guardado: EventoInstalar | null = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  guardado = e as EventoInstalar;
  window.dispatchEvent(new Event("pwa-instalavel"));
});
window.addEventListener("appinstalled", () => {
  guardado = null;
  window.dispatchEvent(new Event("pwa-instalavel"));
});

function useInstalar() {
  const [, forcar] = useState(0);
  useEffect(() => {
    const f = () => forcar((n) => n + 1);
    window.addEventListener("pwa-instalavel", f);
    return () => window.removeEventListener("pwa-instalavel", f);
  }, []);
  const instalado = matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return {
    pode: !!guardado && !instalado,
    ios: ios && !instalado,
    instalar: async () => {
      if (!guardado) return;
      await guardado.prompt();
      await guardado.userChoice;
      guardado = null;
      forcar((n) => n + 1);
    },
  };
}

export function InstalarBotao({ sobreEscuro = false }: { sobreEscuro?: boolean }) {
  const { pode, ios, instalar } = useInstalar();
  const [dica, setDica] = useState(false);
  if (!pode && !ios) return null;
  return (
    <span className="instalar-wrap">
      <button type="button" className={`instalar-btn ${sobreEscuro ? "claro" : ""}`} onClick={() => (pode ? instalar() : setDica((d) => !d))} aria-label="Instalar app">
        ⤓ <span className="instalar-txt">Instalar app</span>
      </button>
      {dica && <span className="instalar-dica">No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</span>}
    </span>
  );
}

export function AvisoOffline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return (
    <div className="aviso-offline" role="status">
      Sem conexão. Suas respostas ficam salvas neste aparelho; reconecte para enviar.
    </div>
  );
}
