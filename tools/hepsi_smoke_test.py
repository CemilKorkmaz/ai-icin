#!/usr/bin/env python3
"""Tek tık başlatıcı testi — tarayıcı veya süreç başlatmaz.

Kapsar: çalıştırılabilir sarmalayıcılar, URL üretimi, port/HTTP sağlık
denetimleri, boş port seçimi ve 4 ekranın (ERP + ERP bağlantısı + sim + edge)
doğru adreslenmesi.
"""
from __future__ import annotations

import json
import socket
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
sys.path.insert(0, str(TOOLS))

import hepsi  # noqa: E402


class _Handler(BaseHTTPRequestHandler):
    payload = {'Eritme': {'temperature': 700}}
    status = 200

    def do_GET(self):
        if self.path == '/api/furnaces':
            raw = json.dumps(self.payload).encode('utf-8')
            self.send_response(self.status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        elif self.path == '/api/health':
            raw = b'{"ok": true, "version": "test"}'
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):
        pass


class LauncherTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(('127.0.0.1', 0), _Handler)
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()
        cls.port = cls.httpd.server_address[1]

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def test_sarmalayicilar_var(self):
        command = ROOT / 'hepsi.command'
        batch = ROOT / 'Hepsi.bat'
        self.assertTrue(command.exists())
        self.assertTrue(batch.exists())
        self.assertIn('tools/hepsi.py', command.read_text(encoding='utf-8'))
        self.assertIn('tools\\hepsi.py', batch.read_text(encoding='utf-8'))
        if sys.platform != 'win32':
            self.assertTrue(command.stat().st_mode & 0o111, 'hepsi.command çalıştırılabilir değil')
        self.assertIn(b'\r\n', batch.read_bytes(), 'Windows toplu iş dosyası CRLF olmalı')

    def test_url_listesi(self):
        urls = hepsi.build_urls(8080, 'http://127.0.0.1:8001/', 8787)
        labels = [label for label, _ in urls]
        self.assertEqual(len(urls), 4)
        self.assertIn('ERP Studio · Panel', labels)
        self.assertIn('ERP · Simülasyon Bağlantısı', labels)
        self.assertEqual(urls[2][1], 'http://127.0.0.1:8001/')
        self.assertEqual(urls[3][1], 'http://127.0.0.1:8787/')
        self.assertEqual(len(hepsi.build_urls(8080, 'http://127.0.0.1:8000', None)), 3)

    def test_saglik_denetimleri(self):
        self.assertTrue(hepsi.sim_ready(self.port))
        self.assertTrue(hepsi.bridge_ready(self.port))
        self.assertTrue(hepsi.port_open(self.port))
        self.assertFalse(hepsi.edge_ready(self.port))
        self.assertFalse(hepsi.sim_ready(1))

    def test_bos_port(self):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            sock.listen(1)
            busy = sock.getsockname()[1]
            self.assertTrue(hepsi.port_open(busy))
            free = hepsi.free_port(busy + 1, 50)
            self.assertFalse(hepsi.port_open(free))


if __name__ == '__main__':
    print('Tek tık başlatıcı — duman testi\n')
    suite = unittest.TestLoader().loadTestsFromTestCase(LauncherTests)
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    print('\nSonuç:', 'TÜM TESTLER GEÇTİ' if result.wasSuccessful()
          else f'{len(result.failures) + len(result.errors)} HATA')
    sys.exit(0 if result.wasSuccessful() else 1)
