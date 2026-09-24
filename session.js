(function () {
    'use strict';

    var COOKIE = 'pf-user';

    function getRaw() {
        var parts = document.cookie.split(';');
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i].trim();
            if (p.indexOf(COOKIE + '=') === 0) {
                try {
                    return decodeURIComponent(p.substring(COOKIE.length + 1));
                } catch (e) {
                    return '';
                }
            }
        }
        return '';
    }

    function getUser() {
        try {
            var raw = getRaw();
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function setUser(obj) {
        document.cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify(obj)) + '; path=/; SameSite=Lax';
    }

    function clearUser() {
        document.cookie = COOKIE + '=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }

    window.PSS = {
        getUser: getUser,
        setUser: setUser,
        clearUser: clearUser
    };
})();