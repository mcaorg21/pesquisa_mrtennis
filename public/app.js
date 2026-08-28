(function () {
  var form = document.getElementById('pesquisa');
  var mensagem = document.getElementById('mensagem');
  var btn = document.getElementById('btnEnviar');
  var sucesso = document.getElementById('sucesso');

  var CHECKBOX_GROUPS = ['pontoMelhorar', 'fundamentoTreinar', 'taticaTreinar'];

  function coletarDados() {
    var dados = {};
    var formData = new FormData(form);

    formData.forEach(function (valor, chave) {
      if (CHECKBOX_GROUPS.indexOf(chave) !== -1) {
        if (!dados[chave]) dados[chave] = [];
        dados[chave].push(valor);
      } else {
        dados[chave] = valor;
      }
    });

    return dados;
  }

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    mensagem.textContent = '';
    mensagem.className = '';

    var nome = document.getElementById('nome').value.trim();
    if (!nome) {
      mensagem.textContent = 'Por favor, preencha seu nome.';
      mensagem.className = 'erro';
      document.getElementById('nome').focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    fetch('/api/respostas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coletarDados()),
    })
      .then(function (resp) {
        if (!resp.ok) return resp.json().then(function (d) { throw new Error(d.error || 'Erro ao enviar.'); });
        return resp.json();
      })
      .then(function () {
        form.hidden = true;
        sucesso.hidden = false;
        sucesso.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function (err) {
        mensagem.textContent = err.message || 'Erro ao enviar. Tente novamente.';
        mensagem.className = 'erro';
        btn.disabled = false;
        btn.textContent = 'Enviar respostas';
      });
  });
})();
