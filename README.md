# Pesquisa Mr. Tennis

Formulário de pesquisa de satisfação e objetivos dos alunos, com respostas salvas em PostgreSQL e um painel de leitura/exportação em `/admin`.

**Ao vivo:** https://pesquisa-mrtennis-production-751e.up.railway.app

O acesso ao formulário é protegido por um portão de e-mail: o aluno informa nome e e-mail antes de ver as perguntas, e o e-mail é a chave única no banco — reenvios com o mesmo e-mail são bloqueados.

## Stack

- Node.js + Express (servidor único, sem build step)
- PostgreSQL (via `pg`)
- Frontend em HTML/CSS/JS puro servido como estático (`/public`)

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha DATABASE_URL, ADMIN_USER, ADMIN_PASSWORD
npm start
```

Abra http://localhost:3000 para o formulário e http://localhost:3000/admin para o painel (pede usuário/senha).

> A tabela `respostas` é criada automaticamente na primeira execução (`CREATE TABLE IF NOT EXISTS`).

## Deploy no Railway

Projeto: **amused-trust**, serviço: **pesquisa-mrtennis** (mesmo projeto do Postgres).

Estado atual: o serviço foi criado e publicado via `railway up` (deploy manual a partir da pasta local), porque o GitHub App da Railway ainda não tem acesso ao repositório `mcaorg21/pesquisa_mrtennis`. Para deploy automático a cada `git push`:

1. No GitHub, vá em **Settings → Applications → Railway** (ou https://github.com/settings/installations) e libere acesso ao repositório `pesquisa_mrtennis`.
2. No painel do Railway, no serviço `pesquisa-mrtennis`, vá em **Settings → Source** e conecte ao repo `mcaorg21/pesquisa_mrtennis` (branch `master`).

Até lá, para publicar uma atualização manualmente:

```bash
railway up --ci
```

(a pasta local já está linkada ao projeto/serviço via `railway link` + `railway service link`).

Variáveis já configuradas no serviço:
- `DATABASE_URL` — URL interna do Postgres (`postgres.railway.internal`), mesmo projeto.
- `ADMIN_USER` / `ADMIN_PASSWORD` — credenciais do painel `/admin`.

O Railway injeta `PORT` automaticamente — o servidor já lê `process.env.PORT`. A tabela `respostas` (com índice único por e-mail) é criada/migrada sozinha a cada boot (`init()` em `db.js`).

## Rotas

- `GET /` — formulário da pesquisa.
- `POST /api/respostas` — salva uma resposta (JSON).
- `GET /admin` — lista todas as respostas (protegido por Basic Auth).
- `GET /admin/export.csv` — exporta todas as respostas em CSV (protegido por Basic Auth).
- `GET /healthz` — healthcheck simples.

## Segurança

- Nunca commite o arquivo `.env` (já está no `.gitignore`).
- Troque `ADMIN_USER`/`ADMIN_PASSWORD` por credenciais fortes antes de divulgar o link do formulário.
