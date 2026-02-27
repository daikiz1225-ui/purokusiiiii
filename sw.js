window.__uv$config = {
    prefix: '/service/',
    bare: '/bare/',
    // iPadでもバグりにくい標準的なBase64エンコード
    encodeUrl: (str) => {
        if (!str) return str;
        return btoa(encodeURIComponent(str));
    },
    decodeUrl: (str) => {
        if (!str) return str;
        try {
            return decodeURIComponent(atob(str));
        } catch(e) { return str; }
    },
    handler: '/handle.js',
    bundle: '/lib.js',
    config: '/config.js',
    sw: '/sw-core.js',
};
