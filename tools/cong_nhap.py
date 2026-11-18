#!/usr/bin/env python3
"""Cổng nhập câu hỏi: gom các file soạn theo Mẫu PNL trong noi-dung/<mã-học-phần>/cau-hoi/*.md|*.txt
thành data/nh-cho.json. Trang quản trị (lop/ngan-hang.js) đọc file này, đưa câu chưa nhận vào Ngân hàng ở trạng thái Nháp.
Mỗi file nhận một lần theo dấu nội dung (sửa file → nhận lại phần mới; câu trùng tự bỏ qua).
Nguồn soạn: dòng đầu "Nguồn: ChatGPT" (Claude, Gemini, NotebookLM, Thủ công…) hoặc tên file có chữ claude/chatgpt/gemini/notebooklm.
Chạy: python3 tools/cong_nhap.py"""
import hashlib, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEN = {"claude": "Claude", "chatgpt": "ChatGPT", "gpt": "ChatGPT", "gemini": "Gemini", "notebooklm": "NotebookLM", "thu-cong": "Thủ công", "tay": "Thủ công"}


def nguon(file, text):
    m = re.search(r"^\s*nguồn\s*[:：]\s*(.+)$", text[:400], re.I | re.M)
    if m:
        return m.group(1).strip()[:30]
    low = file.stem.lower()
    for k, v in TEN.items():
        if k in low:
            return v
    return "AI"


def main():
    out = []
    for f in sorted((ROOT / "noi-dung").glob("*/cau-hoi/*")):
        if f.suffix.lower() not in (".md", ".txt") or f.name.lower().startswith("readme"):
            continue
        text = f.read_text(encoding="utf-8").replace("\r\n", "\n")
        if not text.strip():
            continue
        out.append({"hp": f.parent.parent.name, "file": str(f.relative_to(ROOT)), "nguon": nguon(f, text),
                    "h": hashlib.sha1(text.encode("utf-8")).hexdigest()[:16], "text": text})
    dst = ROOT / "data" / "nh-cho.json"
    dst.parent.mkdir(exist_ok=True)
    dst.write_text(json.dumps({"files": out}, ensure_ascii=False), encoding="utf-8")
    print(f"Cổng nhập: {len(out)} file câu hỏi → data/nh-cho.json")


if __name__ == "__main__":
    main()
