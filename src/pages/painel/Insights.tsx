import { useEffect, useState, type ReactNode } from "react";
import { Cartao, Colunas, ColunasPares, ListaBarras } from "./charts";
import { Info, type InfoTexto } from "./Info";
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
  funil: { etapas: { etapa: string; valor: number }[]; notificados: number; coberturaNotificados: number; prioritarios: number; coberturaPrioritarios: number };
  concentracao: { faixas: { faixa: string; pessoas: number; mencoes: number; pctPessoas: number; pctMencoes: number }[]; totalPessoas: number; totalMencoes: number; top10Pessoas: number; top10PctMencoes: number };
  demoras: { faixa: string; n: number }[];
  tendenciaTemas: { tema: string; anterior: number; recente: number; variacao: number | null; treinavel: boolean }[];
  baseTema: { bases: string[]; temas: string[]; valores: number[][] };
  coordenadores: { nome: string; notificacoes: number; pctNotificacoes: number; pendentes: number; tratadasPct: number; participantes: number; efetivo: number; cobertura: number; reincidentes: number }[];
  processos: { nome: string; n: number; pct: number; pendentes: number }[];
  qualidade: {
    questoes: { numero: number; enunciado: string; tema: string; aplicadas: number; taxaErro: number; nivel: string; repeteDe: number | null }[];
    aprovacaoPorBase: { nome: string; participacoes: number; aprovacao: number; media: number }[];
  };
  ritmo: { novosPorMes: number; prioritariosPendentes: number; mesesNoRitmoAtual: number | null; necessarioPorMes3Meses: number };
  resumo: { tipo: "alerta" | "oportunidade" | "positivo" | "neutro"; texto: string }[];
  acoes: Acao[];
}

