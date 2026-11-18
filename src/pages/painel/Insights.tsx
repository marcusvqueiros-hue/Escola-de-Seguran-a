import { useEffect, useState } from "react";
import { Cartao, Colunas, ColunasPares, ListaBarras } from "./charts";
import { MESES } from "./metrics";

interface Acao {
  prioridade: "alta" | "media" | "info";
  tipo: "alerta" | "oportunidade" | "positivo";
  titulo: string;
  evidencia: string;
  acao: string;
  itens?: string[];
}

interface Cobertura {
  nome: string;
  notificacoes: number;
  pctNotificacoes: number;
  participantes: number;
  pctParticipantes: number;
  efetivo: number;
  cobertura: number;
}

interface Dados {
  disponivel: boolean;
  periodo: { de: string | null; ate: string | null };
  programa: { participacoes: number; participantes: number; efetivo: number; cobertura: number; aprovacao: number; mediaNota: number; repetentes: number; reprovadosSemNova: number };
  efetividade: {
    participantes: number;
    notificadosAntes: number;
    reincidiram: number;
    taxaReincidencia: number;
    reincidenciaDosNotificados: number;
    taxaAntes: number;
    taxaDepois: number;
    taxaReferencia: number;
    variacao: number | null;
    pessoasReferencia: number;
    tempoAteEscola: number | null;
    notificacoesAntes: number;
    notificacoesDepois: number;
  };
  notificacoes: { total: number; tratadas: number; pendentes: number; tempoResposta: number | null; temas: { tema: string; n: number; pct: number; questoes: number; treinavel: boolean }[]; topNCs: { texto: string; n: number }[] };
  porMes: { mes: string; notificacoes: number; participacoes: number }[];
  porBase: Cobertura[];
  porGerencia: Cobertura[];
  erros: { numero: number; enunciado: string; aplicadas: number; erros: number; taxa: number; tema: string }[];
  acoes: Acao[];
}

