/**
 * URLをi-FILTERにバレない形式（Base64）に変換する
 */
export const encodeUrl = (url) => {
  if (!url) return "";
  // 文字列をBase64に変換し、URLでエラーになりやすい記号を置換
  return Buffer.from(url)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * 暗号化された文字列を元のURLに戻す
 */
export const decodeUrl = (str) => {
  if (!str) return "";
  // 置換された記号を元に戻し、Base64をデコード
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  try {
    return Buffer.from(base64, "base64").toString();
  } catch (e) {
    console.error("Decode error:", e);
    return "";
  }
};
