import type { ReactNode } from "react";
import { useTema } from "../../lib/tema";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const COR = {
  verde: "#137e6a",
  vermelho: "#d64550",
  vinho: "#84162b",
  azul: "#1e90ff",
  ambar: "#e0a526",
  cinza: "#9a919a",
  eixo: "#6b6470",
};
export const PALETA = [COR.azul, "#6e1f2a", "#0f2fa0", "#f0b7bf", COR.verde, COR.ambar, COR.cinza];

export function Cartao({ titulo, children, className = "", alto = 260 }: { titulo: string; children: ReactNode; className?: string; alto?: number | "auto" }) {
  return (
    <section className={`card ${className}`}>
      <h3>{titulo}</h3>
      <div className="card-corpo" style={alto === "auto" ? undefined : { height: alto }}>{children}</div>
    </section>
  );
}

export const Vazio = () => <div className="vazio">Sem dados para os filtros selecionados</div>;

function usePaleta() {
  const { tema } = useTema();
  const escuro = tema === "escuro";
  const destaque = escuro ? "#f0a9b8" : COR.vinho;
  const rotulo = { fontSize: 11, fontWeight: 700, fill: escuro ? "#f1e9ec" : "#2b2630" } as const;
  return {
    escuro,
    rotulo,
    grade: escuro ? "#33282d" : "#f0e9ec",
    eixoX: { tick: { fontSize: 11, fontWeight: 700, fill: destaque }, tickLine: false, axisLine: { stroke: escuro ? "#3a2e34" : "#e6dfe2" } } as const,
    tooltip: {
      cursor: { fill: escuro ? "rgba(240,169,184,.08)" : "rgba(132,22,43,.05)" },
      contentStyle: { borderRadius: 10, border: `1px solid ${escuro ? "#3a2e34" : "#eadfe3"}`, fontSize: 12, background: escuro ? "#251c21" : "#fff", color: escuro ? "#f1e9ec" : "#1f1a22" },
      itemStyle: { color: escuro ? "#f1e9ec" : "#1f1a22" },
    } as const,
  };
}

type Linha = { nome: string } & Record<string, number | string>;

export function Colunas({ dados, chave = "valor", formato, cor = COR.verde, max }: { dados: Linha[]; chave?: string; formato?: (n: number) => string; cor?: string; max?: number }) {
  const { eixoX, rotulo, tooltip } = usePaleta();
  if (!dados.length) return <Vazio />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} margin={{ top: 22, right: 8, left: 8, bottom: 0 }}>
        <XAxis dataKey="nome" {...eixoX} interval={0} />
        <YAxis hide domain={[0, max ?? "auto"]} />
        <Tooltip {...tooltip} formatter={(v) => (formato ? formato(Number(v)) : v)} />
        <Bar dataKey={chave} fill={cor} radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive animationDuration={700}>
          <LabelList dataKey={chave} position="top" style={rotulo} formatter={(v: any) => (formato ? formato(Number(v)) : v)} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ColunasDuplas({ dados }: { dados: Linha[] }) {
  const { eixoX, rotulo, tooltip } = usePaleta();
  if (!dados.length) return <Vazio />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} margin={{ top: 22, right: 8, left: 8, bottom: 0 }} barGap={2}>
        <XAxis dataKey="nome" {...eixoX} interval={0} />
        <YAxis hide />
        <Tooltip {...tooltip} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="aprovados" name="Qtd Aprovados" fill={COR.verde} radius={[4, 4, 0, 0]} maxBarSize={22}>
          <LabelList dataKey="aprovados" position="top" style={rotulo} />
        </Bar>
        <Bar dataKey="reprovados" name="Qtd Reprovados" fill={COR.vermelho} radius={[4, 4, 0, 0]} maxBarSize={22}>
          <LabelList dataKey="reprovados" position="top" style={rotulo} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Linhas({ dados, chave = "valor" }: { dados: Linha[]; chave?: string }) {
  const { eixoX, rotulo, tooltip, grade } = usePaleta();
  if (!dados.length) return <Vazio />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={dados} margin={{ top: 24, right: 24, left: 24, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={grade} />
        <XAxis dataKey="nome" {...eixoX} interval={0} />
        <YAxis hide domain={[0, "auto"]} />
        <Tooltip {...tooltip} />
        <Line type="monotone" dataKey={chave} stroke={COR.verde} strokeWidth={2.5} dot={{ r: 3, fill: COR.verde }} activeDot={{ r: 5 }} isAnimationActive animationDuration={900}>
          <LabelList dataKey={chave} position="top" offset={8} style={rotulo} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Rosca({ dados, cores = PALETA }: { dados: { nome: string; valor: number }[]; cores?: string[] }) {
  const { tooltip } = usePaleta();
  const total = dados.reduce((a, d) => a + d.valor, 0);
  if (!total) return <Vazio />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 16, right: 44, bottom: 8, left: 44 }}>
        <Tooltip contentStyle={tooltip.contentStyle} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} verticalAlign="bottom" />
        <Pie
          data={dados}
          dataKey="valor"
          nameKey="nome"
          innerRadius="52%"
          outerRadius="74%"
          paddingAngle={dados.length > 1 ? 2 : 0}
          stroke="none"
          label={(p: any) => `${p.name} ${p.value} (${Math.round((p.value / total) * 100)}%)`}
          labelLine
                    animationDuration={800}
        >
          {dados.map((_, i) => (
            <Cell key={i} fill={cores[i % cores.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Lista rolável com barras horizontais (ranking de nomes). */
export function ListaBarras({ itens, max, formato = (n) => String(n), destaque }: { itens: { nome: string; valor: number; extra?: ReactNode }[]; max: number; formato?: (n: number) => string; destaque?: (v: number) => string }) {
  if (!itens.length) return <Vazio />;
  return (
    <div className="lista">
      {itens.map((it, i) => (
        <div className="lista-linha" key={it.nome + i}>
          <span className="lista-nome" title={it.nome}>{it.nome}</span>
          <span className="lista-barra"><i style={{ width: `${Math.max(4, (it.valor / max) * 100)}%`, background: destaque?.(it.valor) ?? COR.verde }} /></span>
          <b>{formato(it.valor)}</b>
        </div>
      ))}
    </div>
  );
}
