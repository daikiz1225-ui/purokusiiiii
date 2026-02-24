document.getElementById('launchBtn').addEventListener('click', function() {
    launchProxy();
});

// Enterキーでの自動検索（フォーム送信）を防止しつつ、
// もしEnterを押した場合は関数を呼ぶだけにする（ページ更新を防ぐ）
document.getElementById('targetUrl').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); // 検索機能をトリガーさせない
        launchProxy();
    }
});

function launchProxy() {
    const urlInput = document.getElementById('targetUrl').value.trim();
    if (!urlInput) {
        alert('URLを入力してください');
        return;
    }

    // http:// などを除去してパスに結合
    const cleanUrl = urlInput.replace(/^https?:\/\//, '');
    window.location.href = `/proxy/${cleanUrl}`;
}
