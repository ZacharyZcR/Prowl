from flask import Flask, request
import os

app = Flask(__name__)

@app.route("/")
def index():
    return """<!DOCTYPE html>
<html><head><title>File Viewer</title></head>
<body style="font-family:monospace;max-width:600px;margin:40px auto">
<h1>Page Viewer</h1>
<ul>
<li><a href="/view?page=home.txt">Home</a></li>
<li><a href="/view?page=about.txt">About</a></li>
</ul>
</body></html>"""

@app.route("/view")
def view():
    page = request.args.get("page", "")
    if not page:
        return "Missing page parameter", 400
    filepath = os.path.join("/pages", page)
    try:
        with open(filepath) as f:
            content = f.read()
    except Exception:
        content = "File not found"
    return f"""<pre style="font-family:monospace;padding:20px">{content}</pre>
<a href="/">Back</a>"""

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
