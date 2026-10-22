// Uso: bun run importar "<planilha de respostas do Forms>.xlsx"
// Gera server/seed.json, carregado automaticamente quando o banco está vazio.
import * as XLSX from "xlsx";
import { QUESTOES } from "../src/shared/questoes";

const arquivo = process.argv[2];
if (!arquivo) throw new Error('Informe o caminho da planilha: bun run importar "arquivo.xlsx"');

const wb = XLSX.read(await Bun.file(arquivo).arrayBuffer(), { cellDates: false });
const linhas = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]!]!, { header: 1, raw: true }).slice(1);

const norm = (s: string) => s.replace(/^[A-D]\)\s*/, "").replace(/\s+/g, " ").trim();
const gerenciaNova = (g: string) => (({ STC: "GSTC", PERDA: "PERDAS" } as Record<string, string>)[g.toUpperCase()] ?? g.toUpperCase());

function dataLocal(serial: number) {
  const d = new Date(Math.round((serial - 25569) * 86400) * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}-03:00`;
}

function letra(q: number, texto: unknown) {
  const t = String(texto ?? "").trim();
  const m = t.match(/^([A-D])\)/);
  if (m) return m[1];
  const achada = QUESTOES[q]!.opcoes.find((o) => norm(o.texto) === norm(t));
  return achada?.letra ?? null;
}

const registros = linhas
  .filter((l) => l[0])
  .map((l) => ({
    criadoEm: dataLocal(l[0]),
    prefixo: String(l[1] ?? "").trim(),
    matricula: String(l[2] ?? "").trim(),
    nome: String(l[3] ?? "").trim().toUpperCase(),
    funcao: String(l[4] ?? "").trim().toUpperCase(),
    base: String(l[5] ?? "").trim().toUpperCase(),
    gerencia: gerenciaNova(String(l[6] ?? "").trim()),
    respostas: QUESTOES.map((_, q) => letra(q, l[7 + q])),
  }));

await Bun.write("server/seed.json", JSON.stringify(registros, null, 2));
console.log(`${registros.length} registros gravados em server/seed.json`);
