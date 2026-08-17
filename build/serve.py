import http.server, socketserver, os, sys
os.chdir("/Users/samwachsberger/mta-flashcards")
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", port), H) as httpd:
    print("serving mta-flashcards on", port)
    httpd.serve_forever()
