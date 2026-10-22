import { useEffect, useState } from "react";

export type Tema = "claro" | "escuro";

const atual = (): Tema => (document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro");

export function useTema() {
  const [tema, setTema] = useState<Tema>(atual);
  useEffect(() => {
    const obs = new MutationObserver(() => setTema(atual()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => obs.disconnect();
  }, []);
  const alternar = () => {
    const novo: Tema = atual() === "escuro" ? "claro" : "escuro";
    document.documentElement.dataset.tema = novo;
    try {
      localStorage.setItem("tema", novo);
    } catch {}
  };
  return { tema, alternar };
}

export function TemaBotao({ sobreEscuro = false, flutuante = false }: { sobreEscuro?: boolean; flutuante?: boolean }) {
  const { tema, alternar } = useTema();
  return (
    <button
      type="button"
      className={`tema-btn ${sobreEscuro ? "claro" : ""} ${flutuante ? "tema-flutuante" : ""}`}
      onClick={alternar}
      aria-label={tema === "escuro" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={tema === "escuro" ? "Tema claro" : "Tema escuro"}
    >
      {tema === "escuro" ? "☀" : "☾"}
    </button>
  );
}
