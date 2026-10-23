import { useEffect, useMemo, useRef, useState } from "react";
import {
  BASES,
  DURACAO_SEG,
  FUNCOES,
  GERENCIAS,
  NOTA_MINIMA,
  TOLERANCIA_FOTO_SEG,
  type Identificacao,
  type Resposta,
} from "../../shared/constantes";
import { QUESTOES } from "../../shared/questoes";
import { Fundo, Logo } from "../../components/Logo";
import CapturaFoto from "./CapturaFoto";
import NomeCombo from "./NomeCombo";
import { TemaBotao } from "../../lib/tema";
import { AvisoOffline, InstalarBotao } from "../../lib/pwa";
import { chaveNome } from "../../shared/texto";
import type { Local } from "./carimbo";

type Etapa = "nome" | "dados" | "regras" | "prova" | "foto" | "fim";
interface Resultado { nota: number; total: number; aprovado: boolean }
interface Salvo {
  etapa: Etapa;
  ident: Identificacao;
  id?: string;
  prazo?: number;
  respostas: (Resposta | null)[];
  idx: number;
  doCadastro?: boolean;
  resultado?: Resultado;
}

const CHAVE = "escola-seguranca:v1";
const vazio: Identificacao = { nome: "", matricula: "", prefixo: "", funcao: "", base: "", gerencia: "" };

