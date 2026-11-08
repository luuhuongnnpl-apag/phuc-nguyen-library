/* Quản trị Đánh giá định kỳ – giao diện thống nhất theo kiểu APAG UniTeach (08/11/2026).
   Dùng chung cho mọi học phần: index.html#quan-tri (quản trị chung) và tu-luan-luat-dan-su.html#quan-tri.
   - Khung: cột menu trái có biểu tượng, thanh đường dẫn + nút thao tác màu (Import excel / Export excel / Khóa…), bộ lọc, lưới.
   - Danh sách sinh viên của lớp = bảng điểm (STT · Mã SV · Họ tên · Ngày sinh · Điểm quá trình: Kiểm tra định kỳ · Bài làm · Ghi chú);
     Sửa / Xóa / Mở lại lượt nằm ở cột Ghi chú cuối cùng.
   - Xuất Excel đúng mẫu "Bảng điểm quá trình" của APAG, hoặc điền thẳng điểm vào file Export excel tải từ APAG để Import lại. */
(function(){
"use strict";
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const pad=n=>String(n).padStart(2,"0");
const strip=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();
const fnum=x=>x==null||x===""?"":String(x).replace(".",",");
const P='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const ICON={
  home:P+'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  list:P+'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
  plus:P+'<path d="M12 5v14M5 12h14"/></svg>',
  sheet:P+'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  chart:P+'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  cog:P+'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  up:P+'<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>',
  down:P+'<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/></svg>',
  lock:P+'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock:P+'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
  user:P+'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  users:P+'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .8 3.4 2.6 4 5.2"/></svg>',
  book:P+'<path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M4 16a4 4 0 0 1 4-4h10"/></svg>',
  out:P+'<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/></svg>',
  menu:P+'<path d="M3 6h18M3 12h18M3 18h12"/></svg>',
  refresh:P+'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
  file:P+'<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 14l2 2 4-4"/></svg>'
};
const CSS=`
body.qta-on{background:var(--qa-bg)!important}
body.qta-on>header,body.qta-on>footer{display:none!important}
body.qta-on #app{max-width:none!important;margin:0!important;padding:0!important}
.qta{--qa-bg:#f4f6fa;--qa-paper:#fff;--qa-ink:#1f2937;--qa-muted:#6b7280;--qa-line:#e5e7eb;--qa-head:#f8fafc;--qa-blue:#1677ff;--qa-blue-soft:#e6f0ff;--qa-navy:#1d5677;
  --qa-green:#28a745;--qa-green2:#1e6f3a;--qa-red:#f05252;--qa-amber:#b7791f;--qa-amber-soft:#fff6e0;--qa-ok-soft:#e7f6ec;--qa-bad-soft:#fdecec;
  font:14px/1.5 "Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--qa-ink);background:var(--qa-bg);min-height:100vh;display:grid;grid-template-columns:232px 1fr;grid-template-rows:56px 1fr}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .qta{--qa-bg:#0f1520;--qa-paper:#161e2c;--qa-ink:#e5e9f0;--qa-muted:#9aa6b8;--qa-line:#2a3548;--qa-head:#1b2536;--qa-blue:#5b9dff;--qa-blue-soft:#1b2c48;--qa-ok-soft:#163323;--qa-bad-soft:#3a1d1d;--qa-amber-soft:#33290f;--qa-amber:#e8c06a}}
:root[data-theme="dark"] .qta{--qa-bg:#0f1520;--qa-paper:#161e2c;--qa-ink:#e5e9f0;--qa-muted:#9aa6b8;--qa-line:#2a3548;--qa-head:#1b2536;--qa-blue:#5b9dff;--qa-blue-soft:#1b2c48;--qa-ok-soft:#163323;--qa-bad-soft:#3a1d1d;--qa-amber-soft:#33290f;--qa-amber:#e8c06a}
body.qta-on{--qa-bg:#f4f6fa}
.qta *{box-sizing:border-box}
.qta .qta-top{grid-column:1/-1;margin:0;color:var(--qa-ink);display:flex;align-items:center;gap:14px;background:var(--qa-paper);border-bottom:1px solid var(--qa-line);padding:0 16px;position:sticky;top:0;z-index:30}
.qta-brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--qa-navy);min-width:200px}
.qta-brand img{width:34px;height:34px;border-radius:50%;background:#fff;border:1px solid var(--qa-line)}
.qta-brand b{font:800 16px/1.1 Merriweather,Georgia,serif;letter-spacing:.01em;color:var(--qa-navy)}
.qta-brand small{display:block;font:600 11px/1.2 inherit;color:var(--qa-muted);letter-spacing:.04em;text-transform:uppercase}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .qta-brand b{color:#9cc4e6}}
.qta-burger{display:none;background:none;border:0;color:var(--qa-ink);padding:6px;margin:0;cursor:pointer}
.qta-user{margin-left:auto;display:flex;align-items:center;gap:10px;color:var(--qa-muted)}
.qta-user .av{width:30px;height:30px;border-radius:50%;background:var(--qa-line);display:grid;place-items:center;color:var(--qa-muted)}
.qta-user button{background:none;border:1px solid var(--qa-line);color:var(--qa-ink);border-radius:6px;padding:5px 9px;margin:0;font:500 13px inherit;cursor:pointer;display:flex;gap:6px;align-items:center}
.qta-side{background:var(--qa-paper);border-right:1px solid var(--qa-line);padding:10px 0 30px;position:sticky;top:56px;height:calc(100vh - 56px);overflow:auto}
.qta-side .grp{font:700 11px/1 inherit;text-transform:uppercase;letter-spacing:.06em;color:var(--qa-muted);padding:16px 22px 6px}
.qta-side a{display:flex;align-items:center;gap:12px;padding:10px 22px;color:var(--qa-ink);text-decoration:none;font-size:14.5px;border-left:3px solid transparent}
.qta-side a.sub{padding-left:40px;font-size:14px}
.qta-side a:hover{background:var(--qa-head)}
.qta-side a.on{color:var(--qa-blue);background:var(--qa-blue-soft);border-left-color:var(--qa-blue);font-weight:600}
.qta .qta-main{max-width:none;margin:0;padding:0 0 40px;min-width:0;display:block}
.qta-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--qa-paper);border-bottom:1px solid var(--qa-line);padding:10px 18px;position:sticky;top:56px;z-index:20}
.qta-crumb{flex:1 1 320px;color:var(--qa-muted);font-size:15px;min-width:0}
.qta-crumb a{color:var(--qa-muted);text-decoration:none}.qta-crumb a:hover{color:var(--qa-blue)}
.qta-crumb b{color:var(--qa-ink);font-weight:500}
.qta-crumb i{font-style:normal;margin:0 7px;opacity:.6}
.qta-acts{display:flex;gap:6px;flex-wrap:wrap}
.qta .qb{display:inline-flex;align-items:center;gap:7px;border:0;border-radius:4px;padding:8px 14px;margin:0;font:600 14px/1.2 inherit;color:#fff;background:var(--qa-blue);cursor:pointer;white-space:nowrap;text-decoration:none;width:auto}
.qta .qb:disabled{opacity:.5;cursor:not-allowed}
.qta .qb.save{background:var(--qa-green)}.qta .qb.lock{background:var(--qa-red)}.qta .qb.unlock{background:var(--qa-green)}
.qta .qb.imp{background:var(--qa-green)}.qta .qb.exp{background:var(--qa-green2)}.qta .qb.blue{background:var(--qa-blue)}
.qta .qb.ghost{background:var(--qa-paper);color:var(--qa-ink);border:1px solid var(--qa-line)}
.qta .qb.sm{padding:4px 9px;font-size:12.5px;font-weight:600}
.qta .qb.link{background:none;color:var(--qa-blue);padding:3px 6px}.qta .qb.link.red{color:var(--qa-red)}
.qta-body{padding:16px 18px}
.qta-card{background:var(--qa-paper);border:1px solid var(--qa-line);border-radius:6px;padding:16px;margin:0 0 14px}
.qta-card h3{margin:0 0 10px;font:700 15px inherit;color:var(--qa-ink)}
.qta-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px 20px}
.qta-filters label{display:block;font-size:14px;color:var(--qa-ink);margin:0 0 6px;font-weight:500}
.qta select,.qta input[type=text],.qta input[type=search],.qta input[type=number],.qta input[type=datetime-local],.qta textarea{width:100%;height:auto;font:14px/1.4 inherit;color:var(--qa-ink);background:var(--qa-paper);border:1px solid var(--qa-line);border-radius:4px;padding:8px 10px;margin:0}
.qta textarea{min-height:110px;resize:vertical}
.qta select:focus,.qta input:focus,.qta textarea:focus{outline:2px solid var(--qa-blue);outline-offset:0;border-color:var(--qa-blue)}
.qta-chk{display:flex;align-items:center;gap:8px;margin:12px 0 0;font-size:14px;color:var(--qa-ink)}
.qta-chk input{width:16px;height:16px;margin:0}
.qta-meta{display:flex;gap:6px 18px;flex-wrap:wrap;color:var(--qa-muted);font-size:13.5px;margin:0 0 12px}
.qta-meta b{color:var(--qa-ink);font-weight:600}
.qta-tw{background:var(--qa-paper);border:1px solid var(--qa-line);border-radius:6px;overflow:auto;max-height:calc(100vh - 230px)}
.qta table.qg{width:100%;border-collapse:separate;border-spacing:0;font-size:14px;min-width:980px}
.qta .qg th{position:sticky;top:0;z-index:2;background:var(--qa-head);color:var(--qa-ink);font-weight:500;text-align:center;padding:10px 8px;border-bottom:1px solid var(--qa-line);border-right:1px solid var(--qa-line);white-space:normal;vertical-align:middle;line-height:1.3}
.qta .qg thead tr:nth-child(2) th{top:41px}
.qta .qg th:last-child{border-right:0}
.qta .qg th.sort{cursor:pointer;user-select:none}.qta .qg th.sort span{color:var(--qa-blue);margin-left:6px}
.qta .qg td{padding:9px 8px;border-bottom:1px solid var(--qa-line);vertical-align:middle;text-align:center;background:var(--qa-paper)}
.qta .qg tbody tr:nth-child(even) td{background:var(--qa-head)}
.qta .qg tbody tr:hover td{background:var(--qa-blue-soft)}
.qta .qg td.l{text-align:left}.qta .qg td.nw{white-space:nowrap}
.qta .qg td.sep,.qta .qg th.sep{border-left:1px solid var(--qa-line)}
.qta .qcell{display:inline-block;min-width:70px;border:1px solid var(--qa-line);border-radius:4px;padding:6px 8px;background:var(--qa-paper);font-weight:700;font-size:15px}
.qta .qcell.tam{border-color:var(--qa-amber);background:var(--qa-amber-soft)}
.qta .qcell small{display:block;font-weight:500;font-size:11px;color:var(--qa-amber)}
.qta .tag{display:inline-block;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:600;white-space:nowrap}
.qta .tag.nop{background:var(--qa-ok-soft);color:#1e7a45}.qta .tag.dang{background:var(--qa-amber-soft);color:var(--qa-amber)}.qta .tag.chua{background:var(--qa-head);color:var(--qa-muted)}.qta .tag.lock{background:var(--qa-bad-soft);color:#c0392b}
.qta .roi.bad{color:#c0392b;font-weight:700}
.qta .note{display:block;font-size:12px;color:var(--qa-muted);max-width:220px;margin:0 auto 3px;text-align:center}
.qta .acts{display:flex;gap:2px;justify-content:center;flex-wrap:wrap}
.qta-msg{color:var(--qa-muted);font-size:13.5px;margin:8px 0 0}
.qta-err{color:#c0392b;font-weight:600;min-height:1.3em;margin:6px 0 0}
.qta-ok{color:#1e7a45;font-weight:600}
.qta-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:0 0 14px}
.qta-stat{background:var(--qa-paper);border:1px solid var(--qa-line);border-radius:6px;padding:12px 14px}
.qta-stat b{display:block;font-size:22px;color:var(--qa-navy)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .qta-stat b{color:#9cc4e6}}
.qta-stat span{color:var(--qa-muted);font-size:13px}
#qta-modal{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:100;display:flex;align-items:flex-start;justify-content:center;padding:40px 12px;overflow:auto}
#qta-modal[hidden]{display:none}
#qta-modal .qta-dlg{background:var(--qa-paper);color:var(--qa-ink);border-radius:8px;max-width:620px;width:100%;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.3)}
#qta-modal .qta-dlg.wide{max-width:900px}
#qta-modal h2{margin:0 0 12px;font:700 18px inherit}
#qta-modal .fr{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px 14px;margin:0 0 12px}
#qta-modal .fr label,#qta-modal .lab{display:block;font-weight:500;margin:0 0 5px}
#qta-modal .foot{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}
#qta-modal table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}
#qta-modal td,#qta-modal th{border:1px solid var(--qa-line);padding:5px 7px;text-align:left}
#qta-modal .opt{display:block;border:1px solid var(--qa-line);border-radius:6px;padding:10px 12px;margin:0 0 8px;cursor:pointer}
#qta-modal .opt:has(input:checked){border-color:var(--qa-blue);background:var(--qa-blue-soft)}
#qta-modal .opt input{width:auto;margin:0 8px 0 0}
#qta-modal .opt span{display:block;color:var(--qa-muted);font-size:13px;margin:3px 0 0 24px}
@media (max-width:900px){.qta-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:760px){
  .qta{grid-template-columns:1fr}
  .qta-burger{display:block}
  .qta-brand{min-width:0}.qta-brand small{display:none}
  .qta-user .em{display:none}
  .qta-side{position:fixed;top:56px;left:0;width:250px;z-index:40;transform:translateX(-100%);transition:transform .2s;box-shadow:4px 0 20px rgba(0,0,0,.15)}
  .qta.side-open .qta-side{transform:none}
  .qta-bar{position:static}
  .qta-body{padding:12px}
  .qta-filters{grid-template-columns:1fr}
  .qta-tw{max-height:none}
}
`;
function ensureCss(){if(document.getElementById("qta-css"))return;const s=document.createElement("style");s.id="qta-css";s.textContent=CSS;document.head.appendChild(s);
  if(!document.getElementById("qta-modal")){const m=document.createElement("div");m.id="qta-modal";m.hidden=true;m.className="qta";m.style.display="";document.body.appendChild(m)}}

/* ---------- khung trang ---------- */
let ON_ACTION={};
function mount(o){
  ensureCss();document.body.classList.add("qta-on");
  const app=o.root||document.getElementById("app");
  const side=(o.side||[]).map(it=>it.grp?`<div class="grp">${esc(it.grp)}</div>`:`<a href="${esc(it.href||"#")}" class="${it.sub?"sub ":""}${it.on?"on":""}" ${it.id?`data-qside="${esc(it.id)}"`:""}>${ICON[it.icon]||""}<span>${esc(it.label)}</span></a>`).join("");
  const crumbs=(o.crumbs||[]).map((c,i,a)=>i===a.length-1?`<b>${esc(c.t)}</b>`:(c.href?`<a href="${esc(c.href)}">${esc(c.t)}</a>`:esc(c.t))).join("<i>/</i>");
  const acts=(o.actions||[]).filter(Boolean).map(a=>`<button type="button" class="qb ${a.kind||"blue"}" data-qact="${esc(a.id)}" ${a.disabled?"disabled":""} title="${esc(a.title||"")}">${ICON[a.icon]||""}${esc(a.label)}</button>`).join("");
  app.innerHTML=`<div class="qta" id="qta"><header class="qta-top"><button class="qta-burger" type="button" aria-label="Menu" id="qta-burger">${ICON.menu}</button>
      <a class="qta-brand" href="${esc(o.homeHref||"../index.html")}"><img src="${esc(o.logo||"../assets/logo.png")}" alt=""><span><b>Phúc Nguyên</b><small>Quản trị đánh giá định kỳ</small></span></a>
      <div class="qta-user"><span class="av">${ICON.user}</span><span class="em">${esc(o.user||"")}</span>${o.onLogout?`<button type="button" id="qta-out">${ICON.out}<span>Đăng xuất</span></button>`:""}</div></header>
    <nav class="qta-side" aria-label="Menu quản trị">${side}</nav>
    <main class="qta-main"><div class="qta-bar"><div class="qta-crumb">${crumbs}</div><div class="qta-acts">${acts}</div></div><div class="qta-body" id="qta-body">${o.body||""}</div></main></div>`;
  const root=app.querySelector("#qta");
  root.querySelector("#qta-burger").onclick=()=>root.classList.toggle("side-open");
  if(o.onLogout)root.querySelector("#qta-out").onclick=o.onLogout;
  (o.actions||[]).filter(Boolean).forEach(a=>{const b=root.querySelector(`[data-qact="${a.id}"]`);if(b&&a.onClick)b.onclick=()=>a.onClick(b)});
  (o.side||[]).forEach(it=>{if(it.id&&it.onClick){const el=root.querySelector(`[data-qside="${it.id}"]`);if(el)el.onclick=e=>{e.preventDefault();root.classList.remove("side-open");it.onClick()}}});
  root.querySelectorAll(".qta-side a").forEach(a=>a.addEventListener("click",()=>root.classList.remove("side-open")));
  window.scrollTo(0,0);
  return root.querySelector("#qta-body");
}
function unmount(){document.body.classList.remove("qta-on")}

/* ---------- hộp thoại ---------- */
function modal(html,wide){ensureCss();const m=document.getElementById("qta-modal");m.innerHTML=`<div class="qta-dlg ${wide?"wide":""}" role="dialog" aria-modal="true">${html}</div>`;m.hidden=false;
  const f=m.querySelector("input:not([type=radio]):not([type=checkbox]),textarea,select,button");if(f)setTimeout(()=>f.focus(),30);
  m.onkeydown=e=>{if(e.key==="Escape")close()};return m.firstElementChild}
function close(){const m=document.getElementById("qta-modal");if(m){m.hidden=true;m.innerHTML=""}}
function ask(title,html,ok,danger){return new Promise(res=>{const d=modal(`<h2>${esc(title)}</h2><div>${html}</div><div class="foot"><button class="qb ghost" data-x>Quay lại</button><button class="qb ${danger?"lock":"blue"}" data-ok>${esc(ok||"Đồng ý")}</button></div>`);
  d.querySelector("[data-x]").onclick=()=>{close();res(false)};d.querySelector("[data-ok]").onclick=()=>{close();res(true)}})}
function info(html,title){const d=modal(`${title?`<h2>${esc(title)}</h2>`:""}<div>${html}</div><div class="foot"><button class="qb blue" data-ok>Đóng</button></div>`);d.querySelector("[data-ok]").onclick=close;return d}

/* ---------- tên tiếng Việt: sắp theo Tên rồi Họ đệm như APAG ---------- */
const coll=new Intl.Collator("vi",{sensitivity:"base"});
function tenKey(h){const p=String(h||"").trim().split(/\s+/);return [p[p.length-1]||"",p.slice(0,-1).join(" ")]}
function cmpTen(a,b){const x=tenKey(a.hoTen),y=tenKey(b.hoTen);return coll.compare(x[0],y[0])||coll.compare(x[1],y[1])||String(a.mssv).localeCompare(String(b.mssv))}

/* ---------- lưới: danh sách sinh viên = bảng điểm ----------
   rows: {mssv,hoTen,ngaySinh,diem:number|null,tam:bool,st:"nop"|"dang"|"chua"|"khoa",roi:number|null,ghiChu:string,bai:[{a,t,kind}],ghi:[{a,t,kind}]}
   opts: {scoreTitle, onAction(a,mssv), state:{}} */
function grid(el,rows,opts){
  opts=opts||{};const S=opts.state||(opts.state={});S.sort=S.sort||"ten";S.dir=S.dir||1;S.sv=S.sv||"";S.st=S.st||"";S.hd=S.hd||"";S.q=S.q||"";
  const byM=new Map(rows.map(r=>[r.mssv,r]));
  const svOpts=rows.slice().sort(cmpTen).map(r=>`<option value="${esc(r.mssv)}"${S.sv===r.mssv?" selected":""}>${esc(r.hoTen)} – ${esc(r.mssv)}</option>`).join("");
  el.innerHTML=`<div class="qta-card"><div class="qta-filters">
      <div><label for="qg-sv">Sinh viên</label><select id="qg-sv"><option value="">Tất cả</option>${svOpts}</select></div>
      <div><label for="qg-st">Bài làm</label><select id="qg-st"><option value="">Tất cả</option><option value="nop">Đã nộp</option><option value="dang">Đang làm</option><option value="chua">Chưa làm</option></select></div>
      <div><label for="qg-hd">Hiển thị</label><select id="qg-hd"><option value="">Tất cả sinh viên</option><option value="co">Đã có điểm</option><option value="tam">Điểm tạm (chưa xác nhận)</option><option value="khong">Chưa có điểm</option></select></div>
      <div><label for="qg-q">Tìm nhanh</label><input type="search" id="qg-q" placeholder="Họ tên hoặc mã sinh viên" value="${esc(S.q)}"></div></div>
      ${opts.note?`<p class="qta-msg">${opts.note}</p>`:""}</div>
    <div class="qta-tw"><table class="qg"><thead><tr>
      <th rowspan="2" style="width:52px">STT</th><th rowspan="2" class="sort" data-s="mssv">Mã sinh viên<span></span></th><th rowspan="2" class="sort" data-s="ten" style="min-width:190px">Họ tên<span></span></th><th rowspan="2">Ngày sinh</th>
      <th colspan="1" class="sep">Điểm quá trình</th><th rowspan="2" class="sep">Bài làm</th><th rowspan="2">Rời trang</th><th rowspan="2" class="sep" style="min-width:200px">Ghi chú</th></tr>
      <tr><th class="sort sep" data-s="diem">${esc(opts.scoreTitle||"Kiểm tra định kỳ")}<span></span></th></tr></thead><tbody id="qg-tb"></tbody></table></div>`;
  ["sv","st","hd"].forEach(k=>{const s=el.querySelector("#qg-"+k);s.value=S[k];s.onchange=()=>{S[k]=s.value;draw()}});
  const q=el.querySelector("#qg-q");q.oninput=()=>{S.q=q.value;draw()};
  el.querySelectorAll("th.sort").forEach(th=>th.onclick=()=>{if(S.sort===th.dataset.s)S.dir=-S.dir;else{S.sort=th.dataset.s;S.dir=1}draw()});
  el.querySelector("#qg-tb").addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(b&&opts.onAction)opts.onAction(b.dataset.a,b.closest("tr").dataset.m,b)});
  function draw(){
    const qq=strip(S.q).trim();
    let xs=rows.filter(r=>(!S.sv||r.mssv===S.sv)&&(!S.st||(S.st==="dang"?(r.st==="dang"||r.st==="khoa"):r.st===S.st))&&
      (!S.hd||(S.hd==="co"?r.diem!=null:S.hd==="tam"?(r.diem!=null&&r.tam):r.diem==null))&&(!qq||strip(r.hoTen+" "+r.mssv).includes(qq)));
    xs.sort((a,b)=>S.dir*(S.sort==="mssv"?String(a.mssv).localeCompare(String(b.mssv)):S.sort==="diem"?((a.diem==null?-1:a.diem)-(b.diem==null?-1:b.diem))||cmpTen(a,b):cmpTen(a,b)));
    el.querySelectorAll("th.sort span").forEach(s=>s.textContent=s.parentNode.dataset.s===S.sort?(S.dir>0?"↑":"↓"):"");
    const btn=x=>`<button type="button" class="qb sm ${x.kind||"link"}" data-a="${esc(x.a)}">${esc(x.t)}</button>`;
    const tag={nop:'<span class="tag nop">Đã nộp</span>',dang:'<span class="tag dang">Đang làm</span>',khoa:'<span class="tag lock">Bị khóa</span>',chua:'<span class="tag chua">Chưa làm</span>'};
    el.querySelector("#qg-tb").innerHTML=xs.length?xs.map((r,i)=>`<tr data-m="${esc(r.mssv)}"><td>${i+1}</td><td class="nw">${esc(r.mssv)}</td><td class="l">${esc(r.hoTen)}</td><td class="nw">${esc(r.ngaySinh||"")}</td>
      <td class="sep">${r.diem==null?'<span class="qcell" style="color:var(--qa-muted);font-weight:400">&nbsp;</span>':`<span class="qcell${r.tam?" tam":""}">${fnum(r.diem)}${r.tam?"<small>tạm</small>":""}</span>`}</td>
      <td class="sep">${tag[r.st]||""}<div class="acts">${(r.bai||[]).map(btn).join("")}</div></td>
      <td>${r.roi==null?"":`<span class="roi ${r.roi>(opts.maxRoi||10)?"bad":""}">${r.roi}</span>`}</td>
      <td class="sep">${r.ghiChu?`<span class="note">${esc(r.ghiChu)}</span>`:""}<div class="acts">${(r.ghi||[]).map(btn).join("")}</div></td></tr>`).join(""):`<tr><td colspan="8" style="padding:24px;color:var(--qa-muted)">${rows.length?"Không có sinh viên phù hợp bộ lọc.":"Lớp chưa có sinh viên. Bấm “Import excel” hoặc “Thêm sinh viên”."}</td></tr>`;
  }
  draw();return {draw,byM};
}

