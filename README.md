# Escola de Segurança · CGB

React + Bun. Um único servidor entrega dois links:

| Link | Para quem | O que é |
|---|---|---|
| `/` | Colaboradores | Identificação → 10 questões (20 min) → foto carimbada → resultado |
| `/painel` | Administração | Login + Escola de Segurança, Avaliação e Detalhamento |

## Rodar

```bash
bun install
bun run dev      # desenvolvimento (http://localhost:3000)
bun run start    # produção
```

Variáveis opcionais: `PORT`, `HOST`, `DATA_DIR` (padrão `./data`), `ADMIN_USER`, `ADMIN_PASS`.

> **HTTPS é obrigatório em produção.** Câmera e GPS só funcionam em `https://` (ou `localhost`).
> Publique atrás de um proxy/host com certificado (Cloudflare Tunnel, Caddy, Nginx, Railway, Fly…).

## Dados

- Banco SQLite em `data/escola.db`, fotos em `data/fotos/` (faça backup dessa pasta).
- Na primeira execução com o banco vazio, as 45 respostas do Forms são importadas de `server/seed.json`.
  Para reimportar outra planilha: `bun run importar "caminho.xlsx"`, apague `data/` e reinicie.
- O gabarito fica só no servidor (`server/gabarito.ts`); o navegador nunca recebe as respostas corretas.

## Regras configuráveis (`src/shared/constantes.ts`)

- `NOTA_MINIMA` = 7 (aprovado a partir de 7 pontos)
- `HORAS_POR_PARTICIPACAO` = 3 (horas treinadas = participações × 3)
- `DURACAO_SEG` = 20 min, `TOLERANCIA_FOTO_SEG` = 10 min extras para tirar a foto
- `BASES`, `GERENCIAS`, `FUNCOES` (opções do formulário)
