import { useCallback, useEffect, useMemo, useState } from "react";
import { chaveNome } from "../../shared/texto";

interface Colab {
  id?: number;
  chapa: string;
  nome: string;
  funcao: string;
  base: string;
  gerencia: string;
  gerente: string;
  situacao: string;
}

interface Previa {
  aplicado: boolean;
  resumo: { lidos: number; novos: number; alterados: number; removidos: number; invalidos: number; semMudanca: number };
  novos: { chapa: string; nome: string; base: string; gerencia: string }[];
  alterados: { chapa: string; nome: string; mudancas: string[] }[];
  removidos: { chapa: string; nome: string; base: string; gerencia: string }[];
  invalidos: { linha: number; motivo: string }[];
}

type Modal =
  | { tipo: "form"; dados: Colab }
  | { tipo: "excluir"; colab: Colab }
  | { tipo: "importar"; arquivo: string; linhas: Record<string, string>[]; temGerente: boolean; previa: Previa | null; remover: boolean; aplicando: boolean }
  | null;

const VAZIO: Colab = { chapa: "", nome: "", funcao: "", base: "", gerencia: "", gerente: "", situacao: "ATIVO" };
const POR_PAGINA = 50;
const SITUACOES = ["ATIVO", "FÉRIAS", "AFASTADO"];
const COLUNAS_XLSX = ["CHAPA", "NOME", "FUNÇÃO", "BASE", "GERENCIA", "GERENTE", "SITUAÇÃO"];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