const br = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const num = (n: number, casas = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const ROTULO_PRIORIDADE = { alta: "Prioridade alta", media: "Prioridade média", info: "Informação" } as const;

function Kpi({ rotulo, valor, sub, cor }: { rotulo: string; valor: string; sub?: string; cor: string }) {
  return (
    <div className="kpi" style={{ ["--cor" as string]: cor }}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export default function Insights() {
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/insights")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.erro ?? "Falha ao carregar os insights.");
        setD(j);
      })
      .catch((e) => setErro((e as Error).message));
  }, []);

  if (erro) return <p className="erro-msg">{erro}</p>;
  if (!d) return <p className="vazio">Calculando os insights…</p>;

  const { programa: p, efetividade: ef, notificacoes: nt } = d;
  const mes = d.porMes.map((m) => ({ nome: `${MESES[Number(m.mes.slice(5)) - 1]}/${m.mes.slice(2, 4)}`, notificacoes: m.notificacoes, participacoes: m.participacoes }));
  const comparacao = [
    { nome: "Antes da Escola", valor: ef.taxaAntes },
    { nome: "Depois da Escola", valor: ef.taxaDepois },
    { nome: "Sem Escola (referência)", valor: ef.taxaReferencia },
  ];
  const contagens = { alta: d.acoes.filter((a) => a.prioridade === "alta").length, media: d.acoes.filter((a) => a.prioridade === "media").length };

  return (
    <div className="insights">
      {!d.disponivel && <p className="erro-msg">A tabela de notificações não foi encontrada neste banco; os insights mostram só os dados da Escola.</p>}

      <div className="kpis">
        <Kpi rotulo="Participantes da Escola" valor={num(p.participantes)} sub={`${num(p.cobertura, 1)}% do efetivo cadastrado`} cor="var(--serie)" />
        <Kpi rotulo="Aprovação" valor={`${num(p.aprovacao)}%`} sub={`média das notas ${num(p.mediaNota, 2)}`} cor="var(--good)" />
        <Kpi rotulo="Notificações no período" valor={num(nt.total)} sub={`${num(nt.pendentes)} sem tratamento`} cor="var(--neutro)" />
        <Kpi
          rotulo="Notificações por pessoa após a Escola"
          valor={ef.variacao == null ? "—" : `${ef.variacao > 0 ? "+" : ""}${num(ef.variacao)}%`}
          sub="por pessoa-mês, em relação a antes"
          cor={ef.variacao != null && ef.variacao < 0 ? "var(--good)" : "var(--crit)"}
        />
      </div>

      <section className="card ins-secao">
        <header className="card-topo">
          <div>
            <h3>Ações recomendadas</h3>
            <small>{contagens.alta} de prioridade alta e {contagens.media} de prioridade média, com base nos dados da Escola e das notificações.</small>
          </div>
        </header>
        <div className="ins-acoes">
          {d.acoes.map((a, i) => (
            <article key={i} className={`ins-acao ${a.tipo} ${a.prioridade}`}>
              <div className="ins-acao-topo">
                <span className={`ins-selo ${a.prioridade}`}>{ROTULO_PRIORIDADE[a.prioridade]}</span>
                <h4>{a.titulo}</h4>
              </div>
              <p className="ins-evid">{a.evidencia}</p>
              <p className="ins-fazer"><b>O que fazer:</b> {a.acao}</p>
              {a.itens && a.itens.length > 0 && (
                <details>
                  <summary>Ver {a.itens.length} {a.itens.length === 1 ? "item" : "itens"}</summary>
                  <ul>{a.itens.map((t, k) => <li key={k}>{t}</li>)}</ul>
                </details>
              )}
            </article>
          ))}
          {!d.acoes.length && <p className="vazio">Nenhuma ação recomendada com os dados atuais.</p>}
        </div>
      </section>

      <div className="ins-grade">
        <Cartao titulo="Efetividade: notificações por 100 pessoas-mês" subtitulo="Menor é melhor" alto={250} tabela={comparacao}>
          <Colunas dados={comparacao} formato={(n) => num(n, 1)} />
        </Cartao>

        <section className="card ins-secao">
          <header className="card-topo"><div><h3>Leitura da efetividade</h3><small>O que os números dizem sobre os {num(ef.participantes)} participantes</small></div></header>
          <ul className="ins-fatos">
            <li><b>{num(ef.notificadosAntes)}</b> já tinham notificação antes de participar; <b>{num(ef.reincidenciaDosNotificados)}%</b> deles foram notificados de novo depois.</li>
            <li><b>{num(ef.reincidiram)}</b> participante(s) ({num(ef.taxaReincidencia, 1)}%) receberam notificação depois da Escola.</li>
            <li>Notificações dos participantes: <b>{num(ef.notificacoesAntes)}</b> antes e <b>{num(ef.notificacoesDepois)}</b> depois da participação.</li>
            {ef.tempoAteEscola != null && <li>Da primeira notificação até a participação passam, em média, <b>{num(ef.tempoAteEscola)} dias</b>.</li>}
            <li>A referência (<b>{num(ef.taxaReferencia, 1)}</b>) é a de {num(ef.pessoasReferencia)} pessoas notificadas que não fizeram a Escola, contada a partir da primeira notificação.</li>
          </ul>
          <p className="ins-nota">Leitura com cautela: a comparação é observacional, os participantes costumam ser escolhidos justamente por terem sido notificados, e a Escola começou em junho, então o tempo de acompanhamento depois da participação ainda é curto.</p>
        </section>
      </div>

      <Cartao titulo="Notificações e participações na Escola, por mês" subtitulo="Mesma unidade (quantidade) no mesmo eixo" alto={290} tabela={mes}>
        <ColunasPares dados={mes} series={[{ chave: "notificacoes", nome: "Notificações", cor: "alerta" }, { chave: "participacoes", nome: "Participações na Escola", cor: "serie" }]} />
      </Cartao>

      <section className="card ins-secao">
        <header className="card-topo"><div><h3>Não conformidades x conteúdo da Escola</h3><small>Tema de cada notificação, comparado com as questões ativas da avaliação</small></div></header>
        <div className="tabela-wrap">
          <table className="tabela ins-tabela">
            <thead><tr><th>Tema</th><th>Notificações</th><th className="num">Questões</th><th>Situação</th></tr></thead>
            <tbody>
              {nt.temas.map((t) => {
                const max = Math.max(...nt.temas.map((x) => x.n), 1);
                const sit = !t.treinavel ? ["fora", "Fora do escopo do treinamento"] : t.questoes === 0 ? ["lacuna", "Sem questão na avaliação"] : t.questoes === 1 && t.pct >= 10 ? ["pouca", "Pouca cobertura"] : ["ok", "Coberto"];
                return (
                  <tr key={t.tema}>
                    <td data-rotulo="Tema" className="nome">{t.tema}</td>
                    <td data-rotulo="Notificações">
                      <span className="ins-barra"><i style={{ width: `${(t.n / max) * 100}%` }} /></span>
                      <b>{num(t.n)}</b> <small>({num(t.pct, 1)}%)</small>
                    </td>
                    <td data-rotulo="Questões" className="num">{t.questoes}</td>
                    <td data-rotulo="Situação"><span className={`selo-sit ins-sit ${sit[0]}`}>{sit[1]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="ins-grade">
        <TabelaCobertura titulo="Cobertura por base" linhas={d.porBase} />
        <TabelaCobertura titulo="Cobertura por gerência" linhas={d.porGerencia} />
      </div>

      <div className="ins-grade">
        <Cartao titulo="Não conformidades mais frequentes" alto="auto" tabela={nt.topNCs.map((x) => ({ nome: x.texto, valor: x.n }))}>
          <ListaBarras itens={nt.topNCs.map((x) => ({ nome: x.texto, valor: x.n }))} max={Math.max(...nt.topNCs.map((x) => x.n), 1)} destaque={() => "var(--serie)"} />
        </Cartao>
        <Cartao titulo="Questões mais erradas na avaliação" alto="auto" tabela={d.erros.map((e) => ({ nome: `Questão ${e.numero}`, valor: e.taxa }))}>
          <ListaBarras
            itens={d.erros.map((e) => ({ nome: `Q${e.numero} · ${e.tema}`, valor: e.taxa }))}
            max={100}
            formato={(n) => `${num(n)}%`}
            destaque={(v) => (v >= 50 ? "var(--crit)" : "var(--serie)")}
          />
        </Cartao>
      </div>

      <p className="ins-rodape">
        Gerado com as notificações{d.periodo.de && d.periodo.ate ? ` de ${br(d.periodo.de)} a ${br(d.periodo.ate)}` : ""} e as {num(p.participacoes)} participações registradas na Escola de Segurança. O cruzamento é pelo nome do colaborador, e os temas das não conformidades são agrupados por palavras do texto.
      </p>
    </div>
  );
}

function TabelaCobertura({ titulo, linhas }: { titulo: string; linhas: Cobertura[] }) {
  return (
    <section className="card ins-secao">
      <header className="card-topo"><div><h3>{titulo}</h3><small>Participação na Escola frente ao peso nas notificações</small></div></header>
      <div className="tabela-wrap">
        <table className="tabela ins-tabela">
          <thead><tr><th>{titulo.endsWith("base") ? "Base" : "Gerência"}</th><th className="num">Notificações</th><th className="num">Participantes</th><th className="num">Do efetivo</th><th>Sinal</th></tr></thead>
          <tbody>
            {linhas.map((l) => {
              const alerta = l.pctNotificacoes >= 12 && l.pctParticipantes < l.pctNotificacoes * 0.6;
              return (
                <tr key={l.nome}>
                  <td data-rotulo="Nome" className="nome">{l.nome}</td>
                  <td data-rotulo="Notificações" className="num">{num(l.notificacoes)} <small>({num(l.pctNotificacoes, 1)}%)</small></td>
                  <td data-rotulo="Participantes" className="num">{num(l.participantes)} <small>({num(l.pctParticipantes, 1)}%)</small></td>
                  <td data-rotulo="Do efetivo" className="num">{l.efetivo ? `${num(l.cobertura, 1)}%` : "—"}</td>
                  <td data-rotulo="Sinal">{alerta ? <span className="selo-sit ins-sit lacuna">Pouca participação</span> : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
