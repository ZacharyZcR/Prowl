const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const INDEX = `<html><body style="font-family:monospace;max-width:600px;margin:40px auto">
<h1>Page Viewer</h1>
<ul>
<li><a href="/view?page=home.txt">Home</a></li>
<li><a href="/view?page=about.txt">About</a></li>
</ul></body></html>`;

http.createServer((req, res) => {
  res.setHeader("Content-Type", "text/html");
  const parsed = url.parse(req.url, true);
  if (parsed.pathname === "/view") {
    const page = parsed.query.page || "";
    const filepath = path.join("/pages", page);
    let content;
    try { content = fs.readFileSync(filepath, "utf-8"); } catch { content = "File not found"; }
    return res.end(`<pre style="padding:20px">${content}</pre><a href="/">Back</a>`);
  }
  res.end(INDEX);
}).listen(80);
