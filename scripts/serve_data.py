"""Local static data server with HTTP Range + CORS, mimicking R2 for development.

    python scripts/serve_data.py staging/fixture --port 8787
"""
import argparse, os, re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial


class RangeCORSHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "range, if-none-match")
        self.send_header("Access-Control-Expose-Headers", "content-range, content-length, accept-ranges, etag")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204); self.end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        rng = self.headers.get("Range")
        if not rng or os.path.isdir(path) or not os.path.exists(path):
            return super().send_head()
        size = os.path.getsize(path)
        m = re.match(r"bytes=(\d*)-(\d*)$", rng.strip())
        if not m:
            self.send_error(400); return None
        a, b = m.groups()
        if a == "":           # suffix range
            start, end = max(0, size - int(b)), size - 1
        else:
            start, end = int(a), (int(b) if b else size - 1)
        end = min(end, size - 1)
        if start > end:
            self.send_response(416); self.send_header("Content-Range", f"bytes */{size}"); self.end_headers(); return None
        f = open(path, "rb"); f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        n = getattr(self, "_remaining", None)
        if n is None:
            return super().copyfile(source, outputfile)
        outputfile.write(source.read(n)); self._remaining = None

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("root"); ap.add_argument("--port", type=int, default=8787)
    a = ap.parse_args()
    ThreadingHTTPServer(("127.0.0.1", a.port), partial(RangeCORSHandler, directory=a.root)).serve_forever()
