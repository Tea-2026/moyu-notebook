"""Build the single-file, double-clickable edition of Moyu Notebook.

The native Windows app lives in native/. This script is for people who want a
zero-install copy of the same interface, or want to host it as a PWA.
"""
from __future__ import annotations

import base64
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
OUT = DIST / "摸鱼笔记本.html"
SITE = DIST / "web"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def main() -> None:
    DIST.mkdir(exist_ok=True)
    html = read(ROOT / "index.html")
    css = read(ROOT / "styles.css")
    js = read(ROOT / "app.js")

    html = html.replace(
        '<link rel="stylesheet" href="styles.css">',
        "<style>\n" + css + "\n</style>",
        1,
    )
    html = html.replace(
        '<script src="app.js"></script>',
        "<script>\n" + js.replace("</script", "<\\/script") + "\n</script>",
        1,
    )
    html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', "")
    html = html.replace(
        '<link rel="icon" href="icons/favicon.svg" type="image/svg+xml">',
        '<link rel="icon" href="data:image/svg+xml;base64,'
        + base64.b64encode((ROOT / "icons/favicon.svg").read_bytes()).decode()
        + '" type="image/svg+xml">',
    )
    html = html.replace(
        '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
        '<link rel="apple-touch-icon" href="data:image/png;base64,'
        + base64.b64encode((ROOT / "icons/apple-touch-icon.png").read_bytes()).decode()
        + '">',
    )

    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB)")

    # A clean folder for static hosting / PWA deployment.
    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir(parents=True)
    shutil.copy2(ROOT / "index.html", SITE / "index.html")
    shutil.copy2(ROOT / "styles.css", SITE / "styles.css")
    shutil.copy2(ROOT / "app.js", SITE / "app.js")
    shutil.copy2(ROOT / "manifest.webmanifest", SITE / "manifest.webmanifest")
    shutil.copy2(ROOT / "sw.js", SITE / "sw.js")
    shutil.copytree(ROOT / "icons", SITE / "icons", dirs_exist_ok=True)
    print(f"wrote {SITE}")


if __name__ == "__main__":
    main()
