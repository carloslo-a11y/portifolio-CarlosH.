document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cadastro-form');
  const nomeInput = document.getElementById('nome');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const tipoSelect = document.getElementById('tipo');
  const errorMsg = document.getElementById('error-msg');
  const successMsg = document.getElementById('success-msg');
  const cadastroBtn = document.getElementById('cadastro-btn');

  function showError(text) {
    errorMsg.textContent = text;
    errorMsg.hidden = false;
    successMsg.hidden = true;
  }

  function showSuccess(text) {
    successMsg.textContent = text;
    successMsg.hidden = false;
    errorMsg.hidden = true;
  }

  function clearMessages() {
    errorMsg.hidden = true;
    successMsg.hidden = true;
  }

  [nomeInput, emailInput, passwordInput, tipoSelect].forEach(input => {
    input.addEventListener('input', clearMessages);
  });

  // A função de cadastro ainda não existe no banco (SQL antigo)?
  function ehFuncaoAusente(err) {
    if (!err) return false;
    const low = String(err.message || '').toLowerCase();
    return err.code === '42883'
      || low.indexOf('does not exist') !== -1
      || low.indexOf('not found') !== -1
      || low.indexOf('failed to load') !== -1;
  }

  async function criarConta(nome, email, senha, tipo) {
    // 1) Cadastro pelo banco (a senha é guardada com hash lá dentro).
    const { data, error } = await _supabase.rpc('criar_conta', {
      p_nome: nome,
      p_email: email,
      p_senha: senha,
      p_tipo: tipo
    });

    if (!error) return data === 'email_existente' ? 'existente' : 'ok';

    // 2) Banco ainda no formato antigo? Usa o jeito anterior.
    if (ehFuncaoAusente(error)) {
      const { data: existingUser, error: checkError } = await _supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) return 'existente';

      const { error: insertError } = await _supabase
        .from('usuarios')
        .insert([{ nome, email, senha, tipo }]);

      if (insertError) throw insertError;
      return 'ok';
    }

    throw error;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim();
    const senha = passwordInput.value;
    const tipo = tipoSelect.value;

    if (!nome || !email || !senha) {
      showError('Todos os campos são obrigatórios.');
      return;
    }

    if (senha.length < 6) {
      showError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    // O e-mail do administrador é bloqueado aqui: ninguém pode criar
    // uma conta com ele, nem virar administrador pelo cadastro.
    if (window.PSS && window.PSS.ehAdminEmail(email)) {
      showError('Este e-mail é reservado ao administrador do portfólio.');
      return;
    }

    if (!window._supabase) {
      showError('Erro ao carregar o Supabase. Tente novamente em instantes.');
      return;
    }

    cadastroBtn.classList.add('loading');
    cadastroBtn.textContent = 'Cadastrando...';

    try {
      const resultado = await criarConta(nome, email, senha, tipo);

      if (resultado === 'existente') {
        showError('E-mail já cadastrado.');
        return;
      }

      showSuccess('Cadastro realizado! Você poderá visualizar o portfólio. Redirecionando...');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1800);
    } catch (err) {
      console.error(err);
      showError('Erro ao realizar o cadastro. Tente novamente.');
    } finally {
      cadastroBtn.classList.remove('loading');
      cadastroBtn.textContent = 'Cadastrar';
    }
  });
});
