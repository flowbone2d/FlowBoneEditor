#!/usr/bin/env python3
"""Chạy thử trang FlowBone trên localhost.

    python3 serve.py              # mở http://localhost:8000/HomePage/
    python3 serve.py 5500         # đổi cổng
    python3 serve.py --root V1.1.2 --no-open

Khác với `python3 -m http.server` ở ba chỗ cần thiết cho repo này:

  * .wasm trả đúng application/wasm — thiếu nó CanvasKit của bản
    editor Flutter trong V1.1.2 sẽ không khởi động.
  * Tắt cache, nên sửa index.html / index.js xong chỉ cần F5.
  * Nghe trên localhost, không mở ra mạng LAN.
"""

import argparse
import functools
import http.server
import mimetypes
import os
import socket
import socketserver
import sys
import threading
import webbrowser

# Python trên macOS hay đọc MIME từ registry của hệ thống và trả sai
# vài đuôi quan trọng, nên ghi đè thẳng ở đây.
EXTRA_TYPES = {
    ".wasm": "application/wasm",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".json": "application/json",
    ".atlas": "text/plain",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        **EXTRA_TYPES,
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        code = args[1] if len(args) > 1 else ""
        # Chỉ kêu khi có lỗi; 200 OK thì im cho đỡ rối màn hình.
        if str(code).startswith(("4", "5")):
            sys.stderr.write("  %s %s\n" % (code, args[0]))


class Server(socketserver.ThreadingTCPServer):
    # Cho phép bind lại ngay sau khi tắt, khỏi dính "Address already in use".
    allow_reuse_address = True
    daemon_threads = True


def free_port(host, port, tries=20):
    """Cổng đang bận thì nhích lên, khỏi phải tự đoán cổng trống."""
    for candidate in range(port, port + tries):
        with socket.socket() as probe:
            try:
                probe.bind((host, candidate))
                return candidate
            except OSError:
                continue
    raise SystemExit("Không tìm được cổng trống từ %d đến %d." % (port, port + tries - 1))


def main():
    here = os.path.dirname(os.path.abspath(__file__))

    ap = argparse.ArgumentParser(description="Server tĩnh để xem thử trang FlowBone.")
    ap.add_argument("port", nargs="?", type=int, default=8000, help="cổng (mặc định 8000)")
    ap.add_argument("--root", default=here, help="thư mục gốc (mặc định: thư mục chứa file này)")
    ap.add_argument("--path", default="HomePage/", help="đường dẫn mở sẵn (mặc định HomePage/)")
    ap.add_argument("--host", default="127.0.0.1", help="địa chỉ nghe (mặc định 127.0.0.1)")
    ap.add_argument("--no-open", action="store_true", help="không tự mở trình duyệt")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        raise SystemExit("Không thấy thư mục: %s" % root)

    for ext, kind in EXTRA_TYPES.items():
        mimetypes.add_type(kind, ext)

    port = free_port(args.host, args.port)
    if port != args.port:
        print("Cổng %d đang bận, dùng %d." % (args.port, port), flush=True)

    url = "http://localhost:%d/%s" % (port, args.path.lstrip("/"))
    handler = functools.partial(Handler, directory=root)

    with Server((args.host, port), handler) as httpd:
        print("Thư mục : %s" % root, flush=True)
        print("Địa chỉ : %s" % url, flush=True)
        print("Dừng    : Ctrl+C", flush=True)
        if not args.no_open:
            threading.Timer(0.4, webbrowser.open, (url,)).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã dừng.")


if __name__ == "__main__":
    main()
