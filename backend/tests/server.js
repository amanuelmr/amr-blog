const http = require('http');
const app = require('../index');

// Tests hand supertest this already-listening server instead of the bare app.
// Given an app, supertest calls app.listen(0), which binds the IPv6 wildcard,
// and then connects to 127.0.0.1:<port>. On macOS another local process can
// already hold that port on 127.0.0.1, so requests intermittently landed in
// some other app (random 404s, HTTP parse errors, hangs). Binding to
// 127.0.0.1 makes the OS pick a port that is actually free there.
const server = http.createServer(app);
const listening = new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

beforeAll(() => listening);
afterAll(() => new Promise((resolve) => server.close(resolve)));

module.exports = server;
