-- Escola de Segurança: esquema para o Supabase (SQL Editor -> New query -> Run).
-- Tabelas com prefixo escola_ para não colidir com o que já existe no projeto.
-- Seguro para rodar mais de uma vez.

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
);

CREATE TABLE IF NOT EXISTS escola_fotos (
  id    TEXT PRIMARY KEY,
  dados TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS escola_falhas_login (
  ip  TEXT PRIMARY KEY,
  n   INTEGER NOT NULL,
  ate BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS escola_colaboradores (
  id        SERIAL PRIMARY KEY,
  nome      TEXT NOT NULL,
  nome_norm TEXT NOT NULL UNIQUE,
  matricula TEXT,
  prefixo   TEXT,
  funcao    TEXT,
  base      TEXT,
  gerencia  TEXT,
  situacao  TEXT,
  gerente   TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS escola_colaboradores_matricula_uq ON escola_colaboradores (matricula);

-- Dados pessoais e fotos: RLS ligado e sem políticas, então a chave anon
-- (pública) não lê nem grava nada. Só a service_role (no servidor) acessa.
ALTER TABLE escola_tentativas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE escola_fotos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE escola_falhas_login  ENABLE ROW LEVEL SECURITY;
ALTER TABLE escola_colaboradores ENABLE ROW LEVEL SECURITY;
