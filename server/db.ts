import { Pool } from "pg";
import seed from "./seed.json";

const url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) throw new Error("DATABASE_URL não configurada (veja o README).");

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 3 });

type Consulta = PromiseLike<any[]> & { text: string; values: unknown[] };

function consulta(strings: TemplateStringsArray, values: unknown[]): Consulta {
  const text = strings.reduce((t, s, i) => t + s + (i < values.length ? "$" + (i + 1) : ""), "");
  return {
    text,
    values,
    then: (ok, erro) => pool.query(text, values as any[]).then((r) => r.rows, undefined).then(ok, erro),
  };
}

/** Mesma interface de antes: sql`...` devolve as linhas; sql.transaction([...]) roda tudo ou nada. */
export const sql = Object.assign((strings: TemplateStringsArray, ...values: unknown[]) => consulta(strings, values), {
  async transaction(consultas: Consulta[]) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const out: any[][] = [];
      for (const q of consultas) out.push((await c.query(q.text, q.values as any[])).rows);
      await c.query("COMMIT");
      return out;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  },
});

let pronto: Promise<void> | null = null;

/** Cria as tabelas e importa a planilha do Forms na primeira execução. */
export function iniciarBanco() {
  return (pronto ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS escola_tentativas (
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
    await sql`CREATE TABLE IF NOT EXISTS escola_fotos (id TEXT PRIMARY KEY, dados TEXT NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS escola_falhas_login (ip TEXT PRIMARY KEY, n INTEGER NOT NULL, ate BIGINT NOT NULL)`;

    await sql`
      CREATE TABLE IF NOT EXISTS escola_colaboradores (
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
    await sql`ALTER TABLE escola_colaboradores ADD COLUMN IF NOT EXISTS situacao TEXT`;
    await sql`ALTER TABLE escola_colaboradores ADD COLUMN IF NOT EXISTS gerente TEXT`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS escola_colaboradores_matricula_uq ON escola_colaboradores (matricula)`;

    const [{ n }] = (await sql`SELECT COUNT(*)::int AS n FROM escola_tentativas WHERE origem = 'importado'`) as { n: number }[];
    if (n === 0) {
      await sql.transaction(
        (seed as any[]).map(
          (r, i) => sql`
            INSERT INTO escola_tentativas (id, iniciada_em, finalizada_em, nome, matricula, prefixo, funcao, base, gerencia, respostas, origem)
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
