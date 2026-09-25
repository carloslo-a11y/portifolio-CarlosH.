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

  // A função de login ainda não existe no banco (SQL antigo)?
  // Nesse caso caímos no método antigo de consulta direta.
  function ehFuncaoAusente(err) {
    if (!err) return false;
    const low = String(err.message || '').toLowerCase();
    return err.code === '42883'
      || low.indexOf('does not exist') !== -1
      || low.indexOf('not found') !== -1
      || low.indexOf('failed to load') !== -1;
  }

  function linhaParaObjeto(data) {
    if (Array.isArray(data)) return data[0] || null;
    if (data && typeof data === 'object') return data;
    return null;
  }

  async function buscarUsuario(email, password) {
    // 1) Login pelo banco (a senha nunca é comparada no navegador).
    const { data, error } = await _supabase.rpc('fazer_login', {
      p_email: email,
      p_senha: password
    });

    if (!error) return linhaParaObjeto(data);

    // 2) Banco ainda no formato antigo? Usa o jeito anterior.
    if (ehFuncaoAusente(error)) {
      const res = await _supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('senha', password)
        .maybeSingle();
      if (res.error) throw res.error;
      return res.data;
    }

    throw error;
  }

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
      const user = await buscarUsuario(email, password);

      if (!user) {
        showError('E-mail ou senha incorretos.');
        return;
      }

      // session.js calcula o papel (admin ou visualização) pelo e-mail.
      const sessao = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo
      };

      if (window.PSS) {
        window.PSS.setUser(sessao);
      } else {
        const json = JSON.stringify(sessao);
        sessionStorage.setItem('pf-user', json);
        document.cookie = 'pf-user=' + encodeURIComponent(json) + '; path=/; SameSite=Lax';
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
