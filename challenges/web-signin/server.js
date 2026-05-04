const http = require("http");
const FLAG = process.env.FLAG || "flag{default}";
http.createServer((req, res) => {
  res.setHeader("X-Flag", FLAG);
  res.setHeader("Content-Type", "text/html");
  res.end(`<html><body style="font-family:monospace;text-align:center;padding:60px">
<h1>Welcome to CTF!</h1>
<p>Nothing here... or is there?</p>
<p style="color:#ccc;font-size:12px">Hint: Have you checked the HTTP response headers?</p>
</body></html>`);
}).listen(80, () => console.log("listening on 80"));