/* ---------- bảng danh sách lớp ---------- */
function classTable(el,list,opts){
  opts=opts||{};const S=opts.state||{};
  const hps=[...new Set(list.map(x=>x.hocPhanTen||x.hocPhan))];
  el.innerHTML=`<div class="qta-card"><div class="qta-filters">
    <div><label for="qc-hp">Học phần</label><select id="qc-hp"><option value="">Tất cả</option>${hps.map(h=>`<option>${esc(h)}</option>`).join("")}</select></div>
    <div><label for="qc-st">Trạng thái</label><select id="qc-st"><option value="">Tất cả</option><option value="open">Đang mở</option><option value="wait">Chưa đến giờ</option><option value="closed">Khóa / hết giờ</option></select></div>
    <div><label for="qc-nh">Năm học</label><select id="qc-nh"><option value="">Tất cả</option>${[...new Set(list.map(x=>x.namHoc||""))].filter(Boolean).map(h=>`<option>${esc(h)}</option>`).join("")}</select></div>
    <div><label for="qc-q">Tìm nhanh</label><input type="search" id="qc-q" placeholder="Mã lớp hoặc tên lớp"></div></div></div>
    <div class="qta-tw"><table class="qg" style="min-width:860px"><thead><tr><th style="width:52px">STT</th><th>Mã lớp</th><th>Tên lớp</th><th>Học phần</th><th>Năm học</th><th>Sĩ số</th><th>Thời gian mở – đóng</th><th>Trạng thái</th><th></th></tr></thead><tbody id="qc-tb"></tbody></table></div>`;
  const tag={open:'<span class="tag nop">Đang mở</span>',wait:'<span class="tag dang">Chưa đến giờ</span>',closed:'<span class="tag lock">Khóa</span>'};
  const draw=()=>{const hp=el.querySelector("#qc-hp").value,st=el.querySelector("#qc-st").value,nh=el.querySelector("#qc-nh").value,q=strip(el.querySelector("#qc-q").value).trim();
    const xs=list.filter(l=>(!hp||(l.hocPhanTen||l.hocPhan)===hp)&&(!st||l.st===st)&&(!nh||l.namHoc===nh)&&(!q||strip(l.id+" "+(l.ten||"")).includes(q)));
    el.querySelector("#qc-tb").innerHTML=xs.length?xs.map((l,i)=>`<tr data-id="${esc(l.id)}" style="cursor:pointer"><td>${i+1}</td><td class="nw"><b>${esc(l.id)}</b></td><td class="l">${esc(l.ten||"")}</td><td class="l">${esc(l.hocPhanTen||l.hocPhan||"")}</td><td class="nw">${esc(l.namHoc||"")}</td><td>${l.siSo|0}</td><td class="nw">${esc(l.khung||"")}</td><td>${tag[l.st]||""}</td><td><button type="button" class="qb sm blue">Mở lớp</button></td></tr>`).join(""):`<tr><td colspan="9" style="padding:24px;color:var(--qa-muted)">${list.length?"Không có lớp phù hợp bộ lọc.":"Chưa có lớp nào. Bấm “Tạo lớp mới”."}</td></tr>`;
    el.querySelectorAll("#qc-tb tr[data-id]").forEach(tr=>tr.onclick=()=>opts.onOpen&&opts.onOpen(tr.dataset.id))};
  ["#qc-hp","#qc-st","#qc-nh"].forEach(s=>el.querySelector(s).onchange=draw);el.querySelector("#qc-q").oninput=draw;draw();
}

