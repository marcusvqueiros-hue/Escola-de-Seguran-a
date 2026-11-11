import { useCallback, useEffect, useState } from "react";
import { notaMinima, type QuestaoAdmin, type Resposta } from "../../shared/constantes";
import { Janela } from "./Configuracao";

const LETRAS: Resposta[] = ["A", "B", "C", "D"];

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

interface Dados {
  enunciado: string;
  opcoes: string[];
  correta: Resposta;
  ativa: boolean;
  reaplicar?: boolean;
}

export default function Questoes({ onAlterou }: { onAlterou: () => void }) {
  const [lista, setLista] = useState<QuestaoAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mostrar, setMostrar] = useState(true);
  const [modal, setModal] = useState<QuestaoAdmin | "nova" | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLista((await chamar("/api/admin/questoes")).questoes);
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

  const depois = async (msg?: string) => {
    setAviso(msg ?? null);
    await carregar();
    onAlterou();
  };

  async function mover(q: QuestaoAdmin, direcao: "cima" | "baixo") {
    try {
      await chamar(`/api/admin/questoes/${q.id}/mover`, "POST", { direcao });
      await depois();
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function alternar(q: QuestaoAdmin) {
    try {
      await chamar(`/api/admin/questoes/${q.id}`, "PUT", { enunciado: q.enunciado, opcoes: q.opcoes, correta: q.correta, ativa: !q.ativa });
      await depois(q.ativa ? "Questão desativada: não aparece mais nas próximas avaliações." : "Questão ativada.");
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  async function salvar(d: Dados, atual: QuestaoAdmin | null) {
    if (atual) {
      const r = await chamar(`/api/admin/questoes/${atual.id}`, "PUT", d);
      await depois(r.reaplicadas ? `Questão salva. Resposta correta reaplicada em ${r.reaplicadas} avaliação(ões).` : "Questão salva.");
    } else {
      await chamar("/api/admin/questoes", "POST", d);
      await depois("Questão adicionada ao final da prova.");
    }
    setModal(null);
  }

  const ativas = lista.filter((q) => q.ativa).length;

  return (
    <div className="questoes">
      <div className="kpis">
        <div className="kpi" style={{ ["--cor" as string]: "var(--serie)" }}><span>Cadastradas</span><strong>{lista.length}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "var(--good)" }}><span>Ativas</span><strong>{ativas}</strong></div>
        <div className="kpi" style={{ ["--cor" as string]: "var(--neutro)" }}><span>Nota mínima</span><strong>{ativas ? notaMinima(ativas) : "—"}</strong></div>
      </div>

      <section className="card q-painel">
        <header className="card-topo">
          <div>
            <h3>Questões da avaliação</h3>
            <small>A prova usa as questões ativas, na ordem abaixo. Mudanças valem para as próximas avaliações.</small>
          </div>
          <div className="q-acoes-topo">
            <label className="q-toggle">
              <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} />
              <span>Mostrar respostas corretas</span>
            </label>
            <button className="btn-mini" onClick={() => setModal("nova")}>＋ Nova questão</button>
          </div>
        </header>

        {aviso && <p className="aviso-ok" role="status">{aviso}</p>}
        {erro && <p className="erro-msg">{erro}</p>}
        {carregando ? (
          <p className="vazio">Carregando…</p>
        ) : (
          <ol className="q-lista">
            {lista.map((q, i) => (
              <li key={q.id} className={`q-card ${q.ativa ? "" : "inativa"}`}>
                <div className="q-topo">
                  <span className="q-num">{i + 1}</span>
                  <span className={`q-status ${q.ativa ? "on" : ""}`}>{q.ativa ? "Ativa" : "Inativa"}</span>
                  <span className="q-usos">{q.usos ? `Respondida em ${q.usos} avaliação(ões)` : "Ainda não respondida"}</span>
                  <span className="q-botoes">
                    <button className="q-ic" onClick={() => mover(q, "cima")} disabled={i === 0} title="Subir" aria-label="Subir questão">↑</button>
                    <button className="q-ic" onClick={() => mover(q, "baixo")} disabled={i === lista.length - 1} title="Descer" aria-label="Descer questão">↓</button>
                    <button className="q-ic" onClick={() => setModal(q)} title="Editar" aria-label="Editar questão">✎</button>
                    <button className="q-ic" onClick={() => alternar(q)} title={q.ativa ? "Desativar" : "Ativar"} aria-label={q.ativa ? "Desativar questão" : "Ativar questão"}>{q.ativa ? "⏸" : "▶"}</button>
                  </span>
                </div>
                <h4 className="q-enunciado">{q.enunciado}</h4>
                <ul className="q-opcoes">
                  {q.opcoes.map((texto, k) => {
                    const letra = LETRAS[k]!;
                    const certa = mostrar && letra === q.correta;
                    return (
                      <li key={letra} className={certa ? "certa" : ""}>
                        <i>{letra}</i>
                        <span>{texto}</span>
                        {certa && <b>✓ Correta</b>}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      {modal && <FormQuestao inicial={modal === "nova" ? null : modal} onSalvar={(d) => salvar(d, modal === "nova" ? null : modal)} onFechar={() => setModal(null)} />}
    </div>
  );
}

function FormQuestao({ inicial, onSalvar, onFechar }: { inicial: QuestaoAdmin | null; onSalvar: (d: Dados) => Promise<void>; onFechar: () => void }) {
  const [enunciado, setEnunciado] = useState(inicial?.enunciado ?? "");
  const [opcoes, setOpcoes] = useState<string[]>(inicial?.opcoes ?? ["", "", "", ""]);
  const [correta, setCorreta] = useState<Resposta>(inicial?.correta ?? "A");
  const [ativa, setAtiva] = useState(inicial?.ativa ?? true);
  const [reaplicar, setReaplicar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const mudou = !!inicial && inicial.correta !== correta;
  const ok = enunciado.trim().length >= 5 && opcoes.length >= 2 && opcoes.every((o) => o.trim());

  const setOpcao = (i: number, v: string) => setOpcoes((x) => x.map((o, k) => (k === i ? v : o)));
  const remover = (i: number) => {
    setOpcoes((x) => x.filter((_, k) => k !== i));
    // a letra marcada acompanha a remoção
    setCorreta((c) => {
      const idx = LETRAS.indexOf(c);
      return idx === i ? "A" : idx > i ? LETRAS[idx - 1]! : c;
    });
  };

  return (
    <Janela titulo={inicial ? "Editar questão" : "Nova questão"} largo onFechar={onFechar}>
      <form
        className="form-colab form-questao"
        onSubmit={async (e) => {
          e.preventDefault();
          setSalvando(true);
          setErro(null);
          try {
            await onSalvar({ enunciado, opcoes, correta, ativa, reaplicar });
          } catch (er) {
            setErro((er as Error).message);
            setSalvando(false);
          }
        }}
      >
        <label className="campo">
          <span>Enunciado</span>
          <textarea value={enunciado} onChange={(e) => setEnunciado(e.target.value)} rows={3} maxLength={600} autoFocus />
        </label>

        <fieldset className="q-alternativas">
          <legend>Alternativas <small>(marque a correta)</small></legend>
          {opcoes.map((texto, i) => (
            <div key={i} className={`q-alt ${correta === LETRAS[i] ? "certa" : ""}`}>
              <label className="q-radio" title="Marcar como correta">
                <input type="radio" name="correta" checked={correta === LETRAS[i]} onChange={() => setCorreta(LETRAS[i]!)} />
                <i>{LETRAS[i]}</i>
              </label>
              <input value={texto} onChange={(e) => setOpcao(i, e.target.value)} maxLength={400} placeholder={`Alternativa ${LETRAS[i]}`} aria-label={`Alternativa ${LETRAS[i]}`} />
              {opcoes.length > 2 && (
                <button type="button" className="q-ic" onClick={() => remover(i)} title="Remover alternativa" aria-label={`Remover alternativa ${LETRAS[i]}`}>✕</button>
              )}
            </div>
          ))}
          {opcoes.length < LETRAS.length && (
            <button type="button" className="btn-mini sec" onClick={() => setOpcoes((x) => [...x, ""])}>＋ Alternativa</button>
          )}
        </fieldset>

        <label className="q-check">
          <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
          <span>Questão ativa (aparece nas próximas avaliações)</span>
        </label>

        {inicial && inicial.usos > 0 && (
          <div className="q-aviso">
            <p>Esta questão já foi respondida em <b>{inicial.usos}</b> avaliação(ões). Alterar o texto muda o que aparece no Detalhamento dessas avaliações; as notas já registradas não mudam.</p>
            <label className="q-check">
              <input type="checkbox" checked={reaplicar} onChange={(e) => setReaplicar(e.target.checked)} />
              <span>
                Aplicar a resposta correta atual também às avaliações já feitas{mudou ? " (a resposta correta foi alterada)" : ""}
              </span>
            </label>
          </div>
        )}

        {erro && <p className="erro-msg">{erro}</p>}
        <div className="acoes">
          <button type="button" className="btn sec" onClick={onFechar}>Cancelar</button>
          <button className="btn" disabled={!ok || salvando}>{salvando ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
    </Janela>
  );
}
