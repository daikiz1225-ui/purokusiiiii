window.__uv$config = {
    prefix: '/service/',
    bare: '/bare/',
    // 暗号化せず、そのままのURLを渡す（テスト用）
    encodeUrl: (str) => {
        if (!str) return str;
        return encodeURIComponent(str);
    },
    decodeUrl: (str) => {
        if (!str) return str;
        return decodeURIComponent(str);
    },
    handler: '/handle.js',
    bundle: '/lib.js',
    config: '/config.js',
    sw: '/sw-core.js',
};
