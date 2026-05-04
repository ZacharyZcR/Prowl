const http = require("http");
const { execSync } = require("child_process");
const qs = require("querystring");

const HTML = `<html><body style="font-family:monospace;max-width:600px;margin:40px auto">
<h1>Network Diagnostic Tool</h1>
<form action="/ping" method="post">
<label>Enter hostname to lookup:</label><br>
<input name="host" placeholder="localhost" style="width:300px;padding:8px;margin:8px 0">
<button type="submit" style="padding:8px 16px">Lookup</button>
</form></body></html>`;

http.createServer((req, res) => {
  res.setHeader("Content-Type", "text/html");
  if (req.method === "GET") return res.end(HTML);
  if (req.method === "POST" && req.url === "/ping") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      const host = qs.parse(body).host || "";
      let result;
      try {
        result = execSync(`echo "Looking up ${host}" && nslookup ${host} 2>&1 || echo "Lookup done"`, { timeout: 5000 }).toString();
      } catch (e) {
        result = e.stdout ? e.stdout.toString() : e.message;
      }
      res.end(`<pre style="padding:20px">${result}</pre><a href="/">Back</a>`);
    });
    return;
  }
  res.end(HTML);
}).listen(80);
