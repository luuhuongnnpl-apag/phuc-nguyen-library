#!/usr/bin/env python3
"""Xuất Tóm tắt lý thuyết đang có trên web ra noi-dung/<id>/chuong-NN.md (một lần, hoặc khi cần làm lại file nguồn).

Chạy:  python3 tools/xuat_noi_dung.py [id-hoc-phan ...] [--ghi-de]
Không ghi đè file đã có, trừ khi có --ghi-de.
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from xay_dung import ROOT, SRC, INDEX, PN_DATA, ten_chuong  # noqa: E402


def xuat(hp_id, ghi_de):
    hp = ROOT / "hp" / f"{hp_id}.html"
    data = json.loads(PN_DATA.search(hp.read_text(encoding="utf-8")).group(2))
    ly = data.get("ly")
    if not ly or not ly.get("ch"):
        print(f"{hp_id}: chưa có Tóm tắt lý thuyết, bỏ qua")
        return
    m = re.search(r'^TL\["' + re.escape(hp_id) + r'"\]=(\{.*\});$', INDEX.read_text(encoding="utf-8"), re.M)
    tl_ten = {c["n"]: c["t"] for c in json.loads(m.group(1)).get("chapters", [])} if m else {}
    out_dir = SRC / hp_id
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, ch in enumerate(ly["ch"], 1):
        f = out_dir / f"chuong-{i:02d}.md"
        if f.exists() and not ghi_de:
            continue
        lines = []

        def w(n, cap):
            lines.append("#" * cap + " " + n["t"])
            if n.get("cs"):
                lines.append("> CS: " + n["cs"])
            for b in n.get("b", []):
                lines.append("- " + b)
            for k in n.get("c", []):
                lines.append("")
                w(k, cap + 1)

        goc = dict(ch)
        goc["t"] = f"Chương {i}. " + (tl_ten.get(i) or ten_chuong(ch["t"]))
        w(goc, 1)
        f.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("Đã xuất", f.relative_to(ROOT))


if __name__ == "__main__":
    ghi_de = "--ghi-de" in sys.argv
    ids = [a for a in sys.argv[1:] if not a.startswith("--")] or [p.stem for p in sorted((ROOT / "hp").glob("*.html"))]
    for x in ids:
        xuat(x, ghi_de)
