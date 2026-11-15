// Tiny stand-in for Kong: routes /auth/v1 -> GoTrue, /rest/v1 -> PostgREST.
import http from "node:http";
const routes = [
  ["/auth/v1", { host: "auth", port: 9999 }],
  ["/rest/v1", { host: "rest", port: 3000 }],
];
http.createServer((req, res) => {
  const hit = routes.find(([p]) => req.url.startsWith(p));
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" });
    return res.end();
  }
  if (!hit) { res.writeHead(404); return res.end("not found"); }
  const [prefix, target] = hit;
  const headers = { ...req.headers, host: `${target.host}:${target.port}` };
  // Like Kong: if no user JWT is present, use the apikey as the bearer token.
  if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
  const upstream = http.request({ ...target, path: req.url.slice(prefix.length) || "/", method: req.method, headers }, (up) => {
    res.writeHead(up.statusCode, { ...up.headers, "access-control-allow-origin": "*" });
    up.pipe(res);
  });
  upstream.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(upstream);
}).listen(8000, () => console.log("gateway on 8000"));
