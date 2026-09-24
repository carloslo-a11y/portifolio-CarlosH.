(function () {
    'use strict';

    var COOKIE = 'pf-user';
    var STORE = 'pf-user';

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
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function setUser(obj) {
        var json = JSON.stringify(obj);
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

    window.PSS = {
        getUser: getUser,
        setUser: setUser,
        clearUser: clearUser
    };
})();