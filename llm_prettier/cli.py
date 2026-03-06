from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

import llm_prettier


def main() -> None:
    parser = argparse.ArgumentParser(
        description="A generic JSON prettier and viewer, built especially for parsing embedded JSON from LLM payloads and responses.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  llm-prettier response.json\n"
            "  llm-prettier payload.json --serve\n"
            "  llm-prettier payload.json -s -o my_view.html\n"
            "  type response.json | llm-prettier -"
        ),
    )
    parser.add_argument(
        "files",
        metavar="FILE",
        type=str,
        nargs="+",
        help="One or more JSON files to process. Use '-' to read from stdin.",
    )
    parser.add_argument(
        "-s",
        "--serve",
        action="store_true",
        help="Start a temporary HTTP server and open the generated HTML in the browser.",
    )
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        default=2627,
        help="Port to use for the temporary server (default: 2627).",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default=None,
        help="Output file path. Only used when a single input file is provided.",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"llm-prettier {llm_prettier.__version__}",
    )

    args = parser.parse_args()

    if args.output and len(args.files) > 1:
        print("[WARNING] --output is ignored when multiple input files are provided.")
        args.output = None

    generated_files: list[tuple[str, str]] = []

    for filepath in args.files:
        try:
            # Support reading from stdin when filepath is '-'
            if filepath == "-":
                raw = sys.stdin.read()
                data = json.loads(raw)
                filename = "stdin"
                out_name = args.output or "viewer_stdin.html"
                title = "stdin"
            else:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                filename = os.path.basename(filepath)
                name, _ = os.path.splitext(filename)
                out_name = args.output or f"viewer_{name}.html"
                title = filename

            result = llm_prettier.show(data, out_name=out_name, title=title)
            if result:
                generated_files.append((out_name, result))

        except FileNotFoundError:
            print(f"[ERROR] File not found: {filepath}")
        except json.JSONDecodeError as e:
            print(f"[ERROR] Invalid JSON in {filepath}: {e}")
        except Exception as e:
            print(f"[ERROR] Processing {filepath}: {e}")

    if args.serve and generated_files:
        _serve_files(generated_files, args.port)


def _serve_files(generated_files: list[tuple[str, str]], port: int) -> None:
    """Start a temporary HTTP server and open the first generated file."""
    first_file_dir = os.path.dirname(generated_files[0][1])
    if not first_file_dir:
        first_file_dir = os.getcwd()

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=first_file_dir, **kwargs)

        def log_message(self, format, *args):
            pass  # Suppress request logs to keep console clean

    try:
        httpd = HTTPServer(("", port), Handler)
    except OSError as e:
        print(f"[ERROR] Could not start server on port {port}: {e}")
        return

    print(f"\n[INFO] Serving on http://localhost:{port}")

    first_file_name = os.path.basename(generated_files[0][0])
    url = f"http://localhost:{port}/{first_file_name}"

    server_thread = threading.Thread(target=httpd.serve_forever)
    server_thread.daemon = True
    server_thread.start()

    print(f"[INFO] Opening {url} ...")
    time.sleep(0.5)
    webbrowser.open(url)

    try:
        print("[INFO] Press Ctrl+C to stop the server.")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[INFO] Stopping server...")
        httpd.shutdown()
        httpd.server_close()


if __name__ == "__main__":
    main()
