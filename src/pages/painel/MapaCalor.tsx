import { useEffect, useMemo, useState } from "react";
import { BASES, GERENCIAS } from "../../shared/constantes";
import { chaveNome } from "../../shared/texto";
import { MESES, MESES_LONGO } from "./metrics";

interface Notif {
  data: string; // AAAA-MM-DD
  base: string;
  gerencia: string;
  status: string;
}

interface Participante {
  nome: string;
  base: string;
  gerencia: string;
  coordenador: string;
  situacao: string;
  participacoes: string[]; // ISO
  notificacoes: Notif[];
}

interface Fonte {
  notificacoes: number;
  de: string | null;
  ate: string | null;
  disponivel: boolean;
}

const p2 = (n: number) => String(n).padStart(2, "0");
/** Dia local (AAAA-MM-DD) de um instante ISO. */
const diaLocal = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};
const br = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const mesDe = (dia: string) => Number(dia.slice(5, 7)) - 1;
const anoDe = (dia: string) => Number(dia.slice(0, 4));

interface Celula {
  participou: string[]; // dias
  antes: string[]; // notificações até o dia da participação
  depois: string[]; // notificações depois da participação: reincidência
}

interface Linha {
  p: Participante;
  meses: Celula[];
  reincidencias: number;
  participacoesAno: number;
}

