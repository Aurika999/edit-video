# Construieste editor-razvan.html: pune stickerele PNG direct in pagina.
import base64, json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
names = {
    "1-logo-minge": "Logo RĂZVAN",
    "2-gol": "GOOOL",
    "3-aboneaza-te": "Abonează-te",
    "4-exercitiul-zilei": "Exercițiul zilei",
    "5-bravo": "Bravo",
    "6-bara-nume": "Bara cu nume",
}
stickers = []
for stem, name in names.items():
    data = base64.b64encode((root / "stickere" / f"{stem}.png").read_bytes()).decode()
    stickers.append({"name": name, "src": "data:image/png;base64," + data})

tpl = (root / "sursa" / "editor-template.html").read_text(encoding="utf-8")
out = tpl.replace("__STICKERS__", json.dumps(stickers, ensure_ascii=False))
(root / "editor-razvan.html").write_text(out, encoding="utf-8")
print("ok", len(out) // 1024, "KB")
