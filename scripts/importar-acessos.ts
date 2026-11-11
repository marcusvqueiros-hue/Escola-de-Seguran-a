// Uso: bun run acessos "<planilha de usuários e acessos>.xlsx"
// Colunas: CHAPA, NOME, FUNÇÃO, BASE, PROCESSO, GERENCIA, USUARIO, SENHA.
// Grava/atualiza os usuários do painel; as senhas são guardadas só como hash.
import * as XLSX from "xlsx";
import { hashSenha } from "../server/auth";
import { iniciarBanco, sql } from "../server/db";

const arquivo = process.argv[2];
if (!arquivo) throw new Error('Informe o caminho da planilha: bun run acessos "arquivo.xlsx"');

const wb = XLSX.read(await Bun.file(arquivo).arrayBuffer());
const [cab = [], ...linhas] = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]!]!, { header: 1, raw: true });
const col = (nome: string) => cab.findIndex((h) => String(h).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() === nome);
const I = { chapa: col("CHAPA"), nome: col("NOME"), funcao: col("FUNCAO"), base: col("BASE"), processo: col("PROCESSO"), gerencia: col("GERENCIA"), usuario: col("USUARIO"), senha: col("SENHA") };
if (Object.values(I).includes(-1)) throw new Error("Cabeçalho da planilha não reconhecido.");

const txt = (v: unknown) => String(v ?? "").trim();
const usuarios = linhas
  .filter((l) => txt(l[I.usuario]) && txt(l[I.senha]))
  .map((l) => ({
    usuario: txt(l[I.usuario]),
    senha: txt(l[I.senha]),
    nome: txt(l[I.nome]).toUpperCase(),
    chapa: txt(l[I.chapa]),
    funcao: txt(l[I.funcao]).toUpperCase(),
    base: txt(l[I.base]).toUpperCase(),
    gerencia: txt(l[I.gerencia]).toUpperCase(),
    processo: txt(l[I.processo]),
  }));

await iniciarBanco();
await sql.transaction(
  usuarios.map(
    (u) => sql`
      INSERT INTO escola_usuarios (usuario, usuario_norm, senha_hash, nome, chapa, funcao, base, gerencia, processo)
      VALUES (${u.usuario}, ${u.usuario.toLowerCase()}, ${hashSenha(u.senha)}, ${u.nome}, ${u.chapa}, ${u.funcao}, ${u.base}, ${u.gerencia}, ${u.processo})
      ON CONFLICT (usuario_norm) DO UPDATE SET usuario = EXCLUDED.usuario, senha_hash = EXCLUDED.senha_hash, nome = EXCLUDED.nome,
        chapa = EXCLUDED.chapa, funcao = EXCLUDED.funcao, base = EXCLUDED.base, gerencia = EXCLUDED.gerencia, processo = EXCLUDED.processo, ativo = TRUE`,
  ),
);
const [{ n }] = (await sql`SELECT COUNT(*)::int AS n FROM escola_usuarios WHERE ativo`) as { n: number }[];
console.log(`${usuarios.length} usuários importados; ${n} ativos no banco.`);
process.exit(0);
