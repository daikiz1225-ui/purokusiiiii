document.getElementById('goBtn').addEventListener('click', launch);
document.getElementById('urlInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Enterキーでの標準検索を阻止
        launch();
    }
});

function launch() {
    let url = document.getElementById('urlInput').value.trim();
    if (!url) return;
    
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    // URLをBase64でぐちゃぐちゃにする (btoa関数を使用)
    const encoded = btoa(url).replace(/\//g, '_').replace(/\+/g, '-');
    window.location.href = `/view/${encoded}`;
}
