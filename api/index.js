const http = require('http');
const { createBareServer } = require('@tomphttp/bare-server-node');

const bare = createBareServer('/bare/');

module.exports = (req, res) => {
  // Bare Serverへのリクエストかどうか判定
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    // もし間違えてここに来た場合は、とりあえずステータス200を返して404を回避
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bare Server is running');
  }
};
