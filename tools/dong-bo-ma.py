"""Sinh codes.js từ danh sách mã lớp (JSON: [{"code","han","max","note"}]). Chỉ lưu dấu băm SHA-256."""
import hashlib, json, sys
ds = json.load(open(sys.argv[1], encoding="utf-8"))
out = [{"h": hashlib.sha256(("PNLIB|" + d["code"].strip().upper()).encode()).hexdigest(),
        "han": d["han"], "max": d.get("max", 0), "note": d.get("note", "")} for d in ds]
open(sys.argv[2] if len(sys.argv) > 2 else "codes.js", "w", encoding="utf-8").write(
    "/* Mã lớp do giảng viên tạo (dấu băm). Tự sinh bởi tools/dong-bo-ma.py, không sửa tay. */\n"
    "window.PN_CODES=" + json.dumps(out, ensure_ascii=False) + ";\n")
