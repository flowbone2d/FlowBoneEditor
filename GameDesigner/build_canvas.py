#!/usr/bin/env python3
"""Pack a folder of artboards into canvas-shell.html -> one self-contained page.

  python3 build_canvas.py <art_folder> <out.html> --title "My Art"

The folder holds *.dc.html, canvas.json and images. Images are stored base64 because
that is the format the editor reads from the doc block.
"""
import argparse, base64, html, json, pathlib, re

TEXT = {".html", ".json", ".css", ".js", ".svg", ".md", ".txt"}
OPEN = '<script type="application/json" id="appifact-doc">'

def pack(folder):
    files = {}
    for p in sorted(pathlib.Path(folder).iterdir()):
        if p.is_file() and not p.name.startswith("."):
            data = p.read_bytes()
            files[p.name] = data.decode("utf8") if p.suffix in TEXT else base64.b64encode(data).decode()
    return files

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("out")
    ap.add_argument("--title", default="Untitled")
    ap.add_argument("--shell", default=str(pathlib.Path(__file__).with_name("canvas-shell.html")))
    a = ap.parse_args()

    shell = pathlib.Path(a.shell).read_text(encoding="utf8")
    doc = {"title": a.title, "content": {"files": pack(a.folder)}, "comments": []}
    # A literal "<" would let artboard markup close the doc block early.
    body = json.dumps(doc).replace("<", "\\u003c")
    start = shell.index(OPEN) + len(OPEN)
    end = shell.index("</script>", start)
    page = shell[:start] + "\n" + body + "\n" + shell[end:]
    page = re.sub(r"<title>.*?</title>", lambda m: "<title>" + html.escape(a.title) + "</title>", page, count=1)
    pathlib.Path(a.out).write_text(page, encoding="utf8")
    print(a.out, len(page), "bytes,", len(doc["content"]["files"]), "files")

if __name__ == "__main__":
    main()