/* ---------- thư viện Excel (tải khi cần) ---------- */
const LIB={xlsx:["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js","https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"],
  exceljs:["https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js","https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"]};
const loading={};
function addScript(u){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=u;s.onload=res;s.onerror=()=>{s.remove();rej()};document.head.appendChild(s)})}
function lib(name){const g=name==="xlsx"?"XLSX":"ExcelJS";if(window[g])return Promise.resolve(window[g]);
  return loading[name]||(loading[name]=(async()=>{for(const u of LIB[name]){try{await addScript(u);if(window[g])return window[g]}catch(x){}}loading[name]=null;throw new Error("Không tải được thư viện Excel. Kiểm tra mạng rồi thử lại.")})())}

/* ---------- đọc danh sách sinh viên (Excel APAG, Excel bất kỳ, CSV, dán) ---------- */
function fmtNS(v,X){if(v instanceof Date&&!isNaN(v)){const d=new Date(v.getTime()+12*36e5);return pad(d.getUTCDate())+"/"+pad(d.getUTCMonth()+1)+"/"+d.getUTCFullYear()}
  if(typeof v==="number"&&X&&v>10000&&v<80000){const p=X.SSF.parse_date_code(v);return pad(p.d)+"/"+pad(p.m)+"/"+p.y}
  const s=String(v==null?"":v).trim();const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);return m?pad(+m[1])+"/"+pad(+m[2])+"/"+m[3]:s}
