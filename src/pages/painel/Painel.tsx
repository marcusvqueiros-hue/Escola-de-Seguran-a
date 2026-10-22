import { useCallback, useEffect, useMemo, useState } from "react";
import { BASES, GERENCIAS, type Registro } from "../../shared/constantes";
import { Logo } from "../../components/Logo";
import Login from "./Login";
import { PaginaAvaliacao, PaginaDetalhamento, PaginaEscola } from "./paginas";
import { anosDisponiveis, filtrar, MESES_LONGO, semFiltro, type Filtro } from "./metrics";

const ABAS = [
  { id: "escola", rotulo: "Escola de Segurança" },
  { id: "avaliacao", rotulo: "Avaliação" },
  { id: "detalhamento", rotulo: "Detalhamento" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

const abaInicial = (): Aba => ABAS.find((a) => a.id === location.hash.slice(1))?.id ?? "escola";
const alterna = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

export default function Painel() {
  const [auth, setAuth] = useState<"checando" | "nao" | "sim">("checando");
  const [regs, setRegs] = useState<Registro[]>([]);
  const [atualizado, setAtualizado] = useState<Date | null>(null);
  const [aba, setAba] = useState<Aba>(abaInicial);
  const [filtro, setFiltro] = useState<Filtro>({ ...semFiltro });
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/registros");
      if (r.status === 401) return setAuth("nao");
      const d = await r.json();
      setRegs(d.registros);
      setAtualizado(new Date());
      setErro(null);
      setAuth("sim");
    } catch {
      setErro("Sem conexão com o servidor.");
      setAuth((a) => (a === "checando" ? "nao" : a));
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);
  useEffect(() => {
    if (auth !== "sim") return;
    const t = setInterval(carregar, 60000);
    return () => clearInterval(t);
  }, [auth, carregar]);

  const trocar = (a: Aba) => {
    setAba(a);
    history.replaceState(null, "", `#${a}`);
  };

  const anos = useMemo(() => anosDisponiveis(regs), [regs]);
  const filtrados = useMemo(() => filtrar(regs, filtro), [regs, filtro]);
  const ativo = filtro.ano != null || filtro.mes != null || filtro.gerencias.length > 0 || filtro.bases.length > 0;

  if (auth === "checando") return <div className="carregando">Carregando…</div>;
  if (auth === "nao") return <Login onEntrar={carregar} />;

  const sair = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuth("nao");
  };

  return (
    <main className="app-painel">
      <header className="cabecalho">
        <div className="marca">
          <Logo tamanho={40} />
          <div>
            <h1>{ABAS.find((a) => a.id === aba)!.rotulo}</h1>
            <small>Atualizado em {atualizado?.toLocaleDateString("pt-BR")} {atualizado?.toLocaleTimeString("pt-BR")}</small>
          </div>
        </div>
        <nav className="abas" role="tablist">
          {ABAS.map((a) => (
            <button key={a.id} role="tab" aria-selected={aba === a.id} className={aba === a.id ? "on" : ""} onClick={() => trocar(a.id)}>
              {a.rotulo}
            </button>
          ))}
        </nav>
        <div className="cab-acoes">
          <button className="link claro" onClick={carregar}>Atualizar</button>
          <button className="link claro" onClick={sair}>Sair</button>
        </div>
      </header>

      <section className="filtros">
        <label>
          <span>Ano</span>
          <select value={filtro.ano ?? ""} onChange={(e) => setFiltro({ ...filtro, ano: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Todos</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label>
          <span>Mês</span>
          <select value={filtro.mes ?? ""} onChange={(e) => setFiltro({ ...filtro, mes: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Todos</option>
            {MESES_LONGO.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </label>
        <div className="filtro-chips">
          <span>Gerência</span>
          <div>{GERENCIAS.map((g) => <button key={g} className={filtro.gerencias.includes(g) ? "on" : ""} onClick={() => setFiltro({ ...filtro, gerencias: alterna(filtro.gerencias, g) })}>{g}</button>)}</div>
        </div>
        <div className="filtro-chips">
          <span>Base</span>
          <div>{BASES.map((b) => <button key={b} className={filtro.bases.includes(b) ? "on" : ""} onClick={() => setFiltro({ ...filtro, bases: alterna(filtro.bases, b) })}>{b}</button>)}</div>
        </div>
        <button className="limpar" disabled={!ativo} onClick={() => setFiltro({ ...semFiltro })}>Limpar filtros</button>
      </section>

      {erro && <p className="erro-msg centro">{erro}</p>}

      <div className="conteudo" key={aba}>
        {aba === "escola" && <PaginaEscola regs={filtrados} />}
        {aba === "avaliacao" && <PaginaAvaliacao regs={filtrados} />}
        {aba === "detalhamento" && <PaginaDetalhamento regs={filtrados} />}
      </div>
    </main>
  );
}
