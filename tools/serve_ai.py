"""Serve the standalone course with an optional server-side Gemini key.

Set AI_GEMINI_API_KEY in the environment or in an ignored .env file in the
repository root. Never put the key in index.html, a JavaScript file, or Git.
"""

import json
import os
from collections import defaultdict, deque
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from time import monotonic
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM = 'https://generativelanguage.googleapis.com/v1beta'
SITE_MODEL = 'gemini-2.5-flash'
MAX_BODY = 96 * 1024
RATE_WINDOW = 60
RATE_LIMIT = 30
_requests = defaultdict(deque)
_rate_lock = Lock()


def api_key():
    key = os.environ.get('AI_GEMINI_API_KEY', '').strip()
    if key:
        return key
    # Simple env-file format: one KEY=value per line (no shell execution).
    path = ROOT / '.env'
    if path.is_file():
        for line in path.read_text(encoding='utf-8').splitlines():
            if line.startswith('AI_GEMINI_API_KEY='):
                return line.partition('=')[2].strip().strip('"\'')
    return ''


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, data):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/ai/config':
            self.send_json(200, {'geminiAvailable': bool(api_key())})
        elif path == '/api/ai/models':
            self.proxy('GET', 'models')
        elif path in ('/', '/index.html', '/favicon.ico', '/favicon.svg', '/apple-touch-icon.png'):
            # Do not expose .env, source code, Git metadata or directory listings.
            self.path = path
            super().do_GET()
        else:
            self.send_error(404)

    def do_HEAD(self):
        self.send_error(405)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in ('/api/ai/gemini/generateContent', '/api/ai/gemini/streamGenerateContent'):
            self.send_error(404)
            return
        stream = path.endswith('/streamGenerateContent')
        endpoint = f'models/{SITE_MODEL}:' + ('streamGenerateContent?alt=sse' if stream else 'generateContent')
        self.proxy('POST', endpoint)

    def proxy(self, method, endpoint):
        key = api_key()
        if not key:
            self.send_json(503, {'error': 'Site Gemini key is not configured'})
            return
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            self.send_error(403)
            return
        # Best-effort abuse protection; a public shared key still needs proper
        # access controls / quotas before deploying this server publicly.
        client = self.client_address[0]
        with _rate_lock:
            times = _requests[client]
            now = monotonic()
            while times and times[0] < now - RATE_WINDOW:
                times.popleft()
            if len(times) >= RATE_LIMIT:
                self.send_json(429, {'error': 'Too many requests'})
                return
            times.append(now)
        payload = None
        if method == 'POST':
            if not self.headers.get('Content-Type', '').lower().startswith('application/json'):
                self.send_error(415)
                return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= MAX_BODY:
                    self.send_error(413)
                    return
                payload = self.rfile.read(length)
                body = json.loads(payload)
                config = body.get('generationConfig', {}) if isinstance(body, dict) else {}
                if not isinstance(body, dict) or not isinstance(body.get('contents'), list) or not isinstance(config, dict) or not isinstance(config.get('maxOutputTokens'), int) or not 1 <= config['maxOutputTokens'] <= 1200:
                    self.send_error(400)
                    return
            except (ValueError, json.JSONDecodeError):
                self.send_error(400)
                return
        headers = {'x-goog-api-key': key}
        if payload is not None:
            headers['Content-Type'] = 'application/json'
        request = Request(UPSTREAM + '/' + endpoint, data=payload, headers=headers, method=method)
        try:
            response = urlopen(request, timeout=95)
        except HTTPError as error:
            response = error
        except (URLError, TimeoutError):
            self.send_json(502, {'error': 'Gemini service unavailable'})
            return
        with response:
            self.send_response(response.status)
            self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
            self.send_header('Cache-Control', 'no-store')
            # No upstream Authorization/Cookie/redirect headers are forwarded.
            if response.headers.get('Content-Length'):
                self.send_header('Content-Length', response.headers['Content-Length'])
            self.end_headers()
            try:
                while chunk := response.read(8192):
                    self.wfile.write(chunk)
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError):
                pass


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    print(f'StatPracticum: http://0.0.0.0:{port} (Gemini key configured: {bool(api_key())})', flush=True)
    server.serve_forever()
