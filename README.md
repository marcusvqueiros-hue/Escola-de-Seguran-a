# Escola de Segurança · CGB

React + Bun. Um único servidor entrega dois links:

| Link | Para quem | O que é |
|---|---|---|
| `/` | Colaboradores | Identificação → 10 questões (20 min) → foto carimbada → resultado |
| `/painel` | Administração | Relatórios: login + Escola de Segurança, Avaliação, Detalhamento e Configuração (cadastro de colaboradores) |

## Rodar

```bash
bun install
vercel env pull .env.local   # traz DATABASE_URL (Postgres/Neon); defina ADMIN_USER e ADMIN_PASS em .env
bun run dev                  # http://localhost:3000
```

Publicar na Vercel: `bun run build:api` (gera api/index.js), commit e `vercel deploy --prod`.

> **HTTPS é obrigatório em produção** para câmera e GPS (a Vercel já entrega HTTPS).

## Dados

- Banco Postgres (Neon, via Vercel). Tabelas: `tentativas`, `fotos`, `colaboradores` (cadastro usado no autocompletar do login) e `falhas_login`.
- O cadastro de colaboradores vem da planilha oficial (aba `Base`): `bun run colaboradores "caminho.xlsx"` substitui o cadastro no banco. O prefixo não existe na planilha; é digitado pelo colaborador e lembrado para a próxima vez.
- Na primeira execução com o banco vazio, as 45 respostas do Forms são importadas de `server/seed.json`.
  Para reimportar outra planilha: `bun run importar "caminho.xlsx"`, apague `data/` e reinicie.
- O gabarito fica só no servidor (`server/gabarito.ts`); o navegador nunca recebe as respostas corretas.

## Regras configuráveis (`src/shared/constantes.ts`)

- `NOTA_MINIMA` = 7 (aprovado a partir de 7 pontos)
- `HORAS_POR_PARTICIPACAO` = 3 (horas treinadas = participações × 3)
- `DURACAO_SEG` = 20 min, `TOLERANCIA_FOTO_SEG` = 10 min extras para tirar a foto
- `BASES`, `GERENCIAS`, `FUNCOES` (opções do formulário)
