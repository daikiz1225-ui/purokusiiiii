window.__uv$config = {
    prefix: '/service/',
    bare: '/bare/',
    encodeUrl: (str) => {
        if (!str) return str;
        return btoa(str.split('').map((char, i) => i % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join(''));
    },
    decodeUrl: (str) => {
        if (!str) return str;
        try {
            return atob(str).split('').map((char, i) => i % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join('');
        } catch(e) { return str; }
    },
    // ここをすべて絶対パスに変更
    handler: '/handle.js',
    bundle: '/lib.js',
    config: '/config.js',
    sw: '/sw-core.js',
};
