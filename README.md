# Pesquisa Mr. Tennis

Formulário de pesquisa de satisfação e objetivos dos alunos, com respostas salvas em PostgreSQL e um painel de leitura/exportação em `/admin`.

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

1. **Suba o código para o GitHub** (`git@github.com:mcaorg21/pesquisa_mrtennis.git`) e no Railway crie um serviço "Deploy from GitHub repo" apontando para esse repositório. O Railway detecta o Node automaticamente (usa `npm install` + `npm start`).
2. **Banco de dados**: você já criou o Postgres no Railway. No serviço do app, vá em **Variables** e adicione:
   - `DATABASE_URL` — use a variável interna do Postgres (referencie o serviço Postgres em "Add Variable Reference", ou cole a URL interna no formato `postgresql://postgres:SENHA@postgres.railway.internal:5432/railway`). Como o app e o banco ficam no mesmo projeto Railway, essa URL interna funciona sem SSL e é mais rápida.
   - `ADMIN_USER` — usuário para acessar `/admin`.
   - `ADMIN_PASSWORD` — senha para acessar `/admin` (escolha uma senha forte).
3. O Railway injeta `PORT` automaticamente — o servidor já lê `process.env.PORT`.
4. Faça o deploy. Na primeira subida a tabela `respostas` é criada sozinha.

## Rotas

- `GET /` — formulário da pesquisa.
- `POST /api/respostas` — salva uma resposta (JSON).
- `GET /admin` — lista todas as respostas (protegido por Basic Auth).
- `GET /admin/export.csv` — exporta todas as respostas em CSV (protegido por Basic Auth).
- `GET /healthz` — healthcheck simples.

## Segurança

- Nunca commite o arquivo `.env` (já está no `.gitignore`).
- Troque `ADMIN_USER`/`ADMIN_PASSWORD` por credenciais fortes antes de divulgar o link do formulário.
