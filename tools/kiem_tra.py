#!/usr/bin/env python3
"""Chạy thử toàn bộ web trên trình duyệt ảo trước khi đăng.

Kiểm: trang chủ và mọi trang học phần mở được, không lỗi JavaScript, có menu và nội dung,
mục Tóm tắt lý thuyết hiện được, mọi tờ mind map vẽ được.
Kết quả nối vào noi-dung/KET-QUA.md. Mã thoát 1 nếu không đạt (khi đó web KHÔNG được cập nhật).

Chạy:  python3 tools/kiem_tra.py
"""
import base64
import zlib
import subprocess
import functools
import http.server
import json
import pathlib
import re
import shutil
import socketserver
import sys
import threading
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
BAO_CAO = ROOT / "noi-dung" / "KET-QUA.md"
PN_DATA = re.compile(r'<script id="pn-data" type="application/json">(.*?)</script>', re.S)
PHIEN_THU = "localStorage.setItem('pnlib-ma-lop', JSON.stringify({code:'KIEM-THU',label:'Kiểm thử',han:'2099-12-31',courses:['*']}))"


def main():
    loi, ghi_chu = [], []
    # 1. dữ liệu đọc được
    for f in sorted(x for x in (ROOT / "hp").glob("*.html") if x.name != "hoc-phan.html"):  # hoc-phan.html: trang chung đọc dữ liệu Firestore
        m = PN_DATA.search(f.read_text(encoding="utf-8"))
        if not m:
            loi.append(f"hp/{f.name}: không thấy khối dữ liệu")
            continue
        try:
            json.loads(m.group(1))
        except json.JSONDecodeError as e:
            loi.append(f"hp/{f.name}: khối dữ liệu hỏng — {e}")
    idx = (ROOT / "index.html").read_text(encoding="utf-8")
    for m in re.finditer(r'^TL\["([^"]+)"\]=(\{.*\});$', idx, re.M):
        try:
            json.loads(m.group(2))
        except json.JSONDecodeError as e:
            loi.append(f"index.html: dữ liệu mind map '{m.group(1)}' hỏng — {e}")

    # Đánh giá tự luận Luật Dân sự: kiểm tra tập đề và JavaScript riêng.
    essay_path = ROOT / "danh-gia" / "tu-luan-luat-dan-su.html"
    pub_path = ROOT / "danh-gia" / "de" / "luat-dan-su-tu-luan.b64"
    enc_path = ROOT / "danh-gia" / "de" / "luat-dan-su-tu-luan-key.enc.json"
    try:
        essay_html = essay_path.read_text(encoding="utf-8")
        scripts = re.findall(r'<script(?:\\s[^>]*)?>(.*?)</script>', essay_html, re.S)
        if not scripts:
            loi.append("danh-gia tự luận: không tìm thấy script.")
        else:
            # Github Ubuntu runner có Node; kiểm thử cú pháp, không đọc đáp án.
            for j, js in enumerate(scripts):
                chk = subprocess.run(["node", "--check", "-"], input=js, text=True, capture_output=True)
                if chk.returncode:
                    loi.append(f"danh-gia tự luận: lỗi JavaScript {j}: {chk.stderr[:300]}")
        data = json.loads(zlib.decompress(base64.b64decode(pub_path.read_text(encoding="utf-8"))))
        if len(data.get("cases", [])) != 30 or len(data.get("exam_sets", [])) != 15:
            loi.append("danh-gia tự luận: ngân hàng không đủ 30 tình huống / 15 mã đề.")
        enc = json.loads(enc_path.read_text(encoding="utf-8"))
        if enc.get("alg") != "AES-256-GCM" or enc.get("rounds", 0) < 150000:
            loi.append("danh-gia tự luận: cấu trúc mã hóa đáp án không đúng.")
        if len(base64.b64decode(enc.get("payload", ""))) < 1000:
            loi.append("danh-gia tự luận: tệp đáp án mã hóa rỗng.")
    except Exception as e:
        loi.append(f"danh-gia tự luận: lỗi kiểm tra: {e}")

    # 2. chạy thử trên trình duyệt
    if not loi:
        try:
            chay_trinh_duyet(loi, ghi_chu)
        except Exception as e:  # lỗi hạ tầng kiểm thử: coi là không đạt cho an toàn
            loi.append(f"Không chạy được trình duyệt kiểm thử: {e}")

    ok = not loi
    out = ["", "## Bước 2/2 — Chạy thử hiển thị: " + ("ĐẠT, web đã được cập nhật" if ok else "KHÔNG ĐẠT — web giữ nguyên bản cũ"), ""]
    out += [f"- LỖI: {x}" for x in loi] + [f"- {x}" for x in ghi_chu]
    with open(BAO_CAO, "a", encoding="utf-8") as fh:
        fh.write("\n".join(out) + "\n")
    print("\n".join(out))
    return 0 if ok else 1