async function chamar(url: string, metodo = "GET", corpo?: unknown) {
  const r = await fetch(url, {
    method: metodo,
    headers: corpo ? { "Content-Type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro ?? "Falha na requisição.");
  return d;
}

function contar(lista: Colab[], campo: "base" | "gerencia" | "gerente") {
  const m = new Map<string, number>();
  for (const c of lista) if (c[campo]) m.set(c[campo], (m.get(c[campo]) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export default function Configuracao() {
  const [lista, setLista] = useState<Colab[]>([]);
  const [bases, setBases] = useState<string[]>([]);
  const [gerencias, setGerencias] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [fBase, setFBase] = useState("");
  const [fGerencia, setFGerencia] = useState("");
  const [fGerente, setFGerente] = useState("");
  const [fSituacao, setFSituacao] = useState("");
  const [pagina, setPagina] = useState(0);
  const [modal, setModal] = useState<Modal>(null);

  const carregar = useCallback(async () => {
    try {
      const d = await chamar("/api/admin/colaboradores");
      setLista(d.colaboradores);
      setBases(d.bases);
      setGerencias(d.gerencias);
      setErro(null);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar]);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  const gerentes = useMemo(() => contar(lista, "gerente"), [lista]);
  const filtrados = useMemo(() => {
    const q = chaveNome(busca);
    return lista.filter(
      (c) =>
        (!q || chaveNome(c.nome).includes(q) || c.chapa.includes(busca.trim())) &&
        (!fBase || c.base === fBase) &&
        (!fGerencia || c.gerencia === fGerencia) &&
        (!fGerente || c.gerente === fGerente) &&
        (!fSituacao || c.situacao === fSituacao),
    );
  }, [lista, busca, fBase, fGerencia, fGerente, fSituacao]);
  useEffect(() => setPagina(0), [busca, fBase, fGerencia, fGerente, fSituacao]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visiveis = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const filtrando = !!(busca || fBase || fGerencia || fGerente || fSituacao);
  const porBase = useMemo(() => contar(lista, "base"), [lista]);
  const porGerencia = useMemo(() => contar(lista, "gerencia"), [lista]);
  const ativos = lista.filter((c) => c.situacao === "ATIVO").length;
  const funcoes = useMemo(() => [...new Set(lista.map((c) => c.funcao))].sort(), [lista]);

  async function salvar(c: Colab) {
    await chamar(c.id ? `/api/admin/colaboradores/${c.id}` : "/api/admin/colaboradores", c.id ? "PUT" : "POST", c);
    setModal(null);
    setAviso(c.id ? "Colaborador atualizado." : "Colaborador adicionado.");
    await carregar();
  }

  async function excluir(c: Colab) {
    await chamar(`/api/admin/colaboradores/${c.id}`, "DELETE");
    setModal(null);
    setAviso(`${c.nome} foi excluído do cadastro.`);
    await carregar();
  }

  async function aplicarRegra() {
    if (!window.confirm("Redefinir o gerente de TODOS os colaboradores pela regra de gerência e base? Ajustes manuais de gerente serão substituídos.")) return;
    try {
      const d = await chamar("/api/admin/colaboradores/gerentes", "POST", { somenteVazios: false });
      setAviso(`Regra aplicada: ${d.alterados} colaborador(es) atualizados.`);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function exportar() {
    const XLSX = await import("xlsx");
    const linhas = filtrados.map((c) => ({ CHAPA: c.chapa, NOME: c.nome, "FUNÇÃO": c.funcao, BASE: c.base, GERENCIA: c.gerencia, GERENTE: c.gerente, "SITUAÇÃO": c.situacao }));
    const ws = XLSX.utils.json_to_sheet(linhas, { header: COLUNAS_XLSX });
    ws["!cols"] = [{ wch: 9 }, { wch: 42 }, { wch: 38 }, { wch: 7 }, { wch: 12 }, { wch: 28 }, { wch: 11 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Base");
    XLSX.writeFile(wb, `colaboradores-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function escolherArquivo(arq: File) {
    setErro(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await arq.arrayBuffer());
      const ws = wb.Sheets["Base"] ?? wb.Sheets[wb.SheetNames[0]!]!;
      const brutas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const mapa: Record<string, string> = { CHAPA: "chapa", NOME: "nome", FUNCAO: "funcao", BASE: "base", GERENCIA: "gerencia", GERENTE: "gerente", SITUACAO: "situacao" };
      const linhas = brutas.map((r) => {
        const o: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) {
          const campo = mapa[norm(k)];
          if (campo) o[campo] = String(v ?? "").trim();
        }
        return o;
      });
      const cabecalhos = new Set(Object.keys(brutas[0] ?? {}).map(norm));
      const faltam = ["CHAPA", "NOME", "FUNCAO", "BASE", "GERENCIA"].filter((c) => !cabecalhos.has(c));
      if (faltam.length) throw new Error(`A planilha precisa das colunas: ${faltam.join(", ")} (aba "Base" ou primeira aba).`);
      const temGerente = cabecalhos.has("GERENTE");
      const previa = (await chamar("/api/admin/colaboradores/importar", "POST", { linhas, temGerente, aplicar: false })) as Previa;
      setModal({ tipo: "importar", arquivo: arq.name, linhas: linhas as never, temGerente, previa, remover: true, aplicando: false });
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function aplicarImportacao() {
    if (modal?.tipo !== "importar") return;
    setModal({ ...modal, aplicando: true });
    try {
      const r = (await chamar("/api/admin/colaboradores/importar", "POST", { linhas: modal.linhas, temGerente: modal.temGerente, aplicar: true, remover: modal.remover })) as Previa;
      setModal(null);
      setAviso(`Cadastro atualizado: ${r.resumo.novos} novos, ${r.resumo.alterados} alterados${modal.remover ? `, ${r.resumo.removidos} removidos` : ""}.`);
      await carregar();
    } catch (e) {
      setErro((e as Error).message);
      setModal({ ...modal, aplicando: false });
    }
  }

  if (carregando) return <div className="vazio">Carregando cadastro…</div>;

  return (
    <div className="config">
      {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
      {erro && <p className="erro-msg centro">{erro}</p>}

      <div className="kpis">
        <div className="kpi" style={{ ["--cor" as string]: "#84162b" }}><span>Colaboradores</span><strong>{lista.length}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "#137e6a" }}><span>Ativos</span><strong>{ativos}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "#e0a526" }}><span>Férias / afastados</span><strong>{lista.length - ativos}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "#1e90ff" }}><span>Gerentes cadastrados</span><strong>{gerentes.length}</strong></div>
      </div>

      <div className="resumo-grupos">
        <section className="card">
          <h3>Por base</h3>
          <div className="contagens">
            {porBase.map(([k, n]) => (
              <button key={k} className={fBase === k ? "on" : ""} onClick={() => setFBase(fBase === k ? "" : k)}>{k}<b>{n}</b></button>
            ))}
          </div>
        </section>
        <section className="card">
          <h3>Por gerência</h3>
          <div className="contagens">
            {porGerencia.map(([k, n]) => (
              <button key={k} className={fGerencia === k ? "on" : ""} onClick={() => setFGerencia(fGerencia === k ? "" : k)}>{k}<b>{n}</b></button>
            ))}
          </div>
        </section>
      </div>

      <section className="card tabela-card">
        <div className="barra-acoes">
          <input className="busca" type="search" placeholder="Buscar por nome ou chapa" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={fBase} onChange={(e) => setFBase(e.target.value)} aria-label="Base">
            <option value="">Todas as bases</option>
            {bases.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select value={fGerencia} onChange={(e) => setFGerencia(e.target.value)} aria-label="Gerência">
            <option value="">Todas as gerências</option>
            {gerencias.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select value={fGerente} onChange={(e) => setFGerente(e.target.value)} aria-label="Gerente">
            <option value="">{gerentes.length ? "Todos os gerentes" : "Gerente (nenhum cadastrado)"}</option>
            {gerentes.map(([g, n]) => <option key={g} value={g}>{g} ({n})</option>)}
          </select>
          <select value={fSituacao} onChange={(e) => setFSituacao(e.target.value)} aria-label="Situação">
            <option value="">Toda situação</option>
            {SITUACOES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {filtrando && <button className="limpar" onClick={() => { setBusca(""); setFBase(""); setFGerencia(""); setFGerente(""); setFSituacao(""); }}>Limpar</button>}
        </div>

        <div className="barra-acoes acoes-topo">
          <span className="contador">{filtrando ? `${filtrados.length} de ${lista.length}` : lista.length} colaborador(es)</span>
          <span className="espaco" />
          <label className="btn-mini sec">
            ⇪ Importar planilha
            <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ""; if (a) escolherArquivo(a); }} />
          </label>
          <button className="btn-mini sec" onClick={aplicarRegra} title="Atribui o gerente de cada um pela gerência e base">⟳ Regra de gerentes</button>
          <button className="btn-mini sec" onClick={exportar} disabled={!filtrados.length}>⇩ Exportar{filtrando ? " (filtrados)" : ""}</button>
          <button className="btn-mini" onClick={() => setModal({ tipo: "form", dados: { ...VAZIO } })}>＋ Novo colaborador</button>
        </div>

        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr><th>Chapa</th><th>Nome</th><th>Função</th><th>Base</th><th>Gerência</th><th>Gerente</th><th>Situação</th><th aria-label="Ações" /></tr>
            </thead>
            <tbody>
              {visiveis.map((c) => (
                <tr key={c.id}>
                  <td data-rotulo="Chapa">{c.chapa}</td>
                  <td data-rotulo="Nome" className="nome">{c.nome}</td>
                  <td data-rotulo="Função">{c.funcao}</td>
                  <td data-rotulo="Base">{c.base}</td>
                  <td data-rotulo="Gerência">{c.gerencia}</td>
                  <td data-rotulo="Gerente">{c.gerente || "—"}</td>
                  <td data-rotulo="Situação"><span className={`selo-sit ${c.situacao === "ATIVO" ? "ok" : ""}`}>{c.situacao}</span></td>
                  <td className="acoes-linha">
                    <button title="Editar" aria-label={`Editar ${c.nome}`} onClick={() => setModal({ tipo: "form", dados: { ...c } })}>✎</button>
                    <button title="Excluir" aria-label={`Excluir ${c.nome}`} className="perigo" onClick={() => setModal({ tipo: "excluir", colab: c })}>🗑</button>
                  </td>
                </tr>
              ))}
              {!visiveis.length && <tr><td colSpan={8} className="vazio-tab">Nenhum colaborador encontrado.</td></tr>}
            </tbody>
          </table>
        </div>

        {paginas > 1 && (
          <div className="paginacao">
            <button disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>‹ Anterior</button>
            <span>Página {pagina + 1} de {paginas}</span>
            <button disabled={pagina >= paginas - 1} onClick={() => setPagina(pagina + 1)}>Próxima ›</button>
          </div>
        )}
      </section>

      {modal?.tipo === "form" && <FormColab inicial={modal.dados} bases={bases} gerencias={gerencias} funcoes={funcoes} gerentes={gerentes.map(([g]) => g)} onSalvar={salvar} onFechar={() => setModal(null)} />}

      {modal?.tipo === "excluir" && (
        <Janela titulo="Excluir colaborador" onFechar={() => setModal(null)}>
          <p>Excluir <b>{modal.colab.nome}</b> (chapa {modal.colab.chapa}) do cadastro? Use para colaboradores desligados. As avaliações já feitas por essa pessoa permanecem nos relatórios.</p>
          <ErroAcao acao={() => excluir(modal.colab)} rotulo="Excluir" perigo onFechar={() => setModal(null)} />
        </Janela>
      )}

      {modal?.tipo === "importar" && modal.previa && (
        <Janela titulo="Atualizar cadastro pela planilha" largo onFechar={() => setModal(null)}>
          <p className="sub">Arquivo: <b>{modal.arquivo}</b> · {modal.previa.resumo.lidos} linhas lidas. Confira as mudanças antes de aplicar.</p>
          <div className="previa-kpis">
            <div><b>{modal.previa.resumo.novos}</b><span>novos</span></div>
            <div><b>{modal.previa.resumo.alterados}</b><span>alterados</span></div>
            <div className="perigo"><b>{modal.previa.resumo.removidos}</b><span>fora da planilha</span></div>
            <div><b>{modal.previa.resumo.semMudanca}</b><span>sem mudança</span></div>
            <div className={modal.previa.resumo.invalidos ? "perigo" : ""}><b>{modal.previa.resumo.invalidos}</b><span>com problema</span></div>
          </div>
          {!modal.temGerente && <p className="dica vis">A planilha não tem a coluna GERENTE; os gerentes já cadastrados serão mantidos.</p>}

          <label className="check">
            <input type="checkbox" checked={modal.remover} onChange={(e) => setModal({ ...modal, remover: e.target.checked })} />
            <span>Excluir do cadastro quem não está na planilha ({modal.previa.resumo.removidos} pessoas, desligados)</span>
          </label>
          {modal.remover && modal.previa.resumo.removidos > lista.length * 0.3 && (
            <p className="erro-msg">Atenção: isso remove mais de 30% do cadastro. Confirme se a planilha está completa.</p>
          )}

          <Detalhe titulo={`Novos (${modal.previa.resumo.novos})`} vazio={!modal.previa.novos.length}>
            {modal.previa.novos.map((n) => <li key={n.chapa}><b>{n.nome}</b> <small>{n.chapa} · {n.base} · {n.gerencia}</small></li>)}
          </Detalhe>
          <Detalhe titulo={`Alterados (${modal.previa.resumo.alterados})`} vazio={!modal.previa.alterados.length}>
            {modal.previa.alterados.map((n) => <li key={n.chapa}><b>{n.nome}</b> <small>{n.chapa}</small><br /><small>{n.mudancas.join(" · ")}</small></li>)}
          </Detalhe>
          <Detalhe titulo={`Fora da planilha (${modal.previa.resumo.removidos})`} vazio={!modal.previa.removidos.length}>
            {modal.previa.removidos.map((n) => <li key={n.chapa}><b>{n.nome}</b> <small>{n.chapa} · {n.base} · {n.gerencia}</small></li>)}
          </Detalhe>
          <Detalhe titulo={`Linhas com problema (${modal.previa.resumo.invalidos}) — não serão importadas`} vazio={!modal.previa.invalidos.length} aberto>
            {modal.previa.invalidos.map((n, i) => <li key={i}><small>{n.linha ? `Linha ${n.linha}: ` : ""}{n.motivo}</small></li>)}
          </Detalhe>

          <div className="acoes">
            <button className="btn sec" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn" disabled={modal.aplicando || (!modal.previa.resumo.novos && !modal.previa.resumo.alterados && !(modal.remover && modal.previa.resumo.removidos))} onClick={aplicarImportacao}>
              {modal.aplicando ? "Aplicando…" : "Aplicar atualização"}
            </button>
          </div>
        </Janela>
      )}
    </div>
  );
}

function Detalhe({ titulo, vazio, aberto, children }: { titulo: string; vazio: boolean; aberto?: boolean; children: React.ReactNode }) {
  if (vazio) return null;
  return (
    <details className="detalhe" open={aberto}>
      <summary>{titulo}</summary>
      <ul>{children}</ul>
    </details>
  );
}

function Janela({ titulo, largo, onFechar, children }: { titulo: string; largo?: boolean; onFechar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onFechar]);
  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className={`modal ${largo ? "largo" : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <header>
          <h3>{titulo}</h3>
          <button className="fechar" onClick={onFechar} aria-label="Fechar">✕</button>
        </header>
        {children}
      </div>
    </div>
  );
}

function ErroAcao({ acao, rotulo, perigo, onFechar }: { acao: () => Promise<void>; rotulo: string; perigo?: boolean; onFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);
  return (
    <>
      {erro && <p className="erro-msg">{erro}</p>}
      <div className="acoes">
        <button className="btn sec" onClick={onFechar}>Cancelar</button>
        <button className={`btn ${perigo ? "perigo" : ""}`} disabled={indo} onClick={async () => { setIndo(true); try { await acao(); } catch (e) { setErro((e as Error).message); setIndo(false); } }}>
          {indo ? "Aguarde…" : rotulo}
        </button>
      </div>
    </>
  );
}

function FormColab({ inicial, bases, gerencias, funcoes, gerentes, onSalvar, onFechar }: { inicial: Colab; bases: string[]; gerencias: string[]; funcoes: string[]; gerentes: string[]; onSalvar: (c: Colab) => Promise<void>; onFechar: () => void }) {
  const [c, setC] = useState<Colab>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const set = (p: Partial<Colab>) => setC((x) => ({ ...x, ...p }));
  const ok = c.nome.trim().split(/\s+/).length >= 2 && c.chapa.trim() && c.funcao.trim() && c.base && c.gerencia;

  return (
    <Janela titulo={inicial.id ? "Editar colaborador" : "Novo colaborador"} onFechar={onFechar}>
      <form
        className="form-colab"
        onSubmit={async (e) => {
          e.preventDefault();
          setSalvando(true);
          setErro(null);
          try {
            await onSalvar(c);
          } catch (er) {
            setErro((er as Error).message);
            setSalvando(false);
          }
        }}
      >
        <label className="campo"><span>Nome completo</span><input value={c.nome} onChange={(e) => set({ nome: e.target.value.toUpperCase() })} autoFocus /></label>
        <div className="duas">
          <label className="campo"><span>Chapa</span><input value={c.chapa} onChange={(e) => set({ chapa: e.target.value })} inputMode="numeric" /></label>
          <label className="campo">
            <span>Situação</span>
            <select value={c.situacao} onChange={(e) => set({ situacao: e.target.value })}>{SITUACOES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
        </div>
        <label className="campo">
          <span>Função</span>
          <input list="lista-funcoes" value={c.funcao} onChange={(e) => set({ funcao: e.target.value.toUpperCase() })} />
          <datalist id="lista-funcoes">{funcoes.map((f) => <option key={f} value={f} />)}</datalist>
        </label>
        <div className="duas">
          <label className="campo">
            <span>Base</span>
            <select value={c.base} onChange={(e) => set({ base: e.target.value })}><option value="">Selecione</option>{bases.map((b) => <option key={b}>{b}</option>)}</select>
          </label>
          <label className="campo">
            <span>Gerência</span>
            <select value={c.gerencia} onChange={(e) => set({ gerencia: e.target.value })}><option value="">Selecione</option>{gerencias.map((g) => <option key={g}>{g}</option>)}</select>
          </label>
        </div>
        <label className="campo">
          <span>Gerente (opcional)</span>
          <input list="lista-gerentes" value={c.gerente} onChange={(e) => set({ gerente: e.target.value.toUpperCase() })} />
          <datalist id="lista-gerentes">{gerentes.map((g) => <option key={g} value={g} />)}</datalist>
        </label>
        {erro && <p className="erro-msg">{erro}</p>}
        <div className="acoes">
          <button type="button" className="btn sec" onClick={onFechar}>Cancelar</button>
          <button className="btn" disabled={!ok || salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Janela>
  );
}
