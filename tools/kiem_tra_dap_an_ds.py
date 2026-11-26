#!/usr/bin/env python3
"""Kiểm tra đáp án tự luận Luật Dân sự TRƯỚC KHI đăng web (thêm 26/11/2026 sau sự cố đáp án lệch câu).

Cách chạy (khóa KHÔNG để trong repo):
    PNL_KHOA_DS=XXXX-XXXX-XXXX-XXXX python3 tools/kiem_tra_dap_an_ds.py
Thoát mã 1 nếu có LỖI -> không được đăng. CẢNH BÁO thì người soạn đọc lại bằng mắt.

Kiểm:
  1. Giải mã được, đúng phiên bản DAP_AN_VER trong danh-gia/tu-luan-luat-dan-su.html.
  2. Mỗi tình huống cốt lõi có trường "questions" TRÙNG KHÍT 4 yêu cầu trong ngân hàng đề (chống lệch câu).
  3. Đủ 4 đáp án, mỗi đáp án có dẫn "Điều", không còn tiền tố "Định hướng đáp án / phân hóa trường hợp".
  4. Tên người, số tuổi, năm nêu trong đáp án phải có trong đề (chống sót dữ kiện của tình huống khác).
  5. Cảnh báo: đáp án ý j "giống" yêu cầu khác hơn yêu cầu j.
"""
import base64, json, os, re, sys, zlib
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
except ImportError:
    sys.exit("Cần: pip install cryptography")

GOC = Path(__file__).resolve().parent.parent / "danh-gia"
HTML = (GOC / "tu-luan-luat-dan-su.html").read_text(encoding="utf-8")
CORE = json.loads(re.search(r"const CORE_IDS=(\[[^\]]*\])", HTML).group(1))
VER = re.search(r'const DAP_AN_VER="([^"]+)"', HTML).group(1)

U = "A-ZĐÂĂÊÔƠƯÁÀẢÃẠẤẦẨẪẬẮẰẲẴẶÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ"
DANH_XUNG = r"(?:anh|chị|ông|bà|cụ|cháu|em|bé|Anh|Chị|Ông|Bà|Cụ|Cháu)"
NAM_LUAT = {str(y) for y in range(1990, 2027)}  # năm ban hành văn bản, mốc 01/01/2017...
STOP = set("xac dinh cua cac va la co khong duoc theo nguoi nay do thi neu khi phai trong hoac voi mot hai".split())


def kd(s):
    import unicodedata
    s = unicodedata.normalize("NFD", s.lower()).replace("đ", "d")
    return re.sub(r"[̀-ͯ]", "", s)


def tu(s):
    return {w for w in re.findall(r"[a-z]{3,}", kd(s)) if w not in STOP}


def giai_ma(path, khoa):
    c = json.loads(path.read_text())
    k = PBKDF2HMAC(hashes.SHA256(), 32, base64.b64decode(c["salt"]), c["rounds"]).derive(khoa.encode())
    p = AESGCM(k).decrypt(base64.b64decode(c["iv"]), base64.b64decode(c["payload"]), None)
    return json.loads(zlib.decompress(p))


def ngan_hang():
    b = base64.b64decode((GOC / "de/luat-dan-su-tu-luan.b64").read_text().strip())
    return {c["id"]: c for c in json.loads(zlib.decompress(b))["cases"]}


def main():
    khoa = os.environ.get("PNL_KHOA_DS") or (sys.argv[1] if len(sys.argv) > 1 else "")
    if not khoa:
        sys.exit("Thiếu khóa: đặt PNL_KHOA_DS")
    d = giai_ma(GOC / "de/luat-dan-su-tu-luan-rubric.enc.json", khoa)
    bank = ngan_hang()
    loi, canh = [], []
    if d.get("version") != VER:
        loi.append(f"Phiên bản đáp án {d.get('version')} khác DAP_AN_VER {VER} trong trang")
    rc = {c["id"]: c for c in d.get("cases", [])}
    for cid in CORE:
        c, q = rc.get(cid), bank.get(cid)
        if not c or not q:
            loi.append(f"{cid}: thiếu trong đáp án hoặc ngân hàng"); continue
        if c.get("questions") != q["questions"]:
            loi.append(f"{cid}: trường questions không trùng khít 4 yêu cầu của đề"); continue
        a = c.get("answers") or []
        if len(a) != 4:
            loi.append(f"{cid}: không đủ 4 đáp án"); continue
        de = q["text"]
        for j, s in enumerate(a, 1):
            if len(s) < 120: loi.append(f"{cid} ý {j}: đáp án quá ngắn")
            if "Điều" not in s: loi.append(f"{cid} ý {j}: không dẫn điều luật")
            if re.search(r"định hướng đáp án|phân hóa trường hợp", s, re.I): loi.append(f"{cid} ý {j}: còn tiền tố cũ")
            for t in re.findall(DANH_XUNG + r"\s+([" + U + r"][\wÀ-ỹ]*\d?)", s) + re.findall(r"(?<=[\s(])([" + U + r"]\d?)(?=[\s,.;)])", s):
                if not re.search(r"(?<![\wÀ-ỹ])" + re.escape(t) + r"(?![\wÀ-ỹ])", de):
                    loi.append(f"{cid} ý {j}: tên '{t}' không có trong đề")
            for n in re.findall(r"(\d+)\s*tuổi", s):
                if n + " tuổi" not in de and n not in ("15", "6", "9", "18"):
                    loi.append(f"{cid} ý {j}: '{n} tuổi' không có trong đề")
            for y in re.findall(r"(?<!\d)((?:19|20)\d\d)(?!\d)", s):
                if y not in de and y not in NAM_LUAT and int(y) < 2030:
                    loi.append(f"{cid} ý {j}: năm {y} không có trong đề")
        # tên riêng của nhân vật trong đề phải xuất hiện ít nhất một lần trong 4 đáp án
        nv = set(re.findall(r"(?<=[^.!?;:]\s)([" + U + r"][a-zà-ỹ]+)(?=[\s,.;])", de)) - {"Tòa", "Nhà", "Ngân"}  # từ viết hoa giữa câu = tên riêng
        thieu = [x for x in nv if x not in " ".join(a)]
        if thieu: canh.append(f"{cid}: đáp án không nhắc tới {thieu}")
        # lệch ý: đáp án j giống yêu cầu khác hơn yêu cầu j
        Q = [tu(x) for x in q["questions"]]
        for j, s in enumerate(a):
            T = tu(s); sc = [len(T & x) / (len(x) or 1) for x in Q]
            if sc[j] == 0 or sc[j] < max(sc) - 0.5: canh.append(f"{cid} ý {j+1}: nội dung gần yêu cầu {sc.index(max(sc))+1} hơn (kiểm bằng mắt)")
    for x in loi: print("LỖI     ", x)
    for x in canh: print("CẢNH BÁO", x)
    print(f"Đã kiểm {len(CORE)} tình huống cốt lõi · phiên bản {d.get('version')} · {len(loi)} lỗi, {len(canh)} cảnh báo")
    sys.exit(1 if loi else 0)


if __name__ == "__main__":
    main()
