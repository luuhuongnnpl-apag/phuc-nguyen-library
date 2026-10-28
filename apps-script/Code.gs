/**
 * PHÚC NGUYÊN LIBRARY – Máy chủ mã truy cập, lượt dùng và góp ý.
 * Quản trị xác thực bằng Script Properties và token phiên ngắn hạn.
 * Sau khi cập nhật mã: chạy caiDat(); chạy caiDatMatKhauQuanLy(); sau đó cập nhật deployment Web app.
 */
const SH_MA = "MaLop", SH_LUOT = "LuotDung", SH_GOPY = "GopY";
const COURSES = [
  "luat-dan-su", "to-tung-dan-su", "luat-hinh-su", "to-tung-hinh-su",
  "luat-hanh-chinh", "to-tung-hanh-chinh", "luat-doanh-nghiep",
  "so-huu-tri-tue", "luat-dat-dai", "cong-chung-chung-thuc",
  "ky-nang-tu-van", "luat-dau-tu", "luat-thuong-mai", "dam-phan-hop-dong"
];
const ADMIN_HASH_KEY = "PNLIB_ADMIN_PASSWORD_SHA256";
const ADMIN_TOKEN_PREFIX = "pnlib-admin-session-";
const ADMIN_SESSION_SECONDS = 14400;

function caiDat() {
  const ss = SpreadsheetApp.getActive();
  const tao = (ten, cot) => {
    let s = ss.getSheetByName(ten);
    if (!s) s = ss.insertSheet(ten);
    if (s.getLastRow() === 0) {
      s.appendRow(cot);
      s.setFrozenRows(1);
      s.getRange(1, 1, 1, cot.length).setFontWeight("bold");
    }
    return s;
  };
  const sm = tao(SH_MA, ["Mã", "Ghi chú (lớp)", "Hạn dùng", "Số người tối đa", "Ngày tạo", "Phạm vi học phần"]);
  tao(SH_LUOT, ["Mã", "Thiết bị", "Thời điểm"]);
  tao(SH_GOPY, ["Thời điểm", "Học phần", "Nội dung", "Mã lớp"]);
  // Giữ nguyên các dòng mã cũ; thêm cột phạm vi mà không xóa dữ liệu.
  if (sm.getLastColumn() < 6) {
    sm.getRange(1, 6).setValue("Phạm vi học phần");
    sm.getRange(1, 6).setFontWeight("bold");
  }
}

function caiDatMatKhauQuanLy() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt(
    "Thiết lập mật khẩu quản lý Phúc Nguyên Library",
    "Nhập mật khẩu mới (ít nhất 12 ký tự). Mật khẩu được lưu dưới dạng SHA-256 trong Script Properties.",
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const pw = String(res.getResponseText() || "");
  if (pw.length < 12) {
    ui.alert("Mật khẩu chưa đủ mạnh. Hãy dùng ít nhất 12 ký tự rồi chạy lại hàm.");
    return;
  }
  PropertiesService.getScriptProperties().setProperty(ADMIN_HASH_KEY, bamMatKhau_(pw));
  CacheService.getScriptCache().removeAll([]);
  ui.alert("Đã đặt mật khẩu quản lý mới. Hãy cập nhật phiên bản Web app trong Deploy > Manage deployments để kích hoạt mã nguồn mới.");
}

