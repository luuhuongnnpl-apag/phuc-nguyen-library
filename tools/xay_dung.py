#!/usr/bin/env python3
"""Xây dựng Tóm tắt lý thuyết và mind map từ thư mục noi-dung/.

Nguồn duy nhất: noi-dung/<id-hoc-phan>/chuong-NN.md (định dạng xem noi-dung/README.md).
Script cập nhật:
  - khối "ly" (Tóm tắt lý thuyết) trong hp/<id>.html
  - TL["<id>"].chapters[n].maps (mind map) trong index.html
Chỉ những chương có file .md mới được thay; các chương khác giữ nguyên.

Chạy:  python3 tools/xay_dung.py [--kiem]   (--kiem: chỉ soát, không ghi file)
Kết quả soát ghi ra noi-dung/KET-QUA.md. Mã thoát 1 nếu có LỖI.
"""
import json
import pathlib
import re
import sys
from datetime import datetime, timezone, timedelta

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "noi-dung"
INDEX = ROOT / "index.html"

PN_DATA = re.compile(r'(<script id="pn-data" type="application/json">)(.*?)(</script>)', re.S)
SO_MUC = re.compile(r'^(?:\d+(?:\.\d+)*\.?|[a-zđ]\)|[IVXLC]+\.)\s+')
DIEU = re.compile(r'\bĐiều\s+\d+', re.I)

loi, canh_bao, da_lam = [], [], []


def sach(s):
    s = s.strip().replace("**", "").replace("__", "")
    return re.sub(r"\s+", " ", s)


def doc_chuong(path, hp_id):
    """Đọc một file chương → (số chương, nút chương dạng ly {t, cs, b, c}, cảnh báo riêng của chương)."""
    global canh_bao
    ten = f"{hp_id}/{path.name}"
    cb_chung, canh_bao = canh_bao, []
    try:
        so, node = _doc_chuong(path, hp_id, ten)
        return so, node, canh_bao
    finally:
        canh_bao = cb_chung


def _doc_chuong(path, hp_id, ten):
    m = re.match(r"chuong-(\d+)\.md$", path.name)
    if not m:
        loi.append(f"{ten}: tên file phải có dạng chuong-01.md, chuong-02.md …")
        return None, None
    so_file = int(m.group(1))
    lines = path.read_text(encoding="utf-8").splitlines()
    root, stack, cur = None, [], None
    kiem = []
    for i, raw in enumerate(lines, 1):
        line = raw.rstrip()
        if not line.strip() or line.strip().startswith("<!--"):
            continue
        if line.strip().startswith("===TỰ KIỂM") or line.strip().startswith("===TU KIEM"):
            break
        h = re.match(r"^(#{1,6})\s+(.*)$", line)
        if h:
            cap, title = len(h.group(1)), sach(h.group(2))
            if not title:
                loi.append(f"{ten} dòng {i}: đề mục trống")
                continue
            if cap == 1:
                if root is not None:
                    loi.append(f"{ten} dòng {i}: mỗi file chỉ được một đề mục # (một chương)")
                    continue
                mc = re.match(r"^Chương\s+(\d+)\s*[.:]\s*(.+)$", title)
                if not mc:
                    loi.append(f"{ten} dòng {i}: đề mục # phải viết 'Chương N. Tên chương'")
                    return None, None
                if int(mc.group(1)) != so_file:
                    loi.append(f"{ten}: file chuong-{so_file:02d} nhưng đề mục ghi Chương {mc.group(1)}")
                    return None, None
                root = {"t": f"Chương {so_file}. {sach(mc.group(2))}"}
                stack, cur = [root], root
                continue
            if root is None:
                loi.append(f"{ten} dòng {i}: phải mở đầu bằng '# Chương N. Tên chương'")
                return None, None
            if cap - 1 > len(stack):
                loi.append(f"{ten} dòng {i}: nhảy cấp đề mục (từ {'#' * len(stack)} sang {'#' * cap}) ở '{title}'")
                continue
            title = SO_MUC.sub("", title)
            if DIEU.search(title):
                canh_bao.append(f"{ten} dòng {i}: tên đề mục có số điều luật — nên chuyển sang dòng CS: '{title}'")
            if len(title.split()) > 14:
                canh_bao.append(f"{ten} dòng {i}: tên đề mục dài ({len(title.split())} chữ), mind map sẽ khó đọc: '{title}'")
            node = {"t": title}
            del stack[cap - 1:]
            stack[-1].setdefault("c", []).append(node)
            stack.append(node)
            cur = node
            continue
        if cur is None:
            loi.append(f"{ten} dòng {i}: có nội dung trước đề mục '# Chương …'")
            return None, None
        cs = re.match(r"^\s*>?\s*CS\s*:\s*(.*)$", line)
        if cs:
            val = sach(cs.group(1))
            if "cs" in cur:
                canh_bao.append(f"{ten} dòng {i}: '{cur['t']}' có hơn một dòng CS — đã nối lại")
                cur["cs"] += "; " + val
            else:
                cur["cs"] = val
            continue
        b = re.match(r"^\s*[-*+•]\s+(.*)$", line)
        if b:
            val = sach(b.group(1))
        else:
            val = sach(line)
            canh_bao.append(f"{ten} dòng {i}: dòng không có dấu '- ' ở đầu, đã coi là một ý")
        if "[KIỂM TRA]" in val.upper() or "[KIEM TRA]" in val.upper():
            kiem.append(f"{ten} dòng {i}: {val}")
            val = re.sub(r"\s*\[(KIỂM TRA|KIEM TRA)\]\s*", " ", val, flags=re.I).strip()
        if val:
            cur.setdefault("b", []).append(val)
    if root is None:
        loi.append(f"{ten}: không có đề mục '# Chương N. Tên chương'")
        return None, None

    def soat(n, path_t):
        if not n.get("b") and not n.get("c"):
            canh_bao.append(f"{ten}: '{' › '.join(path_t)}' chưa có ý nội dung nào")
        if n is not root and "cs" not in n:
            canh_bao.append(f"{ten}: '{' › '.join(path_t)}' thiếu dòng CS")
        for k in n.get("c", []):
            soat(k, path_t + [k["t"]])
    soat(root, [root["t"]])
    for k in kiem:
        canh_bao.append("Còn [KIỂM TRA] (đã ẩn nhãn trên web, cần tra lại): " + k)
    return so_file, root