def chay_trinh_duyet(loi, ghi_chu):
    from playwright.sync_api import sync_playwright

    class Im(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a, **k):
            pass
    handler = functools.partial(Im, directory=str(ROOT))
    srv = socketserver.TCPServer(("127.0.0.1", 0), handler)
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{port}"
    exe = shutil.which("google-chrome") or shutil.which("chromium")
    with sync_playwright() as p:
        b = p.chromium.launch(**({"executable_path": exe} if exe else {}))
        # Trang học phần
        so_trang = 0
        for f in sorted(x for x in (ROOT / "hp").glob("*.html") if x.name != "hoc-phan.html"):  # hoc-phan.html: trang chung đọc dữ liệu Firestore
            pg = b.new_page(viewport={"width": 1366, "height": 900})
            errs = []
            pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
            pg.add_init_script(PHIEN_THU)
            pg.goto(f"{base}/hp/{f.name}")
            try:
                pg.wait_for_function("document.querySelectorAll('.pn-menu [data-pn]').length>0", timeout=15000)
            except Exception:
                pass
            time.sleep(0.4)
            menu = pg.evaluate("document.querySelectorAll('.pn-menu [data-pn]').length")
            chu = pg.evaluate("(document.getElementById('pn-body')||{innerText:''}).innerText.length")
            if errs:
                loi.append(f"hp/{f.name}: lỗi JavaScript — {errs[0][:200]}")
            if menu < 3 or chu < 50:
                loi.append(f"hp/{f.name}: trang không hiện nội dung (menu {menu} mục, {chu} ký tự)")
            if pg.query_selector('.pn-menu [data-pn="tomtat"]'):
                pg.click('.pn-menu [data-pn="tomtat"]')
                time.sleep(0.4)
                muc = pg.evaluate("document.querySelectorAll('#pn-body li').length")
                if muc < 1:
                    loi.append(f"hp/{f.name}: mục Tóm tắt lý thuyết không hiện")
                if errs:
                    loi.append(f"hp/{f.name}: lỗi khi mở Tóm tắt — {errs[-1][:200]}")
            so_trang += 1
            pg.close()
        # Trang chủ + mind map
        pg = b.new_page(viewport={"width": 1366, "height": 900})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"{base}/index.html")
        pg.wait_for_function("typeof tlChapterHTML==='function'", timeout=20000)
        time.sleep(0.5)
        if errs:
            loi.append(f"index.html: lỗi JavaScript — {errs[0][:200]}")
        kq = pg.evaluate("""()=>{const hong=[];let n=0;
          for(const k of Object.keys(TL)){for(const c of TL[k].chapters){for(let i=0;i<(c.maps||[]).length;i++){
            try{const h=tlChapterHTML(k,c.n,i);if(!h||h.indexOf('mm-tree')<0)hong.push(k+' chương '+c.n+' tờ '+(i+1));n++}
            catch(e){hong.push(k+' chương '+c.n+' tờ '+(i+1)+': '+e.message)}}}}
          return {n,hong}}""")
        for h in kq["hong"]:
            loi.append(f"Mind map không vẽ được: {h}")
        # mở thử một trang mind map như người dùng
        pg.evaluate("()=>{needsCode=()=>false;route('tl-luat-dan-su-1')}")
        time.sleep(0.6)
        if not pg.query_selector(".mm-canvas"):
            loi.append("Trang mind map không mở được")
        if errs:
            loi.append(f"index.html: lỗi khi mở mind map — {errs[-1][:200]}")
        ghi_chu.append(f"Đã mở thử {so_trang} trang học phần, trang chủ và {kq['n']} tờ mind map.")
        b.close()
    srv.shutdown()


if __name__ == "__main__":
    sys.exit(main())
