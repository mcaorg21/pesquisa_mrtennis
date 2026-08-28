(function () {
  var portao = document.getElementById('portao');
  var formPortao = document.getElementById('formPortao');
  var mensagemPortao = document.getElementById('mensagemPortao');
  var btnComecar = document.getElementById('btnComecar');
  var conteudoPesquisa = document.getElementById('conteudoPesquisa');

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
  var JA_RESPONDEU = 'Este e-mail já respondeu a pesquisa. Obrigado!';

  function limparMensagemPortao() {
    mensagemPortao.textContent = '';
    mensagemPortao.className = '';
  }

  function mostrarErroPortao(texto) {
    mensagemPortao.textContent = texto;
    mensagemPortao.className = 'erro';
  }

  formPortao.addEventListener('submit', function (evento) {
    evento.preventDefault();
    limparMensagemPortao();

    var nome = document.getElementById('nomePortao').value.trim();
    var email = document.getElementById('emailPortao').value.trim().toLowerCase();

    if (!nome) {
      mostrarErroPortao('Por favor, preencha seu nome.');
      return;
    }
    if (!email) {
      mostrarErroPortao('Por favor, preencha seu e-mail.');
      return;
    }

    btnComecar.disabled = true;
    btnComecar.textContent = 'Verificando...';

    fetch('/api/verificar-email?email=' + encodeURIComponent(email))
      .then(function (resp) {
        if (!resp.ok) return resp.json().then(function (d) { throw new Error(d.error || 'Erro ao verificar e-mail.'); });
        return resp.json();
      })
      .then(function (data) {
        if (data.jaRespondeu) {
          mostrarErroPortao(JA_RESPONDEU);
          return;
        }

        document.getElementById('nome').value = nome;
        document.getElementById('email').value = email;

        portao.hidden = true;
        conteudoPesquisa.hidden = false;
        irPara(1);
      })
      .catch(function (err) {
        mostrarErroPortao(err.message || 'Erro ao verificar e-mail. Tente novamente.');
      })
      .then(function () {
        btnComecar.disabled = false;
        btnComecar.textContent = 'Começar';
      });
  });

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

  btnAvancar.addEventListener('click', function () {
    if (atual < TOTAL) irPara(atual + 1);
  });

  btnVoltar.addEventListener('click', function () {
    if (atual > 1) irPara(atual - 1);
  });

  navBotoes.forEach(function (btn) {
    btn.addEventListener('click', function () {
      irPara(Number(btn.dataset.goto));
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
})();
