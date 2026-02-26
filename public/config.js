window.__DIP_CONFIG__ = {
    prefix: '/api/bare?url=',
    encodeUrl: (u) => btoa(unescape(encodeURIComponent(u))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    decodeUrl: (u) => decodeURIComponent(escape(atob(u.replace(/-/g, '+').replace(/_/g, '/'))))
};
