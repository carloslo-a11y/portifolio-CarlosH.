(function () {
    'use strict';

    var SUPABASE_URL = 'https://yhbpdtooknnvpevhxtvt.supabase.co';
    var SUPABASE_ANON_KEY = 'sb_publishable_QcfBILqMhKgv064PjrXW-w_NHxAy5Kb';
    var BUCKET = 'portfolio';

    function dataUrlToBlob(dataUrl) {
        var parts = String(dataUrl).split(',');
        var mime = (parts[0].match(/:(.*?);/) || [, 'application/octet-stream'])[1];
        var bin = atob(parts[1]);
        var len = bin.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }

    if (!window.supabase) {
        console.error('supabaseClient.js: inclua o CDN do Supabase ANTES deste arquivo.');
    } else {
        window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    window.SB = {
        client: function () { return window._supabase; },
        ready: function () { return !!window._supabase; },
        bucket: BUCKET,
        email: function () {
            try {
                var u = JSON.parse(localStorage.getItem('user') || 'null');
                return (u && u.email) ? u.email : '';
            } catch (e) { return ''; }
        },
        publicUrl: function (path) {
            var r = window._supabase.storage.from(BUCKET).getPublicUrl(path);
            return (r && r.data && r.data.publicUrl) || '';
        },
        uploadBase64: function (dataUrl, path) {
            var blob = dataUrlToBlob(dataUrl);
            return window._supabase.storage.from(BUCKET)
                .upload(path, blob, { upsert: true })
                .then(function (res) {
                    if (res.error) throw res.error;
                    return SB.publicUrl(path);
                });
        },
        pathFromUrl: function (u) {
            var prefix = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/';
            if (String(u).indexOf(prefix) === 0) return String(u).substring(prefix.length);
            return '';
        },
        subscribe: function (table, column, value, callback) {
            if (!window._supabase) return null;
            var channel = window._supabase
                .channel('realtime-' + table + '-' + (column ? String(value) : 'all'))
                .on('postgres_changes', { event: '*', schema: 'public', table: table }, function (payload) {
                    if (column) {
                        var row = payload.new || payload.old || {};
                        var cell = row[column];
                        if (cell === undefined || cell === null) return;
                        if (String(cell).toLowerCase() !== String(value).toLowerCase()) return;
                    }
                    callback(payload);
                })
                .subscribe();
            return channel;
        }
    };
})();