const OKMS=s=>/^[A-Z0-9_-]{2,24}$/.test(s);
function parseAOA(aoa,X){
  const norm=s=>strip(s).replace(/[^a-z0-9]/g,"");let hi=-1,cM=-1,cT=-1,cH=-1,cN=-1,cD=-1;const info={};
  for(let i=0;i<Math.min(aoa.length,20);i++){(aoa[i]||[]).forEach(c=>{const s=String(c==null?"":c).replace(/\s+/g," ").trim();let m;
      if((m=s.match(/^Tên môn\s*:\s*(.+)$/i)))info.tenMon=m[1].trim();else if((m=s.match(/^Tên lớp tc\s*:\s*(.+)$/i)))info.tenLopTc=m[1].trim();
      else if((m=s.match(/^Học kỳ\s*\/\s*Năm học\s*:\s*(.+)$/i)))info.hocKy=m[1].trim();else if((m=s.match(/^Số tín chỉ\s*:\s*(.+)$/i)))info.soTc=m[1].trim()});
    if(hi<0){const r=(aoa[i]||[]).map(norm);const m=r.findIndex(x=>/^(mssv|masv|masinhvien|msv|masosinhvien)$/.test(x));
      if(m>=0){hi=i;cM=m;r.forEach((x,j)=>{if(/^(hovaten|hoten|hotensinhvien)$/.test(x))cT=j;else if(/^(ho|hodem|holot)$/.test(x))cH=j;else if(x==="ten")cN=j;else if(/ngaysinh|namsinh/.test(x))cD=j})}}}
  const out=[],seen=new Set();let skip=0;
  aoa.slice(hi+1).forEach(r=>{r=r||[];let mssv,ten,ns;
    if(hi>=0){mssv=r[cM];ten=cT>=0?r[cT]:[cH>=0?r[cH]:"",cN>=0?r[cN]:""].join(" ");ns=cD>=0?r[cD]:""}
    else{const c=r.map(x=>String(x==null?"":x).trim());const k=c.findIndex(x=>OKMS(x.toUpperCase().replace(/\s+/g,""))&&/\d/.test(x));if(k<0)return;mssv=c[k];ten=c.find((x,j)=>j!==k&&x&&!/\d/.test(x))||"";ns=c.find((x,j)=>j!==k&&/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/.test(x))||""}
    mssv=String(mssv==null?"":mssv).trim().toUpperCase().replace(/\s+/g,"");ten=String(ten||"").replace(/\s+/g," ").trim();
    if(!OKMS(mssv)||!ten){if(mssv||ten)skip++;return}if(seen.has(mssv))return;seen.add(mssv);out.push({mssv,hoTen:ten,ngaySinh:fmtNS(ns,X)})});
  return {rows:out,info,skip};
}
async function readRosterFile(file){
  const ext=(file.name.split(".").pop()||"").toLowerCase();
  if(ext==="txt")return parseText(await file.text());
  const X=await lib("xlsx");const wb=X.read(await file.arrayBuffer(),{type:"array",cellDates:true});
  const ws=wb.Sheets[wb.SheetNames[0]];let aoa=X.utils.sheet_to_json(ws,{header:1,raw:true,defval:""});
  /* CSV mở sai (cả dòng nằm trong 1 ô, ngăn bằng dấu phẩy) → tách lại */
  if(aoa.length&&aoa.every(r=>r.filter(x=>x!=="").length<=1)&&aoa.some(r=>/[,;]/.test(String(r[0]))))return parseText(aoa.map(r=>String(r[0])).join("\n"));
  return parseAOA(aoa,X);
}
function splitLine(s){const out=[];let cur="",q=false;const sep=s.includes("\t")?"\t":(s.split(";").length>s.split(",").length?";":",");
  for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(q&&s[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===sep&&!q){out.push(cur);cur=""}else cur+=c}out.push(cur);return out.map(x=>x.trim())}
