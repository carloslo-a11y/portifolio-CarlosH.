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

  // O banco ainda não tem a função nova? Usa o método antigo.
  function ehFuncaoAusente(err) {
    if (window.SB && window.SB.funcaoAusente) return window.SB.funcaoAusente(err);
    return false;
  }

  function linhaParaObjeto(data) {
    if (Array.isArray(data)) return data[0] || null;
    if (data && typeof data === 'object') return data;
    return null;
  }

  // Descobre uma vez só se o banco já tem a função nova.
  let bancoTemFuncao = true;

  async function buscarUsuario(email, password) {
    // 1) Login pelo banco (a senha nunca é comparada no navegador).
    if (bancoTemFuncao) {
      const { data, error } = await _supabase.rpc('fazer_login', {
        p_email: email,
        p_senha: password
      });

      if (!error) return linhaParaObjeto(data);

      if (ehFuncaoAusente(error)) {
        bancoTemFuncao = false;
        console.info('login: usando o método antigo (banco ainda sem a função fazer_login).');
      } else {
        throw error;
      }
    }

    // 2) Método antigo: consulta direta na tabela.
    const res = await _supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .eq('senha', password)
      .maybeSingle();

    if (res.error) throw res.error;
    return res.data;
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
      console.error('login falhou:', err);
      const code = (err && err.code) || '';
      if (code === '42501') {
        showError('Acesso negado pelo banco. Rode o supabase.sql no Supabase.');
      } else {
        showError('Não foi possível entrar agora. Tente novamente em instantes.');
      }
    } finally {
      accessBtn.classList.remove('loading');
      accessBtn.textContent = 'Acessar';
    }
  });
});
