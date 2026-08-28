require('dotenv').config();
const path = require('path');
const express = require('express');
const { pool, init } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Definicao dos campos da pesquisa (usada para validar e para montar o CSV/admin)
const FIELDS = [
  ['tempoAulas', 'Ha quanto tempo faz aulas'],
  ['frequenciaJogo', 'Frequencia que joga alem das aulas'],
  ['satisfacaoGeral', 'Satisfacao geral (1-5)'],
  ['metodologia', 'Avaliacao da metodologia (1-5)'],
  ['evolucao', 'Sente que esta evoluindo'],
  ['atencaoFeedback', 'Recebe atencao e feedback'],
  ['gostaAulas', 'O que mais gosta nas aulas'],
  ['objetivoPrincipal', 'Objetivo principal'],
  ['objetivoPrincipalOutro', 'Objetivo principal - outro'],
  ['objetivos3', '3 objetivos mais importantes'],
  ['pontoMelhorar', 'Pontos a melhorar'],
  ['pontoMelhorarOutro', 'Pontos a melhorar - outro'],
  ['fundamentoTreinar', 'Fundamentos a treinar mais'],
  ['fundamentoTreinarOutro', 'Fundamentos a treinar mais - outro'],
  ['taticaTreinar', 'Parte tatica a treinar'],
  ['taticaTreinarOutro', 'Parte tatica a treinar - outro'],
  ['maisJogoSets', 'Gostaria de mais jogo/sets'],
  ['expectativaInicial', 'Expectativa ao comecar as aulas'],
  ['expectativasAtendidas', 'Expectativas estao sendo atendidas'],
  ['faltaAlgo', 'Algo que sente que esta faltando'],
  ['naoConsegueFazer', 'O que gostaria de conseguir fazer'],
  ['formatoTurma', 'Formato de turma preferido'],
  ['mudarAula', 'O que mudaria/acrescentaria'],
  ['contribuirMais', 'Sugestao para o professor'],
];

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n;]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JA_RESPONDEU = 'Este e-mail já respondeu a pesquisa.';

function normalizarEmail(valor) {
  return (valor || '').trim().toLowerCase();
}

app.get('/api/verificar-email', async (req, res) => {
  const email = normalizarEmail(req.query.email);

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM respostas WHERE LOWER(email) = $1',
      [email]
    );
    res.json({ jaRespondeu: rows.length > 0 });
  } catch (err) {
    console.error('Erro ao verificar e-mail:', err);
    res.status(500).json({ error: 'Erro ao verificar e-mail. Tente novamente.' });
  }
});

app.post('/api/respostas', async (req, res) => {
  const body = req.body || {};
  const nome = (body.nome || '').trim();
  const email = normalizarEmail(body.email);

  if (!nome) {
    return res.status(400).json({ error: 'Nome e obrigatorio.' });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  const dados = {};
  for (const [key] of FIELDS) {
    const value = body[key];
    if (Array.isArray(value)) {
      dados[key] = value.filter(Boolean);
    } else if (typeof value === 'string') {
      dados[key] = value.trim();
    }
  }

  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM respostas WHERE LOWER(email) = $1',
      [email]
    );
    if (rows.length > 0) {
      return res.status(409).json({ error: JA_RESPONDEU });
    }

    await pool.query(
      'INSERT INTO respostas (nome, email, dados) VALUES ($1, $2, $3)',
      [nome, email, dados]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: JA_RESPONDEU });
    }
    console.error('Erro ao salvar resposta:', err);
    res.status(500).json({ error: 'Erro ao salvar a resposta. Tente novamente.' });
  }
});

function requireAdmin(req, res, next) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return res.status(503).send('Painel admin nao configurado (defina ADMIN_USER e ADMIN_PASSWORD).');
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const reqUser = decoded.slice(0, idx);
    const reqPass = decoded.slice(idx + 1);
    if (reqUser === user && reqPass === pass) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Mr. Tennis Admin"');
  return res.status(401).send('Autenticacao necessaria.');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === undefined || value === null || value === '') return '-';
  return value;
}

