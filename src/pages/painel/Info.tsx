import { useEffect, useId, useRef, useState } from "react";

export interface InfoTexto {
  oque: string; // o que o gráfico ou indicador mostra
  importa: string; // por que isso ajuda a decidir
  leitura?: string; // como ler / cuidados
}

/** Ícone "i" que abre um quadro curto explicando o gráfico. Fecha com Esc, clique fora ou no próprio ícone. */
export function Info({ titulo, texto }: { titulo: string; texto: InfoTexto }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);
  const id = useId();

  // só um quadro aberto por vez
  useEffect(() => {
    const outro = (e: Event) => (e as CustomEvent<string>).detail !== id && setAberto(false);
    window.addEventListener("info-abrir", outro);
    return () => window.removeEventListener("info-abrir", outro);
  }, [id]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent | TouchEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  return (
    <span className="info-wrap" ref={raiz}>
      <button
        type="button"
        className={`info-btn ${aberto ? "on" : ""}`}
        onClick={() => {
          if (!aberto) window.dispatchEvent(new CustomEvent("info-abrir", { detail: id }));
          setAberto((a) => !a);
        }}
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={`Sobre: ${titulo}`}
        title="O que é isto?"
      >
        i
      </button>
      {aberto && (
        <div className="info-pop" id={id} role="note">
          <b className="info-titulo">{titulo}</b>
          <p><span>O que mostra</span>{texto.oque}</p>
          <p><span>Por que importa</span>{texto.importa}</p>
          {texto.leitura && <p><span>Como ler</span>{texto.leitura}</p>}
        </div>
      )}
    </span>
  );
}