function parseText(t){return parseAOA(String(t||"").split(/\r?\n/).filter(s=>s.trim()).map(splitLine),null)}

/* hộp nhập danh sách: onSave(rows,info,mode) mode = "them" | "thay" */
function rosterDialog(o){
  const d=modal(`<h2>Import danh sách sinh viên</h2>
    <p class="qta-msg" style="margin-top:0">Chọn file <b>Export excel</b> tải từ APAG (Nhập điểm lớp học → lớp → Export excel) — web tự nhận cột Mã sinh viên, Họ và tên, Ngày sinh và thông tin lớp tín chỉ. File Excel/CSV khác cũng được nếu có các cột đó. Hoặc sao chép các dòng trong Excel rồi dán vào ô dưới.</p>
    <div class="fr"><div><label for="qr-f">File Excel / CSV</label><input type="file" id="qr-f" accept=".xlsx,.xls,.csv,.txt" style="border:0;padding:4px 0"></div></div>
    <div class="fr"><div><label for="qr-t">Hoặc dán danh sách (mỗi dòng: MSSV ⇥ Họ tên ⇥ Ngày sinh)</label><textarea id="qr-t" rows="5" placeholder="2305LHOA004	Lê Thị Minh Anh	05/06/2005"></textarea></div></div>
    <div class="foot" style="justify-content:flex-start;margin-top:0"><button class="qb ghost" id="qr-read">Đọc danh sách dán vào</button></div>
    <div id="qr-prev"></div><div class="qta-err" id="qr-err"></div>
    <div class="foot"><button class="qb ghost" id="qr-x">Hủy</button><button class="qb imp" id="qr-ok" disabled>Lưu danh sách</button></div>`,true);
  let got=null;
  const show=r=>{got=r;const p=d.querySelector("#qr-prev");d.querySelector("#qr-err").textContent="";
    if(!r.rows.length){p.innerHTML="";d.querySelector("#qr-err").textContent="Không tìm thấy dòng hợp lệ (cần có Mã sinh viên và Họ tên).";d.querySelector("#qr-ok").disabled=true;return}
    const inf=r.info||{};
    p.innerHTML=`<p class="qta-ok">Đọc được ${r.rows.length} sinh viên${r.skip?` (bỏ qua ${r.skip} dòng không hợp lệ)`:""}.</p>
      ${inf.tenLopTc||inf.tenMon?`<p class="qta-msg" style="margin:0">Thông tin APAG: ${esc([inf.tenMon,inf.tenLopTc,inf.hocKy].filter(Boolean).join(" · "))} — sẽ dùng làm tiêu đề khi xuất bảng điểm.</p>`:""}
      <table><thead><tr><th>TT</th><th>Mã sinh viên</th><th>Họ và tên</th><th>Ngày sinh</th></tr></thead><tbody>${r.rows.slice(0,6).map((s,i)=>`<tr><td>${i+1}</td><td>${esc(s.mssv)}</td><td>${esc(s.hoTen)}</td><td>${esc(s.ngaySinh)}</td></tr>`).join("")}${r.rows.length>6?`<tr><td colspan="4">… và ${r.rows.length-6} sinh viên nữa</td></tr>`:""}</tbody></table>
      <label class="opt"><input type="radio" name="qr-m" value="them" checked>Thêm vào danh sách hiện có (${o.count|0} sinh viên)<span>Sinh viên trùng mã được cập nhật họ tên, ngày sinh; không ai bị xóa.</span></label>
      <label class="opt"><input type="radio" name="qr-m" value="thay">Thay thế toàn bộ danh sách<span>Sinh viên không có trong file bị bỏ khỏi lớp${o.replaceNote?" — "+esc(o.replaceNote):""}.</span></label>`;
    d.querySelector("#qr-ok").disabled=false};
  d.querySelector("#qr-x").onclick=close;
  d.querySelector("#qr-f").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{show(await readRosterFile(f))}catch(x){d.querySelector("#qr-err").textContent="Không đọc được file: "+x.message}};
  d.querySelector("#qr-read").onclick=()=>show(parseText(d.querySelector("#qr-t").value));
  d.querySelector("#qr-ok").onclick=async()=>{const b=d.querySelector("#qr-ok");b.disabled=true;const mode=(d.querySelector("[name=qr-m]:checked")||{}).value||"them";
    try{await o.onSave(got.rows,got.info||{},mode);close()}catch(x){d.querySelector("#qr-err").textContent=x.message||String(x);b.disabled=false}};
}
function mergeRows(cur,rows,mode){if(mode==="thay")return rows.slice();const m=new Map(cur.map(r=>[r.mssv,r]));rows.forEach(r=>m.set(r.mssv,{...(m.get(r.mssv)||{}),...r,ngaySinh:r.ngaySinh||(m.get(r.mssv)||{}).ngaySinh||""}));return [...m.values()]}