export default function MapaCalor() {
  const [dados, setDados] = useState<{ participantes: Participante[]; fonte: Fonte } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ano, setAno] = useState<number | null>(null);
  const [base, setBase] = useState("");
  const [gerencia, setGerencia] = useState("");
  const [reinc, setReinc] = useState("");
  const [porQtd, setPorQtd] = useState(false); // ordena por número de notificações depois da Escola
  const [busca, setBusca] = useState("");

  useEffect(() => {
    fetch("/api/admin/mapa-calor")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.erro ?? "Falha ao carregar o mapa de calor.");
        setDados(d);
      })
      .catch((e) => setErro((e as Error).message));
  }, []);

  const anos = useMemo(() => {
    const s = new Set<number>();
    for (const p of dados?.participantes ?? []) {
      for (const d of p.participacoes) s.add(anoDe(diaLocal(d)));
      for (const n of p.notificacoes) s.add(anoDe(n.data));
    }
    return [...s].sort((a, b) => b - a);
  }, [dados]);
  const anoAtivo = ano ?? anos[0] ?? new Date().getFullYear();

  const todas = useMemo<Linha[]>(() => {
    const q = chaveNome(busca);
    return (dados?.participantes ?? [])
      .map((p) => {
        const dias = p.participacoes.map(diaLocal).sort();
        const primeira = dias[0]!;
        const meses: Celula[] = Array.from({ length: 12 }, () => ({ participou: [], antes: [], depois: [] }));
        for (const d of dias) if (anoDe(d) === anoAtivo) meses[mesDe(d)]!.participou.push(d);
        for (const n of p.notificacoes) {
          if (anoDe(n.data) !== anoAtivo) continue;
          (n.data > primeira ? meses[mesDe(n.data)]!.depois : meses[mesDe(n.data)]!.antes).push(n.data);
        }
        return { p, meses, reincidencias: meses.reduce((a, m) => a + m.depois.length, 0), participacoesAno: dias.filter((d) => anoDe(d) === anoAtivo).length };
      })
      .filter(
        (l) =>
          l.participacoesAno > 0 &&
          (!base || l.p.base === base) &&
          (!gerencia || l.p.gerencia === gerencia) &&
          (!q || chaveNome(l.p.nome).includes(q)),
      );
  }, [dados, anoAtivo, base, gerencia, busca]);

  const linhas = useMemo(() => {
    const f = todas.filter((l) => !reinc || (reinc === "sim" ? l.reincidencias > 0 : l.reincidencias === 0));
    return porQtd ? [...f].sort((a, b) => b.reincidencias - a.reincidencias || a.p.nome.localeCompare(b.p.nome)) : f;
  }, [todas, reinc, porQtd]);

  const reincidentes = todas.filter((l) => l.reincidencias > 0).length;
  const totalReinc = todas.reduce((a, l) => a + l.reincidencias, 0);
  const taxa = todas.length ? Math.round((reincidentes / todas.length) * 100) : 0;

  // cada card aplica um filtro; clicar de novo no card ativo (ou em "Participantes") volta para todos
  const CARDS = [
    { rotulo: "Participantes", valor: String(todas.length), cor: "var(--serie)", filtro: "", qtd: false, espelho: false, dica: "Mostrar todos os participantes" },
    { rotulo: "Reincidiram", valor: String(reincidentes), cor: "var(--crit)", filtro: "sim", qtd: false, espelho: false, dica: "Mostrar só quem recebeu notificação depois da Escola" },
    { rotulo: "Taxa de reincidência", valor: `${taxa}%`, cor: "var(--crit)", filtro: "sim", qtd: false, espelho: true, dica: "Mostrar quem reincidiu (a taxa é a parte deles entre os participantes)" },
    { rotulo: "Notificações após a Escola", valor: String(totalReinc), cor: "var(--neutro)", filtro: "sim", qtd: true, espelho: false, dica: "Mostrar quem reincidiu, com mais notificações primeiro" },
  ];

  const detalhe = (l: Linha, m: number) => {
    const c = l.meses[m]!;
    const partes: string[] = [];
    if (c.participou.length) partes.push(`Participou da Escola em ${c.participou.map(br).join(", ")}`);
    if (c.antes.length) partes.push(`Notificação antes da participação: ${c.antes.map(br).join(", ")}`);
    if (c.depois.length) partes.push(`Reincidiu (notificação depois da participação): ${c.depois.map(br).join(", ")}`);
    return partes.length ? `${l.p.nome} — ${MESES_LONGO[m]}/${anoAtivo}\n${partes.join("\n")}` : "";
  };

  if (erro) return <p className="erro-msg">{erro}</p>;
  if (!dados) return <p className="vazio">Carregando…</p>;

  return (
    <div className="mapa">
      <div className="kpis">
        {CARDS.map((c) => {
          // "Taxa" aplica o mesmo filtro de "Reincidiram", que é quem fica marcado
          const ativo = !c.espelho && reinc === c.filtro && porQtd === c.qtd && (c.filtro !== "" || (!reinc && !porQtd));
          return (
            <button
              key={c.rotulo}
              type="button"
              className={`kpi clicavel ${ativo ? "on" : ""}`}
              style={{ ["--cor" as string]: c.cor }}
              aria-pressed={ativo}
              title={ativo && c.filtro ? "Clique para limpar o filtro" : c.dica}
              onClick={() => {
                const limpa = c.espelho ? false : ativo || !c.filtro;
                setReinc(limpa ? "" : c.filtro);
                setPorQtd(limpa ? false : c.qtd);
              }}
            >
              <span>{c.rotulo}</span>
              <strong>{c.valor}</strong>
            </button>
          );
        })}
      </div>

      <section className="card tabela-card">
        <div className="barra-acoes">
          <input className="busca" type="search" placeholder="Buscar colaborador" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select value={anoAtivo} onChange={(e) => setAno(Number(e.target.value))} aria-label="Ano">
            {(anos.length ? anos : [anoAtivo]).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={base} onChange={(e) => setBase(e.target.value)} aria-label="Base">
            <option value="">Todas as bases</option>
            {BASES.map((b) => <option key={b}>{b}</option>)}
          </select>
          <select value={gerencia} onChange={(e) => setGerencia(e.target.value)} aria-label="Gerência">
            <option value="">Todas as gerências</option>
            {GERENCIAS.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select value={reinc} onChange={(e) => { setReinc(e.target.value); setPorQtd(false); }} aria-label="Reincidência">
            <option value="">Reincidência: todos</option>
            <option value="sim">Reincidiram</option>
            <option value="nao">Não reincidiram</option>
          </select>
          {(base || gerencia || reinc || busca) && <button className="limpar" onClick={() => { setBase(""); setGerencia(""); setReinc(""); setPorQtd(false); setBusca(""); }}>Limpar</button>}
        </div>

        <div className="mapa-legenda" aria-label="Legenda">
          <span><i className="cel p">E</i> Participou da Escola de Segurança</span>
          <span><i className="cel n n1">1</i> Notificação antes da participação</span>
          <span><i className="cel r r1">1</i> Reincidiu: notificação depois da participação</span>
          <small>Quanto mais forte a cor, mais notificações no mês. O número é a quantidade de notificações.</small>
        </div>

        {!dados.fonte.disponivel && <p className="erro-msg">A tabela de notificações não foi encontrada neste banco, então o mapa mostra só a participação na Escola.</p>}

        <div className="tabela-wrap mapa-wrap">
          <table className="mapa-tabela">
            <thead>
              <tr>
                <th className="mapa-nome">Colaborador</th>
                <th>Base</th>
                <th>Gerência</th>
                {MESES.map((m) => <th key={m} className="mapa-mes">{m}</th>)}
                <th>Reincidiu</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={chaveNome(l.p.nome)}>
                  <th scope="row" className="mapa-nome" title={`${l.p.nome}${l.p.situacao ? ` · ${l.p.situacao}` : ""}`}>{l.p.nome}</th>
                  <td>{l.p.base}</td>
                  <td>{l.p.gerencia}</td>
                  {l.meses.map((c, m) => {
                    const nDep = c.depois.length;
                    const nAnt = c.antes.length;
                    const estado = nDep ? `r r${Math.min(3, nDep)}` : c.participou.length ? "p" : nAnt ? `n n${Math.min(3, nAnt)}` : "";
                    const texto = [c.participou.length ? "E" : "", nDep + nAnt ? String(nDep + nAnt) : ""].filter(Boolean).join("·");
                    return (
                      <td key={m} className="mapa-celula">
                        <i className={`cel ${estado}`} title={detalhe(l, m) || undefined} aria-label={detalhe(l, m) || undefined}>{texto}</i>
                      </td>
                    );
                  })}
                  <td className="mapa-reinc">
                    <span className={`selo-sit ${l.reincidencias ? "no" : "ok"}`}>{l.reincidencias ? `Sim · ${l.reincidencias}` : "Não"}</span>
                  </td>
                </tr>
              ))}
              {!linhas.length && <tr><td colSpan={16} className="vazio-tab">Nenhum participante para os filtros selecionados.</td></tr>}
            </tbody>
          </table>
        </div>

        <p className="mapa-fonte">
          Cruzamento pelo nome do colaborador entre a Escola de Segurança e o sistema de Notificações
          {dados.fonte.disponivel && dados.fonte.de && dados.fonte.ate ? ` (${dados.fonte.notificacoes} notificações, de ${br(dados.fonte.de)} a ${br(dados.fonte.ate)})` : ""}.
          Base e gerência são as da participação mais recente na Escola. Quem não aparece nas notificações é mostrado como não reincidente.
        </p>
      </section>
    </div>
  );
}