TIEN_TO_CHUONG = re.compile(r"^\s*(?:PHẦN\s+[IVXLC]+\.?\s*[^–—-]*[–—-]\s*)?(?:CHƯƠNG|Chương)?\s*[\dIVXLC]+\s*[.:]\s*", re.I)


def ten_chuong(t):
    return TIEN_TO_CHUONG.sub("", t, count=1).strip()


def chuan(n, goc=True):
    """Dạng chuẩn để so sánh hai nút: bỏ danh sách rỗng, bỏ khác biệt tiền tố tên chương."""
    out = {"t": (ten_chuong(n.get("t", "")) if goc else SO_MUC.sub("", sach(n.get("t", "")))).lower()}
    if n.get("cs"):
        out["cs"] = sach(n["cs"])
    if n.get("b"):
        out["b"] = [sach(x) for x in n["b"]]
    if n.get("c"):
        out["c"] = [chuan(k, False) for k in n["c"]]
    return out

# ---------- mind map ----------
def bo_cham(s):
    return s[:-1] if s.endswith(".") and not s.endswith("..") else s


Y_CON = re.compile(r"^([^:]{2,70}):\s+(.+)$")


def mm_node(n):
    out = {"t": n["t"]}
    kids = n.get("c", [])
    bs = n.get("b", [])
    # Ý dạng "Nhãn: nội dung" (từ 2 ý trở lên, tất cả cùng dạng) → tách thành nhánh con, như mẫu Luật Dân sự
    if not kids and len(bs) >= 2 and all(Y_CON.match(x) for x in bs):
        kids = [{"t": Y_CON.match(x).group(1).strip(), "b": [Y_CON.match(x).group(2).strip()[:1].upper() + Y_CON.match(x).group(2).strip()[1:]]} for x in bs]
        bs = []
    if kids:
        out["c"] = [mm_node(k) for k in kids]
        if any(k.get("c") for k in out["c"]):
            out["l"] = "row"
        elif len(kids) >= 5:
            out["l"] = "cols2"
        else:
            out["l"] = "stack"
    elif bs:
        out["d"] = " · ".join(bo_cham(x) for x in bs)
    return out


def rong(n):
    kids = n.get("c")
    if not kids:
        return 1
    l = n.get("l")
    if l == "row":
        return sum(rong(k) for k in kids)
    if l == "cols2":
        return 2
    return max(rong(k) for k in kids)


