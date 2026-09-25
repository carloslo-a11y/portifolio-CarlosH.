(function () {
    'use strict';

    var COOKIE = 'pf-user';
    var STORE = 'pf-user';

    // =====================================================
    //  PERMISSÕES
    //  Só os e-mails desta lista podem EDITAR o site
    //  (alterar data, adicionar e excluir atividades).
    //  Qualquer outra conta é somente de visualização.
    // =====================================================
    var ADMIN_EMAILS = [
        'carlosheitorcostalo@gmail.com'
    ];

    function ehAdminEmail(email) {
        var alvo = String(email == null ? '' : email).trim().toLowerCase();
        if (!alvo) return false;
        for (var i = 0; i < ADMIN_EMAILS.length; i++) {
            if (ADMIN_EMAILS[i].trim().toLowerCase() === alvo) return true;
        }
        return false;
    }

    // O papel (admin/viewor) é SEMPRE recalculado a partir do e-mail.
    // Assim, mexer no sessionStorage do navegador não concede edição.
    function normalizar(obj) {
        if (!obj || !obj.email) return null;
        var admin = ehAdminEmail(obj.email);
        return {
            id: obj.id,
            nome: obj.nome || '',
            email: obj.email,
            tipo: obj.tipo || 'aluno',
            papel: admin ? 'admin' : 'viewer',
            podeEditar: admin
        };
    }

    function getRawFromStorage() {
        try {
            return sessionStorage.getItem(STORE) || '';
        } catch (e) {
            return '';
        }
    }

    function getRawFromCookie() {
        try {
            var parts = document.cookie.split(';');
            for (var i = 0; i < parts.length; i++) {
                var p = parts[i].trim();
                if (p.indexOf(COOKIE + '=') === 0) {
                    return decodeURIComponent(p.substring(COOKIE.length + 1));
                }
            }
        } catch (e) { }
        return '';
    }

    function getRaw() {
        var raw = getRawFromStorage();
        if (raw) return raw;
        var c = getRawFromCookie();
        if (c) {
            try { sessionStorage.setItem(STORE, c); } catch (e) { }
            return c;
        }
        return '';
    }

    function getUser() {
        try {
            var raw = getRaw();
            if (!raw) return null;
            return normalizar(JSON.parse(raw));
        } catch (e) {
            return null;
        }
    }

    function setUser(obj) {
        var u = normalizar(obj);
        if (!u) return;
        var json = JSON.stringify(u);
        try {
            sessionStorage.setItem(STORE, json);
        } catch (e) { }
        try {
            document.cookie = COOKIE + '=' + encodeURIComponent(json) + '; path=/; SameSite=Lax';
        } catch (e) { }
    }

    function clearUser() {
        try {
            sessionStorage.removeItem(STORE);
        } catch (e) { }
        try {
            document.cookie = COOKIE + '=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        } catch (e) { }
    }

    // Pode usar as ferramentas de edição? (admin)
    function podeEditar() {
        var u = getUser();
        return !!(u && u.podeEditar);
    }

    function ehAdmin() {
        return podeEditar();
    }

    // Rótulo para mostrar na interface.
    function rotuloPapel() {
        return podeEditar() ? 'Administrador' : 'Visualização';
    }

    function nomeAtual() {
        var u = getUser();
        return u ? u.nome : '';
    }

    window.PSS = {
        getUser: getUser,
        setUser: setUser,
        clearUser: clearUser,
        podeEditar: podeEditar,
        ehAdmin: ehAdmin,
        ehAdminEmail: ehAdminEmail,
        rotuloPapel: rotuloPapel,
        nomeAtual: nomeAtual,
        adminEmails: ADMIN_EMAILS.slice()
    };
})();
