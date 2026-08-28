(function () {
  var portao = document.getElementById('portao');
  var faseVideo = document.getElementById('faseVideo');
  var faseForm = document.getElementById('faseForm');
  var videoIntro = document.getElementById('videoIntro');
  var btnPlay = document.getElementById('btnPlay');
  var btnPular = document.getElementById('btnPular');
  var formPortao = document.getElementById('formPortao');
  var mensagemPortao = document.getElementById('mensagemPortao');
  var btnComecar = document.getElementById('btnComecar');
  var conteudoPesquisa = document.getElementById('conteudoPesquisa');

  var trocandoFase = false;

  function irParaFaseForm() {
    if (trocandoFase || faseForm.hidden === false) return;
    trocandoFase = true;

    faseVideo.style.opacity = '0';
    setTimeout(function () {
      faseVideo.hidden = true;
      videoIntro.pause();

      faseForm.hidden = false;
      faseForm.style.opacity = '0';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          faseForm.style.opacity = '1';
        });
      });
    }, 500);
  }

  function esconderBotaoPlay() {
    btnPlay.hidden = true;
  }

  videoIntro.addEventListener('playing', esconderBotaoPlay);
  videoIntro.addEventListener('ended', irParaFaseForm);
  btnPular.addEventListener('click', irParaFaseForm);

  btnPlay.addEventListener('click', function () {
    videoIntro.play().catch(function () {});
  });

  videoIntro.play()
    .then(esconderBotaoPlay)
    .catch(function () {
      // autoplay com som bloqueado pelo navegador: o botao de play fica visivel
      // para o clique iniciar a reproducao (com som, pois e um gesto do usuario).
    });

  var telaPesquisa = document.querySelector('.tela-pesquisa');
  var form = document.getElementById('pesquisa');
  var mensagem = document.getElementById('mensagem');
  var btnEnviar = document.getElementById('btnEnviar');
  var btnAvancar = document.getElementById('btnAvancar');
  var btnVoltar = document.getElementById('btnVoltar');
  var sucesso = document.getElementById('sucesso');
  var progressoFill = document.getElementById('progressoFill');
  var progressoTexto = document.getElementById('progressoTexto');

  var passos = Array.prototype.slice.call(form.querySelectorAll('.passo'));
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

  function passoValido(passo) {
    var radios = passo.querySelectorAll('input[type="radio"]');
    if (radios.length) {
      return Array.prototype.some.call(radios, function (r) { return r.checked; });
    }

    var checkboxes = passo.querySelectorAll('input[type="checkbox"]');
    if (checkboxes.length) {
      return Array.prototype.some.call(checkboxes, function (c) { return c.checked; });
    }

    return true;
  }

  function primeiroPassoInvalido() {
    for (var i = 0; i < passos.length; i++) {
      if (!passoValido(passos[i])) return i;
    }
    return -1;
  }

  function irPara(numero) {
    atual = numero;
    var passoAtual = passos[atual - 1];

    passos.forEach(function (passo, indice) {
      passo.classList.toggle('ativo', indice === atual - 1);
    });

    progressoFill.style.width = (atual / TOTAL * 100) + '%';
    progressoTexto.textContent = passoAtual.dataset.tema + ' · ' + atual + ' de ' + TOTAL;

    btnVoltar.hidden = atual === 1;
    btnAvancar.hidden = atual === TOTAL;
    btnEnviar.hidden = atual !== TOTAL;

    limparMensagem();
    form.querySelector('.area-passo').scrollTop = 0;
  }

  btnAvancar.addEventListener('click', function () {
    if (!passoValido(passos[atual - 1])) {
      mostrarErro('Por favor, responda antes de continuar.');
      return;
    }
    if (atual < TOTAL) irPara(atual + 1);
  });

  btnVoltar.addEventListener('click', function () {
    if (atual > 1) irPara(atual - 1);
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

    var indiceInvalido = primeiroPassoInvalido();
    if (indiceInvalido !== -1) {
      irPara(indiceInvalido + 1);
      mostrarErro('Por favor, responda antes de continuar.');
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
        telaPesquisa.hidden = true;
        sucesso.hidden = false;
      })
      .catch(function (err) {
        mostrarErro(err.message || 'Erro ao enviar. Tente novamente.');
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Enviar respostas';
      });
  });
})();
