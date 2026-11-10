import { useEffect, useState } from "react";

const suportado = () => typeof document !== "undefined" && document.fullscreenEnabled === true;

export function TelaCheiaBotao({ sobreEscuro = false }: { sobreEscuro?: boolean }) {
  const [cheia, setCheia] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    const atualizar = () => setCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", atualizar);
    return () => document.removeEventListener("fullscreenchange", atualizar);
  }, []);

  if (!suportado()) return null;

  const alternar = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };

  return (
    <button
      type="button"
      className={`tema-btn tela-cheia-btn ${sobreEscuro ? "claro" : ""}`}
      onClick={alternar}
      aria-label={cheia ? "Sair da tela cheia" : "Tela cheia"}
      title={cheia ? "Sair da tela cheia" : "Tela cheia"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {cheia ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
      </svg>
    </button>
  );
}
