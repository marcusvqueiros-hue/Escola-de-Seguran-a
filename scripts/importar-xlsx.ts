// Uso: bun run importar "<planilha de respostas do Forms>.xlsx"
// Mescla com server/seed.json: as respostas já existentes (conferidas à mão) são mantidas
// e só entram as novas, identificadas pelo carimbo de data/hora.
import * as XLSX from "xlsx";
import { QUESTOES } from "../src/shared/questoes";

const arquivo = process.argv[2];
if (!arquivo) throw new Error('Informe o caminho da planilha: bun run importar "arquivo.xlsx"');

const wb = XLSX.read(await Bun.file(arquivo).arrayBuffer(), { cellDates: false });
const [cabecalho = [], ...linhas] = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]!]!, { header: 1, raw: true });

// A ordem das colunas do Forms mudou entre versões: localiza pelo texto do cabeçalho.
const semAcento = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const col = (...chaves: string[]) => cabecalho.findIndex((h) => chaves.some((c) => semAcento(h).includes(c)));
const C = {
  prefixo: col("prefixo"),
  matricula: col("matricula"),
  nome: col("nome completo"),
  funcao: col("funcao"),
  base: col("sua base"),
  gerencia: col("gerencia", "coordenacao"),
  q1: cabecalho.findIndex((h) => /^s*1[.)]/.test(String(h))),
};
if ([C.prefixo, C.matricula, C.nome, C.gerencia, C.q1].includes(-1)) throw new Error("Cabeçalho da planilha não reconhecido.");

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

const BASES = ["BCB", "BDC", "ITM", "PDS", "PDT", "STI"];

const registros = linhas
  .filter((l) => l[0])
  .map((l) => {
    const prefixo = String(l[C.prefixo] ?? "").trim();
    const baseInformada = C.base >= 0 ? String(l[C.base] ?? "").trim().toUpperCase() : "";
    // Sem base na resposta, usa a sigla do prefixo (ex.: "ITM 303" -> ITM).
    const base = baseInformada || (BASES.find((b) => prefixo.toUpperCase().startsWith(b)) ?? "");
    return {
      criadoEm: dataLocal(l[0]),
      prefixo,
      matricula: String(l[C.matricula] ?? "").trim(),
      nome: String(l[C.nome] ?? "").trim().toUpperCase(),
      funcao: C.funcao >= 0 ? String(l[C.funcao] ?? "").trim().toUpperCase() : "",
      base,
      gerencia: gerenciaNova(String(l[C.gerencia] ?? "").trim()),
      respostas: QUESTOES.map((_, q) => letra(q, l[C.q1 + q])),
    };
  });

const arquivoSeed = Bun.file("server/seed.json");
const existentes: typeof registros = (await arquivoSeed.exists()) ? await arquivoSeed.json() : [];
const jaTem = new Set(existentes.map((r) => r.criadoEm));
const semAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const novos = registros.filter((r) => !jaTem.has(r.criadoEm)).map((r) => ({ ...r, nome: semAcentos(r.nome) }));

await Bun.write("server/seed.json", JSON.stringify([...existentes, ...novos], null, 2));
console.log(`${existentes.length} mantidos + ${novos.length} novos = ${existentes.length + novos.length} em server/seed.json`);
