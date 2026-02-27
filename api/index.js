const http = require('http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const bare = createBareServer('/bare/');
const server = http.createServer();
server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) bare.routeRequest(req, res);
    else { res.writeHead(200); res.end('active'); }
});
server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) bare.routeUpgrade(req, socket, head);
    else socket.end();
});
module.exports = server;
