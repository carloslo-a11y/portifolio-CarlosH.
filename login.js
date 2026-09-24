document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorMsg = document.getElementById('error-msg');
  const accessBtn = document.getElementById('access-btn');

  function showError(text) {
    errorMsg.textContent = text;
    errorMsg.hidden = false;
    emailInput.classList.add('invalid');
    passwordInput.classList.add('invalid');
  }

  function clearError() {
    errorMsg.hidden = true;
    emailInput.classList.remove('invalid');
    passwordInput.classList.remove('invalid');
  }

  [emailInput, passwordInput].forEach(input => {
    input.addEventListener('input', clearError);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showError('Preencha todos os campos.');
      return;
    }

    if (!window._supabase) {
      showError('Erro ao carregar o Supabase. Tente novamente em instantes.');
      return;
    }

    accessBtn.classList.add('loading');
    accessBtn.textContent = 'Entrando...';

    try {
      const { data: user, error } = await _supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('senha', password)
        .maybeSingle();

      if (error) throw error;

      if (!user) {
        showError('E-mail ou senha incorretos.');
        return;
      }

      var sessao = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo
      };

      if (window.PSS) {
        window.PSS.setUser(sessao);
      } else {
        try {
          var json = JSON.stringify(sessao);
          sessionStorage.setItem('pf-user', json);
          document.cookie = 'pf-user=' + encodeURIComponent(json) + '; path=/; SameSite=Lax';
        } catch (err) {
          console.error(err);
        }
      }

      window.location.href = 'index.html';
    } catch (err) {
      console.error(err);
      showError('Erro ao efetuar login. Verifique sua conexão.');
    } finally {
      accessBtn.classList.remove('loading');
      accessBtn.textContent = 'Acessar';
    }
  });
});