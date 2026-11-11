import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "../../components/Logo";
import { InstalarBotao } from "../../lib/pwa";

const ICONES: Record<string, string> = {
  escola: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4",
  avaliacao: "M9 3h6v3H9zM7 4.5H6a2 2 0 0 0-2 2V20a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2h-1M9 14l2 2 4-4",
  detalhamento: "M5 20V11M12 20V5M19 20v-7",
  questoes: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6M12 17h.01",
  usuarios: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  configuracao: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  atualizar: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  sair: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  menu: "M4 6h16M4 12h16M4 18h16",
  seta: "M15 18l-6-6 6-6",
};

export function Icone({ nome }: { nome: string }) {
  return (
    <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONES[nome]} />
    </svg>
  );
}

interface Item {
  id: string;
  rotulo: string;
}

interface Props {
  eu: { nome: string; admin: boolean } | null;
  itens: readonly Item[];
  ativo: string;
  onEscolher: (id: string) => void;
  recolhido: boolean;
  onRecolher: () => void;
  aberto: boolean; // gaveta no celular
  onFechar: () => void;
  onSair: () => void;
}

/** Abaixo de 900px o menu é uma gaveta, sempre expandida. */
function useGaveta() {
  const q = "(max-width: 900px)";
  const [g, setG] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const f = () => setG(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return g;
}

export function MenuLateral({ eu, itens, ativo, onEscolher, recolhido, onRecolher, aberto, onFechar, onSair }: Props) {
  const gaveta = useGaveta();
  const compacto = recolhido && !gaveta;
  const acao = (nome: string, rotulo: string, onClick: () => void): ReactNode => (
    <button type="button" className="menu-item" onClick={onClick} title={rotulo}>
      <Icone nome={nome} />
      <span className="menu-rotulo">{rotulo}</span>
    </button>
  );

  return (
    <>
      <div className={`menu-fundo ${aberto ? "on" : ""}`} onClick={onFechar} aria-hidden="true" />
      <aside className={`menu-lateral ${recolhido ? "recolhido" : ""} ${aberto ? "aberto" : ""}`} aria-label="Menu principal">
        <div className="menu-interno">
          <div className="menu-marca">
            <Logo tamanho={compacto ? 38 : 46} neon tom="sobreVinho" soSimbolo={compacto} />
            <span className="menu-rotulo menu-titulo">Escola de Segurança<small>Relatórios</small></span>
          </div>

          <nav className="menu-nav" aria-label="Seções">
            {itens.map((i) => (
              <button
                key={i.id}
                type="button"
                className={`menu-item ${ativo === i.id ? "on" : ""}`}
                aria-current={ativo === i.id ? "page" : undefined}
                title={i.rotulo}
                onClick={() => onEscolher(i.id)}
              >
                <Icone nome={i.id} />
                <span className="menu-rotulo">{i.rotulo}</span>
              </button>
            ))}
          </nav>

          <div className="menu-rodape">
            {eu && (
              <div className="menu-usuario" title={`${eu.nome} · ${eu.admin ? "Administrador" : "Relatórios"}`}>
                <span className="menu-avatar" aria-hidden="true">{eu.nome.trim().charAt(0)}</span>
                <span className="menu-rotulo menu-quem">{eu.nome.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())}<small>{eu.admin ? "Administrador" : "Somente relatórios"}</small></span>
              </div>
            )}
            <div className="menu-instalar"><InstalarBotao sobreEscuro /></div>
            {acao("sair", "Sair", onSair)}
          </div>
        </div>

        <button
          type="button"
          className="menu-toggle"
          onClick={onRecolher}
          aria-label={recolhido ? "Expandir menu" : "Minimizar menu"}
          aria-expanded={!recolhido}
          title={recolhido ? "Expandir menu" : "Minimizar menu"}
        >
          <Icone nome="seta" />
        </button>
      </aside>
    </>
  );
}
