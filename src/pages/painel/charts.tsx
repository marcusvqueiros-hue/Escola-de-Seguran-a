import { useState, type ReactNode } from "react";
import { useTema } from "../../lib/tema";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Label, Legend, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/** Papéis de cor usados no HTML (valem nos dois temas via CSS). */
export const COR = {
  serie: "var(--serie)",
  good: "var(--good)",
  crit: "var(--crit)",
  neutro: "var(--neutro)",
  info: "var(--info)",
  // nomes antigos, mantidos para as páginas
  vinho: "var(--serie)",
  verde: "var(--good)",
  vermelho: "var(--crit)",
  cinza: "var(--neutro)",
};

/** Valores literais para o SVG dos gráficos (um conjunto por tema, passos escolhidos para cada superfície). */
const TEMAS = {
  claro: {
    superficie: "#ffffff",
    serie: "#b02a55",
    tick: "#8d8489",
    rotulo: "#5b5358",
    grade: "#ece7e9",
    eixo: "#d9d2d5",
    good: "#0ca30c",
    crit: "#d03b3b",
    cats: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  },
  escuro: {
    superficie: "#181516",
    serie: "#e8577f",
    tick: "#8f858a",
    rotulo: "#c9bfc4",
    grade: "#2a2427",
    eixo: "#3a3236",
    good: "#0ca30c",
    crit: "#d03b3b",
    cats: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
  },
};

function usePaleta() {
  const { tema } = useTema();
  const t = TEMAS[tema];
  return {
    ...t,
    eixoX: { tick: { fontSize: 11, fontWeight: 500, fill: t.tick }, tickLine: false, axisLine: { stroke: t.eixo } } as const,
    rotuloEstilo: { fontSize: 11, fontWeight: 600, fill: t.rotulo } as const,
    tooltip: {
      cursor: { fill: tema === "escuro" ? "rgba(255,255,255,.05)" : "rgba(28,23,25,.04)" },
      contentStyle: {
        background: "var(--card)",
        border: "1px solid var(--hair)",
        borderRadius: 10,
        fontSize: 12,
        boxShadow: "0 12px 28px -12px rgba(0,0,0,.45)",
        padding: "8px 12px",
      },
      labelStyle: { color: "var(--ink-2)", fontSize: 11, marginBottom: 2 },
      itemStyle: { color: "var(--ink-1)", fontWeight: 650, padding: 0 },
    } as const,
  };
}

type Linha = { nome: string } & Record<string, number | string>;

const ROTULOS_COLUNA: Record<string, string> = { nome: "Categoria", valor: "Quantidade", horas: "Horas", aprovados: "Aprovados", reprovados: "Reprovados" };