/* hộp thêm / sửa một sinh viên: onSave({mssv,hoTen,ngaySinh}) có thể ném lỗi để hiện */
function studentDialog(o){
  const r=o.row||{};
  const d=modal(`<h2>${r.mssv?"Sửa thông tin sinh viên":"Thêm sinh viên"}</h2>
    <div class="fr"><div style="grid-column:1/-1"><label for="qs-t">Họ và tên</label><input type="text" id="qs-t" maxlength="80" value="${esc(r.hoTen||"")}" autocomplete="off"></div>
      <div><label for="qs-m">Mã sinh viên</label><input type="text" id="qs-m" maxlength="24" value="${esc(r.mssv||"")}" style="text-transform:uppercase" autocomplete="off" spellcheck="false"${o.lockMssv?" readonly":""}></div>
      <div><label for="qs-n">Ngày sinh <span class="qta-msg">(không bắt buộc)</span></label><input type="text" id="qs-n" maxlength="10" placeholder="dd/mm/yyyy" value="${esc(r.ngaySinh||"")}" autocomplete="off"></div></div>
    ${o.lockMssv?`<p class="qta-msg">${esc(o.lockMssv)}</p>`:""}<div class="qta-err" id="qs-err"></div>
    <div class="foot">${r.mssv&&o.onDelete?`<button class="qb lock" id="qs-del" style="margin-right:auto">Xóa sinh viên</button>`:""}<button class="qb ghost" id="qs-x">Hủy</button><button class="qb save" id="qs-ok">Lưu</button></div>`);
  const err=d.querySelector("#qs-err");d.querySelector("#qs-x").onclick=close;
  d.querySelector("#qs-ok").onclick=async()=>{err.textContent="";
    const hoTen=d.querySelector("#qs-t").value.replace(/\s+/g," ").trim(),mssv=d.querySelector("#qs-m").value.trim().toUpperCase().replace(/\s+/g,""),ns=d.querySelector("#qs-n").value.trim();
    if(!hoTen){err.textContent="Nhập họ và tên.";return}if(!OKMS(mssv)){err.textContent="Mã sinh viên chỉ gồm chữ, số, dấu gạch (2–24 ký tự).";return}
    if(ns&&!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(ns)){err.textContent="Ngày sinh ghi theo dạng dd/mm/yyyy hoặc để trống.";return}
    const b=d.querySelector("#qs-ok");b.disabled=true;try{await o.onSave({mssv,hoTen,ngaySinh:ns?fmtNS(ns):""});close()}catch(x){err.textContent=x.message||String(x);b.disabled=false}};
  if(d.querySelector("#qs-del"))d.querySelector("#qs-del").onclick=async()=>{try{await o.onDelete();close()}catch(x){err.textContent=x.message||String(x)}};
}

