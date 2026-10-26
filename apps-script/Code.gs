/**
 * PHÚC NGUYÊN LIBRARY – Máy chủ mã lớp, lượt truy cập và góp ý
 * Chạy trên Google Apps Script, lưu dữ liệu trong chính Google Sheet này.
 *
 * Cài đặt (làm một lần):
 * 1. Đổi MAT_KHAU_QUAN_LY bên dưới thành mật khẩu riêng của sếp.
 * 2. Chọn hàm caiDat ở thanh công cụ, bấm Chạy (Run), cho phép quyền truy cập.
 * 3. Triển khai (Deploy) > Tùy chọn triển khai mới (New deployment) > Loại: Ứng dụng web (Web app)
 *    - Thực thi với tư cách (Execute as): Tôi (Me)
 *    - Ai có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
 * 4. Sao chép đường link Ứng dụng web (kết thúc bằng /exec) gửi cho Claude.
 */
const MAT_KHAU_QUAN_LY = "doi-mat-khau-nay";

const SH_MA = "MaLop", SH_LUOT = "LuotDung", SH_GOPY = "GopY";

function caiDat() {
  const ss = SpreadsheetApp.getActive();
  const tao = (ten, cot) => {
    let sh = ss.getSheetByName(ten);
    if (!sh) sh = ss.insertSheet(ten);
    if (sh.getLastRow() === 0) { sh.appendRow(cot); sh.setFrozenRows(1); sh.getRange(1, 1, 1, cot.length).setFontWeight("bold"); }
    return sh;
  };
  tao(SH_MA, ["Mã", "Ghi chú (lớp)", "Hạn dùng", "Số người tối đa", "Ngày tạo"]);
  tao(SH_LUOT, ["Mã", "Thiết bị", "Thời điểm"]);
  tao(SH_GOPY, ["Thời điểm", "Học phần", "Nội dung", "Mã lớp"]);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  let out;
  try { out = xuLy(p); } catch (err) { out = { ok: false, why: "error", msg: String(err) }; }
  const json = JSON.stringify(out);
  if (p.callback && /^[A-Za-z_$][\w$]{0,40}$/.test(p.callback)) {
    return ContentService.createTextOutput(p.callback + "(" + json + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function chuanMa(s) { return String(s || "").trim().toUpperCase().replace(/\s+/g, ""); }
function sh(ten) { return SpreadsheetApp.getActive().getSheetByName(ten); }
function dongDuLieu(ten) { const s = sh(ten); const n = s.getLastRow(); return n < 2 ? [] : s.getRange(2, 1, n - 1, s.getLastColumn()).getValues(); }
function ngayISO(d) { return Utilities.formatDate(new Date(d), "Asia/Ho_Chi_Minh", "yyyy-MM-dd"); }
function hetHan(han) { return ngayISO(new Date()) > ngayISO(han); }
function demLuot(ma) { return dongDuLieu(SH_LUOT).filter(r => chuanMa(r[0]) === ma).length; }

function xuLy(p) {
  const a = p.action;
  if (a === "check") return kiemTraMa(chuanMa(p.code), String(p.dev || "").slice(0, 64));
  if (a === "stats") return { ok: true, users: dongDuLieu(SH_LUOT).length, feedback: dongDuLieu(SH_GOPY).length };
  if (a === "fb_list") return { ok: true, items: dongDuLieu(SH_GOPY).map(r => ({ time: ngayISO(r[0]), course: r[1], text: r[2] })) };
  if (a === "fb_add") {
    const text = String(p.text || "").trim().slice(0, 1500);
    if (text.length < 3) return { ok: false, why: "empty" };
    sh(SH_GOPY).appendRow([new Date(), String(p.course || "").slice(0, 80), text, chuanMa(p.code).slice(0, 30)]);
    return { ok: true };
  }
  if (String(a || "").indexOf("admin_") === 0) {
    if (String(p.key || "") !== MAT_KHAU_QUAN_LY) return { ok: false, why: "key" };
    if (a === "admin_list") {
      const luot = dongDuLieu(SH_LUOT);
      return { ok: true, items: dongDuLieu(SH_MA).map(r => { const ma = chuanMa(r[0]); return { code: ma, note: r[1], han: ngayISO(r[2]), max: Number(r[3]) || 0, used: luot.filter(x => chuanMa(x[0]) === ma).length, created: r[4] ? ngayISO(r[4]) : "" }; }) };
    }
    if (a === "admin_create") {
      const ma = chuanMa(p.code), han = String(p.han || ""), max = parseInt(p.max, 10);
      if (!/^[A-Z0-9][A-Z0-9-]{2,23}$/.test(ma)) return { ok: false, why: "badcode" };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(han)) return { ok: false, why: "badhan" };
      if (!(max >= 1 && max <= 1000)) return { ok: false, why: "badmax" };
      const lock = LockService.getScriptLock(); lock.waitLock(10000);
      try {
        if (dongDuLieu(SH_MA).some(r => chuanMa(r[0]) === ma)) return { ok: false, why: "exists" };
        sh(SH_MA).appendRow([ma, String(p.note || "").slice(0, 80), han, max, new Date()]);
      } finally { lock.releaseLock(); }
      return { ok: true };
    }
    if (a === "admin_delete") {
      const ma = chuanMa(p.code);
      const lock = LockService.getScriptLock(); lock.waitLock(10000);
      try { xoaDong(SH_MA, ma); xoaDong(SH_LUOT, ma); } finally { lock.releaseLock(); }
      return { ok: true };
    }
    if (a === "admin_fb_delete") {
      const s = sh(SH_GOPY), row = parseInt(p.row, 10);
      if (row >= 2 && row <= s.getLastRow()) s.deleteRow(row);
      return { ok: true };
    }
  }
  return { ok: false, why: "action" };
}

function xoaDong(ten, ma) {
  const s = sh(ten), v = dongDuLieu(ten);
  for (let i = v.length - 1; i >= 0; i--) if (chuanMa(v[i][0]) === ma) s.deleteRow(i + 2);
}

function kiemTraMa(ma, dev) {
  if (!ma || !dev) return { ok: false, why: "notfound" };
  const row = dongDuLieu(SH_MA).find(r => chuanMa(r[0]) === ma);
  if (!row) return { ok: false, why: "notfound" };
  const han = ngayISO(row[2]), max = Number(row[3]) || 0;
  if (hetHan(row[2])) return { ok: false, why: "expired", han };
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const luot = dongDuLieu(SH_LUOT).filter(r => chuanMa(r[0]) === ma);
    if (luot.some(r => String(r[1]) === dev)) return { ok: true, han, note: row[1], used: luot.length, max };
    if (luot.length >= max) return { ok: false, why: "full", max };
    sh(SH_LUOT).appendRow([ma, dev, new Date()]);
    return { ok: true, han, note: row[1], used: luot.length + 1, max };
  } finally { lock.releaseLock(); }
}
