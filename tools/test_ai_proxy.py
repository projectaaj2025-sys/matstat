"""Local-only regression checks for the optional Gemini proxy (no Google calls)."""

import json
import os
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from serve_ai import Handler


class FakeResponse:
    status = 200
    headers = {'Content-Type': 'application/json'}

    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        pass

    def read(self, _size):
        data, self.payload = self.payload, b''
        return data


class ProxyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.http.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join()

    def test_config_and_no_secret_files(self):
        with patch.dict(os.environ, {'AI_GEMINI_API_KEY': 'server-secret'}):
            with urlopen(self.base + '/api/ai/config') as res:
                self.assertEqual(json.load(res), {'geminiAvailable': True})
            for path in ('/.env', '/.git/config', '/src/js/24-ai-assistant.js'):
                with self.assertRaises(HTTPError) as error:
                    urlopen(self.base + path)
                self.assertEqual(error.exception.code, 404)
            with urlopen(self.base + '/index.html') as res:
                self.assertNotIn(b'server-secret', res.read())

    def test_no_key_returns_503(self):
        with patch('serve_ai.api_key', return_value=''):
            with self.assertRaises(HTTPError) as error:
                urlopen(self.base + '/api/ai/models')
            self.assertEqual(error.exception.code, 503)

    def test_proxy_uses_only_server_key(self):
        payload = json.dumps({'contents': [{'role': 'user', 'parts': [{'text': 'hi'}]}], 'generationConfig': {'maxOutputTokens': 1200}}).encode()
        with patch.dict(os.environ, {'AI_GEMINI_API_KEY': 'server-secret'}), patch('serve_ai.urlopen', return_value=FakeResponse(b'{"choices":[]}')) as upstream:
            req = Request(self.base + '/api/ai/gemini/generateContent', data=payload, headers={'Content-Type': 'application/json'}, method='POST')
            with urlopen(req) as res:
                self.assertEqual(json.load(res), {'choices': []})
            upstream_request = upstream.call_args.args[0]
            self.assertEqual(upstream_request.get_header('X-goog-api-key'), 'server-secret')
            self.assertEqual(upstream_request.full_url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent')
            self.assertEqual(upstream_request.data, payload)

    def test_rejects_arbitrary_model_and_origin(self):
        with patch.dict(os.environ, {'AI_GEMINI_API_KEY': 'server-secret'}), patch('serve_ai.urlopen') as upstream:
            payload = json.dumps({'contents': [], 'generationConfig': {'maxOutputTokens': 999999}}).encode()
            req = Request(self.base + '/api/ai/gemini/generateContent', data=payload, headers={'Content-Type': 'application/json'}, method='POST')
            with self.assertRaises(HTTPError) as error:
                urlopen(req)
            self.assertEqual(error.exception.code, 400)
            req = Request(self.base + '/api/ai/models', headers={'Origin': 'https://other.example'})
            with self.assertRaises(HTTPError) as error:
                urlopen(req)
            self.assertEqual(error.exception.code, 403)
            upstream.assert_not_called()


if __name__ == '__main__':
    unittest.main()
