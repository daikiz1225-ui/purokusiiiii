const sw = '/sw.js';

self.__uv$config = {
    prefix: '/service/',
    bare: '/bare/',
    encodeUrl: (str) => {
        if (!str) return str;
        // i-フィルター対策: URLをXORで難読化
        return encodeURIComponent(str.split('').map((char, i) => i % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join(''));
    },
    decodeUrl: (str) => {
        if (!str) return str;
        return decodeURIComponent(str).split('').map((char, i) => i % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join('');
    },
    handler: '/uv/uv.handler.js',
    bundle: '/uv/uv.bundle.js',
    config: '/uv/uv.config.js',
    sw: '/uv/uv.sw.js',
};