app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, criado_em, nome, email, dados FROM respostas ORDER BY criado_em DESC'
    );

    const cards = rows.map((row) => {
      const linhas = FIELDS.map(([key, label]) => {
        const value = formatValue(row.dados[key]);
        if (value === '-') return '';
        return `<div class="campo"><span class="rotulo">${escapeHtml(label)}</span><span class="valor">${escapeHtml(value)}</span></div>`;
      }).join('');

      return `
        <article class="resposta">
          <header>
            <div>
              <h2>${escapeHtml(row.nome)}</h2>
              <p class="email">${escapeHtml(row.email)}</p>
            </div>
            <time>${new Date(row.criado_em).toLocaleString('pt-BR')}</time>
          </header>
          <div class="campos">${linhas}</div>
        </article>
      `;
    }).join('');

    res.send(`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Admin - Pesquisa Mr. Tennis</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { color-scheme: dark; }
  body { background:#0b0b0c; color:#f2f2f2; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin:0; padding:2rem; }
  h1 { margin:0 0 .25rem; }
  .sub { color:#9a9a9a; margin:0 0 1.5rem; }
  .barra { display:flex; gap:1rem; align-items:center; flex-wrap:wrap; margin-bottom:2rem; }
  .barra a { color:#c8ff4d; text-decoration:none; border:1px solid #c8ff4d; padding:.5rem 1rem; border-radius:999px; font-size:.9rem; }
  .contagem { color:#9a9a9a; font-size:.9rem; }
  .resposta { background:#161618; border:1px solid #2a2a2d; border-radius:14px; padding:1.25rem 1.5rem; margin-bottom:1rem; }
  .resposta header { display:flex; justify-content:space-between; align-items:baseline; gap:1rem; flex-wrap:wrap; border-bottom:1px solid #2a2a2d; padding-bottom:.6rem; margin-bottom:.8rem; }
  .resposta h2 { margin:0; font-size:1.1rem; }
  .resposta .email { margin:.15rem 0 0; color:#8a8a8a; font-size:.82rem; }
  .resposta time { color:#8a8a8a; font-size:.8rem; }
  .campos { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap:.5rem 1.5rem; }
  .campo { display:flex; flex-direction:column; gap:.15rem; font-size:.9rem; }
  .rotulo { color:#8a8a8a; font-size:.75rem; text-transform:uppercase; letter-spacing:.03em; }
  .valor { color:#f2f2f2; }
  .vazio { color:#8a8a8a; text-align:center; padding:3rem 0; }
</style>
</head>
<body>
  <h1>Pesquisa Mr. Tennis</h1>
  <p class="sub">Respostas recebidas</p>
  <div class="barra">
    <a href="/admin/export.csv">Exportar CSV</a>
    <span class="contagem">${rows.length} resposta${rows.length === 1 ? '' : 's'}</span>
  </div>
  ${rows.length ? cards : '<p class="vazio">Nenhuma resposta ainda.</p>'}
</body>
</html>`);
  } catch (err) {
    console.error('Erro ao carregar admin:', err);
    res.status(500).send('Erro ao carregar respostas.');
  }
});

app.get('/admin/export.csv', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, criado_em, nome, email, dados FROM respostas ORDER BY criado_em ASC'
    );

    const headers = ['ID', 'Data', 'Nome', 'Email', ...FIELDS.map(([, label]) => label)];
    const lines = [headers.map(csvEscape).join(';')];

    for (const row of rows) {
      const line = [
        row.id,
        new Date(row.criado_em).toLocaleString('pt-BR'),
        row.nome,
        row.email,
        ...FIELDS.map(([key]) => formatValue(row.dados[key])),
      ];
      lines.push(line.map(csvEscape).join(';'));
    }

    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="pesquisa-mrtennis.csv"');
    res.send('﻿' + lines.join('\n'));
  } catch (err) {
    console.error('Erro ao exportar CSV:', err);
    res.status(500).send('Erro ao exportar CSV.');
  }
});

app.get('/healthz', (req, res) => res.send('ok'));

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Falha ao inicializar o banco de dados:', err);
    process.exit(1);
  });
