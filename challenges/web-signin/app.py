from flask import Flask, make_response
import os

app = Flask(__name__)

@app.route("/")
def index():
    resp = make_response("""<!DOCTYPE html>
<html><head><title>Welcome</title></head>
<body style="font-family:monospace;text-align:center;padding:60px">
<h1>Welcome to CTF!</h1>
<p>Nothing here... or is there?</p>
<p style="color:#ccc;font-size:12px">Hint: Have you checked the HTTP headers?</p>
</body></html>""")
    resp.headers["X-Flag"] = os.environ.get("FLAG", "flag{not_set}")
    return resp

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=80)
