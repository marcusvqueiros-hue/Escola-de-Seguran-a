import { neon } from "@neondatabase/serverless";
import seed from "./seed.json";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL não configurada (veja o README).");

export const sql = neon(url);

let pronto: Promise<void> | null = null;

/** Cria as tabelas e importa a planilha do Forms na primeira execução. */
export function iniciarBanco() {
  return (pronto ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS tentativas (
        id            TEXT PRIMARY KEY,
        iniciada_em   TEXT NOT NULL,
        finalizada_em TEXT,
        nome          TEXT NOT NULL,
        matricula     TEXT,
        prefixo       TEXT,
        funcao        TEXT,
        base          TEXT,
        gerencia      TEXT,
        respostas     TEXT,
        duracao_seg   INTEGER,
        tem_foto      BOOLEAN NOT NULL DEFAULT FALSE,
        local         TEXT,
        lat           DOUBLE PRECISION,
        lng           DOUBLE PRECISION,
        carimbo       TEXT,
        origem        TEXT NOT NULL DEFAULT 'app'
      )`;
    await sql`CREATE TABLE IF NOT EXISTS fotos (id TEXT PRIMARY KEY, dados TEXT NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS falhas_login (ip TEXT PRIMARY KEY, n INTEGER NOT NULL, ate BIGINT NOT NULL)`;

    await sql`
      CREATE TABLE IF NOT EXISTS colaboradores (
        id        SERIAL PRIMARY KEY,
        nome      TEXT NOT NULL,
        nome_norm TEXT NOT NULL UNIQUE,
        matricula TEXT,
        prefixo   TEXT,
        funcao    TEXT,
        base      TEXT,
        gerencia  TEXT,
        situacao  TEXT
      )`;
    await sql`ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS situacao TEXT`;
    await sql`ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS gerente TEXT`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_matricula_uq ON colaboradores (matricula)`;

    const [{ n }] = (await sql`SELECT COUNT(*)::int AS n FROM tentativas WHERE origem = 'importado'`) as { n: number }[];
    if (n === 0) {
      await sql.transaction(
        (seed as any[]).map(
          (r, i) => sql`
            INSERT INTO tentativas (id, iniciada_em, finalizada_em, nome, matricula, prefixo, funcao, base, gerencia, respostas, origem)
            VALUES (${`seed-${i + 1}`}, ${r.criadoEm}, ${r.criadoEm}, ${r.nome}, ${r.matricula}, ${r.prefixo}, ${r.funcao}, ${r.base}, ${r.gerencia}, ${JSON.stringify(r.respostas)}, 'importado')
            ON CONFLICT (id) DO NOTHING`,
        ),
      );
    }

  })().catch((e) => {
    pronto = null;
    throw e;
  }));
}