const br = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const num = (n: number, casas = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const ROTULO_PRIORIDADE = { alta: "Prioridade alta", media: "Prioridade média", info: "Informação" } as const;

/** Texto do ícone de informação de cada bloco: o que mostra, por que importa e como ler. */
const INFO: Record<string, InfoTexto> = {
  resumo: {
    oque: "As conclusões principais do relatório, escritas em frases curtas e geradas a partir dos dados de hoje.",
    importa: "Dá a leitura de 30 segundos para quem decide: cobertura, efeito do programa, maior lacuna e capacidade de atendimento.",
    leitura: "Verde indica sinal favorável, vermelho pede atenção, laranja é oportunidade de melhoria.",
  },
  acoes: {
    oque: "Ações sugeridas, ordenadas por prioridade, com a evidência numérica de cada uma e o que fazer.",
    importa: "Transforma os números em decisão: quem convocar, que tema incluir, onde reforçar e o que cobrar.",
    leitura: "Prioridade alta é o que mais reduz risco com menos esforço. As regras e limites são fixos e usam sempre os dados mais recentes.",
  },
  kpiParticipantes: { oque: "Quantos colaboradores diferentes já passaram pela Escola e que parte do efetivo cadastrado isso representa.", importa: "É o alcance do programa. Quanto menor a cobertura, maior a parte da equipe que ainda não recebeu o treinamento." },
  kpiAprovacao: { oque: "Percentual de participações aprovadas e a média das notas (0 a 10).", importa: "Indica se o conteúdo está sendo aprendido. Aprovação muito alta ou muito baixa sugere avaliação fácil demais ou conteúdo mal absorvido." },
  kpiNotificacoes: { oque: "Total de notificações (não conformidades) registradas no período e quantas ainda estão sem tratamento.", importa: "É o tamanho do problema em campo. Pendências sem tratamento tendem a se repetir." },
  kpiVariacao: { oque: "Variação, depois da Escola, no número de notificações por pessoa-mês dos participantes.", importa: "É o melhor sinal de efetividade: mede se quem foi treinado passou a ser notificado menos.", leitura: "Negativo é bom. Não é prova isolada: a amostra é pequena e o acompanhamento ainda é curto." },
  kpiCoberturaNotificados: { oque: "Entre as pessoas que já foram notificadas, quantas passaram pela Escola.", importa: "Quem foi notificado é o público que mais precisa do treinamento. Mostra se o programa está chegando a quem tem o problema.", leitura: "Perto de 100% seria o ideal; valores baixos indicam que a Escola ainda não está direcionada a esse público." },
  kpiRitmo: { oque: "Quantos meses levaria atender quem tem 2 ou mais notificações, mantendo o ritmo atual de novos participantes.", importa: "Mede se a capacidade do programa é compatível com o tamanho da necessidade e quanto é preciso acelerar." },
  efetividade: {
    oque: "Notificações por 100 pessoas-mês dos participantes antes e depois da Escola, comparadas a quem foi notificado e não participou.",
    importa: "Mostra se o treinamento está associado a menos desvios. A taxa por pessoa-mês corrige o fato de cada pessoa ter sido acompanhada por tempos diferentes.",
    leitura: "Menor é melhor. Compare 'Depois da Escola' com 'Antes' e com a referência. A comparação é observacional.",
  },
  leituraEfetividade: {
    oque: "Os números por trás do gráfico: quantos já tinham notificação antes, quantos receberam depois e a demora até a Escola.",
    importa: "Ajuda a interpretar o efeito com honestidade, vendo o tamanho da amostra e os limites da comparação.",
  },
  funil: {
    oque: "Do efetivo cadastrado até o resultado: notificados, participantes, aprovados e quem ficou sem nova notificação.",
    importa: "Mostra onde o programa perde pessoas e o tamanho do público que ainda não foi atendido.",
    leitura: "A porcentagem em cada etapa é em relação à etapa anterior.",
  },
  demoras: {
    oque: "Quanto tempo depois da primeira notificação a pessoa chegou à Escola.",
    importa: "Treinamento perto do desvio tem mais chance de corrigir o comportamento. Demora longa significa que o problema se repete antes de a pessoa ser treinada.",
  },
  mensal: {
    oque: "Notificações e participações na Escola, mês a mês, no mesmo eixo.",
    importa: "Mostra se o treinamento acompanha os períodos de mais problemas e se há meses sem turmas.",
    leitura: "Compare o formato das barras, não a proporção exata: uma notificação é um evento, uma participação é uma pessoa. O mês corrente está incompleto.",
  },
  temas: {
    oque: "Os temas das não conformidades, cada um com o número de notificações e de questões da avaliação.",
    importa: "Revela lacunas: temas que geram muitas notificações e não são avaliados na Escola.",
    leitura: "Os temas são agrupados por palavras do texto da não conformidade. 'Fora do escopo' são questões de estrutura e documentação, que o treinamento não resolve sozinho.",
  },
  matriz: {
    oque: "Quantas notificações cada tema tem em cada base. Quanto mais forte a cor, maior o número.",
    importa: "Mostra onde cada problema se concentra, para direcionar o reforço à base certa em vez de uma ação geral.",
  },
  tendencia: {
    oque: "Notificações por tema nos últimos 90 dias contra os 90 dias anteriores.",
    importa: "Identifica problemas que estão crescendo antes que se tornem os maiores. Permite agir de forma preventiva.",
    leitura: "Mostra a variação só quando o período anterior tem pelo menos 5 notificações.",
  },
  concentracao: {
    oque: "Que parcela das pessoas e das notificações fica em cada faixa de quantidade de notificações por pessoa.",
    importa: "Quando poucas pessoas concentram muitas notificações, um plano individual para elas rende mais que uma ação geral.",
    leitura: "Compare as duas barras de cada faixa: se a de notificações for bem maior que a de pessoas, o problema está concentrado.",
  },
  topNCs: { oque: "As não conformidades mais registradas, pelo texto original.", importa: "Dá exemplos concretos para usar no conteúdo e nas conversas de segurança." },
  processos: { oque: "Notificações por processo de trabalho (plantão, construção, inspeção etc.).", importa: "Mostra em que tipo de atividade os desvios acontecem, para escolher o público e o exemplo certo da turma." },
  cobBase: { oque: "Para cada base: notificações, participantes da Escola e a parte do efetivo atendida.", importa: "Compara o peso do problema com o alcance do treinamento e aponta onde faltam turmas.", leitura: "O selo 'Pouca participação' indica base com muitas notificações e poucos participantes." },
  cobGerencia: { oque: "O mesmo cruzamento por gerência.", importa: "Ajuda a negociar metas de participação com cada gerência." },
  coordenadores: {
    oque: "Por coordenador: notificações, pendências, participantes da Escola, cobertura da equipe e quem recebeu nova notificação depois.",
    importa: "Mostra quem concentra o problema, quem trata rápido e quem precisa de apoio para levar a equipe à Escola.",
    leitura: "O cruzamento usa o primeiro nome do coordenador, pois a grafia é diferente entre os sistemas.",
  },
  ritmo: {
    oque: "Quantos participantes novos entram por mês e quanto seria necessário para atender quem tem 2 ou mais notificações.",
    importa: "Transforma a meta em número: quantas pessoas por mês e quantas turmas são necessárias.",
  },
  questoes: {
    oque: "Taxa de erro de cada questão da avaliação, o tema e a classificação de dificuldade.",
    importa: "Questões muito difíceis podem estar mal escritas ou mal ensinadas, e as muito fáceis não distinguem quem aprendeu. Textos repetidos pesam duas vezes na nota.",
    leitura: "Muito difícil: 60% ou mais de erro. Muito fácil: menos de 10%.",
  },
  erros: { oque: "As cinco questões com maior taxa de erro.", importa: "Indica os pontos do conteúdo que mais precisam ser reforçados na próxima turma." },
  aprovacaoBase: { oque: "Percentual de aprovação e nota média das participações em cada base.", importa: "Mostra onde o conteúdo está sendo menos absorvido, para ajustar instrutor, horário ou material.", leitura: "Bases com poucas participações variam muito; considere o número ao interpretar." },
};

function Kpi({ rotulo, valor, sub, cor, info }: { rotulo: string; valor: string; sub?: string; cor: string; info: InfoTexto }) {
  return (
    <div className="kpi kpi-info" style={{ ["--cor" as string]: cor }}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
      {sub && <small>{sub}</small>}
      <span className="kpi-i"><Info titulo={rotulo} texto={info} /></span>
    </div>
  );
}

/** Cartão para conteúdo próprio (tabelas, listas), com o mesmo cabeçalho e o ícone de informação. */
function Bloco({ titulo, subtitulo, info, children, className = "" }: { titulo: string; subtitulo?: string; info: InfoTexto; children: ReactNode; className?: string }) {
  return (
    <section className={`card ins-secao ${className}`}>
      <header className="card-topo">
        <div><h3>{titulo}</h3>{subtitulo && <small>{subtitulo}</small>}</div>
        <div className="card-icones"><Info titulo={titulo} texto={info} /></div>
      </header>
      {children}
    </section>
  );
}

function Secao({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="ins-titulo-secao">
      <h2>{titulo}</h2>
      <p>{texto}</p>
    </div>
  );
}

export default function Insights() {
  const [d, setD] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroAcao, setFiltroAcao] = useState<"todas" | Acao["prioridade"]>("todas");

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

  const { programa: p, efetividade: ef, notificacoes: nt, funil, concentracao: co, ritmo } = d;
  const mes = d.porMes.map((m) => ({ nome: `${MESES[Number(m.mes.slice(5)) - 1]}/${m.mes.slice(2, 4)}`, notificacoes: m.notificacoes, participacoes: m.participacoes }));
  const comparacao = [
    { nome: "Antes da Escola", valor: ef.taxaAntes },
    { nome: "Depois da Escola", valor: ef.taxaDepois },
    { nome: "Sem Escola (referência)", valor: ef.taxaReferencia },
  ];
  const faixas = co.faixas.map((f) => ({ nome: f.faixa, pctPessoas: f.pctPessoas, pctMencoes: f.pctMencoes }));
  const demoras = d.demoras.map((x) => ({ nome: x.faixa, valor: x.n }));
  const aprovBase = d.qualidade.aprovacaoPorBase.map((b) => ({ nome: b.nome, valor: b.aprovacao, participacoes: b.participacoes }));
  const contagens = { alta: d.acoes.filter((a) => a.prioridade === "alta").length, media: d.acoes.filter((a) => a.prioridade === "media").length };
  const acoes = d.acoes.filter((a) => filtroAcao === "todas" || a.prioridade === filtroAcao);
  const maxMatriz = Math.max(...d.baseTema.valores.flat(), 1);
  const maxTema = Math.max(...nt.temas.map((x) => x.n), 1);
  const maxFunil = Math.max(...funil.etapas.map((e) => e.valor), 1);

  return (
    <div className="insights">
      {!d.disponivel && <p className="erro-msg">A tabela de notificações não foi encontrada neste banco; os insights mostram só os dados da Escola.</p>}

      <div className="kpis kpis-ins">
        <Kpi rotulo="Participantes da Escola" valor={num(p.participantes)} sub={`${num(p.cobertura, 1)}% do efetivo cadastrado`} cor="var(--serie)" info={INFO.kpiParticipantes!} />
        <Kpi rotulo="Aprovação" valor={`${num(p.aprovacao)}%`} sub={`média das notas ${num(p.mediaNota, 2)}`} cor="var(--good)" info={INFO.kpiAprovacao!} />
        <Kpi rotulo="Notificações no período" valor={num(nt.total)} sub={`${num(nt.pendentes)} sem tratamento`} cor="var(--neutro)" info={INFO.kpiNotificacoes!} />
        <Kpi
          rotulo="Notificações por pessoa após a Escola"
          valor={ef.variacao == null ? "—" : `${ef.variacao > 0 ? "+" : ""}${num(ef.variacao)}%`}
          sub="por pessoa-mês, em relação a antes"
          cor={ef.variacao != null && ef.variacao < 0 ? "var(--good)" : "var(--crit)"}
          info={INFO.kpiVariacao!}
        />
        <Kpi rotulo="Notificados que já fizeram a Escola" valor={`${num(funil.coberturaNotificados, 1)}%`} sub={`${num(funil.prioritarios)} pessoas com 2+ notificações: ${num(funil.coberturaPrioritarios, 1)}%`} cor="var(--info)" info={INFO.kpiCoberturaNotificados!} />
        <Kpi
          rotulo="Meses para atender os prioritários"
          valor={ritmo.mesesNoRitmoAtual == null ? "—" : num(ritmo.mesesNoRitmoAtual)}
          sub={`no ritmo atual de ${num(ritmo.novosPorMes, 1)} novos por mês`}
          cor={ritmo.mesesNoRitmoAtual != null && ritmo.mesesNoRitmoAtual > 6 ? "var(--crit)" : "var(--good)"}
          info={INFO.kpiRitmo!}
        />
      </div>

      <Bloco titulo="Resumo executivo" subtitulo="O essencial em poucas frases" info={INFO.resumo!}>
        <ul className="ins-resumo">
          {d.resumo.map((r, i) => <li key={i} className={r.tipo}>{r.texto}</li>)}
        </ul>
      </Bloco>

      <Bloco titulo="Ações recomendadas" subtitulo={`${contagens.alta} de prioridade alta e ${contagens.media} de prioridade média, com base nos dados da Escola e das notificações.`} info={INFO.acoes!}>
        <div className="ins-filtro-acoes" role="group" aria-label="Filtrar ações">
          {(["todas", "alta", "media", "info"] as const).map((f) => (
            <button key={f} type="button" className={filtroAcao === f ? "on" : ""} onClick={() => setFiltroAcao(f)}>
              {f === "todas" ? `Todas (${d.acoes.length})` : `${ROTULO_PRIORIDADE[f]} (${d.acoes.filter((a) => a.prioridade === f).length})`}
            </button>
          ))}
        </div>
        <div className="ins-acoes">
          {acoes.map((a, i) => (
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
          {!acoes.length && <p className="vazio">Nenhuma ação nesta prioridade.</p>}
        </div>
      </Bloco>

      <Secao titulo="Efetividade da Escola" texto="O programa está funcionando e chegando a quem precisa?" />
      <div className="ins-grade">
        <Cartao titulo="Efetividade: notificações por 100 pessoas-mês" subtitulo="Menor é melhor" alto={250} tabela={comparacao} info={INFO.efetividade}>
          <Colunas dados={comparacao} formato={(n) => num(n, 1)} />
        </Cartao>
        <Bloco titulo="Leitura da efetividade" subtitulo={`O que os números dizem sobre os ${num(ef.participantes)} participantes`} info={INFO.leituraEfetividade!}>
          <ul className="ins-fatos">
            <li><b>{num(ef.notificadosAntes)}</b> já tinham notificação antes de participar; <b>{num(ef.reincidenciaDosNotificados)}%</b> deles foram notificados de novo depois.</li>
            <li><b>{num(ef.reincidiram)}</b> participante(s) ({num(ef.taxaReincidencia, 1)}%) receberam notificação depois da Escola.</li>
            <li>Notificações dos participantes: <b>{num(ef.notificacoesAntes)}</b> antes e <b>{num(ef.notificacoesDepois)}</b> depois da participação.</li>
            {ef.tempoAteEscola != null && <li>Da primeira notificação até a participação passam, em média, <b>{num(ef.tempoAteEscola)} dias</b>.</li>}
            <li>A referência (<b>{num(ef.taxaReferencia, 1)}</b>) é a de {num(ef.pessoasReferencia)} pessoas notificadas que não fizeram a Escola, contada a partir da primeira notificação.</li>
          </ul>
          <p className="ins-nota">Leitura com cautela: a comparação é observacional, os participantes costumam ser escolhidos justamente por terem sido notificados, e a Escola começou em junho, então o tempo de acompanhamento depois da participação ainda é curto.</p>
        </Bloco>
      </div>

      <div className="ins-grade">
        <Bloco titulo="Funil da população" subtitulo="Do efetivo até o resultado" info={INFO.funil!}>
          <ol className="ins-funil">
            {funil.etapas.map((e, i) => {
              const anterior = i > 0 ? funil.etapas[i - 1]!.valor : null;
              return (
                <li key={e.etapa}>
                  <span className="ins-funil-nome">{e.etapa}</span>
                  <span className="ins-funil-barra"><i style={{ width: `${Math.max(2, (e.valor / maxFunil) * 100)}%` }} /></span>
                  <b>{num(e.valor)}</b>
                  <small>{anterior ? `${num((e.valor / anterior) * 100, 1)}% da etapa anterior` : "100%"}</small>
                </li>
              );
            })}
          </ol>
        </Bloco>
        <Cartao titulo="Tempo da primeira notificação até a Escola" subtitulo="Participantes que já tinham notificação" alto={250} tabela={demoras} info={INFO.demoras}>
          <Colunas dados={demoras} />
        </Cartao>
      </div>

      <Cartao titulo="Notificações e participações na Escola, por mês" subtitulo="Mesma unidade (quantidade) no mesmo eixo" alto={290} tabela={mes} info={INFO.mensal}>
        <ColunasPares dados={mes} series={[{ chave: "notificacoes", nome: "Notificações", cor: "alerta" }, { chave: "participacoes", nome: "Participações na Escola", cor: "serie" }]} />
      </Cartao>

      <Secao titulo="Onde estão os problemas" texto="Quais temas, bases e pessoas concentram as não conformidades." />
      <Bloco titulo="Não conformidades x conteúdo da Escola" subtitulo="Tema de cada notificação, comparado com as questões ativas da avaliação" info={INFO.temas!}>
        <div className="tabela-wrap">
          <table className="tabela ins-tabela">
            <thead><tr><th>Tema</th><th>Notificações</th><th className="num">Questões</th><th>Situação</th></tr></thead>
            <tbody>
              {nt.temas.map((t) => {
                const sit = !t.treinavel ? ["fora", "Fora do escopo do treinamento"] : t.questoes === 0 ? ["lacuna", "Sem questão na avaliação"] : t.questoes === 1 && t.pct >= 10 ? ["pouca", "Pouca cobertura"] : ["ok", "Coberto"];
                return (
                  <tr key={t.tema}>
                    <td data-rotulo="Tema" className="nome">{t.tema}</td>
                    <td data-rotulo="Notificações">
                      <span className="ins-barra"><i style={{ width: `${(t.n / maxTema) * 100}%` }} /></span>
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
      </Bloco>

      <Bloco titulo="Tema por base" subtitulo="Onde cada problema acontece (número de notificações)" info={INFO.matriz!}>
        <div className="tabela-wrap">
          <table className="tabela ins-matriz">
            <thead><tr><th>Tema</th>{d.baseTema.bases.map((b) => <th key={b} className="num">{b}</th>)}</tr></thead>
            <tbody>
              {d.baseTema.temas.map((t, i) => (
                <tr key={t}>
                  <td data-rotulo="Tema" className="nome">{t}</td>
                  {d.baseTema.valores[i]!.map((v, k) => (
                    <td key={k} data-rotulo={d.baseTema.bases[k]} className="num mx-cel" style={{ ["--i" as string]: v / maxMatriz }}>{v || ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>

      <div className="ins-grade">
        <Bloco titulo="Temas em alta ou em queda" subtitulo="Últimos 90 dias contra os 90 anteriores" info={INFO.tendencia!}>
          <div className="tabela-wrap">
            <table className="tabela ins-tabela">
              <thead><tr><th>Tema</th><th className="num">Anterior</th><th className="num">Recente</th><th className="num">Variação</th></tr></thead>
              <tbody>
                {d.tendenciaTemas.map((t) => (
                  <tr key={t.tema}>
                    <td data-rotulo="Tema" className="nome">{t.tema}</td>
                    <td data-rotulo="Anterior" className="num">{t.anterior}</td>
                    <td data-rotulo="Recente" className="num">{t.recente}</td>
                    <td data-rotulo="Variação" className="num">
                      {t.variacao == null ? "—" : <span className={`ins-var ${t.variacao > 10 ? "sobe" : t.variacao < -10 ? "desce" : ""}`}>{t.variacao > 0 ? "▲" : t.variacao < 0 ? "▼" : "•"} {t.variacao > 0 ? "+" : ""}{num(t.variacao)}%</span>}
                    </td>
                  </tr>
                ))}
                {!d.tendenciaTemas.length && <tr><td colSpan={4} className="vazio-tab">Dados insuficientes.</td></tr>}
              </tbody>
            </table>
          </div>
        </Bloco>
        <Cartao titulo="Concentração de notificações por pessoa" subtitulo={`10% das pessoas concentram ${num(co.top10PctMencoes, 1)}% das notificações`} alto={250} tabela={faixas} info={INFO.concentracao}>
          <ColunasPares dados={faixas} series={[{ chave: "pctPessoas", nome: "% das pessoas", cor: "serie" }, { chave: "pctMencoes", nome: "% das notificações", cor: "alerta" }]} />
        </Cartao>
      </div>

      <div className="ins-grade">
        <Cartao titulo="Não conformidades mais frequentes" alto="auto" tabela={nt.topNCs.map((x) => ({ nome: x.texto, valor: x.n }))} info={INFO.topNCs}>
          <ListaBarras itens={nt.topNCs.map((x) => ({ nome: x.texto, valor: x.n }))} max={Math.max(...nt.topNCs.map((x) => x.n), 1)} destaque={() => "var(--serie)"} />
        </Cartao>
        <Cartao titulo="Notificações por processo" alto="auto" tabela={d.processos.map((x) => ({ nome: x.nome, valor: x.n }))} info={INFO.processos}>
          <ListaBarras itens={d.processos.map((x) => ({ nome: x.nome, valor: x.n }))} max={Math.max(...d.processos.map((x) => x.n), 1)} destaque={() => "var(--serie)"} />
        </Cartao>
      </div>

      <Secao titulo="Cobertura e capacidade" texto="Quem a Escola já alcançou e o que falta para atender quem mais precisa." />
      <div className="ins-grade">
        <TabelaCobertura titulo="Cobertura por base" linhas={d.porBase} info={INFO.cobBase!} />
        <TabelaCobertura titulo="Cobertura por gerência" linhas={d.porGerencia} info={INFO.cobGerencia!} />
      </div>

      <Bloco titulo="Coordenadores" subtitulo="Notificações, tratamento e participação da equipe na Escola" info={INFO.coordenadores!}>
        <div className="tabela-wrap">
          <table className="tabela ins-tabela">
            <thead>
              <tr><th>Coordenador</th><th className="num">Notificações</th><th className="num">Tratadas</th><th className="num">Pendentes</th><th className="num">Participantes</th><th className="num">Da equipe</th><th className="num">Receberam nova notificação</th></tr>
            </thead>
            <tbody>
              {d.coordenadores.map((c) => (
                <tr key={c.nome}>
                  <td data-rotulo="Coordenador" className="nome">{c.nome}</td>
                  <td data-rotulo="Notificações" className="num">{num(c.notificacoes)} <small>({num(c.pctNotificacoes, 1)}%)</small></td>
                  <td data-rotulo="Tratadas" className="num">{c.notificacoes ? `${num(c.tratadasPct, 1)}%` : "—"}</td>
                  <td data-rotulo="Pendentes" className="num">{c.pendentes ? <span className="ins-var sobe">{c.pendentes}</span> : 0}</td>
                  <td data-rotulo="Participantes" className="num">{c.participantes}</td>
                  <td data-rotulo="Da equipe" className="num">{c.efetivo ? `${num(c.cobertura, 1)}%` : "—"}</td>
                  <td data-rotulo="Nova notificação" className="num">{c.reincidentes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>

      <Bloco titulo="Ritmo necessário" subtitulo="Para atender quem tem 2 ou mais notificações" info={INFO.ritmo!}>
        <div className="ins-tiles">
          <div><strong>{num(ritmo.novosPorMes, 1)}</strong><span>participantes novos por mês (média dos últimos 90 dias)</span></div>
          <div><strong>{num(ritmo.prioritariosPendentes)}</strong><span>pessoas com 2 ou mais notificações ainda sem a Escola</span></div>
          <div><strong>{ritmo.mesesNoRitmoAtual == null ? "—" : num(ritmo.mesesNoRitmoAtual)}</strong><span>meses para atendê-las no ritmo atual</span></div>
          <div><strong>{num(ritmo.necessarioPorMes3Meses)}</strong><span>participantes por mês para atendê-las em 3 meses</span></div>
        </div>
      </Bloco>

      <Secao titulo="Qualidade da avaliação" texto="As questões medem bem o que a Escola ensina?" />
      <Bloco titulo="Análise das questões" subtitulo="Dificuldade e tema de cada questão ativa" info={INFO.questoes!}>
        <div className="tabela-wrap">
          <table className="tabela ins-tabela">
            <thead><tr><th className="num">Q</th><th>Tema</th><th>Erro</th><th>Nível</th><th>Observação</th></tr></thead>
            <tbody>
              {d.qualidade.questoes.map((q) => (
                <tr key={q.numero}>
                  <td data-rotulo="Questão" className="num"><b>{q.numero}</b></td>
                  <td data-rotulo="Tema">{q.tema}</td>
                  <td data-rotulo="Erro">
                    <span className="ins-barra"><i className={q.taxaErro >= 60 ? "crit" : ""} style={{ width: `${Math.min(100, q.taxaErro)}%` }} /></span>
                    <b>{num(q.taxaErro, 1)}%</b> <small>({q.aplicadas})</small>
                  </td>
                  <td data-rotulo="Nível"><span className={`selo-sit ins-sit ${q.nivel === "Muito difícil" ? "lacuna" : q.nivel === "Difícil" || q.nivel === "Muito fácil" ? "pouca" : q.nivel === "Adequada" ? "ok" : "fora"}`}>{q.nivel}</span></td>
                  <td data-rotulo="Observação" className="ins-obs">{q.repeteDe ? `Texto quase igual ao da questão ${q.repeteDe}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloco>

      <div className="ins-grade">
        <Cartao titulo="Questões mais erradas na avaliação" alto="auto" tabela={d.erros.map((e) => ({ nome: `Questão ${e.numero}`, valor: e.taxa }))} info={INFO.erros}>
          <ListaBarras itens={d.erros.map((e) => ({ nome: `Q${e.numero} · ${e.tema}`, valor: e.taxa }))} max={100} formato={(n) => `${num(n)}%`} destaque={(v) => (v >= 50 ? "var(--crit)" : "var(--serie)")} />
        </Cartao>
        <Cartao titulo="Aprovação por base" subtitulo="% das participações aprovadas" alto={250} tabela={aprovBase} info={INFO.aprovacaoBase}>
          <Colunas dados={aprovBase} formato={(n) => `${num(n)}%`} max={100} />
        </Cartao>
      </div>

      <p className="ins-rodape">
        Gerado com as notificações{d.periodo.de && d.periodo.ate ? ` de ${br(d.periodo.de)} a ${br(d.periodo.ate)}` : ""} e as {num(p.participacoes)} participações registradas na Escola de Segurança. O cruzamento é pelo nome do colaborador, e os temas das não conformidades são agrupados por palavras do texto.
      </p>
    </div>
  );
}

function TabelaCobertura({ titulo, linhas, info }: { titulo: string; linhas: Cobertura[]; info: InfoTexto }) {
  return (
    <Bloco titulo={titulo} subtitulo="Participação na Escola frente ao peso nas notificações" info={info}>
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
    </Bloco>
  );
}
