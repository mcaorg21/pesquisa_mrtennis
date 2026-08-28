(function () {
  var form = document.getElementById('pesquisa');
  var mensagem = document.getElementById('mensagem');
  var btnEnviar = document.getElementById('btnEnviar');
  var btnAvancar = document.getElementById('btnAvancar');
  var btnVoltar = document.getElementById('btnVoltar');
  var sucesso = document.getElementById('sucesso');
  var stepper = document.getElementById('stepper');

  var passos = Array.prototype.slice.call(form.querySelectorAll('.passo'));
  var navBotoes = Array.prototype.slice.call(stepper.querySelectorAll('.passo-nav'));
  var TOTAL = passos.length;
  var atual = 1;

  var CHECKBOX_GROUPS = ['pontoMelhorar', 'fundamentoTreinar', 'taticaTreinar'];

  function limparMensagem() {
    mensagem.textContent = '';
    mensagem.className = '';
  }

  function mostrarErro(texto) {
    mensagem.textContent = texto;
    mensagem.className = 'erro';
  }

  function irPara(numero) {
    atual = numero;

    passos.forEach(function (passo) {
      var doPasso = Number(passo.dataset.step);
      passo.classList.toggle('ativo', doPasso === atual);
    });

    navBotoes.forEach(function (btn) {
      var doBotao = Number(btn.dataset.goto);
      btn.classList.toggle('atual', doBotao === atual);
      btn.classList.toggle('concluido', doBotao < atual);
    });

    btnVoltar.hidden = atual === 1;
    btnAvancar.hidden = atual === TOTAL;
    btnEnviar.hidden = atual !== TOTAL;

    limparMensagem();
    window.scrollTo({ top: stepper.offsetTop - 12, behavior: 'smooth' });
  }

  function validarPasso1() {
    var nome = document.getElementById('nome').value.trim();
    if (!nome) {
      mostrarErro('Por favor, preencha seu nome antes de continuar.');
      document.getElementById('nome').focus();
      return false;
    }
    return true;
  }

  btnAvancar.addEventListener('click', function () {
    if (atual === 1 && !validarPasso1()) return;
    if (atual < TOTAL) irPara(atual + 1);
  });

  btnVoltar.addEventListener('click', function () {
    if (atual > 1) irPara(atual - 1);
  });

  navBotoes.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var destino = Number(btn.dataset.goto);
      if (destino > atual && atual === 1 && !validarPasso1()) return;
      irPara(destino);
    });
  });

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
    limparMensagem();

    if (!validarPasso1()) {
      irPara(1);
      return;
    }

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

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
        stepper.hidden = true;
        form.hidden = true;
        sucesso.hidden = false;
        sucesso.scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function (err) {
        mostrarErro(err.message || 'Erro ao enviar. Tente novamente.');
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Enviar respostas';
      });
  });

  irPara(1);
})();