class Thuoc:
    """Đo bề rộng thực tế của một tờ mind map bằng trình duyệt ảo (cùng CSS của trang chủ).
    Không có trình duyệt thì ước lượng theo số cột."""
    RONG_TACH = 1500     # px: mục rộng hơn mức này thì tách thành nhiều tờ (theo mẫu Luật Dân sự)
    RONG_TOI_DA = 1720   # px: tờ gộp nhiều mục nhỏ không rộng quá mức này
    CAO_GOP_TOI_DA = 1150  # px, chỉ gộp các mục nhỏ khi tờ gộp không quá cao

    def __init__(self):
        self.page = None
        try:
            from playwright.sync_api import sync_playwright
            import shutil
            self._pw = sync_playwright().start()
            exe = shutil.which("google-chrome") or shutil.which("chromium")
            self._b = self._pw.chromium.launch(**({"executable_path": exe} if exe else {}))
            self.page = self._b.new_page(viewport={"width": 1366, "height": 900})
            self.page.goto(INDEX.as_uri())
            self.page.wait_for_function("typeof mmHTML==='function'", timeout=20000)
            self.page.evaluate("""()=>{const h=document.createElement('div');h.id='do-mm';h.className='mm-canvas';
              h.style.cssText='position:absolute;left:0;top:0;visibility:hidden;width:max-content';document.body.appendChild(h)}""")
        except Exception as e:  # không có trình duyệt: dùng ước lượng
            print("Ghi chú: không đo được bằng trình duyệt, dùng ước lượng số cột:", e)
            self.page = None

    def do(self, sheet):
        if self.page is None:
            w = sum(rong(x) for x in sheet["c"])
            return w * 285, 700
        return tuple(self.page.evaluate("""(m)=>{const h=document.getElementById('do-mm');h.innerHTML=mmHTML(m);
            return [h.scrollWidth,h.scrollHeight]}""", sheet))

    def dong(self):
        if self.page is not None:
            self._b.close()
            self._pw.stop()


def ten_to(ts):
    s = " · ".join(ts)
    if len(ts) > 1 and len(s) > 48:
        s = s[:46].rsplit(" ", 1)[0].rstrip(" ·") + " …"
    return s


def sinh_maps(ch_node, so, thuoc):
    ten_ch = ten_chuong(ch_node["t"])
    h1 = f"Chương {so}"
    muc = ch_node.get("c", [])
    if not muc:
        return [{"k": f"Sơ đồ Chương {so}", "h1": h1, "h2": ten_ch,
                 "c": [mm_node({"t": ten_ch, "b": ch_node.get("b", [])})]}]
    to = lambda nodes: {"k": "", "h1": h1, "h2": ten_ch, "c": nodes}
    don_vi = []  # (danh sách nút gốc, tên, có phải phần tách không)
    for m in muc:
        top = mm_node(m)
        if top.get("c"):
            top["l"] = "row"
        kids = top.get("c", [])
        if not kids or thuoc.do(to([top]))[0] <= thuoc.RONG_TACH:
            don_vi.append(([top], [m["t"]], None))
            continue
        nhom, cur = [], []
        for k in kids:
            thu = cur + [k]
            if cur and thuoc.do(to([{"t": top["t"], "l": "row", "c": thu}]))[0] > thuoc.RONG_TACH:
                nhom.append(cur)
                cur = [k]
            else:
                cur = thu
        if cur:
            nhom.append(cur)
        for p, g in enumerate(nhom, 1):
            don_vi.append(([{"t": top["t"], "l": "row", "c": g}], [m["t"]], f"({p}/{len(nhom)})"))
    # gộp các mục nhỏ liền nhau vào chung một tờ
    maps, i = [], 0
    while i < len(don_vi):
        nodes, ts, phan = don_vi[i]
        nodes, ts = list(nodes), list(ts)
        j = i + 1
        while phan is None and j < len(don_vi) and don_vi[j][2] is None:
            w, h = thuoc.do(to(nodes + don_vi[j][0]))
            if w > thuoc.RONG_TOI_DA or h > thuoc.CAO_GOP_TOI_DA:
                break
            nodes += don_vi[j][0]
            ts += don_vi[j][1]
            j += 1
        ten = ten_to(ts) + (f" {phan}" if phan else "")
        sheet = to(nodes)
        if phan:
            sheet["h3"] = f"{ts[0]} (phần {phan[1:-1]})"
        sheet["k"] = f"{len(maps) + 1}. {ten}" if len(don_vi) > 1 else f"Sơ đồ Chương {so}"
        maps.append(sheet)
        i = j
    if len(maps) == 1:
        maps[0]["k"] = f"Sơ đồ Chương {so}"
    return maps


