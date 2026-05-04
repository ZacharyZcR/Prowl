from flask import Flask, request
import subprocess, os

app = Flask(__name__)

@app.route("/")
def index():
    return """<!DOCTYPE html>
<html><head><title>Network Tool</title></head>
<body style="font-family:monospace;max-width:600px;margin:40px auto">
<h1>Network Diagnostic Tool</h1>
<form action="/ping" method="post">
<label>Enter IP to ping:</label><br>
<input name="ip" placeholder="127.0.0.1" style="width:300px;padding:8px;margin:8px 0">
<button type="submit" style="padding:8px 16px">Ping</button>
</form>
</body></html>"""

@app.route("/ping", methods=["POST"])
def ping():
    ip = request.form.get("ip", "")
    if not ip:
        return "Please provide an IP", 400
    try:
        result = subprocess.check_output(
            f"ping -c 2 {ip}", shell=True, stderr=subprocess.STDOUT, timeout=5
        ).decode()
    except subprocess.TimeoutExpired:
        result = "Timeout"
    except subprocess.CalledProcessError as e:
        result = e.output.decode()
    return f"""<pre style="font-family:monospace;padding:20px">{result}</pre>
<a href="/">Back</a>"""

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
