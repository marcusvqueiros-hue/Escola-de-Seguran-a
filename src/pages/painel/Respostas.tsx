import { useCallback, useEffect, useMemo, useState } from "react";
import { BASES, GERENCIAS, type Registro, type Resposta } from "../../shared/constantes";
import { chaveNome } from "../../shared/texto";
import { Janela } from "./Configuracao";

interface Linha extends Registro {
  origem: "app" | "importado";
  iniciadaEm: string | null;
  duracaoSeg: number | null;
}

interface Questao {
  id: number;
  numero: number;
  enunciado: string;
  opcoes: string[];
  correta: Resposta;
  ativa: boolean;
}

const LETRAS: Resposta[] = ["A", "B", "C", "D"];
const POR_PAGINA = 50;

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

const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
/** ISO -> valor do <input type="datetime-local"> (hora local). */
const paraInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const pontos = (r: Registro) => r.acertos.filter(Boolean).length;

export default function Respostas({ onAlterou }: { onAlterou: () => void }) {
  const [lista, setLista] = useState<Linha[]>([]);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [fBase, setFBase] = useState("");
  const [fGerencia, setFGerencia] = useState("");
  const [fResultado, setFResultado] = useState("");
  const [fOrigem, setFOrigem] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [pagina, setPagina] = useState(0);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ tipo: "editar"; r: Linha } | { tipo: "excluir"; ids: string[]; rotulo: string } | null>(null);

  const carregar = useCallback(async () => {
    try {
      const d = await chamar("/api/admin/respostas");
      setLista(d.registros);
      setQuestoes(d.questoes);
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

  const filtrados = useMemo(() => {
    const q = chaveNome(busca);
    const ini = de ? new Date(`${de}T00:00:00`).getTime() : null;
    const fim = ate ? new Date(`${ate}T23:59:59`).getTime() : null;
    return lista.filter((r) => {
      const t = Date.parse(r.data);
      return (
        (!q || chaveNome(r.nome).includes(q) || r.matricula.includes(busca.trim()) || chaveNome(r.prefixo).includes(q)) &&
        (!fBase || r.base === fBase) &&
        (!fGerencia || r.gerencia === fGerencia) &&
        (!fResultado || (fResultado === "aprovado" ? r.aprovado : !r.aprovado)) &&
        (!fOrigem || r.origem === fOrigem) &&
        (ini == null || t >= ini) &&
        (fim == null || t <= fim)
      );
    });
  }, [lista, busca, fBase, fGerencia, fResultado, fOrigem, de, ate]);
  useEffect(() => setPagina(0), [busca, fBase, fGerencia, fResultado, fOrigem, de, ate]);

  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visiveis = filtrados.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const filtrando = !!(busca || fBase || fGerencia || fResultado || fOrigem || de || ate);
  const aprovados = filtrados.filter((r) => r.aprovado).length;
  const media = filtrados.length ? filtrados.reduce((a, r) => a + r.nota, 0) / filtrados.length : 0;

  const todosDaPagina = visiveis.length > 0 && visiveis.every((r) => marcados.has(r.id));
  const alternarPagina = () =>
    setMarcados((m) => {
      const n = new Set(m);
      for (const r of visiveis) todosDaPagina ? n.delete(r.id) : n.add(r.id);
      return n;
    });
  const alternarUm = (id: string) =>
    setMarcados((m) => {
      const n = new Set(m);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const depois = async (msg: string) => {
    setAviso(msg);
    await carregar();
    onAlterou();
  };

  async function salvar(r: Linha, corpo: unknown) {
    await chamar(`/api/admin/respostas/${r.id}`, "PUT", corpo);
    setModal(null);
    await depois(`Registro de ${r.nome} atualizado.`);
  }

  async function excluir(ids: string[]) {
    await chamar("/api/admin/respostas/excluir", "POST", { ids });
    setModal(null);
    setMarcados((m) => new Set([...m].filter((id) => !ids.includes(id))));
    await depois(ids.length === 1 ? "Registro excluído." : `${ids.length} registros excluídos.`);
  }

  async function exportar() {
    const XLSX = await import("xlsx");
    const linhas = filtrados.map((r) => {
      const l: Record<string, unknown> = {
        DATA: dataHora(r.data),
        NOME: r.nome,
        MATRÍCULA: r.matricula,
        PREFIXO: r.prefixo,
        FUNÇÃO: r.funcao,
        BASE: r.base,
        GERÊNCIA: r.gerencia,
        COORDENADOR: r.coordenador,
        SITUAÇÃO: r.situacao,
        ACERTOS: pontos(r),
        QUESTÕES: r.acertos.length,
        NOTA: r.nota,
        RESULTADO: r.aprovado ? "Aprovado" : "Reprovado",
        "DURAÇÃO (min)": r.duracaoSeg != null ? Math.round(r.duracaoSeg / 60) : "",
        LOCAL: r.local ?? "",
        ORIGEM: r.origem === "app" ? "Aplicativo" : "Forms",
      };
      // uma coluna por questão: a alternativa marcada, com ✗ quando errou
      for (const q of questoes) {
        const i = r.questoes.indexOf(q.id);
        l[`Q${q.numero}`] = i < 0 ? "" : `${r.respostas[i] ?? "—"}${r.acertos[i] ? "" : " ✗"}`;
      }
      return l;
    });
    const ws = XLSX.utils.json_to_sheet(linhas);
    ws["!cols"] = [{ wch: 17 }, { wch: 40 }, { wch: 10 }, { wch: 16 }, { wch: 30 }, { wch: 7 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 8 }, { wch: 9 }, { wch: 7 }, { wch: 11 }, { wch: 13 }, { wch: 40 }, { wch: 11 }, ...questoes.map(() => ({ wch: 6 }))];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Respostas");
    XLSX.writeFile(wb, `respostas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const limpar = () => {
    setBusca("");
    setFBase("");
    setFGerencia("");
    setFResultado("");
    setFOrigem("");
    setDe("");
    setAte("");
  };

  return (
    <div className="respostas">
      <div className="kpis">
        <div className="kpi" style={{ ["--cor" as string]: "var(--serie)" }}><span>Registros{filtrando ? " (filtrados)" : ""}</span><strong>{filtrados.length}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "var(--good)" }}><span>Aprovados</span><strong>{aprovados}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "var(--crit)" }}><span>Reprovados</span><strong>{filtrados.length - aprovados}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "var(--neutro)" }}><span>Média de notas</span><strong>{media.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
      </div>

      <section className="card tabela-card">
        <div className="barra-acoes">
          <input className="busca" type="search" placeholder="Buscar por nome, matrícula ou prefixo" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={fBase} onChange={(e) => setFBase(e.target.value)} aria-label="Base">
            <option value="">Todas as bases</option>
            {BASES.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select value={fGerencia} onChange={(e) => setFGerencia(e.target.value)} aria-label="Gerência">
            <option value="">Todas as gerências</option>
            {GERENCIAS.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select value={fResultado} onChange={(e) => setFResultado(e.target.value)} aria-label="Resultado">
            <option value="">Todos os resultados</option>
            <option value="aprovado">Aprovados</option>
            <option value="reprovado">Reprovados</option>
          </select>
          <select value={fOrigem} onChange={(e) => setFOrigem(e.target.value)} aria-label="Origem">
            <option value="">Todas as origens</option>
            <option value="importado">Forms</option>
            <option value="app">Aplicativo</option>
          </select>
          <label className="data-filtro"><span>De</span><input type="date" value={de} onChange={(e) => setDe(e.target.value)} /></label>
          <label className="data-filtro"><span>Até</span><input type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
          {filtrando && <button className="limpar" onClick={limpar}>Limpar</button>}
        </div>

        <div className="barra-acoes acoes-topo">
          <span className="contador">{filtrando ? `${filtrados.length} de ${lista.length}` : lista.length} registro(s){marcados.size ? ` · ${marcados.size} selecionado(s)` : ""}</span>
          <span className="espaco" />
          {marcados.size > 0 && (
            <>
              <button className="btn-mini sec" onClick={() => setMarcados(new Set())}>Limpar seleção</button>
              <button className="btn-mini perigo" onClick={() => setModal({ tipo: "excluir", ids: [...marcados], rotulo: `${marcados.size} registro(s) selecionado(s)` })}>🗑 Excluir selecionados</button>
            </>
          )}
          <button className="btn-mini" onClick={exportar} disabled={!filtrados.length}>⇩ Exportar planilha{filtrando ? " (filtrados)" : ""}</button>
        </div>

        {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
        {erro && <p className="erro-msg">{erro}</p>}

        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th className="col-marca"><input type="checkbox" checked={todosDaPagina} onChange={alternarPagina} aria-label="Selecionar a página" /></th>
                <th>Data</th><th>Nome</th><th>Matrícula</th><th>Prefixo</th><th>Base</th><th>Gerência</th><th>Acertos</th><th>Nota</th><th>Resultado</th><th>Origem</th><th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r) => (
                <tr key={r.id} className={marcados.has(r.id) ? "linha-sel" : ""}>
                  <td className="col-marca"><input type="checkbox" checked={marcados.has(r.id)} onChange={() => alternarUm(r.id)} aria-label={`Selecionar ${r.nome}`} /></td>
                  <td data-rotulo="Data">{dataHora(r.data)}</td>
                  <td data-rotulo="Nome" className="nome">{r.nome}</td>
                  <td data-rotulo="Matrícula">{r.matricula}</td>
                  <td data-rotulo="Prefixo">{r.prefixo}</td>
                  <td data-rotulo="Base">{r.base}</td>
                  <td data-rotulo="Gerência">{r.gerencia}</td>
                  <td data-rotulo="Acertos">{pontos(r)}/{r.acertos.length}</td>
                  <td data-rotulo="Nota">{r.nota.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                  <td data-rotulo="Resultado"><span className={`selo-sit ${r.aprovado ? "ok" : "no"}`}>{r.aprovado ? "Aprovado" : "Reprovado"}</span></td>
                  <td data-rotulo="Origem">{r.origem === "app" ? "App" : "Forms"}</td>
                  <td className="acoes-linha">
                    <button title="Ver respostas e editar" aria-label={`Ver ou editar o registro de ${r.nome}`} onClick={() => setModal({ tipo: "editar", r })}>✎</button>
                    <button title="Excluir registro" aria-label={`Excluir o registro de ${r.nome}`} className="perigo" onClick={() => setModal({ tipo: "excluir", ids: [r.id], rotulo: `o registro de ${r.nome} (${dataHora(r.data)})` })}>🗑</button>
                  </td>
                </tr>
              ))}
              {!visiveis.length && <tr><td colSpan={12} className="vazio-tab">{carregando ? "Carregando…" : "Nenhum registro encontrado."}</td></tr>}
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

      {modal?.tipo === "editar" && <FormRegistro r={modal.r} questoes={questoes} onSalvar={(c) => salvar(modal.r, c)} onFechar={() => setModal(null)} />}

      {modal?.tipo === "excluir" && (
        <Janela titulo="Excluir registros" onFechar={() => setModal(null)}>
          <p>Excluir <b>{modal.rotulo}</b>? Os relatórios serão recalculados sem {modal.ids.length === 1 ? "ele" : "eles"} e a foto também é removida. Isso não pode ser desfeito; se precisar, exporte a planilha antes.</p>
          <Acao acao={() => excluir(modal.ids)} rotulo="Excluir" onFechar={() => setModal(null)} />
        </Janela>
      )}
    </div>
  );
}

function Acao({ acao, rotulo, onFechar }: { acao: () => Promise<void>; rotulo: string; onFechar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);
  return (
    <>
      {erro && <p className="erro-msg">{erro}</p>}
      <div className="acoes">
        <button className="btn sec" onClick={onFechar}>Cancelar</button>
        <button
          className="btn perigo"
          disabled={indo}
          onClick={async () => {
            setIndo(true);
            try {
              await acao();
            } catch (e) {
              setErro((e as Error).message);
              setIndo(false);
            }
          }}
        >
          {indo ? "Aguarde…" : rotulo}
        </button>
      </div>
    </>
  );
}

function FormRegistro({ r, questoes, onSalvar, onFechar }: { r: Linha; questoes: Questao[]; onSalvar: (corpo: unknown) => Promise<void>; onFechar: () => void }) {
  const [f, setF] = useState({ nome: r.nome, matricula: r.matricula, prefixo: r.prefixo, funcao: r.funcao, base: r.base, gerencia: r.gerencia, data: paraInput(r.data) });
  const [respostas, setRespostas] = useState<(Resposta | null)[]>(r.respostas);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  const porId = useMemo(() => new Map(questoes.map((q) => [q.id, q])), [questoes]);
  const acertos = r.questoes.map((id, i) => respostas[i] != null && respostas[i] === porId.get(id)?.correta);
  const total = acertos.length;
  const nAcertos = acertos.filter(Boolean).length;
  const ok = f.nome.trim().split(/\s+/).length >= 2 && !!f.data;

  return (
    <Janela titulo="Respostas do colaborador" largo onFechar={onFechar}>
      <form
        className="form-colab form-resposta"
        onSubmit={async (e) => {
          e.preventDefault();
          setSalvando(true);
          setErro(null);
          try {
            const mudouData = f.data !== paraInput(r.data);
            await onSalvar({ ...f, data: mudouData ? new Date(f.data).toISOString() : undefined, respostas });
          } catch (er) {
            setErro((er as Error).message);
            setSalvando(false);
          }
        }}
      >
        <label className="campo"><span>Nome completo</span><input value={f.nome} onChange={(e) => set({ nome: e.target.value.toUpperCase() })} /></label>
        <div className="duas">
          <label className="campo"><span>Matrícula</span><input value={f.matricula} onChange={(e) => set({ matricula: e.target.value })} inputMode="numeric" /></label>
          <label className="campo"><span>Prefixo</span><input value={f.prefixo} onChange={(e) => set({ prefixo: e.target.value.toUpperCase() })} /></label>
        </div>
        <label className="campo"><span>Função</span><input value={f.funcao} onChange={(e) => set({ funcao: e.target.value.toUpperCase() })} /></label>
        <div className="duas">
          <label className="campo">
            <span>Base</span>
            <select value={f.base} onChange={(e) => set({ base: e.target.value })}><option value="">—</option>{BASES.map((b) => <option key={b}>{b}</option>)}</select>
          </label>
          <label className="campo">
            <span>Gerência</span>
            <select value={f.gerencia} onChange={(e) => set({ gerencia: e.target.value })}><option value="">—</option>{GERENCIAS.map((g) => <option key={g}>{g}</option>)}</select>
          </label>
        </div>
        <label className="campo"><span>Data e hora da avaliação</span><input type="datetime-local" value={f.data} onChange={(e) => set({ data: e.target.value })} /></label>

        <div className="resp-cab">
          <h4>Respostas</h4>
          <span className={`selo-sit ${nAcertos >= Math.ceil(total * 0.7) ? "ok" : "no"}`}>{nAcertos} de {total} acertos</span>
        </div>
        <ol className="resp-lista">
          {r.questoes.map((id, i) => {
            const q = porId.get(id);
            const certa = respostas[i] != null && respostas[i] === q?.correta;
            return (
              <li key={id} className={respostas[i] == null ? "branco" : certa ? "acertou" : "errou"}>
                <div className="resp-q">
                  <b>{q?.numero ?? "?"}</b>
                  <span>{q?.enunciado ?? "Questão removida"}</span>
                </div>
                <select
                  value={respostas[i] ?? ""}
                  onChange={(e) => setRespostas((x) => x.map((v, k) => (k === i ? ((e.target.value || null) as Resposta | null) : v)))}
                  aria-label={`Resposta da questão ${q?.numero ?? i + 1}`}
                >
                  <option value="">Em branco</option>
                  {(q?.opcoes ?? []).map((t, k) => (
                    <option key={k} value={LETRAS[k]}>{LETRAS[k]} — {t.length > 70 ? `${t.slice(0, 70)}…` : t}</option>
                  ))}
                </select>
                <small>{certa ? "✓ Correta" : q ? `Correta: ${q.correta}` : ""}</small>
              </li>
            );
          })}
        </ol>

        {erro && <p className="erro-msg">{erro}</p>}
        <div className="acoes">
          <button type="button" className="btn sec" onClick={onFechar}>Cancelar</button>
          <button className="btn" disabled={!ok || salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Janela>
  );
}