/* ---------- xuất Excel ---------- */
const rnd=(x,m)=>x==null?null:m==="1"?Math.round(x*10)/10:m==="05"?Math.round(x*2)/2:Math.round(x*100)/100;
function tenMonOf(l){return (l.apag&&l.apag.tenMon)||String(l.hocPhanTen||l.hocPhan||"").replace(/\s*[–-]\s*(Đánh giá định kỳ|Đề cũ).*$/i,"").trim()}
function download(buf,name){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
const safeName=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").replace(/[^A-Za-z0-9_.-]+/g,"_").replace(/^_+|_+$/g,"");

/* Bảng điểm quá trình theo đúng bố cục file Export excel của APAG (dòng 1–2 ẩn: tên trường, dữ liệu từ dòng 12) */
async function buildAPAG(l,rows,m){
  const EJ=await lib("exceljs");const wb=new EJ.Workbook();wb.creator="Phúc Nguyên Library";
  const ws=wb.addWorksheet("BangDiemQuaTrinh",{pageSetup:{paperSize:9,orientation:"portrait",fitToPage:true,fitToWidth:1,fitToHeight:0,margins:{left:.5,right:.4,top:.6,bottom:.6,header:.3,footer:.3}}});
  const F={name:"Times New Roman",size:13},C={vertical:"middle",horizontal:"center",wrapText:true},TH={style:"thin"},BOX={top:TH,left:TH,bottom:TH,right:TH};
  ws.columns=[4.4,14.6,25.1,11.6,11.3,11.3,10.4,9.7,14].map(w=>({width:w}));
  ws.getRow(1).values=["STT","Ma_sv","Ho_ten","Ngay_sinh","TP1","TP2","So_tiet_nghi","TBCBP","Ghi_chu"];ws.getRow(1).hidden=true;
  ws.getRow(2).values=[12,6,20,null,22.57];ws.getRow(2).hidden=true;
  const put=(ref,v,font,al)=>{const c=ws.getCell(ref);c.value=v;c.font={...F,...(font||{})};c.alignment=al||C;return c};
  const mg=(a,b,v,font,al)=>{ws.mergeCells(a+":"+b);return put(a,v,font,al)};
  const S10={...F,size:10};
  mg("A3","C3","HỌC VIỆN CHÍNH TRỊ QUỐC GIA\nHỒ CHÍ MINH",S10);mg("D3","I3","CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",{...S10,bold:true});
  mg("A4","C4","HỌC VIỆN HÀNH CHÍNH",{...S10,bold:true});mg("D4","I4","Độc lập - Tự do - Hạnh phúc",{...S10,bold:true});
  mg("A5","C5","VÀ QUẢN TRỊ CÔNG",{...S10,bold:true});
  ws.getRow(3).height=34.9;ws.getRow(6).height=24;ws.getRow(8).height=21;ws.getRow(10).height=33;
  mg("A6","I6","BẢNG ĐIỂM QUÁ TRÌNH",{bold:true});
  mg("A7","I7","Học kỳ/Năm học: "+((l.apag&&l.apag.hocKy)||l.namHoc||""),{bold:true});
  mg("A8","D8","Tên môn: "+tenMonOf(l),null,{vertical:"middle",horizontal:"left",wrapText:true});
  mg("E8","I8","Tên lớp tc:   "+((l.apag&&l.apag.tenLopTc)||l.ten||l.id),null,{vertical:"middle",horizontal:"center",wrapText:true});
  mg("A9","C9","Số tín chỉ:  "+((l.apag&&l.apag.soTc)||""),null,{vertical:"middle",horizontal:"left"});
  const H={bold:true};
  [["A10","A11","TT"],["B10","B11","Mã \nsinh viên"],["C10","C11","Họ và tên"],["D10","D11","Ngày sinh"],["G10","G11","Số tiết nghỉ"],["H10","H11","TBCBP"],["I10","I11","Ghi chú"]].forEach(([a,b,t])=>mg(a,b,t,H));
  mg("E10","F10","Điểm quá trình",H);put("E11","Kiểm Tra thường xuyên",H);put("F11","Kiểm tra định kỳ",H);
  ws.getRow(11).height=36;
  for(let r=10;r<=11;r++)for(let c=1;c<=9;c++)ws.getRow(r).getCell(c).border=BOX;
  let n=12;
  rows.forEach((s,i)=>{const row=ws.getRow(n++);row.values=[i+1,s.mssv,s.hoTen,s.ngaySinh||"",null,rnd(s.diem,m),null,null,s.ghiChuXuat||null];
    for(let c=1;c<=9;c++){const cell=row.getCell(c);cell.font=F;cell.border=BOX;cell.alignment={vertical:"middle",horizontal:c===3||c===9?"left":"center",wrapText:c===9}}});
  n++;const now=new Date();
  mg("D"+n,"I"+n,`Hà Nội, ngày ${now.getDate()} tháng ${now.getMonth()+1} năm ${now.getFullYear()}`,{italic:true});n++;
  mg("A"+n,"C"+n,"TRƯỞNG KHOA/BỘ MÔN",{bold:true});mg("D"+n,"I"+n,"GIẢNG VIÊN GIẢNG DẠY",{bold:true});n++;
  mg("A"+n,"C"+n,"(Ký, ghi rõ họ tên)",{italic:true});mg("D"+n,"I"+n,"(Ký, ghi rõ họ tên)",{italic:true});
  ws.views=[{state:"frozen",ySplit:11}];
  return wb.xlsx.writeBuffer();
}
/* Điền điểm vào file Export excel tải từ APAG (giữ nguyên mọi thứ khác, kể cả cột ẩn ID) để Import excel lại */
async function fillAPAG(file,rows,m,colKey){
  const EJ=await lib("exceljs");const wb=new EJ.Workbook();await wb.xlsx.load(await file.arrayBuffer());
  const ws=wb.worksheets.find(w=>w.state!=="hidden"&&w.actualRowCount>5)||wb.worksheets[0];
  const txt=v=>v==null?"":typeof v==="object"?(v.richText?v.richText.map(x=>x.text).join(""):v.text!=null?String(v.text):v.result!=null?String(v.result):""):String(v);
  const nk=v=>strip(txt(v)).replace(/[^a-z0-9]/g,"");
  let cM=0,cD=0,start=0;
  /* 1) dòng tên trường (ẩn) của APAG: Ma_sv / TP2 */
  for(let r=1;r<=15&&!cM;r++){ws.getRow(r).eachCell({includeEmpty:false},(c,j)=>{const k=nk(c.value);if(k==="masv")cM=j;if(k===(colKey||"tp2"))cD=j})}
  /* 2) dòng tiêu đề hiển thị */
  for(let r=1;r<=20;r++){const row=ws.getRow(r);row.eachCell({includeEmpty:false},(c,j)=>{const k=nk(c.value);
      if(!cM&&/^(masinhvien|mssv|masosinhvien)$/.test(k))cM=j;if(/kiemtradinhky/.test(k)){cD=cD||j;start=Math.max(start,r+1)}if(/^(masinhvien|mssv)$/.test(k))start=Math.max(start,r+1)})}
  if(!cM)throw new Error("Không tìm thấy cột Mã sinh viên trong file. Hãy dùng đúng file Export excel tải từ APAG.");
  if(!cD)throw new Error("Không tìm thấy cột “Kiểm tra định kỳ” trong file APAG.");
  const by=new Map(rows.map(r=>[String(r.mssv).toUpperCase(),r]));const used=new Set();const thieu=[];let ghi=0,last=start;
  for(let r=Math.max(start,2);r<=ws.rowCount;r++){const row=ws.getRow(r);const ms=txt(row.getCell(cM).value).trim().toUpperCase();if(!OKMS(ms)||!/\d/.test(ms))continue;last=r;
    const s=by.get(ms);if(!s){thieu.push({mssv:ms,hoTen:txt(row.getCell(cM+1).value),ly:"không có trong lớp trên web"});continue}used.add(ms);
    if(s.diem==null){thieu.push({mssv:ms,hoTen:s.hoTen,ly:s.st==="dang"?"đang làm, chưa nộp":"chưa làm bài"});continue}
    const cell=row.getCell(cD);cell.value=rnd(s.diem,m);ghi++}
  const ngoai=rows.filter(r=>!used.has(String(r.mssv).toUpperCase())&&r.diem!=null);
  return {buf:await wb.xlsx.writeBuffer(),ghi,thieu,ngoai};
}
/* hộp xuất: o = {lop, rows:[{mssv,hoTen,ngaySinh,diem,tam,st}], tamNote} */
function exportDialog(o){
  const l=o.lop,cho=o.rows.filter(r=>r.tam&&r.diem!=null).length,co=o.rows.filter(r=>r.diem!=null).length;
  const d=modal(`<h2>Export excel – bảng điểm Kiểm tra định kỳ</h2>
    <p class="qta-msg" style="margin-top:0">Lớp <b>${esc(l.id)}</b> · ${esc(tenMonOf(l))} · ${co}/${o.rows.length} sinh viên có điểm (thang 10).</p>
    ${cho?`<p class="qta-err" style="font-weight:500">Còn ${cho} bài có điểm tạm (chưa xác nhận). ${esc(o.tamNote||"")}</p>`:""}
    <label class="opt"><input type="radio" name="qx-k" value="mau" checked><b>Bảng điểm theo mẫu APAG</b><span>File Excel đúng bố cục “Bảng điểm quá trình”: TT · Mã sinh viên · Họ và tên · Ngày sinh · Điểm quá trình (Kiểm tra thường xuyên | Kiểm tra định kỳ) · Số tiết nghỉ · TBCBP · Ghi chú; mỗi sinh viên một dòng, mỗi điểm một ô. Dùng để lưu, in, ký.</span></label>
    <label class="opt"><input type="radio" name="qx-k" value="apag"><b>Điền điểm vào file Export excel của APAG</b><span>Trên APAG bấm Export excel ở lớp này, chọn file đó ở dưới. Web ghi điểm vào cột “Kiểm tra định kỳ” theo mã sinh viên, giữ nguyên các cột khác → tải về rồi Import excel lên APAG.</span></label>
    <div id="qx-fwrap" hidden class="fr"><div><label for="qx-f">File Export excel của APAG</label><input type="file" id="qx-f" accept=".xlsx" style="border:0;padding:4px 0"></div></div>
    <div class="fr"><div><label for="qx-r">Làm tròn điểm</label><select id="qx-r"><option value="2">Giữ nguyên (tối đa 2 chữ số thập phân)</option><option value="1">1 chữ số thập phân</option><option value="05">Đến 0,5</option></select></div></div>
    <div id="qx-res"></div><div class="qta-err" id="qx-err"></div>
    <div class="foot"><button class="qb ghost" id="qx-x">Đóng</button><button class="qb exp" id="qx-ok">${ICON.down}Tải file Excel</button></div>`,true);
  const kind=()=>(d.querySelector("[name=qx-k]:checked")||{}).value;
  d.querySelectorAll("[name=qx-k]").forEach(x=>x.onchange=()=>{d.querySelector("#qx-fwrap").hidden=kind()!=="apag"});
  d.querySelector("#qx-x").onclick=close;
  d.querySelector("#qx-ok").onclick=async()=>{const err=d.querySelector("#qx-err"),res=d.querySelector("#qx-res"),b=d.querySelector("#qx-ok");err.textContent="";res.innerHTML="";const m=d.querySelector("#qx-r").value;
    b.disabled=true;try{
      const base="Bang-diem-KTDK-"+safeName(l.id);
      if(kind()==="mau"){const rows=o.rows.slice().sort(cmpTen).map(r=>({...r,ghiChuXuat:r.diem==null?(r.st==="dang"?"Chưa nộp bài":"Không dự kiểm tra"):r.tam?"Điểm tạm":""}));
        download(await buildAPAG(l,rows,m),base+".xlsx");res.innerHTML=`<p class="qta-ok">Đã tải ${esc(base)}.xlsx (${rows.length} sinh viên).</p>`}
      else{const f=d.querySelector("#qx-f").files[0];if(!f)throw new Error("Chọn file Export excel tải từ APAG.");
        const r=await fillAPAG(f,o.rows,m);download(r.buf,f.name.replace(/\.xlsx$/i,"")+"_DIEN-DIEM.xlsx");
        res.innerHTML=`<p class="qta-ok">Đã ghi ${r.ghi} điểm vào cột Kiểm tra định kỳ. File tải về: ${esc(f.name.replace(/\.xlsx$/i,""))}_DIEN-DIEM.xlsx — Import excel lên APAG rồi bấm Lưu.</p>
          ${r.thieu.length?`<p class="qta-msg" style="margin:6px 0 2px">${r.thieu.length} sinh viên trong file APAG chưa có điểm (ô để trống):</p><table><tbody>${r.thieu.map(x=>`<tr><td>${esc(x.mssv)}</td><td>${esc(x.hoTen)}</td><td>${esc(x.ly)}</td></tr>`).join("")}</tbody></table>`:""}
          ${r.ngoai.length?`<p class="qta-err" style="font-weight:500">${r.ngoai.length} sinh viên có điểm trên web nhưng không có trong file APAG: ${esc(r.ngoai.map(x=>x.mssv+" "+x.hoTen).join("; "))}.</p>`:""}`}
    }catch(x){console.error(x);err.textContent=x.message||String(x)}b.disabled=false};
}

window.QTA={mount,unmount,modal,close,ask,info,grid,classTable,rosterDialog,studentDialog,mergeRows,exportDialog,buildAPAG,fillAPAG,parseAOA,parseText,readRosterFile,cmpTen,ICON,esc,lib};
})();
