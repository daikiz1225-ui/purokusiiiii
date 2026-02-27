/**
 * Ultra-Light Proxy Library (lib.js)
 * 通信の暗号化とページ制御を担当
 */
(function() {
    'use strict';

    // グローバル設定
    window.__uv$config = window.__uv$config || {
        prefix: '/service/',
        bare: '/bare/',
        // i-フィルターを混乱させるための簡易XOR暗号
        encodeUrl: (str) => {
            if (!str) return str;
            return btoa(str.split('').map((char, i) => i % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join(''));
        },
        decodeUrl: (str) => {
            if (!str) return str;
            try {
                return atob(str).split('').map((char, i) => i % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char).join('');
            } catch(e) { return str; }
        }
    };

    // サービスワーカーの登録補助
    window.UVServiceWorker = class {
        constructor() {}
        async register() {
            if ('serviceWorker' in navigator) {
                return await navigator.serviceWorker.register('/sw.js', {
                    scope: window.__uv$config.prefix
                });
            }
        }
    };

    console.log('Stealth Library Loaded');
})();