function bamMatKhau_(s) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
  return bytes.map(b => ("0" + ((b + 256) % 256).toString(16)).slice(-2)).join("");
}
function bangNhau_(a, b) {
  a = String(a || ""); b = String(b || "");
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
function taoTokenQuanLy_() {
  return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
}
function tokenHopLe_(token) {
  if (!token || !/^[a-f0-9]{50,80}$/i.test(String(token))) return false;
  return CacheService.getScriptCache().get(ADMIN_TOKEN_PREFIX + token) === "1";
}
function chuanMa(s) { return String(s || "").trim().toUpperCase().replace(/\s+/g, ""); }
function sh(ten) { return SpreadsheetApp.getActive().getSheetByName(ten); }
function dongDuLieu(ten) {
  const s = sh(ten);
  if (!s || s.getLastRow() < 2) return [];
  const cols = Math.max(1, s.getLastColumn());
  return s.getRange(2, 1, s.getLastRow() - 1, cols).getValues();
}
function ngayISO(d) {
  if (!d) return "";
  return Utilities.formatDate(new Date(d), "Asia/Ho_Chi_Minh", "yyyy-MM-dd");
}
function hetHan(han) { return ngayISO(new Date()) > ngayISO(han); }
function validISODate_(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""))) return false; const d = new Date(String(s) + "T12:00:00+07:00"); return !isNaN(d.getTime()) && Utilities.formatDate(d, "Asia/Ho_Chi_Minh", "yyyy-MM-dd") === s; }
function demLuot(ma) { return dongDuLieu(SH_LUOT).filter(r => chuanMa(r[0]) === ma).length; }
function phamVi_(raw) {
  if (raw === null || raw === undefined || String(raw).trim() === "" || String(raw).trim() === "*") return ["*"];
  let xs = Array.isArray(raw) ? raw : String(raw).split(",");
  xs = [...new Set(xs.map(x => String(x || "").trim()).filter(Boolean))];
  if (!xs.length) return [];
  if (xs.includes("*")) return ["*"];
  return xs.filter(x => COURSES.includes(x));
}
function nhanPhamVi_(raw) {
  const xs = phamVi_(raw);
  return xs.length ? xs : [];
}
function xuLy(p) {
  const a = p.action;
  if (a === "check") return kiemTraMa(chuanMa(p.code), String(p.dev || "").slice(0, 100), String(p.course || "").trim());
  if (a === "stats") return { ok: true, users: dongDuLieu(SH_LUOT).length, feedback: dongDuLieu(SH_GOPY).length };
  if (a === "fb_list") return { ok: true, items: dongDuLieu(SH_GOPY).map(r => ({ time: ngayISO(r[0]), course: r[1], text: r[2] })) };
  if (a === "fb_add") {
    const text = String(p.text || "").trim().slice(0, 1500);
    if (text.length < 3) return { ok: false, why: "empty" };
    sh(SH_GOPY).appendRow([new Date(), String(p.course || "").slice(0, 80), text, chuanMa(p.code).slice(0, 30)]);
    return { ok: true };
  }
  if (a === "admin_login") {
    const expected = PropertiesService.getScriptProperties().getProperty(ADMIN_HASH_KEY);
    if (!expected) return { ok: false, why: "setup" };
    if (!bangNhau_(bamMatKhau_(String(p.key || "")), expected)) return { ok: false, why: "key" };
    const token = taoTokenQuanLy_();
    CacheService.getScriptCache().put(ADMIN_TOKEN_PREFIX + token, "1", ADMIN_SESSION_SECONDS);
    return { ok: true, token: token, expiresIn: ADMIN_SESSION_SECONDS };
  }
  if (String(a || "").indexOf("admin_") === 0) {
    if (!tokenHopLe_(p.token)) return { ok: false, why: "key" };
    if (a === "admin_list") {
      const luot = dongDuLieu(SH_LUOT);
      return {
        ok: true,
        items: dongDuLieu(SH_MA).map(r => {
          const ma = chuanMa(r[0]);
          const scope = phamVi_(r.length > 5 ? r[5] : "");
          return {
            code: ma, note: r[1], han: ngayISO(r[2]), max: Number(r[3]) || 0,
            used: luot.filter(x => chuanMa(x[0]) === ma).length,
            created: r[4] ? ngayISO(r[4]) : "",
            courses: scope.length ? scope : ["*"]
          };
        })
      };
    }
    if (a === "admin_create") {
      let ma = chuanMa(p.code);
      const han = String(p.han || "");
      const max = parseInt(p.max, 10);
      const rawScope = String(p.courses || "").trim();
      if (!rawScope) return { ok: false, why: "badcourses" };
      const scope = phamVi_(rawScope);
      if (!ma) ma = "PN-" + Utilities.getUuid().replace(/-/g, "").slice(0, 12).toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9-]{2,23}$/.test(ma)) return { ok: false, why: "badcode" };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(han) || !validISODate_(han)) return { ok: false, why: "badhan" };
      if (han < ngayISO(new Date())) return { ok: false, why: "badhan" };
      if (!(max >= 1 && max <= 1000)) return { ok: false, why: "badmax" };
      if (!scope.length || (rawScope !== "*" && scope.length !== rawScope.split(",").filter(Boolean).length)) return { ok: false, why: "badcourses" };
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        if (dongDuLieu(SH_MA).some(r => chuanMa(r[0]) === ma)) return { ok: false, why: "exists" };
        sh(SH_MA).appendRow([ma, String(p.note || "").slice(0, 80), han, max, new Date(), scope.includes("*") ? "*" : scope.join(",")]);
      } finally { lock.releaseLock(); }
      return { ok: true, code: ma, courses: scope };
    }
    if (a === "admin_delete") {
      const ma = chuanMa(p.code);
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try { xoaDong(SH_MA, ma); xoaDong(SH_LUOT, ma); } finally { lock.releaseLock(); }
      return { ok: true };
    }
    if (a === "admin_fb_delete") {
      const s = sh(SH_GOPY), row = parseInt(p.row, 10);
      if (s && row >= 2 && row <= s.getLastRow()) s.deleteRow(row);
      return { ok: true };
    }
  }
  return { ok: false, why: "action" };
}

function xoaDong(ten, ma) {
  const s = sh(ten), v = dongDuLieu(ten);
  if (!s) return;
  for (let i = v.length - 1; i >= 0; i--) if (chuanMa(v[i][0]) === ma) s.deleteRow(i + 2);
}
function kiemTraMa(ma, dev, course) {
  if (!ma || !dev) return { ok: false, why: "notfound" };
  const rows = dongDuLieu(SH_MA);
  const row = rows.find(r => chuanMa(r[0]) === ma);
  if (!row) return { ok: false, why: "notfound" };
  const han = ngayISO(row[2]), max = Number(row[3]) || 0;
  const courses = phamVi_(row.length > 5 ? row[5] : "");
  if (hetHan(row[2])) return { ok: false, why: "expired", han: han };
  if (course && courses.length && !courses.includes("*") && !courses.includes(course)) {
    return { ok: false, why: "course", courses: courses };
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const luot = dongDuLieu(SH_LUOT).filter(r => chuanMa(r[0]) === ma);
    if (luot.some(r => String(r[1]) === dev)) {
      return { ok: true, han: han, note: row[1], used: luot.length, max: max, courses: courses.length ? courses : ["*"] };
    }
    if (luot.length >= max) return { ok: false, why: "full", max: max };
    sh(SH_LUOT).appendRow([ma, dev, new Date()]);
    return { ok: true, han: han, note: row[1], used: luot.length + 1, max: max, courses: courses.length ? courses : ["*"] };
  } finally { lock.releaseLock(); }
}
function doGet(e) {
  const p = (e && e.parameter) || {};
  let out;
  try { out = xuLy(p); } catch (err) { out = { ok: false, why: "error", msg: "Không xử lý được yêu cầu." }; }
  const json = JSON.stringify(out);
  if (p.callback && /^[A-Za-z_$][\w$]{0,40}$/.test(p.callback)) {
    return ContentService.createTextOutput(p.callback + "(" + json + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