/** Cartão de gráfico, com a tabela dos mesmos dados disponível (equivalente acessível do gráfico). */
export function Cartao({ titulo, subtitulo, children, className = "", alto = 260, tabela }: { titulo: string; subtitulo?: string; children: ReactNode; className?: string; alto?: number | "auto"; tabela?: Record<string, unknown>[] }) {
  const [ver, setVer] = useState(false);
  const colunas = tabela?.length ? Object.keys(tabela[0]!).filter((k) => k !== "k") : [];
  return (
    <section className={`card ${className}`}>
      <header className="card-topo">
        <div>
          <h3>{titulo}</h3>
          {subtitulo && <small>{subtitulo}</small>}
        </div>
        {tabela && tabela.length > 0 && (
          <button className={`card-tab ${ver ? "on" : ""}`} onClick={() => setVer((v) => !v)} aria-pressed={ver} title={ver ? "Ver gráfico" : "Ver tabela"} aria-label={ver ? "Ver gráfico" : "Ver tabela dos dados"}>
            {ver ? "▥" : "▤"}
          </button>
        )}
      </header>
      <div className="card-corpo" style={alto === "auto" ? undefined : { height: alto }}>
        {ver && tabela ? (
          <div className="tabela-dados">
            <table>
              <thead>
                <tr>{colunas.map((c) => <th key={c} className={c === "nome" ? "" : "num"}>{ROTULOS_COLUNA[c] ?? c}</th>)}</tr>
              </thead>
              <tbody>
                {tabela.map((l, i) => (
                  <tr key={i}>
                    {colunas.map((c) => (
                      <td key={c} className={c === "nome" ? "" : "num"}>{typeof l[c] === "number" ? Number(l[c]).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : String(l[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export const Vazio = () => <div className="vazio">Sem dados para os filtros selecionados</div>;

export function Colunas({ dados, chave = "valor", formato, max }: { dados: Linha[]; chave?: string; formato?: (n: number) => string; cor?: string; max?: number }) {
  const p = usePaleta();
  if (!dados.length) return <Vazio />;
  const fmtv = (v: unknown) => (formato ? formato(Number(v)) : String(v));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke={p.grade} />
        <XAxis dataKey="nome" {...p.eixoX} interval={0} />
        <YAxis hide domain={[0, max ?? "auto"]} />
        <Tooltip {...p.tooltip} formatter={(v: any) => fmtv(v)} />
        <Bar dataKey={chave} fill={p.serie} radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={700} activeBar={{ fillOpacity: 0.8 }}>
          <LabelList dataKey={chave} position="top" offset={6} style={p.rotuloEstilo} formatter={fmtv} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Aprovados × reprovados: estado (bom/crítico), por isso as cores de status. */
export function ColunasDuplas({ dados }: { dados: Linha[] }) {
  const p = usePaleta();
  if (!dados.length) return <Vazio />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barGap={2} barCategoryGap="26%">
        <CartesianGrid vertical={false} stroke={p.grade} />
        <XAxis dataKey="nome" {...p.eixoX} interval={0} />
        <YAxis hide />
        <Tooltip {...p.tooltip} />
        <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: p.rotulo }} formatter={(v: string) => <span style={{ color: p.rotulo }}>{v}</span>} />
        <Bar dataKey="aprovados" name="Aprovados" fill={p.good} radius={[4, 4, 0, 0]} maxBarSize={20} activeBar={{ fillOpacity: 0.8 }}>
          <LabelList dataKey="aprovados" position="top" offset={6} style={p.rotuloEstilo} />
        </Bar>
        <Bar dataKey="reprovados" name="Reprovados" fill={p.crit} radius={[4, 4, 0, 0]} maxBarSize={20} activeBar={{ fillOpacity: 0.8 }}>
          <LabelList dataKey="reprovados" position="top" offset={6} style={p.rotuloEstilo} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Evolução no tempo: linha de 2px com um véu de 10%, marcadores com anel e rótulos só no pico e no último ponto. */
export function Linhas({ dados, chave = "valor" }: { dados: Linha[]; chave?: string }) {
  const p = usePaleta();
  if (!dados.length) return <Vazio />;
  const maior = Math.max(...dados.map((d) => Number(d[chave])));
  const ult = dados.length - 1;
  const rotulo = (e: any) =>
    e.index === ult || Number(e.value) === maior ? (
      <text x={e.x} y={e.y - 12} textAnchor="middle" style={p.rotuloEstilo as React.CSSProperties}>{e.value}</text>
    ) : (
      <g />
    );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={dados} margin={{ top: 26, right: 28, left: 28, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={p.grade} />
        <XAxis dataKey="nome" {...p.eixoX} interval={0} />
        <YAxis hide domain={[0, "auto"]} />
        <Tooltip {...p.tooltip} cursor={{ stroke: p.eixo, strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey={chave}
          stroke={p.serie}
          strokeWidth={2}
          fill={p.serie}
          fillOpacity={0.1}
          dot={{ r: 4, fill: p.serie, stroke: p.superficie, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: p.serie, stroke: p.superficie, strokeWidth: 2 }}
          label={rotulo}
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Parte do todo (até ~6 fatias): cores categóricas em ordem fixa, 2px de superfície entre fatias, total no centro. */
export function Rosca({ dados, cores }: { dados: { nome: string; valor: number }[]; cores?: string[] }) {
  const p = usePaleta();
  const total = dados.reduce((a, d) => a + d.valor, 0);
  if (!total) return <Vazio />;
  const paleta = cores ?? p.cats;
  const pct = (v: number) => Math.round((v / total) * 100);
  const RAD = Math.PI / 180;
  const rotuloAnel = (e: any) => {
    if (e.value / total < 0.07) return null;
    const r = (e.innerRadius + e.outerRadius) / 2;
    return (
      <text x={e.cx + r * Math.cos(-e.midAngle * RAD)} y={e.cy + r * Math.sin(-e.midAngle * RAD)} textAnchor="middle" dominantBaseline="central" className="rosca-valor">
        {e.value}
      </text>
    );
  };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <Tooltip {...p.tooltip} formatter={(v: any, n: any) => [`${v} (${pct(Number(v))}%)`, n]} />
        <Legend
          iconType="circle"
          iconSize={7}
          verticalAlign="bottom"
          wrapperStyle={{ fontSize: 12, lineHeight: "18px" }}
          formatter={(nome: string) => {
            const d = dados.find((x) => x.nome === nome);
            return <span style={{ color: p.rotulo }}>{d ? `${nome} · ${d.valor} (${pct(d.valor)}%)` : nome}</span>;
          }}
        />
        <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="58%" outerRadius="88%" stroke={p.superficie} strokeWidth={2} label={rotuloAnel} labelLine={false} animationDuration={800}>
          {dados.map((_, i) => (
            <Cell key={i} fill={paleta[i % paleta.length]} />
          ))}
          <Label
            position="center"
            content={({ viewBox }: any) => (
              <g>
                <text x={viewBox.cx} y={viewBox.cy - 2} textAnchor="middle" className="rosca-total">{total}</text>
                <text x={viewBox.cx} y={viewBox.cy + 16} textAnchor="middle" className="rosca-rotulo">total</text>
              </g>
            )}
          />
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Ranking de nomes com barras horizontais finas; o destaque vem de `destaque` (uma cor, o resto fica neutro). */
export function ListaBarras({ itens, max, formato = (n) => String(n), destaque }: { itens: { nome: string; valor: number; extra?: ReactNode }[]; max: number; formato?: (n: number) => string; destaque?: (v: number) => string }) {
  if (!itens.length) return <Vazio />;
  return (
    <div className="lista">
      {itens.map((it, i) => (
        <div className="lista-linha" key={it.nome + i}>
          <span className="lista-nome" title={it.nome}>{it.nome}</span>
          <span className="lista-barra">
            <i style={{ width: `${Math.max(3, (it.valor / max) * 100)}%`, background: destaque?.(it.valor) ?? COR.serie }} />
          </span>
          <b>{formato(it.valor)}</b>
        </div>
      ))}
    </div>
  );
}
