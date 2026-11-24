import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface InfoTexto {
  oque: string; // o que o gráfico ou indicador mostra
  importa: string; // por que isso ajuda a decidir
  leitura?: string; // como ler / cuidados
}

const MARGEM = 12;

/**
 * Ícone "i" que abre um quadro curto explicando o gráfico. O quadro é desenhado direto no body (position: fixed),
 * então nenhum cartão com overflow o corta. Fecha com Esc, clique fora ou no próprio ícone; só um fica aberto por vez.
 */
export function Info({ titulo, texto }: { titulo: string; texto: InfoTexto }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; largura: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const quadro = useRef<HTMLDivElement>(null);
  const id = useId();

  // só um quadro aberto por vez
  useEffect(() => {
    const outro = (e: Event) => (e as CustomEvent<string>).detail !== id && setAberto(false);
    window.addEventListener("info-abrir", outro);
    return () => window.removeEventListener("info-abrir", outro);
  }, [id]);

  const posicionar = useCallback(() => {
    const b = botao.current?.getBoundingClientRect();
    if (!b) return;
    const largura = Math.min(340, window.innerWidth - MARGEM * 2);
    const left = Math.max(MARGEM, Math.min(b.right - largura, window.innerWidth - largura - MARGEM));
    const altura = quadro.current?.offsetHeight ?? 220;
    // abre embaixo; se não couber, abre em cima
    const embaixo = b.bottom + 8;
    const top = embaixo + altura > window.innerHeight - MARGEM && b.top - 8 - altura > MARGEM ? b.top - 8 - altura : embaixo;
    setPos({ top, left, largura });
  }, []);

  useLayoutEffect(() => {
    if (!aberto) return;
    posicionar();
    // segunda passada, já com a altura real do quadro
    const r = requestAnimationFrame(posicionar);
    return () => cancelAnimationFrame(r);
  }, [aberto, posicionar]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent | TouchEvent) => {
      const alvo = e.target as Node;
      if (!botao.current?.contains(alvo) && !quadro.current?.contains(alvo)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", posicionar);
    window.addEventListener("scroll", posicionar, true);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", posicionar);
      window.removeEventListener("scroll", posicionar, true);
    };
  }, [aberto, posicionar]);

  return (
    <span className="info-wrap">
      <button
        ref={botao}
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
      {aberto &&
        createPortal(
          <div
            ref={quadro}
            className="info-pop"
            id={id}
            role="note"
            style={pos ? { top: pos.top, left: pos.left, width: pos.largura } : { visibility: "hidden" }}
          >
            <b className="info-titulo">{titulo}</b>
            <p><span>O que mostra</span>{texto.oque}</p>
            <p><span>Por que importa</span>{texto.importa}</p>
            {texto.leitura && <p><span>Como ler</span>{texto.leitura}</p>}
          </div>,
          document.body,
        )}
    </span>
  );
}