# ---------- ghi vào web ----------
def main():
    chi_kiem = "--kiem" in sys.argv
    if not SRC.is_dir():
        print("Không có thư mục noi-dung/ — không có gì để xây dựng.")
        return 0
    index = INDEX.read_text(encoding="utf-8")
    index_moi = index
    ghi = {}
    thuoc = None
    for hp_dir in sorted(p for p in SRC.iterdir() if p.is_dir()):
        hp_id = hp_dir.name
        files = sorted(hp_dir.glob("*.md"))
        files = [f for f in files if f.name.lower() != "readme.md"]
        if not files:
            continue
        hp_file = ROOT / "hp" / f"{hp_id}.html"
        tl_re = re.compile(r'^TL\["' + re.escape(hp_id) + r'"\]=(\{.*\});$', re.M)
        tl_m = tl_re.search(index_moi)
        if not hp_file.exists():
            loi.append(f"{hp_id}: chưa có trang hp/{hp_id}.html — học phần mới cần Claude tạo trang khung trước")
            continue
        if not tl_m:
            loi.append(f"{hp_id}: index.html chưa có mục mind map cho học phần này — cần Claude thêm trước")
            continue
        chuong, cb_chuong = {}, {}
        for f in files:
            so, node, cb = doc_chuong(f, hp_id)
            if node:
                if so in chuong:
                    loi.append(f"{hp_id}: có hai file cùng là Chương {so}")
                chuong[so] = node
                cb_chuong[so] = cb
        if not chuong:
            continue
        html = hp_file.read_text(encoding="utf-8")
        pm = PN_DATA.search(html)
        if not pm:
            loi.append(f"{hp_id}: không tìm thấy khối dữ liệu pn-data trong hp/{hp_id}.html")
            continue
        try:
            data = json.loads(pm.group(2))
        except json.JSONDecodeError as e:
            loi.append(f"{hp_id}: khối dữ liệu hp/{hp_id}.html đang hỏng ({e}) — báo Claude")
            continue
        ly = data.get("ly") or {"root": data.get("meta", {}).get("name", hp_id), "ch": []}
        ly.setdefault("ch", [])
        tl = json.loads(tl_m.group(1))
        tl.setdefault("chapters", [])
        doi = []
        for so in sorted(chuong):
            node = chuong[so]
            i = so - 1
            if i < len(ly["ch"]):
                if chuan(ly["ch"][i]) == chuan(node):
                    continue  # chương không đổi: giữ nguyên Tóm tắt và mind map hiện có
                ly["ch"][i] = node
            elif i == len(ly["ch"]):
                ly["ch"].append(node)
            else:
                loi.append(f"{hp_id}: có Chương {so} nhưng chưa có Chương {len(ly['ch']) + 1} — viết các chương theo thứ tự")
                continue
            doi.append(so)
            canh_bao.extend(cb_chuong[so])
        if not doi:
            continue
        data["ly"] = ly
        new_json = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        ghi[hp_file] = html[:pm.start(2)] + new_json + html[pm.end(2):]
        if thuoc is None:
            thuoc = Thuoc()
        for so in doi:
            node = chuong[so]
            ten = ten_chuong(node["t"])
            maps = sinh_maps(node, so, thuoc)
            c = next((x for x in tl["chapters"] if x.get("n") == so), None)
            if c is None:
                tl["chapters"].append({"n": so, "t": ten, "maps": maps})
            else:
                c["t"] = ten
                c["maps"] = maps
            da_lam.append(f"{hp_id} · Chương {so}. {ten} — {len(maps)} tờ mind map")
        tl["chapters"].sort(key=lambda x: x.get("n", 999))
        tl_str = json.dumps(tl, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
        index_moi = index_moi[:tl_m.start(1)] + tl_str + index_moi[tl_m.end(1):]
    if thuoc is not None:
        thuoc.dong()
    if index_moi != index:
        ghi[INDEX] = index_moi

    ok = not loi
    if ok and not chi_kiem:
        for p, s in ghi.items():
            p.write_text(s, encoding="utf-8")
    viet_bao_cao(ok, chi_kiem)
    for x in loi:
        print("LỖI:", x)
    for x in canh_bao:
        print("Cảnh báo:", x)
    for x in da_lam:
        print("Đã dựng:", x)
    return 0 if ok else 1


def viet_bao_cao(ok, chi_kiem):
    now = datetime.now(timezone(timedelta(hours=7))).strftime("%H:%M %d/%m/%Y")
    out = [f"# Kết quả dựng nội dung — {now}", ""]
    if ok:
        out.append("**Bước 1/2 (đọc nội dung): ĐẠT.** Bước 2 (chạy thử hiển thị) xem ở mục cuối file này." if not chi_kiem else "**Soát định dạng: ĐẠT.**")
    else:
        out.append("**KHÔNG ĐẠT — web giữ nguyên bản cũ.** Sửa các LỖI dưới đây trong file nội dung rồi đẩy lại.")
    if loi:
        out += ["", "## LỖI (phải sửa)", ""] + [f"- {x}" for x in loi]
    if canh_bao:
        out += ["", "## Cảnh báo (nên sửa, không chặn đăng)", ""] + [f"- {x}" for x in canh_bao]
    if da_lam:
        out += ["", "## Đã dựng", ""] + [f"- {x}" for x in da_lam]
    (SRC / "KET-QUA.md").write_text("\n".join(out) + "\n", encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