function carregar(): Salvo {
  const novo: Salvo = { etapa: "nome", ident: vazio, respostas: Array(QUESTOES.length).fill(null), idx: 0 };
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Salvo | null;
    if (!s) return novo;
    if (s.etapa === "fim") return novo;
    if ((s.etapa === "prova" || s.etapa === "foto") && (!s.prazo || Date.now() > s.prazo + TOLERANCIA_FOTO_SEG * 1000)) return novo;
    if (s.etapa === "prova" && s.prazo && Date.now() > s.prazo) return { ...s, etapa: "foto" };
    return s;
  } catch {
    return novo;
  }
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Avaliacao() {
  const [s, setS] = useState<Salvo>(carregar);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [agora, setAgora] = useState(Date.now());
  const [tempoEsgotado, setTempoEsgotado] = useState(false);

  const atualizar = (p: Partial<Salvo>) => setS((x) => ({ ...x, ...p }));
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(s));
    } catch {}
  }, [s]);

  useEffect(() => {
    if (s.etapa !== "prova" && s.etapa !== "foto") return;
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [s.etapa]);

  const restante = s.prazo ? Math.max(0, Math.ceil((s.prazo - agora) / 1000)) : DURACAO_SEG;
  useEffect(() => {
    if (s.etapa === "prova" && s.prazo && agora >= s.prazo) {
      setTempoEsgotado(true);
      atualizar({ etapa: "foto" });
    }
  }, [agora, s.etapa, s.prazo]);

  const { ident } = s;
  const setIdent = (p: Partial<Identificacao>) => atualizar({ ident: { ...ident, ...p } });
  const primeiroNome = ident.nome.trim().split(" ")[0] ?? "";
  const nomeOk = ident.nome.trim().split(/\s+/).filter((p) => p.length > 1).length >= 2;
  const dadosOk = ident.matricula.trim() && ident.prefixo.trim() && ident.funcao.trim() && ident.base && ident.gerencia;
  const respondidas = s.respostas.filter(Boolean).length;

  async function preencher(id: number, nome?: string) {
    try {
      const d = await (await fetch(`/api/colaboradores/${id}`)).json();
      atualizar({
        doCadastro: true,
        ident: { nome: d.nome, matricula: d.matricula ?? "", prefixo: d.prefixo ?? "", funcao: d.funcao ?? "", base: d.base ?? "", gerencia: d.gerencia ?? "" },
      });
    } catch {
      atualizar({ doCadastro: false, ident: { ...ident, nome: nome ?? ident.nome } });
    }
  }

  /** Avança para a confirmação; se o nome digitado existir no cadastro, já traz os dados. */
  async function continuarNome() {
    if (!nomeOk || carregando) return;
    if (!s.doCadastro) {
      setCarregando(true);
      try {
        const d = await (await fetch(`/api/colaboradores?q=${encodeURIComponent(ident.nome.trim())}`)).json();
        const exato = (d.resultados ?? []).find((r: { nome: string }) => chaveNome(r.nome) === chaveNome(ident.nome));
        if (exato) {
          await preencher(exato.id);
          atualizar({ etapa: "dados" });
          return;
        }
      } catch {} finally {
        setCarregando(false);
      }
    }
    atualizar({ etapa: "dados" });
  }

  async function iniciar() {
    setErro(null);
    setCarregando(true);
    try {
      const r = await fetch("/api/avaliacao/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ident),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro);
      setTempoEsgotado(false);
      setAgora(Date.now());
      atualizar({ etapa: "prova", id: d.id, prazo: Date.now() + d.duracaoSeg * 1000, respostas: Array(QUESTOES.length).fill(null), idx: 0 });
    } catch (e) {
      setErro((e as Error).message || "Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function finalizar(foto: string, local: Local, carimbo: string) {
    setErro(null);
    setCarregando(true);
    try {
      const r = await fetch("/api/avaliacao/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, respostas: s.respostas, foto, local: local.endereco, lat: local.lat, lng: local.lng, carimbo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro);
      atualizar({ etapa: "fim", resultado: d });
    } catch (e) {
      setErro((e as Error).message || "Falha de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  const nova = () => {
    try {
      localStorage.removeItem(CHAVE);
    } catch {}
    setTempoEsgotado(false);
    setS({ etapa: "nome", ident: vazio, respostas: Array(QUESTOES.length).fill(null), idx: 0 });
  };

  const q = QUESTOES[s.idx]!;
  const passos = useMemo(() => ["nome", "dados", "regras", "prova", "foto"] as Etapa[], []);

  return (
    <main className="app-avaliacao">
      <Fundo />
      <AvisoOffline />
      <header className="topo">
        <div className="topo-esq">
          {(s.etapa === "prova" || s.etapa === "foto") && (
            <span className={`relogio ${restante <= 120 && s.etapa === "prova" ? "alerta" : ""}`} aria-live="off">
              <i /> {s.etapa === "prova" ? mmss(restante) : "00:00"}
            </span>
          )}
        </div>
        <Logo tamanho={64} neon />
        <span className="topo-fim">
          <InstalarBotao />
          <TemaBotao />
        </span>
      </header>

      {s.etapa !== "fim" && (
        <nav className="passos" aria-label="Etapas">
          {passos.map((p, i) => (
            <i key={p} className={passos.indexOf(s.etapa) >= i ? "on" : ""} />
          ))}
        </nav>
      )}

      <section className="palco" key={s.etapa}>
        {s.etapa === "nome" && (
          <div className="cartao entra">
            <p className="sobre">Bem-vindo(a)</p>
            <h1>
              Qual é o seu <em>nome</em>?
            </h1>
            <NomeCombo
              valor={ident.nome}
              onChange={(nome) => atualizar({ doCadastro: false, ident: { ...vazio, nome } })}
              onEscolher={(sug) => {
                atualizar({ ident: { ...ident, nome: sug.nome } });
                preencher(sug.id, sug.nome);
              }}
              onEnter={continuarNome}
            />
            <p className={`dica ${ident.nome && !nomeOk ? "vis" : ""}`}>Digite nome e sobrenome e escolha na lista.</p>
            <button className="btn" disabled={!nomeOk || carregando} onClick={continuarNome}>
              Continuar <span aria-hidden>→</span>
            </button>
          </div>
        )}

        {s.etapa === "dados" && (
          <div className="cartao entra">
            <p className="sobre">Olá, {primeiroNome}</p>
            <h1>Confirme seus <em>dados</em></h1>
            {s.doCadastro ? (
              <p className="cadastro-ok">✓ Dados encontrados no cadastro. Confira e corrija se algo mudou.</p>
            ) : (
              <p className="sub">Não encontramos seu nome no cadastro. Preencha os dados abaixo.</p>
            )}
            <div className="duas">
              <label className="campo">
                <span>Matrícula</span>
                <input inputMode="numeric" value={ident.matricula} onChange={(e) => setIdent({ matricula: e.target.value.replace(/\D/g, "") })} />
              </label>
              <label className="campo">
                <span>Prefixo</span>
                <input value={ident.prefixo} onChange={(e) => setIdent({ prefixo: e.target.value.toUpperCase() })} placeholder="Ex.: MA-MRA-E001M" autoCapitalize="characters" />
              </label>
            </div>
            <label className="campo">
              <span>Função</span>
              <input list="funcoes" value={ident.funcao} onChange={(e) => setIdent({ funcao: e.target.value.toUpperCase() })} />
              <datalist id="funcoes">{FUNCOES.map((f) => <option key={f} value={f} />)}</datalist>
            </label>
            <div className="grupo">
              <span>Base</span>
              <div className="chips">
                {BASES.map((b) => (
                  <button key={b} type="button" className={ident.base === b ? "on" : ""} onClick={() => setIdent({ base: b })}>{b}</button>
                ))}
              </div>
            </div>
            <div className="grupo">
              <span>Coordenação</span>
              <div className="chips">
                {GERENCIAS.map((g) => (
                  <button key={g} type="button" className={ident.gerencia === g ? "on" : ""} onClick={() => setIdent({ gerencia: g })}>{g}</button>
                ))}
              </div>
            </div>
            <div className="acoes">
              <button className="btn sec" onClick={() => atualizar({ etapa: "nome" })}>Voltar</button>
              <button className="btn" disabled={!dadosOk} onClick={() => atualizar({ etapa: "regras" })}>Continuar <span aria-hidden>→</span></button>
            </div>
          </div>
        )}

        {s.etapa === "regras" && (
          <div className="cartao entra">
            <p className="sobre">Antes de começar</p>
            <h1>Como funciona a <em>avaliação</em></h1>
            <ul className="regras">
              <li><b>{QUESTOES.length}</b><span>questões de múltipla escolha, valendo 1 ponto cada</span></li>
              <li><b>20</b><span>minutos para responder, a contagem começa ao tocar em iniciar</span></li>
              <li><b>{NOTA_MINIMA}</b><span>pontos é a nota mínima para aprovação</span></li>
              <li><b>📸</b><span>no final, uma foto sua é obrigatória, com data, hora e localização no carimbo</span></li>
            </ul>
            {erro && <p className="erro-msg">{erro}</p>}
            <div className="acoes">
              <button className="btn sec" onClick={() => atualizar({ etapa: "dados" })}>Voltar</button>
              <button className="btn" disabled={carregando} onClick={iniciar}>{carregando ? "Iniciando…" : "Iniciar avaliação"}</button>
            </div>
          </div>
        )}

        {s.etapa === "prova" && (
          <div className="cartao prova">
            <div className="prova-topo">
              <span>Questão <b>{s.idx + 1}</b> de {QUESTOES.length}</span>
              <span>{respondidas} respondida{respondidas === 1 ? "" : "s"}</span>
            </div>
            <div className="barra"><i style={{ width: `${(respondidas / QUESTOES.length) * 100}%` }} /></div>

            <div className="questao" key={q.id}>
              <h2>{q.enunciado}</h2>
              <div className="opcoes" role="radiogroup">
                {q.opcoes.map((o) => (
                  <button
                    key={o.letra}
                    role="radio"
                    aria-checked={s.respostas[s.idx] === o.letra}
                    className={s.respostas[s.idx] === o.letra ? "on" : ""}
                    onClick={() => atualizar({ respostas: s.respostas.map((r, i) => (i === s.idx ? o.letra : r)) })}
                  >
                    <i>{o.letra}</i>
                    <span>{o.texto}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pontos">
              {QUESTOES.map((x, i) => (
                <button
                  key={x.id}
                  className={`${i === s.idx ? "atual" : ""} ${s.respostas[i] ? "feito" : ""}`}
                  onClick={() => atualizar({ idx: i })}
                  aria-label={`Ir para a questão ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="acoes">
              <button className="btn sec" disabled={s.idx === 0} onClick={() => atualizar({ idx: s.idx - 1 })}>Anterior</button>
              {s.idx < QUESTOES.length - 1 ? (
                <button className="btn" onClick={() => atualizar({ idx: s.idx + 1 })}>Próxima <span aria-hidden>→</span></button>
              ) : (
                <button
                  className="btn"
                  disabled={respondidas < QUESTOES.length}
                  title={respondidas < QUESTOES.length ? "Responda todas as questões" : undefined}
                  onClick={() => atualizar({ etapa: "foto" })}
                >
                  Registrar foto <span aria-hidden>→</span>
                </button>
              )}
            </div>
            {s.idx === QUESTOES.length - 1 && respondidas < QUESTOES.length && (
              <p className="dica vis">Faltam {QUESTOES.length - respondidas} questão(ões) sem resposta.</p>
            )}
          </div>
        )}

        {s.etapa === "foto" && (
          <div className="cartao entra largo">
            <p className="sobre">Última etapa</p>
            <h1>Registre sua <em>foto</em></h1>
            {tempoEsgotado && <p className="aviso">O tempo acabou. Suas respostas foram travadas, e questões em branco contam como erro.</p>}
            <p className="sub">A foto recebe carimbo com data, hora e localização. Ela é obrigatória para concluir.</p>
            <CapturaFoto nome={ident.nome} matricula={ident.matricula} enviando={carregando} erroEnvio={erro} onConfirmar={finalizar} />
          </div>
        )}

        {s.etapa === "fim" && s.resultado && (
          <div className="cartao entra fim">
            <div className={`selo ${s.resultado.aprovado ? "ok" : "no"}`}>
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" className="trilho" />
                <circle cx="60" cy="60" r="52" className="prog" style={{ strokeDashoffset: 327 - 327 * (s.resultado.nota / s.resultado.total) }} />
              </svg>
              <strong>{s.resultado.nota}<small>/{s.resultado.total}</small></strong>
            </div>
            <h1>{s.resultado.aprovado ? <>Aprovado, <em>{primeiroNome}</em>!</> : <>Avaliação <em>concluída</em></>}</h1>
            <p className="sub">
              {s.resultado.aprovado
                ? "Parabéns! Sua avaliação foi registrada com sucesso."
                : `Sua avaliação foi registrada. A nota mínima é ${NOTA_MINIMA}. Procure seu gestor para orientações.`}
            </p>
            <button className="btn sec" onClick={nova}>Nova avaliação</button>
          </div>
        )}
      </section>
    </main>
  );
}
