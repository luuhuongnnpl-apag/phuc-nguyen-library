"use strict";
/* PHÚC NGUYÊN LIBRARY — Không gian quản trị (lop/) — khung Azota, 17/11/2026
   Một màn đăng nhập chung: sinh viên ID + mật khẩu (mật khẩu chung của lớp do giảng viên đặt), giảng viên/quản trị Google.
   Dữ liệu Firestore:
     pnl_dg_lop/{mã}   lớp (dùng chung với Đánh giá định kỳ) + nhom, luuTru, diemKhoa, ghiChu
     pnl_dg_ds/{mã}    danh sách lớp {rows, matKhau} — chỉ quản trị đọc
     pnl_dg_sv/{mã}__{mssv}  tên sinh viên cho Đánh giá định kỳ
     pnl_tk/{mssv}     tài khoản sinh viên {hoTen, lop[], pw (băm), pwDefault} — quản trị ghi; sinh viên chỉ đổi pw của mình
     pnl_phien/{uid}   phiên đăng nhập sinh viên: tạo được khi băm mật khẩu gửi lên khớp pnl_tk (quy tắc đối chiếu, không ai đọc được băm)
     pnl_ma/{MÃ}       mã lớp ôn tập (khách); pnl_gopy/{uid} góp ý */
const FB_CFG={apiKey:"AIzaSyCIYY-dzhJ4rUYsXvBQivIxcziUC3hR1-U",authDomain:"phuc-nguyen-library.firebaseapp.com",projectId:"phuc-nguyen-library",storageBucket:"phuc-nguyen-library.firebasestorage.app",messagingSenderId:"842652271567",appId:"1:842652271567:web:23b95b5c4d6061497988ba"};
const FB_ADMIN_UID="smoIpuX7qseqTeu9nToc9RYigku1";
const FB_ADMIN_EMAILS=["luuhuong.nnpl@gmail.com"];
const ADMIN_NAME="Lưu Hương NNPL";
const fbIsAdmin=u=>!!u&&!u.isAnonymous&&(u.uid===FB_ADMIN_UID||(!!u.email&&u.emailVerified!==false&&FB_ADMIN_EMAILS.includes(u.email.toLowerCase())));
const SV_KEY="pnl-lop-sv";          /* phiên sinh viên trên máy này */
const HOME_KEY="pnlib-ma-lop";      /* phiên mã lớp của trang chủ: cấp cho sinh viên đã đăng nhập để mở học phần */
const COURSES_URL="../assets/pnl-courses.json";
const HOME="../index.html",DG="../danh-gia/";

/* ============ tiện ích ============ */
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const strip=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();
const normId=s=>String(s||"").trim().toUpperCase().replace(/\s+/g,"");
const normMa=s=>String(s||"").trim().toUpperCase().replace(/[^A-Z0-9._-]/g,"");
const initials=n=>{const p=String(n||"").trim().split(/\s+/);return p.length>1?(p[p.length-2][0]+p[p.length-1][0]).toUpperCase():(p[0]||"?").slice(0,2).toUpperCase()};
const AVC=["#1d5677","#6fa8d6","#6a3fa0","#c0392b","#2e7d6b","#e08a3c","#4a5d8a","#8e2c3f"];
const avc=s=>AVC[[...String(s)].reduce((a,c)=>a+c.charCodeAt(0),0)%AVC.length];
async function sha(t){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
const pwHash=(mssv,pw)=>sha("PNL-SV|"+normId(mssv)+"|"+String(pw));
function toast(t,ms){const el=$("#toast");el.textContent=t;el.classList.remove("hidden");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.add("hidden"),ms||3400)}
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const errMsg=x=>x&&x.code==="permission-denied"?"chưa có quyền ghi (đăng nhập Google quản trị, hoặc quy tắc Firestore chưa cập nhật).":(x&&x.message)||String(x);
const fmtD=d=>{if(!d)return"";const t=d.toDate?d.toDate():new Date(d);return isNaN(t)?"":t.toLocaleDateString("vi-VN")};
const todayISO=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const fmtISO=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||"")?s.slice(8,10)+"/"+s.slice(5,7)+"/"+s.slice(0,4):(s||"");
const P='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const I={
  home:P+'<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/></svg>',
  lop:P+'<path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M2 13l10 5 10-5"/></svg>',
  hp:P+'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4Z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7Z"/></svg>',
  de:P+'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
  users:P+'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15 20a5 5 0 0 1 6.5-4.8"/></svg>',
  user:P+'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  cog:P+'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
  qr:P+'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 21h-3v-3"/></svg>',
  task:P+'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  exam:P+'<path d="M9 3h6l1 3h3v15H5V6h3Z"/><path d="m9 13 2 2 4-4"/></svg>',
  grade:P+'<path d="M4 5h16v14H4Z"/><path d="M4 10h16M9 10v9M14 10v9"/></svg>',
  key:P+'<circle cx="8" cy="14" r="4"/><path d="M11 11 20 2M16 6l2 2M13 9l2 2"/></svg>',
  code:P+'<path d="M4 4h16v6H4ZM4 14h16v6H4Z"/><path d="M8 7h.01M8 17h.01"/></svg>',
  bank:P+'<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>',
  folder:P+'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>',
  map:P+'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
  plus:P+'<path d="M12 5v14M5 12h14"/></svg>',
  search:P+'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  go:P+'<path d="M3 12h18M13 6l6 6-6 6"/></svg>',
  back:P+'<path d="m15 5-7 7 7 7"/></svg>',
  down:P+'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
  up:P+'<path d="M12 3v12M7 8l5-5 5 5M4 21h16"/></svg>',
  chart:P+'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  edit:P+'<path d="M4 20h4l10-10-4-4L4 16Z"/></svg>',
  del:P+'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  chev:P+'<path d="m6 9 6 6 6-6"/></svg>',
  news:P+'<path d="M4 5h16v11H8l-4 4Z"/></svg>',
  out:P+'<path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/></svg>',
  xls:P+'<path d="M4 4h16v16H4Z"/><path d="M8 12h8M12 8v8"/></svg>',
  eye:P+'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  chat:P+'<path d="M4 5h16v11H8l-4 4Z"/><path d="M8 9h8M8 12h5"/></svg>',
  save:P+'<path d="M5 3h11l3 3v15H5Z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/></svg>'
};

/* ============ trạng thái ============ */
const S={dg:[],fs:null,auth:null,user:null,admin:false,sv:null,courses:[],hp:{},lop:[],ds:{},pwLop:{},acc:{},ma:null,loaded:false,open:{},q:"",pre:{}};
const LIB={xlsx:["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js","https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"]};
function lib(name){if(window.XLSX)return Promise.resolve(window.XLSX);return new Promise((ok,no)=>{let i=0;const next=()=>{if(i>=LIB[name].length)return no(new Error("Không tải được thư viện đọc Excel"));const s=document.createElement("script");s.src=LIB[name][i++];s.onload=()=>ok(window.XLSX);s.onerror=next;document.head.appendChild(s)};next()})}
const FV=()=>firebase.firestore.FieldValue;

/* ============ dữ liệu ============ */
async function loadCourses(){try{S.courses=await (await fetch(COURSES_URL,{cache:"no-store"})).json()}catch(e){S.courses=[]}}
async function loadHp(){try{(await S.fs.collection("pnl_hp").get()).docs.forEach(d=>{S.hp[d.id]=Object.assign({id:d.id},d.data()||{})})}catch(e){}
  Object.values(S.hp).forEach(h=>{if(!S.courses.some(c=>c.id===h.id))S.courses.push({id:h.id,name:h.name||h.id,c:h.c||"#1d5677",src:h.src||"",st:h.status||h.st||"",fb:true})})}
async function loadLop(){try{const all=(await S.fs.collection("pnl_dg_lop").get()).docs.map(d=>Object.assign({id:d.id},d.data()||{}));S.lop=all.filter(l=>!l.cha);S.dg=all.filter(l=>l.cha)}catch(e){S.lop=[];S.dg=[];console.warn("pnl_dg_lop",e&&e.code)}
  S.lop.sort((a,b)=>String(a.id).localeCompare(String(b.id),"vi"))}
/* ĐỢT KIỂM TRA ĐỊNH KỲ của lớp (18/11/2026): mỗi đề ra từ ngân hàng là một đợt riêng pnl_dg_lop/{lớp-HP} (cha = mã lớp, dùng danh sách SV của lớp),
   lớp cha ghi dgs:[mã đợt]. Lớp cũ có đề gắn thẳng vào lớp (đề Luật Dân sự, Kỹ năng tư vấn, đề NH cũ) vẫn là một đợt. */
const dgLaDe=l=>!!l&&!!l.hocPhan&&(l.hocPhan!=="nh"||!!l.deNh);
const dgHp=e=>(e.deNh&&e.deNh.hp)||lopHps(e)[0]||e.hocPhan||"";
const dgTen=e=>(e.deNh&&e.deNh.hpTen)||e.hocPhanTen||lopHpTen(e)||e.id;
const dgMs=t=>{if(!t)return null;const d=t.toDate?t.toDate():new Date(t);return isNaN(d)?null:d.getTime()};
function dgMo(e){if(!e||!e.open)return false;const n=Date.now(),a=dgMs(e.openAt),b=dgMs(e.closeAt);return !(a&&n<a)&&!(b&&n>b)}
async function dgGet(id){S.dg=S.dg||[];let e=S.dg.find(x=>x.id===id);if(e)return e;try{const d=await S.fs.doc("pnl_dg_lop/"+id).get();if(d.exists){e=Object.assign({id},d.data());S.dg.push(e)}}catch(x){}return e||null}
async function lopDgs(l){const xs=[];if(dgLaDe(l))xs.push(l);for(const id of (l.dgs||[])){const e=await dgGet(id);if(e)xs.push(e)}return xs}
async function loadDs(ma){if(S.ds[ma])return S.ds[ma];try{const d=(await S.fs.doc("pnl_dg_ds/"+ma).get()).data()||{};S.ds[ma]=d.rows||[];S.pwLop[ma]=d.matKhau||""}catch(e){S.ds[ma]=[];S.pwLop[ma]=""}return S.ds[ma]}
async function loadAcc(mssvs){const need=[...new Set(mssvs.map(normId))].filter(x=>x&&!(x in S.acc));
  for(let i=0;i<need.length;i+=10){await Promise.all(need.slice(i,i+10).map(async m=>{try{const d=await S.fs.doc("pnl_tk/"+m).get();S.acc[m]=d.exists?d.data():null}catch(e){S.acc[m]=null}}))}}
async function loadMa(){const ms=await S.fs.collection("pnl_ma").get();const out=[];
  await Promise.all(ms.docs.map(async d=>{const x=d.data()||{};let used=null;try{used=(await S.fs.collection("pnl_ma/"+d.id+"/luot").get()).size+(x.usedBefore|0)}catch(e){}
    out.push({code:d.id,note:x.note||"",han:x.han||"",max:x.max|0,courses:Array.isArray(x.courses)&&x.courses.length?x.courses:["*"],used,created:x.created||""})}));
  S.ma=out.sort((a,b)=>String(b.created).localeCompare(String(a.created)));return S.ma}
const courseOf=id=>S.courses.find(c=>c.id===id)||(id?{id,name:S.lop.find(l=>l.hocPhan===id)?.hocPhanTen||id,c:"#1d5677"}:null);
/* Học phần của lớp (18/11/2026): l.hps = các học phần gán cho lớp (sinh viên vào học không cần mã).
   l.hocPhan là LOẠI ĐỀ đánh giá định kỳ ("nh" = đề rút từ ngân hàng; mã cũ của trang danh-gia), không còn dùng làm học phần. */
const DG_HP={"luat-dan-su-tu-luan":"luat-dan-su","luat-dan-su":"luat-dan-su"};
function lopHps(l){if(!l)return [];if(Array.isArray(l.hps)&&l.hps.length)return l.hps.slice();const h=l.hocPhan;if(h==="nh")return l.deNh&&l.deNh.hp?[l.deNh.hp]:[];
  const m=DG_HP[h]||h;return m&&S.courses.some(c=>c.id===m)?[m]:[]}
const lopHpTen=l=>lopHps(l).map(id=>(S.courses.find(c=>c.id===id)||{}).name||id).join(", ")||l.hocPhanTen||"";
const courseHref=c=>c&&c.src?(c.src.startsWith("hp/")?HOME+"#"+c.id:"../"+c.src):(c?HOME+"#"+c.id:HOME);
const grpOf=l=>l.nhom||l.namHoc||"Khác";
const lopName=l=>l.id+(l.ten?" — "+l.ten:"");
const dgHref=ma=>DG+"#quan-tri"+(ma?"/"+encodeURIComponent(ma):"");
/* nhúng quản trị Đánh giá định kỳ ngay trong khung (iframe cùng nguồn, tự giãn chiều cao) */
const dgEmbed=(ma,view)=>`<iframe class="dgf" id="dgf" title="Đánh giá định kỳ" src="${DG}index.html?embed=1#quan-tri${ma?"/"+encodeURIComponent(ma)+(view?"/"+view:""):""}"></iframe>`;
window.addEventListener("message",e=>{const d=e.data;if(!d||!d.pnlEmbed)return;const f=$("#dgf");if(f&&d.h)f.style.height=Math.max(520,d.h+24)+"px"});

/* ============ khung trang ============ */
const RAIL=[["#home","home","Trang chủ quản trị","home"],["#lop","lop","Lớp","lop"],["#hocphan","hp","Học phần","hocphan"],["#malop","code","Mã lớp ôn tập","malop"],["#dg","de","Đề thi, đánh giá định kỳ","dg"],["#nganhang","bank","Ngân hàng câu hỏi","nganhang"],["#hethong","cog","Đồng bộ & quy tắc dữ liệu","hethong"],["#sinhvien","users","Sinh viên và tài khoản","sinhvien"],["#gopy","chat","Góp ý, báo lỗi","gopy"]];
function rail(items,wide,cur){return `<nav class="rail${wide?" wide":""}" aria-label="Điều hướng">
  ${wide?`<div class="brand"><div class="logo"><img src="../assets/logo.png" alt=""></div><div><b>PHÚC NGUYÊN</b><span>LIBRARY</span></div></div>`:`<a class="logo" href="${HOME}" aria-label="Về trang chủ Phúc Nguyên Library"><img src="../assets/logo.png" alt=""></a>`}
  ${items.map(([h,ic,t,k,soon])=>`<a href="${h}" class="${k&&k===cur?"on":""}" aria-label="${esc(t)}"${soon?' title="Sắp có"':""}>${I[ic]}${wide?`<span>${esc(t)}</span>`:`<span class="tip">${esc(t)}</span>`}</a>`).join("")}
  <span class="sp"></span>
  <a href="${HOME}" aria-label="Về trang chủ thư viện">${I.home}${wide?"<span>Thư viện</span>":'<span class="tip">Về trang chủ thư viện</span>'}</a>
</nav>`}
function who(name,role,ab){return `<div class="who"><div class="av" style="background:${avc(name)}">${esc(ab||initials(name))}</div><div><b>${esc(name)}</b><span>${esc(role)}</span></div><button type="button" class="out" data-out>${I.out}Đăng xuất</button></div>`}
function shell(cur,body,crumb){return `${rail(RAIL,false,cur)}<main><header class="top"><div class="crumb">${crumb||`<span class="pn">PHÚC NGUYÊN LIBRARY</span><span class="sep">/</span><span class="sub">Không gian quản trị</span>`}</div>${who(ADMIN_NAME,"Quản trị viên · Google","LH")}</header>${body}</main>`}
function bindOut(){const b=$("[data-out]");if(b)b.onclick=logout}
function keepFocus(sel){const i=$(sel);if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}

/* ============ đăng nhập ============ */
function viewLogin(msg){$("#app").innerHTML=`<div class="login"><div class="box">
  <section class="side"><div class="logo"><img src="../assets/logo.png" alt=""></div><h1>PHÚC NGUYÊN LIBRARY</h1><p><b>Lớp học</b> — một nơi cho việc học, kiểm tra, thi, điểm danh và kết quả của các lớp do giảng viên quản lý.</p>
    <ul><li><b>Sinh viên</b>: đăng nhập bằng <b>mã sinh viên</b> và <b>mật khẩu chung của lớp</b> do giảng viên cấp; sau đó tự đổi mật khẩu riêng.</li><li><b>Giảng viên, quản trị</b>: đăng nhập Google bằng tài khoản được cấp quyền.</li><li>Chỉ cần ôn tập theo mã lớp? <a href="${HOME}" style="color:#ffd97a">Về trang thư viện</a>.</li></ul></section>
  <section class="form"><h2>Đăng nhập</h2>
    <form id="f-sv" autocomplete="on"><div class="fld"><label for="sv-id">ID (mã sinh viên)</label><input id="sv-id" name="username" autocomplete="username" placeholder="VD: 2405CCLT001" required></div>
      <div class="fld"><label for="sv-pw">Mật khẩu</label><input id="sv-pw" name="password" type="password" autocomplete="current-password" placeholder="Mật khẩu chung của lớp hoặc mật khẩu đã đổi" required></div>
      <p class="err" id="sv-err">${esc(msg||"")}</p><button type="submit" class="btn pri" style="justify-content:center;padding:12px">Vào lớp học</button></form>
    <div class="or">hoặc</div>
    <button type="button" class="gbtn" id="b-google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4H24v8.1h12.7c-.3 2.1-1.7 5.3-4.8 7.4l7.4 5.7c4.4-4.1 7.2-10.1 7.2-17.2z"/><path fill="#FBBC05" d="M10.4 28.8A14.6 14.6 0 0 1 9.5 24c0-1.7.3-3.3.8-4.8l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.7 2.4-8.5 2.4-6.3 0-11.7-3.7-13.6-9.1l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>Giảng viên, quản trị: đăng nhập Google</button>
    <p class="err" id="g-err"></p></section></div></div>`;
  $("#f-sv").onsubmit=async e=>{e.preventDefault();const id=normId($("#sv-id").value),pw=$("#sv-pw").value;const err=$("#sv-err");err.textContent="";
    const btn=$("#f-sv button");btn.disabled=true;btn.textContent="Đang kiểm tra…";
    S.busy=true;try{await svLogin(id,pw);const cho=sessionStorage.getItem("pnl-dd-cho");sessionStorage.removeItem("pnl-dd-cho");if(cho){const c=JSON.parse(cho);location.hash="#dd/"+encodeURIComponent(c.buoiId)+"/"+c.code}
      else if(new URLSearchParams(location.search).get("ve")==="dg"){location.href=DG;return}else{location.href=HOME;return}S.busy=false;render()}
    catch(x){err.textContent=x.message||String(x)}finally{S.busy=false;btn.disabled=false;btn.textContent="Vào lớp học"}};
  /* đăng nhập chuyển từ ô trên trang chủ (mã SV + mật khẩu lớp): dùng một lần rồi xóa */
  try{const dn=sessionStorage.getItem("pnl-dn");if(dn){sessionStorage.removeItem("pnl-dn");const d=JSON.parse(dn);$("#sv-id").value=d.id||"";$("#sv-pw").value=d.pw||"";
    const f=$("#f-sv");if(f.requestSubmit)f.requestSubmit();else f.dispatchEvent(new Event("submit",{cancelable:true}))}}catch(e){}
  $("#b-google").onclick=async()=>{const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:"select_account",login_hint:FB_ADMIN_EMAILS[0]});$("#g-err").textContent="";
    try{const r=await S.auth.signInWithPopup(p);if(!fbIsAdmin(r.user)){const em=r.user.email;await S.auth.signOut();$("#g-err").textContent="Tài khoản "+em+" chưa được cấp quyền giảng viên/quản trị.";}}
    catch(x){$("#g-err").textContent="Không đăng nhập được: "+(x.message||x)}}}
/* Đăng nhập sinh viên: ghi pnl_phien/{uid} với băm mật khẩu; quy tắc Firestore chỉ cho ghi khi băm khớp pnl_tk/{mssv}.pw */
async function svLogin(id,pw){if(!/^[0-9A-Z]{4,16}$/.test(id))throw new Error("Mã sinh viên gồm 4–16 chữ/số không dấu.");
  let u=S.auth.currentUser;if(!u||!u.isAnonymous){if(u)await S.auth.signOut();u=(await S.auth.signInAnonymously()).user}
  const h=await pwHash(id,pw);
  try{await S.fs.doc("pnl_phien/"+u.uid).set({mssv:id,h,at:FV().serverTimestamp()})}
  catch(x){if(x.code==="permission-denied")throw new Error("Mã sinh viên hoặc mật khẩu chưa đúng. Mật khẩu lần đầu là mật khẩu chung của lớp do giảng viên cấp.");throw x}
  let a={};try{a=(await S.fs.doc("pnl_tk/"+id).get()).data()||{}}catch(e){}
  S.sv={mssv:id,hoTen:a.hoTen||id,lop:a.lop||[],lopNienChe:a.lopNienChe||"",pwDefault:a.pwDefault!==false,uid:u.uid,at:Date.now()};store.set(SV_KEY,S.sv);await grantHomeSession()}
async function svCheckSession(){/* phiên lưu trên máy còn hợp lệ? (cùng uid ẩn danh, còn phiên trên máy chủ) */
  if(!S.sv)return false;const u=S.auth.currentUser;if(!u||u.uid!==S.sv.uid){S.sv=null;store.del(SV_KEY);return false}
  try{const d=await S.fs.doc("pnl_phien/"+u.uid).get();if(!d.exists||d.data().mssv!==S.sv.mssv)throw 0;const a=(await S.fs.doc("pnl_tk/"+S.sv.mssv).get()).data()||{};Object.assign(S.sv,{hoTen:a.hoTen||S.sv.hoTen,lop:a.lop||[],pwDefault:a.pwDefault!==false});store.set(SV_KEY,S.sv);grantHomeSession().catch(()=>{});return true}
  catch(e){S.sv=null;store.del(SV_KEY);return false}}
async function grantHomeSession(){if(!S.sv)return;const hps=[];for(const ma of S.sv.lop){let l=S.lop.find(x=>x.id===ma);if(!l){try{const d=await S.fs.doc("pnl_dg_lop/"+ma).get();if(d.exists){l=Object.assign({id:ma},d.data());S.lop.push(l)}}catch(e){}}if(l)lopHps(l).forEach(h=>{if(!hps.includes(h))hps.push(h)})}
  store.set(HOME_KEY,{code:"SV-"+S.sv.mssv,label:S.sv.hoTen,han:"2099-12-31",courses:hps.length?hps:["*"],sv:true})}
async function logout(){if(S.admin){await S.auth.signOut()}else if(S.sv){try{await S.fs.doc("pnl_phien/"+S.sv.uid).delete()}catch(e){}}
  S.sv=null;store.del(SV_KEY);const h=store.get(HOME_KEY);if(h&&h.sv)store.del(HOME_KEY);location.hash="";render()}

/* ============ QUẢN TRỊ: trang chủ ============ */
function viewHome(){const nOpen=S.lop.filter(l=>!l.luuTru).length,nSv=S.lop.reduce((a,l)=>a+(l.siSo||0),0),nHp=S.courses.length,nMo=S.lop.filter(dgMo).length+(S.dg||[]).filter(dgMo).length;
  const tile=(h,ic,t,o)=>`<a href="${h}" class="tile${o&&o.soon?" soon":""}">${o&&o.badge?`<span class="badge ${o.badge[1]||""}">${o.badge[0]}</span>`:""}<span class="ic">${I[ic]}</span>${t}</a>`;
  const soon={soon:true,badge:["SẮP CÓ","gray"]};
  const body=`<div class="page">
    <div class="kpi"><div><b>${nOpen}</b><span>lớp đang quản lý</span></div><div><b>${nSv}</b><span>sinh viên trong các lớp</span></div><div><b>${nMo}</b><span>lớp đang mở đánh giá định kỳ</span></div><div><b>${nHp}</b><span>học phần trong thư viện</span></div></div>
    <section><h2 class="sec">Quản lý học tập</h2><div class="grid4">
      ${tile("#lop","lop","Quản lý lớp")}
      ${tile("#lop","qr","Điểm danh QR")}
      ${tile("#lop","task","Bài tập")}
      ${tile("#dg","exam","Kiểm tra &amp; Thi")}
      ${tile("#dg","grade","Bảng điểm")}
      ${tile("#home","key","Giảng viên &amp; phân quyền",soon)}
      ${tile("#sinhvien","user","Sinh viên &amp; tài khoản")}
      ${tile("#malop","code","Mã lớp ôn tập (khách)")}
    </div></section>
    <section><h2 class="sec">Nội dung &amp; công cụ</h2><div class="grid4">
      ${tile("#hocphan","hp","Học phần ("+nHp+")")}
      ${tile("#nganhang","bank","Ngân hàng câu hỏi")}${tile("#hethong","cog","Đồng bộ & quy tắc dữ liệu",typeof RS!=="undefined"&&RS.ok===false?{badge:["cần cập nhật","bad"]}:null)}
      ${tile(HOME+"#home","folder","Tài liệu – giáo trình")}
      ${tile(HOME+"#home","map","Mind map &amp; tóm tắt")}
      ${tile("#gopy","chat","Góp ý, báo lỗi")}
      ${tile(HOME+"#qt-sl","save","Sao lưu dữ liệu")}
    </div></section>
    <section><h2 class="sec">Truy cập nhanh</h2><div class="grid4">
      <a href="#lop" class="quick"><span class="ic" style="background:#e6f4ea;color:#1b7a3d">${I.qr}</span><div><b>Mở điểm danh hôm nay</b><span>Chọn lớp → tab Điểm danh → Mở buổi</span></div></a>
      <button type="button" class="quick" data-import><span class="ic" style="background:#fdf1dc;color:#9a6200">${I.xls}</span><div><b>Nhập danh sách lớp</b><span>Từ Excel, tự tạo tài khoản SV</span></div></button>
      <a href="#sinhvien" class="quick"><span class="ic" style="background:#eaf1f6;color:#1d5677">${I.search}</span><div><b>Tìm kiếm</b><span>Lớp, sinh viên, học phần</span></div></a>
      <a href="#sv" class="quick hl"><span class="ic" style="background:#1d5677;color:#fff">${I.go}</span><div><b>Xem như sinh viên</b><span>Kiểm tra giao diện SV thấy gì</span></div></a>
    </div></section></div>`;
  $("#app").innerHTML=shell("home",body);bindOut();$("[data-import]").onclick=()=>dlgLop(null,true)}

/* ============ QUẢN TRỊ: danh sách lớp ============ */
function viewLop(){const q=strip(S.q);const arch=location.hash.includes("/luu-tru");
  const list=S.lop.filter(l=>!!l.luuTru===arch).filter(l=>!q||strip(lopName(l)+" "+lopHpTen(l)+" "+grpOf(l)).includes(q));
  const groups={};list.forEach(l=>{(groups[grpOf(l)]=groups[grpOf(l)]||[]).push(l)});
  const gkeys=Object.keys(groups).sort((a,b)=>b.localeCompare(a,"vi"));
  const card=l=>`<div class="card" data-lop="${esc(l.id)}" tabindex="0" role="link"><button type="button" class="dots" data-menu="${esc(l.id)}" aria-label="Thao tác với lớp">···</button><b class="nm" title="${esc(lopName(l))}">${esc(lopName(l))}</b>
    <span class="meta"><span>Sĩ số: <strong>${l.siSo||0}</strong></span><span>Buổi: <strong>${l.buoi||0}</strong></span><span>Điểm: <strong>${l.diemKhoa?"đã khóa":(l.siSo?"đang mở":"—")}</strong></span></span>
    <span class="meta" style="margin-top:8px"><span>${esc(lopHpTen(l))}</span>${l.open?'<span class="pill">ĐGĐK đang mở</span>':""}${l.thu?'<span class="pill gray">lớp thử</span>':""}</span></div>`;
  const body=`<div class="page">
    <div class="bar"><div><h1 class="t">${arch?"Lớp lưu trữ":"Danh sách lớp"}</h1><span class="t-sub">${S.lop.filter(l=>!l.luuTru).length} lớp đang mở · ${S.lop.filter(l=>l.luuTru).length} lớp lưu trữ</span></div>
      <div class="tools"><button type="button" class="btn pri" data-add>${I.plus}Thêm lớp</button><button type="button" class="btn" data-import>${I.xls}Nhập danh sách từ Excel</button><a class="btn" href="${arch?"#lop":"#lop/luu-tru"}">${arch?"Lớp đang mở":"Lưu trữ ("+S.lop.filter(l=>l.luuTru).length+")"}</a></div></div>
    <div class="tools"><label class="search"><span class="sr">Tìm lớp</span><input type="search" id="q" value="${esc(S.q)}" placeholder="Tìm theo tên lớp, mã lớp, học phần…"></label></div>
    ${!S.lop.length?`<div class="empty">Chưa có lớp nào. Bấm <b>Thêm lớp</b> hoặc <b>Nhập danh sách từ Excel</b> để bắt đầu.</div>`:!list.length?`<div class="empty">Không có lớp nào khớp.</div>`:
      gkeys.map(g=>`<section><button type="button" class="grp${S.open[g]===false?" closed":""}" data-grp="${esc(g)}">${I.chev}${esc(g)} <span class="n">(${groups[g].length} lớp)</span></button><div class="grid4"${S.open[g]===false?" hidden":""}>${groups[g].map(card).join("")}</div></section>`).join("")}
    <p class="note">Nhóm lớp theo <b>năm học</b> (hoặc tên nhóm sếp đặt khi sửa lớp). Bấm vào thẻ lớp để xem danh sách sinh viên; dấu ··· để sửa, đổi mật khẩu chung, lưu trữ, xóa.</p></div>`;
  $("#app").innerHTML=shell("lop",body);bindOut();
  $("#q").oninput=e=>{S.q=e.target.value;viewLop();keepFocus("#q")};
  $("[data-add]").onclick=()=>dlgLop(null);$("[data-import]").onclick=()=>dlgLop(null,true);
  $$("[data-grp]").forEach(b=>b.onclick=()=>{const g=b.dataset.grp;S.open[g]=S.open[g]===false;viewLop()});
  $$("[data-lop]").forEach(c=>{const go=()=>location.hash="#lop/"+encodeURIComponent(c.dataset.lop);c.onclick=e=>{if(e.target.closest("[data-menu]"))return;go()};c.onkeydown=e=>{if(e.key==="Enter")go()}});
  $$("[data-menu]").forEach(b=>b.onclick=e=>{e.stopPropagation();const l=S.lop.find(x=>x.id===b.dataset.menu);openMenu(b,[["Xem danh sách sinh viên",()=>location.hash="#lop/"+encodeURIComponent(l.id)],["Sửa thông tin, mật khẩu chung",()=>dlgLop(l)],["Đánh giá định kỳ của lớp",()=>location.hash="#lop/"+encodeURIComponent(l.id)+"/bt"],
    [l.diemKhoa?"Mở lại điểm":"Khóa điểm",()=>saveLop(l.id,{diemKhoa:!l.diemKhoa})],[l.luuTru?"Đưa về lớp đang mở":"Chuyển vào lưu trữ",()=>saveLop(l.id,{luuTru:!l.luuTru})],["Xóa lớp…",()=>delLop(l),"danger"]])})}
function openMenu(anchor,items){closeMenu();const m=document.createElement("div");m.className="menu";m.innerHTML=items.map(([t,,cls],i)=>`<button type="button" data-i="${i}" class="${cls||""}">${esc(t)}</button>`).join("");document.body.appendChild(m);
  const r=anchor.getBoundingClientRect();m.style.top=(r.bottom+window.scrollY+4)+"px";m.style.left=Math.min(r.left+window.scrollX,window.innerWidth-230)+"px";
  m.querySelectorAll("button").forEach(b=>b.onclick=()=>{closeMenu();items[+b.dataset.i][1]()});setTimeout(()=>document.addEventListener("click",closeMenu,{once:true}),0)}
function closeMenu(){$$(".menu").forEach(m=>m.remove())}
async function saveLop(ma,part){try{await S.fs.doc("pnl_dg_lop/"+ma).set(part,{merge:true});Object.assign(S.lop.find(l=>l.id===ma)||{},part);toast("Đã lưu.");render()}catch(x){toast("Chưa lưu được: "+errMsg(x))}}
async function delLop(l){const ok=await confirmDlg("Xóa lớp "+lopName(l)+"?","Xóa toàn bộ danh sách sinh viên, các đợt kiểm tra định kỳ (đề, bài làm, điểm) của lớp này. Tài khoản sinh viên chỉ bị gỡ khỏi lớp. Không khôi phục được.","Xóa lớp");if(!ok)return;
  try{const db=S.fs;const refs=[];for(const c of ["pnl_dg_sv","pnl_dg_bai","pnl_dg_cham"]){(await db.collection(c).where("maLop","==",l.id).get()).docs.forEach(d=>refs.push(d.ref))}
    const rows=await loadDs(l.id);await loadAcc(rows.map(r=>r.mssv));
    for(const r of rows){const a=S.acc[normId(r.mssv)];if(a&&Array.isArray(a.lop)&&a.lop.includes(l.id)){const lop=a.lop.filter(x=>x!==l.id);a.lop=lop;refs.push({_set:db.doc("pnl_tk/"+normId(r.mssv)),data:{lop}})}}
    refs.push(db.doc("pnl_dg_ds/"+l.id),db.doc("pnl_dg_lop/"+l.id));
    for(const id of (l.dgs||[])){for(const c of ["pnl_dg_bai","pnl_dg_cham"]){(await db.collection(c).where("maLop","==",id).get()).docs.forEach(d=>refs.push(d.ref))}refs.push(db.doc("pnl_dg_de/"+id),db.doc("pnl_dg_dap/"+id),db.doc("pnl_dg_lop/"+id))}
    for(let i=0;i<refs.length;i+=400){const b=db.batch();refs.slice(i,i+400).forEach(r=>r._set?b.set(r._set,r.data,{merge:true}):b.delete(r));await b.commit()}
    S.lop=S.lop.filter(x=>x.id!==l.id);S.dg=(S.dg||[]).filter(x=>x.cha!==l.id);delete S.ds[l.id];toast("Đã xóa lớp "+l.id);location.hash="#lop";render()}catch(x){toast("Chưa xóa được: "+errMsg(x))}}

/* hộp thoại thêm / sửa lớp (kèm nhập Excel). Mật khẩu chung của lớp lưu ở pnl_dg_ds (chỉ quản trị đọc) */
async function dlgLop(l,withImport,preset){const dlg=$("#dlg");const isNew=!l;if(l)await loadDs(l.id);const years=[...new Set(S.lop.map(grpOf))];const y=new Date();const yh=(y.getMonth()>=7?y.getFullYear():y.getFullYear()-1);const defYear="HK"+(y.getMonth()>=7||y.getMonth()<1?"1":"2")+" "+yh+"–"+(yh+1);
  const curPw=l?(S.pwLop[l.id]||""):"";preset=preset||{};
  dlg.className=withImport?"wide":"";dlg.innerHTML=`<div class="dh"><h3>${isNew?(withImport?"Thêm lớp và nhập danh sách sinh viên":"Thêm lớp"):"Sửa thông tin lớp"}</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <form id="f-lop"><div class="row2">
    <div class="fld"><label for="l-ma">Mã lớp *</label><input id="l-ma" value="${esc(l?l.id:"")}" ${l?"readonly":""} placeholder="VD: CCCT.01" required><span class="hint">Chữ không dấu, số, dấu . _ -; sinh viên dùng mã này ở Đánh giá định kỳ.</span></div>
    <div class="fld"><label for="l-ten">Tên lớp</label><input id="l-ten" value="${esc(l?l.ten||"":"")}" placeholder="VD: Công chứng Liên thông"></div></div>
    <div class="row2"><div class="fld"><label>Học phần của lớp * <span class="hint" style="font-weight:400">(chọn một hoặc nhiều — sinh viên đăng nhập là vào học được)</span></label><div class="hpchk" id="l-hp">${S.courses.map(c=>`<label><input type="checkbox" value="${esc(c.id)}"${(l?lopHps(l):[preset.hocPhan]).includes(c.id)?" checked":""}> ${esc(c.name)}</label>`).join("")}</div></div>
    <div class="fld"><label for="l-nam">Năm học / nhóm *</label><input id="l-nam" list="l-years" value="${esc(l?grpOf(l):defYear)}" required><datalist id="l-years">${years.map(v=>`<option value="${esc(v)}">`).join("")}</datalist><span class="hint">Lớp được xếp nhóm theo ô này ở Danh sách lớp.</span></div></div>
    <div class="row2"><div class="fld"><label for="l-pw">Mật khẩu chung của lớp ${isNew?"*":""}</label><input id="l-pw" value="${esc(curPw)}" ${isNew?"required":""} minlength="4" maxlength="32" autocomplete="off" placeholder="VD: ccct2026"><span class="hint">${isNew?"Sinh viên đăng nhập lần đầu bằng ID = mã SV và mật khẩu này.":"Đổi ở đây thì sinh viên <b>chưa tự đổi mật khẩu</b> sẽ dùng mật khẩu mới; ai đã đổi riêng không bị ảnh hưởng."}</span></div>
    <div class="fld"><label for="l-tg">Thời gian làm bài ĐGĐK (phút)</label><input id="l-tg" type="number" min="5" max="180" value="${esc(l&&l.thoiGian||40)}"></div></div>
    <div class="fld"><label for="l-nc">Ghi chú</label><input id="l-nc" value="${esc(l?l.ghiChu||"":"")}" placeholder="VD: lớp liên thông, học tối"></div>
    ${withImport?`<div class="fld"><label>Danh sách sinh viên (Excel/CSV: cột Mã SV, Họ tên, Ngày sinh, Lớp)</label><div class="drop" id="drop">Kéo thả file vào đây hoặc <label style="color:var(--navy);font-weight:600;cursor:pointer">chọn file<input type="file" id="l-file" accept=".xlsx,.xls,.csv,.txt" class="sr"></label><br><span class="hint">Nhận file bảng điểm / danh sách lớp tải từ APAG. Mỗi sinh viên được tạo tài khoản ID = mã SV với mật khẩu chung của lớp.</span></div><div id="prev"></div></div>`:""}
    <p class="err" id="l-err"></p><div class="df"><button type="button" class="btn" data-x>Hủy</button><button type="submit" class="btn pri">${isNew?"Tạo lớp":"Lưu"}</button></div></form>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());
  let rows=[];
  if(withImport){const onFile=async f=>{if(!f)return;try{rows=await readRoster(f);$("#prev").innerHTML=previewRows(rows);$("#l-err").textContent="";const inf=rows.info||{};
      if(inf.tenLopTc&&!$("#l-ten").value)$("#l-ten").value=inf.tenLopTc;if(inf.hocKy)$("#l-nam").value=inf.hocKy;
      if(inf.tenMon&&!$$("#l-hp input:checked").length){const c=S.courses.find(c=>strip(c.name)===strip(inf.tenMon))||S.courses.find(c=>strip(inf.tenMon).includes(strip(c.name))||strip(c.name).includes(strip(inf.tenMon)));if(c){const cb=$(`#l-hp input[value="${c.id}"]`);if(cb)cb.checked=true}}
      if(!$("#l-ma").value&&inf.tenLopTc){$("#l-ma").value=normMa(inf.tenLopTc.replace(/[^A-Za-z0-9]+/g,".").slice(0,20))}}
    catch(x){$("#l-err").textContent=x.message||String(x)}};
    $("#l-file").onchange=e=>onFile(e.target.files[0]);const dz=$("#drop");dz.ondragover=e=>{e.preventDefault();dz.classList.add("on")};dz.ondragleave=()=>dz.classList.remove("on");dz.ondrop=e=>{e.preventDefault();dz.classList.remove("on");onFile(e.dataTransfer.files[0])}}
  $("#f-lop").onsubmit=async e=>{e.preventDefault();const err=$("#l-err");err.textContent="";const ma=normMa($("#l-ma").value);if(ma.length<2){err.textContent="Mã lớp cần ít nhất 2 ký tự.";return}
    const hps=$$("#l-hp input:checked").map(x=>x.value);if(!hps.length){err.textContent="Chọn ít nhất một học phần.";return}const hp=courseOf(hps[0]);const pw=$("#l-pw").value.trim();if(isNew&&pw.length<4){err.textContent="Mật khẩu chung từ 4 ký tự.";return}
    const data={ten:$("#l-ten").value.trim(),hps,namHoc:$("#l-nam").value.trim(),nhom:$("#l-nam").value.trim(),thoiGian:+$("#l-tg").value||40,ghiChu:$("#l-nc").value.trim()};
    const btn=$("button[type=submit]",dlg);btn.disabled=true;
    try{const ref=S.fs.doc("pnl_dg_lop/"+ma);if(isNew){if((await ref.get()).exists)throw new Error("Mã lớp này đã có.");data.created=FV().serverTimestamp();data.siSo=0;data.open=false;data.hocPhan="nh";data.hocPhanTen=hp.name}
      await ref.set(data,{merge:true});const cur=S.lop.find(x=>x.id===ma);if(cur)Object.assign(cur,data);else S.lop.push(Object.assign({id:ma},data));
      if(pw&&pw!==curPw){await S.fs.doc("pnl_dg_ds/"+ma).set({matKhau:pw},{merge:true});S.pwLop[ma]=pw;if(!isNew)await rehashDefault(ma,pw)}
      if(withImport&&rows.length)await saveRoster(ma,rows,true);
      dlg.close();toast(isNew?"Đã tạo lớp "+ma+(rows.length?" với "+rows.length+" sinh viên.":"."):"Đã lưu.");location.hash="#lop/"+encodeURIComponent(ma);render()}
    catch(x){err.textContent="Chưa lưu được: "+errMsg(x)}finally{btn.disabled=false}}}
/* đổi mật khẩu chung → cập nhật băm cho tài khoản còn dùng mật khẩu chung (pwDefault) của lớp */
async function rehashDefault(ma,pw){const rows=await loadDs(ma);await loadAcc(rows.map(r=>r.mssv));const db=S.fs;let b=db.batch(),n=0;
  for(const r of rows){const k=normId(r.mssv);const a=S.acc[k];if(!a||a.pwDefault===false||(a.lopPw&&a.lopPw!==ma))continue;const h=await pwHash(k,pw);a.pw=h;a.lopPw=ma;b.set(db.doc("pnl_tk/"+k),{pw:h,pwDefault:true,lopPw:ma},{merge:true});if(++n%400===0){await b.commit();b=db.batch()}}
  if(n%400)await b.commit()}

/* đọc danh sách từ Excel/CSV (nhận file Export excel của APAG hoặc Excel/CSV thường) */
async function readRoster(file){let grid=[];if(/\.(csv|txt)$/i.test(file.name)){const t=await file.text();grid=t.split(/\r?\n/).map(r=>r.split(/[;,\t]/).map(c=>c.replace(/^"|"$/g,"").trim()))}
  else{const X=await lib("xlsx");const wb=X.read(await file.arrayBuffer(),{type:"array",cellDates:true});const ws=wb.Sheets[wb.SheetNames[0]];grid=X.utils.sheet_to_json(ws,{header:1,raw:false,defval:""}).map(r=>r.map(c=>String(c==null?"":c).trim()))}
  const nz=s=>strip(s).replace(/[^a-z0-9]/g,"");let hi=-1,cM=-1,cT=-1,cH=-1,cN=-1,cD=-1,cL=-1;const info={};
  for(let i=0;i<Math.min(grid.length,25);i++){grid[i].forEach(c=>{const s=String(c||"").replace(/\s+/g," ").trim();let m;
      if((m=s.match(/^Tên môn\s*:\s*(.+)$/i)))info.tenMon=m[1].trim();else if((m=s.match(/^Tên lớp tc\s*:\s*(.+)$/i)))info.tenLopTc=m[1].trim();else if((m=s.match(/^Học kỳ\s*\/\s*Năm học\s*:\s*(.+)$/i)))info.hocKy=m[1].trim()});
    if(hi<0){const r=grid[i].map(nz);const m=r.findIndex(x=>/^(mssv|masv|masinhvien|msv|masosinhvien|id|ma)$/.test(x));
      if(m>=0){hi=i;cM=m;r.forEach((x,j)=>{if(/^(hovaten|hoten|hotensinhvien|hovatensinhvien)$/.test(x))cT=j;else if(/^(ho|hodem|holot|hovatendem)$/.test(x))cH=j;else if(x==="ten")cN=j;else if(/ngaysinh|namsinh/.test(x))cD=j;else if(/^(lop|lopnienche|lophc|lophanhchinh|lopsinhhoat|lopsh)$/.test(x))cL=j})}}}
  const OKMS=s=>/^[0-9A-Z]{4,16}$/.test(s)&&/\d/.test(s);const rows=[],seen=new Set();
  grid.slice(hi+1).forEach(r=>{let mssv,ten,ns="",lop="";
    if(hi>=0){mssv=r[cM];ten=cT>=0?r[cT]:[cH>=0?r[cH]:"",cN>=0?r[cN]:""].join(" ");ns=cD>=0?r[cD]:"";lop=cL>=0?r[cL]:""}
    else{const c=r.map(x=>String(x||"").trim());const k=c.findIndex(x=>OKMS(normId(x)));if(k<0)return;mssv=c[k];ten=c.find((x,j)=>j!==k&&x&&!/\d/.test(x))||"";ns=c.find((x,j)=>j!==k&&/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(x))||""}
    mssv=normId(mssv);ten=String(ten||"").replace(/\s+/g," ").trim();if(!OKMS(mssv)||!ten||seen.has(mssv))return;seen.add(mssv);
    const row={mssv,hoTen:ten};if(ns)row.ngaySinh=String(ns).trim();if(lop)row.lopNienChe=String(lop).trim();rows.push(row)});
  if(!rows.length)throw new Error("Không đọc được sinh viên nào. Hãy để dòng tiêu đề có cột 'Mã SV' (hoặc MSSV) và 'Họ và tên'.");rows.info=info;return rows}
function previewRows(rows){return `<p class="note" style="margin:8px 0">Đọc được <b>${rows.length}</b> sinh viên:</p><div class="prev"><table><thead><tr><th>STT</th><th>Mã SV</th><th>Họ tên</th><th>Ngày sinh</th><th>Lớp</th></tr></thead><tbody>${rows.slice(0,200).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.mssv)}</td><td>${esc(r.hoTen)}</td><td>${esc(r.ngaySinh||"")}</td><td>${esc(r.lopNienChe||"")}</td></tr>`).join("")}</tbody></table></div>`}
/* ghi danh sách lớp: pnl_dg_ds (bản đầy đủ), pnl_dg_sv/{ma__mssv} (cho ĐGĐK), pnl_tk/{mssv} (tài khoản, mật khẩu chung của lớp), siSo */
async function saveRoster(ma,rows,merge){const db=S.fs;const old=merge?await loadDs(ma):(await loadDs(ma),[]);const pw=S.pwLop[ma]||"";const map=new Map((merge?old:[]).map(r=>[normId(r.mssv),r]));
  rows.forEach(r=>{const k=normId(r.mssv);map.set(k,Object.assign({},map.get(k)||{},r,{mssv:k}))});const all=[...map.values()];
  await loadAcc(all.map(r=>r.mssv));const ops=[];
  for(const r of all){const k=normId(r.mssv);ops.push(b=>b.set(db.doc("pnl_dg_sv/"+ma+"__"+k),{maLop:ma,mssv:k,hoTen:r.hoTen},{merge:true}));
    const a=S.acc[k];if(!a){if(!pw)continue;const acc={mssv:k,hoTen:r.hoTen,lop:[ma],lopPw:ma,pw:await pwHash(k,pw),pwDefault:true,created:FV().serverTimestamp()};if(r.lopNienChe)acc.lopNienChe=r.lopNienChe;S.acc[k]=acc;ops.push(b=>b.set(db.doc("pnl_tk/"+k),acc))}
    else{const lop=Array.isArray(a.lop)?a.lop.slice():[];const part={hoTen:r.hoTen};if(!lop.includes(ma)){lop.push(ma);part.lop=lop}if(r.lopNienChe&&!a.lopNienChe)part.lopNienChe=r.lopNienChe;Object.assign(a,part);ops.push(b=>b.set(db.doc("pnl_tk/"+k),part,{merge:true}))}}
  if(!merge){const keep=new Set(all.map(r=>normId(r.mssv)));(S.ds[ma]||[]).forEach(r=>{const k=normId(r.mssv);if(!keep.has(k))ops.push(b=>b.delete(db.doc("pnl_dg_sv/"+ma+"__"+k)))})}
  ops.push(b=>b.set(db.doc("pnl_dg_ds/"+ma),{rows:all,updated:FV().serverTimestamp()},{merge:true}));ops.push(b=>b.set(db.doc("pnl_dg_lop/"+ma),{siSo:all.length},{merge:true}));
  for(let i=0;i<ops.length;i+=400){const b=db.batch();ops.slice(i,i+400).forEach(f=>f(b));await b.commit()}
  S.ds[ma]=all;const l=S.lop.find(x=>x.id===ma);if(l)l.siSo=all.length}

/* ============ QUẢN TRỊ: chi tiết lớp ============ */
async function viewLopDetail(ma,tab,dgId){const l=S.lop.find(x=>x.id===ma);if(!l){$("#app").innerHTML=shell("lop",`<div class="page"><div class="empty">Không tìm thấy lớp <b>${esc(ma)}</b>. <a href="#lop">Về danh sách lớp</a></div></div>`);bindOut();return}
  tab=tab||"sv";const hp=courseOf(lopHps(l)[0]);const crumb=`<a class="back" href="#lop">${I.back}Quay lại</a><span class="sep">/</span><span class="sub">${tab==="sv"?"Danh sách sinh viên":"Lớp"}: ${esc(lopName(l))}</span>`;
  $("#app").innerHTML=shell("lop",`<div class="page"><div class="empty">Đang tải danh sách lớp…</div></div>`,crumb);bindOut();
  const rows=await loadDs(ma);await loadAcc(rows.map(r=>r.mssv));const pw=S.pwLop[ma]||"";
  const q=strip(S.q);const list=rows.filter(r=>!q||strip(r.mssv+" "+r.hoTen+" "+(r.lopNienChe||"")).includes(q));
  const sub=[["sv","user","Danh sách sinh viên"],["dd","qr","Điểm danh &amp; chuyên cần"],["btap","task","Bài tập"],["de","de","Ra đề từ ngân hàng"],["bt","exam","Kiểm tra, thi (ĐGĐK)"],["bd","grade","Bảng điểm"],["tk","chart","Thống kê"],["hp","hp","Học phần &amp; tài liệu của lớp"],["bt2","news","Bảng tin"]];
  const subnav=`<aside class="subnav">${sub.map(([k,ic,t,soon])=>`<a href="#lop/${encodeURIComponent(ma)}/${k}" class="${tab===k?"on":""}">${I[ic]}${t}${soon?'<span class="soon">sắp có</span>':""}</a>`).join("")}</aside>`;
  const head=`<div class="bar"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><h1 class="t">${esc(l.ten||l.id)}</h1><span class="pill gray">${esc(grpOf(l))}</span><span class="pill ${l.diemKhoa?"gray":""}">${l.diemKhoa?"Điểm đã khóa":"Điểm đang mở"}</span>${(l.dgs||[]).some(id=>dgMo((S.dg||[]).find(x=>x.id===id)))||dgMo(l)?'<span class="pill live">ĐGĐK đang mở</span>':""}</div>
    <div class="tools"><button type="button" class="btn sm" data-export>${I.down}Xuất danh sách</button><a class="btn sm" href="#lop/${encodeURIComponent(ma)}/bd">${I.chart}Bảng điểm</a><button type="button" class="btn sm" data-import>${I.up}Nhập Excel</button><button type="button" class="btn sm pri" data-add>${I.plus}Thêm</button></div></div>`;
  let content="";
  if(tab==="sv"){const nAcc=rows.filter(r=>S.acc[normId(r.mssv)]).length;content=`${head}
    <div class="tools" style="align-items:center"><span class="t-sub">Học phần: <b style="color:var(--ink)">${esc(lopHpTen(l))}</b> · Mã lớp: <b style="color:var(--ink)">${esc(l.id)}</b> · Mật khẩu chung: ${pw?`<b style="color:var(--ink)" data-pw>••••••</b> <button type="button" class="btn sm" data-showpw style="padding:3px 8px">${I.eye}Hiện</button>`:'<span class="pill bad">chưa đặt</span>'} <button type="button" class="btn sm" data-editlop style="padding:3px 8px">${I.edit}Sửa lớp</button></span>
      <label class="search" style="flex:1 1 260px"><span class="sr">Tìm sinh viên</span><input type="search" id="q" value="${esc(S.q)}" placeholder="Tìm theo mã SV, tên, lớp niên chế…"></label></div>
    ${!pw?`<div class="empty" style="text-align:left;border-color:var(--warn);background:var(--warn-soft);color:var(--warn)">Lớp chưa có <b>mật khẩu chung</b> nên chưa tạo được tài khoản cho sinh viên. Bấm <b>Sửa lớp</b> để đặt; tài khoản sẽ được tạo cho ${rows.length} sinh viên đang có.</div>`:(nAcc<rows.length?`<div class="tools" style="align-items:center"><span class="t-sub">${rows.length-nAcc} sinh viên chưa có tài khoản.</span><button type="button" class="btn sm pri" data-mkacc>${I.key}Tạo tài khoản còn thiếu</button></div>`:"")}
    ${!rows.length?`<div class="empty">Lớp chưa có sinh viên. Bấm <b>Nhập Excel</b> (file danh sách / bảng điểm APAG) hoặc <b>Thêm</b> từng người.</div>`:`<div class="tbl"><table><thead><tr><th>STT</th><th>Họ và tên <span style="font-weight:500;text-transform:none;letter-spacing:0">· Sĩ số ${rows.length}</span></th><th>Ngày sinh</th><th>Có mặt</th><th>Kiểm tra / thi</th><th>Tài khoản</th><th class="acts">Hành động</th></tr></thead><tbody>
      ${list.map((r,i)=>{const a=S.acc[normId(r.mssv)];return `<tr><td>${i+1}</td><td><div class="sv"><div class="av" style="background:${avc(r.hoTen)}">${esc(initials(r.hoTen))}</div><div><b>${esc(r.hoTen)}</b><span>ID: ${esc(r.mssv)}${r.lopNienChe?" · "+esc(r.lopNienChe):""}</span></div></div></td><td>${esc(r.ngaySinh||"—")}</td><td><span class="pill gray">—</span></td><td><a href="#lop/${encodeURIComponent(ma)}/bd" class="pill gray" title="Xem bảng điểm">xem điểm</a></td>
        <td>${!a?'<span class="pill bad">chưa có</span>':a.pwDefault===false?'<span class="pill">đã đổi MK riêng</span>':'<span class="pill warn">MK chung của lớp</span>'}</td>
        <td class="acts"><button type="button" class="ico" data-edit="${esc(r.mssv)}" aria-label="Sửa" title="Sửa">${I.edit}</button> <button type="button" class="ico key" data-reset="${esc(r.mssv)}" aria-label="Đặt lại mật khẩu về mật khẩu chung" title="Đặt lại về mật khẩu chung của lớp">${I.key}</button> <button type="button" class="ico del" data-del="${esc(r.mssv)}" aria-label="Xóa khỏi lớp" title="Xóa khỏi lớp">${I.del}</button></td></tr>`}).join("")}</tbody></table></div>`}
    <p class="note">Sinh viên đăng nhập <a href="./">Lớp học</a> bằng <b>ID = mã sinh viên</b> và mật khẩu chung của lớp, sau đó tự đổi mật khẩu riêng; <b>Đặt lại</b> đưa về mật khẩu chung. Cột <b>Có mặt</b> sẽ có số liệu khi mở Điểm danh.</p>`}
  else if(tab==="de"){content=await tabDeThi(l,head,ma)}
  else if(tab==="bt"||tab==="bd"||tab==="tk"){const dgs=await lopDgs(l);const cur=dgs.find(e=>e.id===dgId)||dgs[0]||null;
    const chips=dgs.length>1||(dgs.length&&tab!=="bt")?`<div class="tools" style="align-items:center"><span class="t-sub">Đợt kiểm tra:</span>${dgs.map(e=>`<a class="btn sm${cur&&e.id===cur.id?" pri":""}" href="#lop/${encodeURIComponent(ma)}/${tab}/${encodeURIComponent(e.id)}">${esc(dgTen(e))} · ${esc(e.id)}${dgMo(e)?" ●":""}</a>`).join("")}</div>`:"";
    content=`${head}${chips}<p class="note">${tab==="bt"?(cur?`Mở/đóng đợt <b>${esc(cur.id)}</b> (${esc(dgTen(cur))}), thời gian và bài làm — quản trị ngay tại đây. Đề: <b>${esc(cur.deNh?cur.deNh.mota:(cur.hocPhanTen||cur.hocPhan))}</b> · <a href="#lop/${encodeURIComponent(ma)}/de">Ra thêm đề từ ngân hàng</a>`:`Lớp chưa có đợt kiểm tra định kỳ nào. <a href="#lop/${encodeURIComponent(ma)}/de">Ra đề từ ngân hàng</a> — mỗi đề lưu là một đợt, gán thẳng cho lớp.`)
      :tab==="bd"?`Danh sách và điểm theo mẫu APAG, xuất Excel${cur?" — điểm kiểm tra định kỳ lấy từ đợt <b>"+esc(cur.id)+"</b>":""}; điểm kiểm tra thường xuyên tính từ điểm danh của lớp.`:"Phổ điểm và thống kê câu hỏi của đợt kiểm tra."}</p>${tab==="bt"&&!cur?"":dgEmbed(cur?cur.id:ma,tab==="bt"?"cai-dat":tab==="tk"?"thong-ke":"")}`}
  else if(tab==="hp"){const cs=lopHps(l).map(courseOf).filter(Boolean);content=`${head}<section><h2 class="sec">Học phần của lớp <button type="button" class="btn sm" data-editlop style="margin-left:8px">${I.edit}Gán học phần</button></h2>${cs.length?`<div class="grid4">${cs.map(hp=>`<article class="hp"><div class="cover" style="background:${esc(hp.c||"#1d5677")}">${esc(hp.name)}</div><div class="body"><div class="tags">${["Tóm tắt","Mind map","Câu hỏi","Tình huống","Thi thử","Văn bản"].map(t=>`<span class="tag">${t}</span>`).join("")}</div><div class="act"><a href="#hocphan/${encodeURIComponent(hp.id)}">Quản trị học phần</a><a href="${courseHref(hp)}" class="pri" target="_blank" rel="noopener">Mở nội dung</a></div></div></article>`).join("")}</div><p class="note">Sinh viên của lớp đăng nhập là vào học được các học phần này, không cần mã lớp ôn tập.</p>`:`<div class="empty">Lớp chưa gắn học phần — bấm <b>Gán học phần</b>.</div>`}</section>
    <section><h2 class="sec">Tài liệu riêng của lớp</h2><div class="empty">Tài liệu gắn theo lớp (đề cương, lịch học, bài đọc) — sắp có. Hiện tài liệu, giáo trình quản lý trong từng học phần trên <a href="${HOME}">trang thư viện</a>.</div></section>`}
  else if(tab==="dd"){content=await tabDiemDanh(l,rows,head,ma)}else if(tab==="bt2"){content=await tabBangTin(l,rows,head,ma)}else if(tab==="btap"){content=await tabBaiTap(l,rows,head,ma)}
  else{content=`${head}<div class="empty">Mục này sắp có.</div>`}
  $("#app").innerHTML=shell("lop",`<div class="page"><div class="split">${subnav}<section class="panel">${content}</section></div></div>`,crumb);bindOut();
  if(tab==="dd")bindDiemDanh(l,rows,ma);if(tab==="de")bindDeThi(l,ma);if(tab==="bt2")bindBangTin(l,ma);if(tab==="btap")bindBaiTap(l,rows,ma);
  const qi=$("#q");if(qi&&tab==="sv")qi.oninput=e=>{S.q=e.target.value;viewLopDetail(ma,tab).then(()=>keepFocus("#q"))};
  $("[data-add]").onclick=()=>dlgSv(l,null);$("[data-import]").onclick=()=>dlgImport(l);$("[data-export]").onclick=()=>exportCsv(l,rows);
  const el=$("[data-editlop]");if(el)el.onclick=()=>dlgLop(l);const sp=$("[data-showpw]");if(sp)sp.onclick=()=>{const b=$("[data-pw]");const on=b.textContent!=="••••••";b.textContent=on?"••••••":pw;sp.innerHTML=I.eye+(on?"Hiện":"Ẩn")};
  const mk=$("[data-mkacc]");if(mk)mk.onclick=async()=>{mk.disabled=true;try{await saveRoster(ma,rows,true);toast("Đã tạo tài khoản còn thiếu.");render()}catch(x){toast("Chưa tạo được: "+errMsg(x));mk.disabled=false}};
  $$("[data-edit]").forEach(b=>b.onclick=()=>dlgSv(l,rows.find(r=>r.mssv===b.dataset.edit)));
  $$("[data-reset]").forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.mssv===b.dataset.reset);if(!pw){toast("Lớp chưa có mật khẩu chung — bấm Sửa lớp để đặt.");return}
    if(!await confirmDlg("Đặt lại mật khẩu cho "+r.hoTen+"?","Mật khẩu đăng nhập của ID "+r.mssv+" sẽ về mật khẩu chung của lớp "+l.id+".","Đặt lại"))return;
    try{const k=normId(r.mssv);const part={mssv:k,hoTen:r.hoTen,pw:await pwHash(k,pw),pwDefault:true,lopPw:ma,lop:FV().arrayUnion(ma)};await S.fs.doc("pnl_tk/"+k).set(part,{merge:true});S.acc[k]=Object.assign(S.acc[k]||{},{pw:part.pw,pwDefault:true,lopPw:ma,lop:[...new Set([...(S.acc[k]?.lop||[]),ma])]});toast("Đã đặt lại mật khẩu cho "+r.hoTen+" về mật khẩu chung của lớp.");render()}catch(x){toast("Chưa làm được: "+errMsg(x))}});
  $$("[data-del]").forEach(b=>b.onclick=async()=>{const r=rows.find(x=>x.mssv===b.dataset.del);if(!await confirmDlg("Xóa "+r.hoTen+" khỏi lớp "+l.id+"?","Tài khoản vẫn giữ nếu sinh viên còn ở lớp khác.","Xóa khỏi lớp"))return;
    try{const k=normId(r.mssv);const all=rows.filter(x=>x.mssv!==r.mssv);const db=S.fs;const b2=db.batch();b2.delete(db.doc("pnl_dg_sv/"+ma+"__"+k));b2.set(db.doc("pnl_dg_ds/"+ma),{rows:all,updated:FV().serverTimestamp()},{merge:true});b2.set(db.doc("pnl_dg_lop/"+ma),{siSo:all.length},{merge:true});
      const a=S.acc[k];if(a){const lop=(a.lop||[]).filter(x=>x!==ma);a.lop=lop;b2.set(db.doc("pnl_tk/"+k),{lop},{merge:true})}await b2.commit();S.ds[ma]=all;l.siSo=all.length;toast("Đã xóa "+r.hoTen+" khỏi lớp.");render()}catch(x){toast("Chưa xóa được: "+errMsg(x))}})}
function dlgSv(l,r){const dlg=$("#dlg");dlg.className="";dlg.innerHTML=`<div class="dh"><h3>${r?"Sửa sinh viên":"Thêm sinh viên vào lớp "+esc(l.id)}</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <form id="f-sv2"><div class="row2"><div class="fld"><label for="s-ma">Mã sinh viên (ID) *</label><input id="s-ma" value="${esc(r?r.mssv:"")}" ${r?"readonly":""} required placeholder="VD: 2405CCLT001"></div><div class="fld"><label for="s-ten">Họ và tên *</label><input id="s-ten" value="${esc(r?r.hoTen:"")}" required></div></div>
  <div class="row2"><div class="fld"><label for="s-ns">Ngày sinh</label><input id="s-ns" value="${esc(r?r.ngaySinh||"":"")}" placeholder="dd/mm/yyyy"></div><div class="fld"><label for="s-lop">Lớp niên chế</label><input id="s-lop" value="${esc(r?r.lopNienChe||"":"")}" placeholder="VD: K24 CC Liên thông"></div></div>
  <p class="err" id="s-err"></p><div class="df"><button type="button" class="btn" data-x>Hủy</button><button type="submit" class="btn pri">${r?"Lưu":"Thêm"}</button></div></form>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());
  $("#f-sv2").onsubmit=async e=>{e.preventDefault();const mssv=normId($("#s-ma").value),hoTen=$("#s-ten").value.trim();const err=$("#s-err");if(!/^[0-9A-Z]{4,16}$/.test(mssv)){err.textContent="Mã sinh viên gồm 4–16 chữ/số không dấu.";return}
    const row={mssv,hoTen};const ns=$("#s-ns").value.trim(),lnc=$("#s-lop").value.trim();if(ns)row.ngaySinh=ns;if(lnc)row.lopNienChe=lnc;
    const btn=$("button[type=submit]",dlg);btn.disabled=true;try{await saveRoster(l.id,[row],true);dlg.close();toast(r?"Đã lưu.":"Đã thêm "+hoTen+".");render()}catch(x){err.textContent="Chưa lưu được: "+errMsg(x)}finally{btn.disabled=false}}}
function dlgImport(l){const dlg=$("#dlg");dlg.className="wide";dlg.innerHTML=`<div class="dh"><h3>Nhập danh sách sinh viên · ${esc(l.id)}</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <form id="f-imp"><div class="fld"><div class="drop" id="drop">Kéo thả file Excel/CSV vào đây hoặc <label style="color:var(--navy);font-weight:600;cursor:pointer">chọn file<input type="file" id="i-file" accept=".xlsx,.xls,.csv,.txt" class="sr"></label><br><span class="hint">Nhận file danh sách lớp hoặc bảng điểm tải từ APAG (cột Mã SV, Họ tên, Ngày sinh, Lớp).</span></div><div id="prev"></div></div>
  <div class="fld"><label><input type="radio" name="mode" value="merge" checked> Bổ sung vào danh sách hiện có (${(S.ds[l.id]||[]).length} SV)</label><label><input type="radio" name="mode" value="replace"> Thay toàn bộ danh sách bằng file này</label></div>
  <p class="err" id="i-err"></p><div class="df"><button type="button" class="btn" data-x>Hủy</button><button type="submit" class="btn pri" disabled>Nhập</button></div></form>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());let rows=[];
  const onFile=async f=>{if(!f)return;try{rows=await readRoster(f);$("#prev").innerHTML=previewRows(rows);$("#i-err").textContent="";$("button[type=submit]",dlg).disabled=false}catch(x){$("#i-err").textContent=x.message||String(x)}};
  $("#i-file").onchange=e=>onFile(e.target.files[0]);const dz=$("#drop");dz.ondragover=e=>{e.preventDefault();dz.classList.add("on")};dz.ondragleave=()=>dz.classList.remove("on");dz.ondrop=e=>{e.preventDefault();dz.classList.remove("on");onFile(e.dataTransfer.files[0])};
  $("#f-imp").onsubmit=async e=>{e.preventDefault();const merge=$("input[name=mode]:checked",dlg).value==="merge";const btn=$("button[type=submit]",dlg);btn.disabled=true;btn.textContent="Đang ghi…";
    try{await saveRoster(l.id,rows,merge);dlg.close();toast("Đã nhập "+rows.length+" sinh viên vào lớp "+l.id+".");render()}catch(x){$("#i-err").textContent="Chưa nhập được: "+errMsg(x);btn.disabled=false;btn.textContent="Nhập"}}}
function exportCsv(l,rows){const lines=[["STT","Mã SV","Họ và tên","Ngày sinh","Lớp niên chế","Mã lớp","Học phần"]].concat(rows.map((r,i)=>[i+1,r.mssv,r.hoTen,r.ngaySinh||"",r.lopNienChe||"",l.id,lopHpTen(l)]));
  const csv="﻿"+lines.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(";")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="danh-sach-"+l.id+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
function confirmDlg(title,text,okLabel){return new Promise(res=>{const dlg=$("#dlg");dlg.className="";dlg.innerHTML=`<div class="dh"><h3>${esc(title)}</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div><form method="dialog"><p style="margin:0;color:var(--muted)">${esc(text)}</p><div class="df"><button type="button" class="btn" data-x>Hủy</button><button type="button" class="btn pri" data-ok style="background:var(--red);border-color:var(--red)">${esc(okLabel||"Đồng ý")}</button></div></form>`;
  const done=v=>{dlg.close();res(v)};$$("[data-x]",dlg).forEach(b=>b.onclick=()=>done(false));$("[data-ok]",dlg).onclick=()=>done(true);dlg.oncancel=()=>res(false);dlg.showModal()})}

/* ============ QUẢN TRỊ: học phần (quản trị theo học phần) ============ */
async function viewHocPhan(id){if(id)return viewHocPhanDetail(id);const q=strip(S.q);const byHp={};S.lop.forEach(l=>{if(l.luuTru)return;lopHps(l).forEach(h=>(byHp[h]=byHp[h]||[]).push(l))});
  if(!S.ma){try{await loadMa()}catch(e){S.ma=[]}}const maOf=c=>S.ma.filter(m=>m.courses.includes("*")||m.courses.includes(c.id));
  const pub=S.courses.filter(c=>c.src),draft=S.courses.filter(c=>!c.src);const f=a=>a.filter(c=>!q||strip(c.name).includes(q));
  const card=c=>{const ls=byHp[c.id]||[];const sv=ls.reduce((a,l)=>a+(l.siSo||0),0);const h=S.hp[c.id]||{};const ch=(h.chapters||[]).length;const nm=maOf(c).length;
    return `<article class="hp"><span class="rib${c.src?"":" draft"}">${c.src?"XUẤT BẢN":"NHÁP"}</span><div class="cover" style="background:${esc(c.c||"#1d5677")}">${esc(c.name)}</div><div class="body">
      <div class="meta"><span><strong>${sv}</strong> SV · ${ls.length} lớp · ${nm} mã</span><span>${ch?ch+" chương":(c.src?"web ôn tập":"chưa có đề")}</span></div>
      <div class="tags">${c.src?["Thi thử","Tóm tắt","Mind map","Tài liệu"].map(t=>`<span class="tag">${t}</span>`).join(""):'<span class="tag off">Thi thử</span><span class="tag off">Tóm tắt</span>'}</div>
      <div class="act"><a href="#hocphan/${encodeURIComponent(c.id)}">Quản trị</a>${c.src?`<a href="${courseHref(c)}" class="pri" target="_blank" rel="noopener">Mở nội dung</a>`:`<a href="${HOME}#home" class="pri">Biên soạn</a>`}</div></div></article>`};
  const body=`<div class="page"><div class="bar"><div><h1 class="t">Học phần</h1><span class="t-sub">Mỗi học phần = web ôn tập + tài liệu + ngân hàng câu hỏi; lớp, mã ôn tập, đánh giá định kỳ quản trị theo học phần</span></div>
    <div class="tools"><a class="btn pri" href="${HOME}#home">${I.plus}Thêm học phần</a><label class="search" style="flex:0 1 280px"><span class="sr">Tìm học phần</span><input type="search" id="q" value="${esc(S.q)}" placeholder="Tìm học phần…"></label></div></div>
    <section><h2 class="grp" style="cursor:default">${I.chev}Đã xuất bản <span class="n">(${pub.length} học phần)</span></h2><div class="grid4">${f(pub).map(card).join("")||'<div class="empty">Không có học phần khớp.</div>'}</div></section>
    <section><h2 class="grp" style="cursor:default">${I.chev}Đang biên soạn <span class="n">(${draft.length} học phần)</span></h2><div class="grid4">${f(draft).map(card).join("")||'<div class="empty">Không có.</div>'}</div></section>
    <p class="note">Thêm, sửa nội dung học phần và chương thực hiện trên trang thư viện (đăng nhập Google) — nút <b>Thêm học phần</b> đưa về đó.</p></div>`;
  $("#app").innerHTML=shell("hocphan",body);bindOut();$("#q").oninput=e=>{S.q=e.target.value;viewHocPhan().then(()=>keepFocus("#q"))}}
async function viewHocPhanDetail(id){const c=courseOf(id);if(!c){location.hash="#hocphan";return}if(!S.ma){try{await loadMa()}catch(e){S.ma=[]}}
  const ls=S.lop.filter(l=>lopHps(l).includes(id));const act=ls.filter(l=>!l.luuTru),arch=ls.filter(l=>l.luuTru);const ms=S.ma.filter(m=>m.courses.includes("*")||m.courses.includes(id));const t=todayISO();const h=S.hp[id]||{};
  const crumb=`<a class="back" href="#hocphan">${I.back}Học phần</a><span class="sep">/</span><span class="sub">${esc(c.name)}</span>`;
  const body=`<div class="page">
    <div class="bar"><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="av" style="width:44px;height:44px;border-radius:12px;background:${esc(c.c||"#1d5677")}"></span><div><h1 class="t">${esc(c.name)}</h1><span class="t-sub">${c.src?"Đã xuất bản":"Đang biên soạn"} · ${(h.chapters||[]).length?(h.chapters||[]).length+" chương":"chương theo đề cương trên web"}</span></div></div>
      <div class="tools"><button type="button" class="btn" data-addlop>${I.plus}Thêm lớp</button><a class="btn" href="#malop/moi/${encodeURIComponent(id)}">${I.code}Cấp mã ôn tập</a>${c.src?`<a class="btn pri" href="${courseHref(c)}" target="_blank" rel="noopener">${I.go}Mở nội dung</a>`:`<a class="btn pri" href="${HOME}#home">${I.edit}Biên soạn</a>`}</div></div>
    <div class="kpi"><div><b>${act.length}</b><span>lớp đang học</span></div><div><b>${act.reduce((a,l)=>a+(l.siSo||0),0)}</b><span>sinh viên</span></div><div><b>${act.filter(l=>l.open).length}</b><span>lớp đang mở ĐGĐK</span></div><div><b>${ms.filter(m=>m.han>=t).length}</b><span>mã ôn tập còn hiệu lực</span></div></div>
    <section><h2 class="sec">Lớp của học phần</h2>${act.length?`<div class="grid4">${act.map(l=>`<a class="card" href="#lop/${encodeURIComponent(l.id)}"><b class="nm">${esc(lopName(l))}</b><span class="meta"><span>Sĩ số: <strong>${l.siSo||0}</strong></span><span>${esc(grpOf(l))}</span><span>${l.open?'<span class="pill">ĐGĐK mở</span>':(l.diemKhoa?'<span class="pill gray">đã khóa điểm</span>':"")}</span></span></a>`).join("")}</div>`:`<div class="empty">Chưa có lớp nào dùng học phần này. Bấm <b>Thêm lớp</b>.</div>`}${arch.length?`<p class="note" style="margin-top:8px">Lưu trữ: ${arch.map(l=>esc(l.id)).join(", ")}</p>`:""}</section>
    <section><h2 class="sec">Đánh giá định kỳ</h2><div class="scard" style="padding:0"><div class="tbl"><table><thead><tr><th>Lớp</th><th>Trạng thái</th><th>Thời gian</th><th class="acts"></th></tr></thead><tbody>${act.length?act.map(l=>`<tr><td><b>${esc(lopName(l))}</b></td><td>${l.open?'<span class="pill live">đang mở</span>':'<span class="pill gray">đóng</span>'}</td><td>${l.thoiGian||40} phút${l.closeAt?" · đến "+fmtD(l.closeAt):""}</td><td class="acts"><a class="btn sm" href="#lop/${encodeURIComponent(l.id)}/bt">Quản trị đợt</a></td></tr>`).join(""):'<tr><td colspan="4" class="empty" style="border:0">Chưa có lớp.</td></tr>'}</tbody></table></div></div></section>
    <section><h2 class="sec">Mã lớp ôn tập (khách) mở học phần này</h2><div class="scard" style="padding:0"><div class="tbl"><table><thead><tr><th>Mã</th><th>Lớp / ghi chú</th><th>Hạn</th><th>Đã dùng</th></tr></thead><tbody>${ms.length?ms.map(x=>`<tr><td><b>${esc(x.code)}</b>${x.courses.includes("*")?' <span class="pill gray">mọi học phần</span>':""}</td><td>${esc(x.note)}</td><td>${fmtISO(x.han)}${t>x.han?' <span class="pill bad">hết hạn</span>':""}</td><td>${x.used==null?"?":x.used} / ${x.max||"—"}</td></tr>`).join(""):'<tr><td colspan="4" class="empty" style="border:0">Chưa có mã nào.</td></tr>'}</tbody></table></div></div></section>
    <section><h2 class="sec">Nội dung &amp; học liệu</h2><div class="grid4">${[["Tóm tắt lý thuyết","map"],["Mind map","map"],["Câu hỏi lý thuyết","de"],["Câu hỏi tình huống","task"],["Thi thử","exam"],["Văn bản, án lệ","bank"],["Tài liệu, giáo trình","folder"],["Ngân hàng câu hỏi","bank"]].map(([t2,ic])=>{const nh=t2==="Ngân hàng câu hỏi";return `<a class="quick" href="${nh?"#nganhang/"+encodeURIComponent(id):courseHref(c)}"><span class="ic" style="background:var(--soft);color:var(--navy)">${I[ic]}</span><div><b>${t2}</b><span>${nh?"nhập, duyệt, xuất bản câu hỏi":"mở trên web học phần"}</span></div></a>`}).join("")}</div></section></div>`;
  $("#app").innerHTML=shell("hocphan",body,crumb);bindOut();$("[data-addlop]").onclick=()=>dlgLop(null,false,{hocPhan:id})}

/* ============ QUẢN TRỊ: đề thi, đánh giá định kỳ (nhúng) ============ */
function viewDg(){const body=`<div class="page" style="max-width:none"><div class="bar"><div><h1 class="t">Đề thi, đánh giá định kỳ</h1><span class="t-sub">Tất cả lớp đang có đợt đánh giá định kỳ — mở/đóng đợt, danh sách, điểm, thống kê. Mỗi lớp cũng có các tab này trong mục Lớp.</span></div></div>${dgEmbed()}</div>`;
  $("#app").innerHTML=shell("dg",body);bindOut()}

/* ============ QUẢN TRỊ: mã lớp ôn tập (khách) — chuyển từ trang chủ ============ */
async function viewMaLop(sub,arg){$("#app").innerHTML=shell("malop",`<div class="page"><div class="empty">Đang tải mã lớp…</div></div>`);bindOut();
  if(!S.ma){try{await loadMa()}catch(x){S.ma=[];toast("Chưa tải được mã: "+errMsg(x))}}const t=todayISO();const q=strip(S.q);
  const nm=id=>courseOf(id)?.name||id;const list=S.ma.filter(x=>!q||strip(x.code+" "+x.note+" "+x.courses.map(nm).join(" ")).includes(q));
  const body=`<div class="page"><div class="bar"><div><h1 class="t">Mã lớp ôn tập (khách)</h1><span class="t-sub">${S.ma.length} mã · ${S.ma.filter(x=>x.han>=t).length} đang hiệu lực · Mỗi mã mở một hoặc nhiều học phần trên trang thư viện, có hạn dùng và số người tối đa (mỗi trình duyệt một người).</span></div>
    <div class="tools"><button type="button" class="btn pri" data-new>${I.plus}Cấp mã</button><label class="search" style="flex:0 1 280px"><span class="sr">Tìm mã</span><input type="search" id="q" value="${esc(S.q)}" placeholder="Tìm mã, lớp, học phần…"></label></div></div>
    <div class="scard" style="padding:0"><div class="tbl"><table><thead><tr><th>Mã</th><th>Lớp / ghi chú</th><th>Học phần</th><th>Hạn dùng</th><th>Đã dùng</th><th class="acts">Hành động</th></tr></thead><tbody>
      ${list.length?list.map(x=>{const exp=t>x.han,full=x.max&&x.used!=null&&x.used>=x.max;return `<tr><td><b>${esc(x.code)}</b></td><td>${esc(x.note)}</td><td>${esc(x.courses.includes("*")?"Tất cả học phần":x.courses.map(nm).join("; "))}</td><td style="white-space:nowrap">${fmtISO(x.han)}${exp?' <span class="pill bad">hết hạn</span>':""}</td><td>${x.used==null?"?":x.used} / ${x.max||"—"}${full?' <span class="pill warn">đủ</span>':""}</td><td class="acts"><button type="button" class="ico" data-edit="${esc(x.code)}" aria-label="Sửa" title="Sửa">${I.edit}</button> <button type="button" class="ico del" data-del="${esc(x.code)}" aria-label="Xóa" title="Xóa">${I.del}</button></td></tr>`}).join(""):`<tr><td colspan="6" class="empty" style="border:0">${S.ma.length?"Không có mã khớp.":"Chưa có mã nào."}</td></tr>`}</tbody></table></div></div>
    <p class="note">Nên đặt số người dư khoảng 30% (một sinh viên dùng điện thoại và máy tính tính 2 lượt). Xóa mã thì lượt dùng của mã cũng xóa; sinh viên đang dùng phải nhập mã mới. Mã lớp ôn tập khác tài khoản sinh viên: tài khoản (ID + mật khẩu) quản lý ở mục Lớp.</p></div>`;
  $("#app").innerHTML=shell("malop",body);bindOut();$("#q").oninput=e=>{S.q=e.target.value;viewMaLop().then(()=>keepFocus("#q"))};
  $("[data-new]").onclick=()=>dlgMa(null);$$("[data-edit]").forEach(b=>b.onclick=()=>dlgMa(S.ma.find(x=>x.code===b.dataset.edit)));
  $$("[data-del]").forEach(b=>b.onclick=async()=>{const code=b.dataset.del;if(!await confirmDlg("Xóa mã "+code+"?","Lượt dùng của mã bị xóa theo; sinh viên đang dùng phải nhập mã mới.","Xóa mã"))return;
    try{for(const d of (await S.fs.collection("pnl_ma/"+code+"/luot").get()).docs)await d.ref.delete();await S.fs.doc("pnl_ma/"+code).delete();S.ma=S.ma.filter(x=>x.code!==code);toast("Đã xóa mã "+code);render()}catch(x){toast("Chưa xóa được: "+errMsg(x))}});
  if(sub==="moi")dlgMa(null,arg)}
function dlgMa(x,presetCourse){const dlg=$("#dlg");const d0=new Date();d0.setMonth(d0.getMonth()+4);const def=d0.toISOString().slice(0,10);const t=todayISO();
  const cs=x?x.courses:(presetCourse?[presetCourse]:["*"]);const all=cs.includes("*");
  dlg.className="wide";dlg.innerHTML=`<div class="dh"><h3>${x?"Sửa mã "+esc(x.code):"Cấp mã lớp ôn tập"}</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <form id="f-ma"><div class="row2" style="grid-template-columns:1fr 1fr 1fr"><div class="fld"><label for="m-code">Mã *</label><input id="m-code" value="${esc(x?x.code:"")}" ${x?"readonly":""} maxlength="24" style="text-transform:uppercase" autocomplete="off" placeholder="VD: K25D-LDS" required></div>
    <div class="fld"><label for="m-max">Số người tối đa</label><input id="m-max" type="number" min="1" max="1000" value="${x?x.max||40:40}"></div><div class="fld"><label for="m-han">Hiệu lực đến hết ngày</label><input id="m-han" type="date" value="${esc(x?x.han:def)}" min="${t}"></div></div>
    <div class="fld"><label for="m-note">Lớp / ghi chú</label><input id="m-note" maxlength="80" value="${esc(x?x.note:"")}" placeholder="K25D – Luật Dân sự"></div>
    <div class="fld"><label>Học phần được mở</label><label style="font-weight:500"><input type="checkbox" id="m-all" ${all?"checked":""}> <b>Tất cả học phần</b></label>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px 12px;margin-top:4px">${S.courses.map(c=>`<label style="font-weight:400;font-size:13px"><input type="checkbox" data-c value="${esc(c.id)}" ${all?"disabled":(cs.includes(c.id)?"checked":"")}> ${esc(c.name)}</label>`).join("")}</div></div>
    <p class="err" id="m-err"></p><div class="df"><button type="button" class="btn" data-x>Hủy</button><button type="submit" class="btn pri">${x?"Lưu thay đổi":"Cấp mã"}</button></div></form>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());
  $("#m-all").onchange=e=>$$("[data-c]",dlg).forEach(c=>{c.disabled=e.target.checked;if(c.disabled)c.checked=false});
  $("#f-ma").onsubmit=async e=>{e.preventDefault();const err=m=>{$("#m-err").textContent=m};const code=String($("#m-code").value).toUpperCase().replace(/\s+/g,"").replace(/[–—]/g,"-"),max=parseInt($("#m-max").value,10),han=$("#m-han").value,note=$("#m-note").value.trim().slice(0,80);
    const courses=$("#m-all").checked?["*"]:$$("[data-c]:checked",dlg).map(c=>c.value);
    if(!/^[A-Z0-9_-]{3,24}$/.test(code))return err("Mã gồm 3–24 ký tự: chữ không dấu, số, gạch ngang hoặc gạch dưới.");if(!(max>=1&&max<=1000))return err("Số người từ 1 đến 1000.");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(han)||han<t)return err("Chọn ngày hết hạn từ hôm nay trở đi.");if(!courses.length)return err("Chọn ít nhất một học phần.");err("");
    const btn=$("button[type=submit]",dlg);btn.disabled=true;
    try{const ref=S.fs.doc("pnl_ma/"+code);
      if(x){const curd=(await ref.get()).data()||{};await ref.set(Object.assign({},curd,{note,han,max,courses,updated:new Date().toISOString()}));Object.assign(x,{note,han,max,courses});toast("Đã cập nhật mã "+code)}
      else{if((await ref.get()).exists){btn.disabled=false;return err("Mã "+code+" đã có. Đặt mã khác.")}const data={note,han,max,courses,created:new Date().toISOString()};await ref.set(data);S.ma.unshift(Object.assign({code,used:0},data));toast("Đã cấp mã "+code+". Sinh viên dùng được ngay.")}
      dlg.close();location.hash="#malop";render()}catch(ex){err("Chưa lưu được: "+errMsg(ex));btn.disabled=false}}}

/* ============ QUẢN TRỊ: góp ý, báo lỗi ============ */
async function viewGopY(){$("#app").innerHTML=shell("gopy",`<div class="page"><div class="empty">Đang tải góp ý…</div></div>`);bindOut();
  let docs=[];try{docs=(await S.fs.collection("pnl_gopy").get()).docs.map(d=>({uid:d.id,items:(d.data()||{}).items||[]}))}catch(x){toast("Chưa tải được: "+errMsg(x))}
  const items=[];docs.forEach(d=>d.items.forEach((it,i)=>items.push(Object.assign({uid:d.uid,i},it))));items.sort((a,b)=>String(b.ts||b.time).localeCompare(String(a.ts||a.time)));
  const q=strip(S.q);const list=items.filter(it=>!q||strip((it.course||"")+" "+(it.text||"")).includes(q));
  const body=`<div class="page"><div class="bar"><div><h1 class="t">Góp ý, báo lỗi</h1><span class="t-sub">${items.length} góp ý từ ${docs.length} người · báo lỗi từng câu còn gửi về email giảng viên</span></div><label class="search" style="flex:0 1 320px"><span class="sr">Tìm</span><input type="search" id="q" value="${esc(S.q)}" placeholder="Tìm trong góp ý…"></label></div>
    ${list.length?list.map(it=>`<div class="scard" style="display:flex;gap:14px;align-items:flex-start"><div style="flex:1"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><span class="pill gray">${esc(fmtISO(it.time)||fmtD(it.ts))}</span>${it.course?`<span class="pill">${esc(courseOf(it.course)?.name||it.course)}</span>`:""}</div><div style="white-space:pre-wrap">${esc(it.text)}</div></div><button type="button" class="ico del" data-del="${esc(it.uid)}" data-i="${it.i}" aria-label="Xóa góp ý" title="Xóa">${I.del}</button></div>`).join(""):`<div class="empty">${items.length?"Không có góp ý khớp.":"Chưa có góp ý nào."}</div>`}</div>`;
  $("#app").innerHTML=shell("gopy",body);bindOut();$("#q").oninput=e=>{S.q=e.target.value;viewGopY().then(()=>keepFocus("#q"))};
  $$("[data-del]").forEach(b=>b.onclick=async()=>{if(!await confirmDlg("Xóa góp ý này?","Không khôi phục được.","Xóa"))return;const d=docs.find(x=>x.uid===b.dataset.del);const its=d.items.filter((_,i)=>i!==+b.dataset.i);
    try{if(its.length)await S.fs.doc("pnl_gopy/"+d.uid).set({items:its});else await S.fs.doc("pnl_gopy/"+d.uid).delete();toast("Đã xóa.");render()}catch(x){toast("Chưa xóa được: "+errMsg(x))}})}

/* ============ QUẢN TRỊ: sinh viên & tài khoản (tìm toàn hệ) ============ */
async function viewSinhVien(){$("#app").innerHTML=shell("sinhvien",`<div class="page"><div class="empty">Đang tải…</div></div>`);bindOut();
  const act=S.lop.filter(l=>!l.luuTru);for(const l of act)await loadDs(l.id);
  const all=[];act.forEach(l=>(S.ds[l.id]||[]).forEach(r=>all.push(Object.assign({lop:l},r))));
  const q=strip(S.q);const list=q?all.filter(r=>strip(r.mssv+" "+r.hoTen+" "+r.lop.id+" "+(r.lop.ten||"")+" "+(r.lopNienChe||"")).includes(q)):all.slice(0,60);
  await loadAcc(list.map(r=>r.mssv));
  const body=`<div class="page"><div class="bar"><div><h1 class="t">Sinh viên &amp; tài khoản</h1><span class="t-sub">${all.length} lượt sinh viên trong ${act.length} lớp đang mở · ${new Set(all.map(r=>normId(r.mssv))).size} tài khoản</span></div>
    <label class="search" style="flex:0 1 420px"><span class="sr">Tìm</span><input type="search" id="q" value="${esc(S.q)}" placeholder="Tìm theo mã SV, tên, lớp…"></label></div>
    <div class="scard" style="padding:0"><div class="tbl"><table><thead><tr><th>Họ và tên</th><th>Lớp</th><th>Học phần</th><th>Tài khoản</th><th class="acts">Mở</th></tr></thead><tbody>
    ${list.map(r=>{const a=S.acc[normId(r.mssv)];return `<tr><td><div class="sv"><div class="av" style="background:${avc(r.hoTen)}">${esc(initials(r.hoTen))}</div><div><b>${esc(r.hoTen)}</b><span>ID: ${esc(r.mssv)}${r.lopNienChe?" · "+esc(r.lopNienChe):""}</span></div></div></td><td>${esc(lopName(r.lop))}</td><td>${esc(lopHpTen(r.lop))}</td><td>${!a?'<span class="pill bad">chưa có</span>':a.pwDefault===false?'<span class="pill">đã đổi MK riêng</span>':'<span class="pill warn">MK chung của lớp</span>'}</td><td class="acts"><a class="ico" href="#lop/${encodeURIComponent(r.lop.id)}" aria-label="Mở lớp">${I.go}</a></td></tr>`}).join("")||`<tr><td colspan="5" class="empty" style="border:0">${all.length?"Không có kết quả.":"Chưa có sinh viên. Thêm lớp và nhập danh sách trước."}</td></tr>`}
    </tbody></table></div></div>${!q&&all.length>60?'<p class="note">Đang hiện 60 dòng đầu — gõ vào ô tìm để lọc.</p>':""}
    <p class="note">Phân quyền hiện có: <b>Quản trị</b> (Google) thấy và sửa tất cả; <b>Sinh viên</b> (ID + mật khẩu) thấy Học tập, Kiểm tra, Thi, Điểm danh của lớp mình. Tài khoản giảng viên khác (ID = tên viết liền, mật khẩu do quản trị cấp, chỉ thấy lớp được chia sẻ) — đợt sau.</p></div>`;
  $("#app").innerHTML=shell("sinhvien",body);bindOut();$("#q").oninput=e=>{S.q=e.target.value;clearTimeout(viewSinhVien._t);viewSinhVien._t=setTimeout(()=>viewSinhVien().then(()=>keepFocus("#q")),250)}}

/* ============ SINH VIÊN ============ */
/* Khung quản trị của sinh viên (18/11/2026): Trang chủ (về màn hình chính thư viện) · Bảng điều khiển · Học tập · Kiểm tra, thi · Bài tập · Điểm danh · Tài khoản */
const SV_RAIL=cur=>[[HOME,"home","Trang chủ thư viện"],["#sv","grade","Bảng điều khiển","home"],["#sv/hoctap","hp","Học tập","hoctap"],["#sv/kiemtra","exam","Kiểm tra, thi","kiemtra"],["#sv/baitap","task","Bài tập & bảng tin","baitap"],["#sv/diemdanh","qr","Điểm danh","diemdanh"],["#sv/taikhoan","user","Tài khoản","taikhoan"]];
async function svLops(me){const lops=[];for(const ma of me.lop||[]){let l=S.lop.find(x=>x.id===ma);if(!l){try{const d=await S.fs.doc("pnl_dg_lop/"+ma).get();if(d.exists){l=Object.assign({id:ma},d.data());if(!l.cha)S.lop.push(l)}}catch(e){}}if(l&&!l.cha)lops.push(l)}return lops}
const svMe=()=>S.sv||{mssv:"XEM-THU",hoTen:ADMIN_NAME,lop:S.lop.filter(l=>!l.luuTru).slice(0,2).map(l=>l.id),pwDefault:false};
const svHead=(me,text)=>`<header class="top"><div class="crumb">${text}</div><div style="display:flex;align-items:center;gap:10px"><a class="btn sm" href="${HOME}">${I.home}Trang chủ</a>${S.sv?who(me.hoTen,me.mssv+" · Sinh viên"):`<div class="who"><span class="pill warn">Đang xem như sinh viên</span><a class="out" href="#home">Về quản trị</a></div>`}</div></header>`;
/* mọi đợt kiểm tra định kỳ của các lớp sinh viên học, kèm trạng thái bài làm của chính sinh viên */
async function svDgs(me,lops){const out=[];for(const l of lops){for(const e of await lopDgs(l)){let bai=null,khac=false;
    if(S.sv){try{const d=await S.fs.doc("pnl_dg_bai/"+e.id+"__"+me.mssv).get();bai=d.exists?d.data():null}catch(x){khac=x&&x.code==="permission-denied"}}
    const mo=dgMo(e),sap=!!e.open&&!mo&&dgMs(e.openAt)>Date.now();
    const act=bai&&bai.status==="da-nop"?"xong":khac?"khac":bai&&bai.status==="dang-lam"?(mo?"tiep":"dong"):mo?"lam":sap?"sap":"dong";
    out.push({e,l,bai,act,hp:dgHp(e)})}}return out}
const SV_ACT={xong:["đã nộp bài","pill"],khac:["đã làm trên máy khác","pill gray"],tiep:["đang làm dở","pill live"],lam:["đang mở","pill live"],sap:["sắp mở","pill warn"],dong:["chưa mở / đã đóng","pill gray"]};
function svDgRow(x){const e=x.e,t=SV_ACT[x.act];const go=x.act==="lam"||x.act==="tiep";
  return `<div class="row" style="align-items:center;gap:12px"><div><b>${esc(dgTen(e))}</b> <span class="${t[1]}">${t[0]}</span><br><span style="font-size:12px;color:var(--muted)">Lớp ${esc(x.l.id)} · đợt ${esc(e.id)} · ${+e.thoiGian||40} phút${dgMs(e.openAt)?" · mở "+fmtD(e.openAt):""}${dgMs(e.closeAt)?" · đóng "+fmtD(e.closeAt):""}</span></div>${go?`<a class="btn sm pri" href="${DG}?ma=${encodeURIComponent(e.id)}">${x.act==="tiep"?"Tiếp tục làm bài":"Làm bài"}</a>`:x.act==="xong"?`<a class="btn sm" href="${DG}?ma=${encodeURIComponent(e.id)}">Xem</a>`:""}</div>`}
async function viewSvHome(){const me=svMe();const lops=await svLops(me);const first=(me.hoTen||"").trim().split(/\s+/).pop();
  const [dgs,dd]=await Promise.all([svDgs(me,lops),S.sv?svDdData(me,lops):Promise.resolve({buoi:[],co:[]})]);const ddMo=dd.buoi.filter(ddOpen);
  const can=dgs.filter(x=>x.act==="lam"||x.act==="tiep"),sap=dgs.filter(x=>x.act==="sap");
  const hpCards=[];lops.forEach(l=>lopHps(l).forEach(h=>{const c=courseOf(h)||{id:h,name:h,c:"#1d5677"};hpCards.push(`<div class="row" style="align-items:center"><div><b>${esc(c.name)}</b><br><span style="font-size:12px;color:var(--muted)">Lớp ${esc(l.id)}${l.ten&&l.ten!==l.id?" · "+esc(l.ten):""} · ${esc(grpOf(l))} · ${dgs.filter(x=>x.l===l&&x.hp===h).length} đợt kiểm tra</span></div><a class="btn sm" href="${courseHref(c)}">Vào học</a></div>`)}));
  const body=`<main>${svHead(me,`<span class="sub">Chào ${esc(first)}${ddMo.length?", có "+ddMo.length+" buổi học đang điểm danh":can.length?", có "+can.length+" bài kiểm tra cần làm":", hôm nay chưa có việc gấp"}</span>`)}
  <div class="page" style="max-width:1180px">
    ${S.sv&&S.sv.pwDefault?`<div class="scard" style="border-color:var(--warn);background:var(--warn-soft);display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><span>Bạn đang dùng <b>mật khẩu chung của lớp</b>. Hãy đổi mật khẩu riêng để bảo vệ tài khoản.</span><a class="btn sm pri" href="#sv/taikhoan">Đổi mật khẩu</a></div>`:""}
    ${svDdBox(dd.buoi,dd.co,dd.err)}
    ${can.map(x=>`<div class="scard" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border-color:var(--navy);background:#f3f8fb"><div style="display:flex;align-items:center;gap:14px"><span class="pill live">${x.act==="tiep"?"ĐANG LÀM":"ĐANG MỞ"}</span><div><b style="display:block;font-size:15px">Kiểm tra định kỳ — ${esc(dgTen(x.e))}</b><span style="font-size:13px;color:var(--muted)">Lớp ${esc(x.l.id)} · đợt ${esc(x.e.id)}${dgMs(x.e.closeAt)?" · đóng "+fmtD(x.e.closeAt):""} · ${+x.e.thoiGian||40} phút</span></div></div><a class="btn pri" href="${DG}?ma=${encodeURIComponent(x.e.id)}">${x.act==="tiep"?"Tiếp tục làm bài":"Vào làm bài"}</a></div>`).join("")}
    <section><h2 class="sec">Các mục của bạn</h2><div class="grid4">
      <a href="#sv/hoctap" class="stile"><span class="ic">${I.hp}</span><b>Học tập</b><span>${hpCards.length} học phần · ôn tập, tóm tắt, mind map, tài liệu</span></a>
      <a href="#sv/kiemtra" class="stile"><span class="ic">${I.exam}</span><b>Kiểm tra, thi</b><span>${can.length?can.length+" bài cần làm":"Chưa có bài đang mở"} · ${dgs.length} đợt của các lớp</span></a>
      <a href="#sv/baitap" class="stile"><span class="ic">${I.task}</span><b>Bài tập &amp; bảng tin</b><span>Bài được giao, hạn nộp, thông báo của lớp</span></a>
      <a href="#sv/diemdanh" class="stile"><span class="ic">${I.qr}</span><b>Điểm danh</b><span>Có mặt ${dd.co.length}/${dd.buoi.filter(b=>b.trangThai!=="huy").length} buổi · quét QR hoặc nhập mã buổi</span></a>
    </div></section>
    <div class="grid2"><section class="scard"><h2 class="sec">Lớp và học phần đang học</h2>${hpCards.join("")||(lops.length?'<p class="note">Lớp của bạn chưa được gán học phần.</p>':'<p class="note">Bạn chưa được xếp vào lớp nào. Hãy báo giảng viên.</p>')}</section>
    <section class="scard"><h2 class="sec">Bài kiểm tra cần làm</h2>${can.concat(sap).map(svDgRow).join("")||'<div class="row"><span>Chưa có bài kiểm tra nào đang mở.</span><a class="btn sm" href="#sv/kiemtra">Xem tất cả</a></div>'}</section></div></div></main>`;
  $("#app").innerHTML=rail(SV_RAIL(),true,"home")+body;bindOut();bindSvDd(me,lops,()=>viewSvHome());grantHomeSession().catch(()=>{})}
async function viewSvKiemTra(){const me=svMe();const lops=await svLops(me);const dgs=await svDgs(me,lops);const by={};dgs.forEach(x=>(by[x.hp]=by[x.hp]||[]).push(x));
  const body=`<main>${svHead(me,`<a class="back" href="#sv">${I.back}Bảng điều khiển</a><span class="sep">/</span><span class="sub">Kiểm tra, thi</span>`)}
  <div class="page" style="max-width:1000px"><h1 class="t">Kiểm tra, thi</h1>
    ${Object.keys(by).length?Object.entries(by).map(([h,xs])=>{const c=courseOf(h)||{name:dgTen(xs[0].e)};return `<section class="scard"><h2 class="sec" style="margin-top:0">${esc(c.name)}</h2>${xs.map(svDgRow).join("")}</section>`}).join("")
      :`<div class="empty">${lops.length?"Các lớp của bạn chưa có đợt kiểm tra định kỳ nào.":"Bạn chưa được xếp vào lớp nào."}</div>`}
    <p class="note">Mỗi bài làm một lần bằng tài khoản này. Đợt chỉ làm được khi giảng viên mở và trong khung giờ; điểm kiểm tra định kỳ từ 9 trở lên và nộp sớm (30 bạn đầu) được cộng vào điểm kiểm tra thường xuyên.</p></div></main>`;
  $("#app").innerHTML=rail(SV_RAIL(),true,"kiemtra")+body;bindOut()}
async function viewSvHocTap(){const me=svMe();const lops=await svLops(me);
  const TASKS=[["Tóm tắt lý thuyết","map"],["Mind map","map"],["Câu hỏi lý thuyết","de"],["Câu hỏi tình huống","task"],["Thi thử","exam"],["Văn bản, án lệ","bank"]];
  const body=`<main>${svHead(me,`<a class="back" href="#sv">${I.back}Bảng điều khiển</a><span class="sep">/</span><span class="sub">Học tập</span>`)}
  <div class="page"><h1 class="t">Học tập</h1>${(()=>{const hp={};lops.forEach(l=>lopHps(l).forEach(h=>(hp[h]=hp[h]||[]).push(l.id)));const ids=Object.keys(hp);
    return ids.length?`<div class="grid4">${ids.map(id=>{const c=courseOf(id)||{id,name:id,c:"#1d5677"};return `<article class="hp"><div class="cover" style="background:${esc(c.c||"#1d5677")}">${esc(c.name)}</div><div class="body"><div class="meta"><span>Lớp ${esc(hp[id].join(", "))}</span></div><div class="tags">${TASKS.map(t=>`<span class="tag">${t[0]}</span>`).join("")}</div><div class="act"><a href="${courseHref(c)}" class="pri" data-vao>Vào học</a></div></div></article>`}).join("")}</div>`
    :lops.length?'<div class="empty">Lớp của bạn chưa được gán học phần nào. Báo giảng viên.</div>':'<div class="empty">Bạn chưa được xếp vào lớp nào.</div>'})()}
  <p class="note">Vào học mở web ôn tập của học phần trên trang thư viện; tài khoản lớp đã được cấp quyền, không cần nhập mã lớp.</p></div></main>`;
  $("#app").innerHTML=rail(SV_RAIL(),true,"hoctap")+body;bindOut();await grantHomeSession()}
async function viewSvTaiKhoan(){const me=svMe();const lops=await svLops(me);
  const body=`<main>${svHead(me,`<a class="back" href="#sv">${I.back}Bảng điều khiển</a><span class="sep">/</span><span class="sub">Tài khoản</span>`)}
  <div class="page" style="max-width:900px"><h1 class="t">Tài khoản</h1>
    <div class="grid2"><section class="scard"><h2 class="sec">Thông tin</h2><div class="row"><span>Họ và tên</span><b>${esc(me.hoTen)}</b></div><div class="row"><span>ID (mã sinh viên)</span><b>${esc(me.mssv)}</b></div>${me.lopNienChe?`<div class="row"><span>Lớp niên chế</span><b>${esc(me.lopNienChe)}</b></div>`:""}<div class="row"><span>Lớp học phần</span><b style="text-align:right">${lops.map(l=>esc(l.id)).join("<br>")||"—"}</b></div><div class="row"><span>Mật khẩu</span>${me.pwDefault?'<span class="pill warn">đang dùng mật khẩu chung của lớp</span>':'<span class="pill">đã đổi riêng</span>'}</div></section>
    <section class="scard"><h2 class="sec">Đổi mật khẩu</h2>${S.sv?`<form id="f-pw" style="display:flex;flex-direction:column;gap:12px"><div class="fld"><label for="p-old">Mật khẩu hiện tại</label><input id="p-old" type="password" autocomplete="current-password" required></div><div class="fld"><label for="p-new">Mật khẩu mới (từ 6 ký tự)</label><input id="p-new" type="password" autocomplete="new-password" minlength="6" required></div><div class="fld"><label for="p-new2">Nhập lại mật khẩu mới</label><input id="p-new2" type="password" autocomplete="new-password" minlength="6" required></div><p class="err" id="p-err"></p><button type="submit" class="btn pri" style="justify-content:center">Đổi mật khẩu</button></form><p class="note" style="margin-top:10px">Quên mật khẩu riêng: báo giảng viên bấm <b>Đặt lại</b>, mật khẩu sẽ về mật khẩu chung của lớp.</p>`:'<p class="note">Đang xem thử với tư cách quản trị — không đổi được mật khẩu ở đây.</p>'}</section></div></div></main>`;
  $("#app").innerHTML=rail(SV_RAIL(),true,"taikhoan")+body;bindOut();const f=$("#f-pw");if(!f)return;
  f.onsubmit=async e=>{e.preventDefault();const err=$("#p-err");err.textContent="";const o=$("#p-old").value,n=$("#p-new").value,n2=$("#p-new2").value;if(n!==n2){err.textContent="Hai lần nhập mật khẩu mới chưa giống nhau.";return}if(n===o){err.textContent="Mật khẩu mới phải khác mật khẩu hiện tại.";return}
    const btn=$("button",f);btn.disabled=true;try{const k=S.sv.mssv;const hOld=await pwHash(k,o),hNew=await pwHash(k,n);
      /* xác nhận mật khẩu hiện tại bằng cách ghi lại phiên với băm cũ (quy tắc đối chiếu), rồi đổi băm trong tài khoản và phiên */
      try{await S.fs.doc("pnl_phien/"+S.sv.uid).set({mssv:k,h:hOld,at:FV().serverTimestamp()})}catch(x){if(x.code==="permission-denied")throw new Error("Mật khẩu hiện tại chưa đúng.");throw x}
      await S.fs.doc("pnl_tk/"+k).update({pw:hNew,pwDefault:false,doiLuc:FV().serverTimestamp()});await S.fs.doc("pnl_phien/"+S.sv.uid).set({mssv:k,h:hNew,at:FV().serverTimestamp()});
      S.sv.pwDefault=false;store.set(SV_KEY,S.sv);toast("Đã đổi mật khẩu. Lần sau đăng nhập bằng mật khẩu mới.");f.reset();render()}
    catch(x){err.textContent=x.message||errMsg(x)}finally{btn.disabled=false}}}

/* ============ điều hướng ============ */
function render(){closeMenu();const h=decodeURIComponent((location.hash||"").slice(1));const p=h.split("/");
  if(S.admin){if(!S.loaded)return;if(p[0]==="dd")return viewQrCheckin(p[1],p[2]);if(p[0]==="sv")return svRoute(p);
    if(p[0]==="lop"&&p[1]&&p[1]!=="luu-tru")return viewLopDetail(p[1],p[2],p[3]);if(p[0]==="lop")return viewLop();
    if(p[0]==="hocphan")return viewHocPhan(p[1]);if(p[0]==="nganhang")return viewNganHang(p[1]);if(p[0]==="hethong")return viewHeThong();if(p[0]==="dg")return viewDg();if(p[0]==="malop")return viewMaLop(p[1],p[2]);if(p[0]==="sinhvien")return viewSinhVien();if(p[0]==="gopy")return viewGopY();return viewHome()}
  if(!S.admin&&new URLSearchParams(location.search).get("out")==="1"){(S.sv?logout():Promise.resolve()).catch(()=>{}).then(()=>{store.del(SV_KEY);const h=store.get(HOME_KEY);if(h&&h.sv)store.del(HOME_KEY);location.href=HOME});return}
  if(S.sv){try{sessionStorage.removeItem("pnl-dn")}catch(e){}if(new URLSearchParams(location.search).get("ve")==="dg"){location.href=DG;return}if(p[0]==="dd")return viewQrCheckin(p[1],p[2]);return svRoute(p)}
  if(p[0]==="dd")return viewQrCheckin(p[1],p[2]);
  viewLogin()}
function svRoute(p){return p[1]==="kiemtra"?viewSvKiemTra():p[1]==="hoctap"?viewSvHocTap():p[1]==="taikhoan"?viewSvTaiKhoan():p[1]==="diemdanh"?viewSvDiemDanh():p[1]==="baitap"?viewSvBaiTap():viewSvHome()}
window.addEventListener("hashchange",()=>{const h=location.hash;const keep=h.includes("#lop/")||h.startsWith("#hocphan")||h.startsWith("#malop")||h.startsWith("#gopy")||h.startsWith("#sinhvien");if(!keep)S.q="";render()});

/* ============ khởi động ============ */
(async function init(){$("#app").innerHTML=`<div class="login"><div class="box" style="grid-template-columns:1fr;max-width:420px"><div class="form" style="text-align:center"><p class="note">Đang kết nối…</p></div></div></div>`;
  try{firebase.initializeApp(FB_CFG);S.fs=firebase.firestore();S.auth=firebase.auth()}catch(e){$("#app").innerHTML=`<div class="login"><div class="box" style="grid-template-columns:1fr;max-width:480px"><div class="form"><h2>Không kết nối được máy chủ dữ liệu</h2><p class="note">${esc(e.message||e)}</p><a class="btn" href="${HOME}">Về trang chủ</a></div></div></div>`;return}
  S.sv=store.get(SV_KEY,null);await loadCourses();
  let first=true;
  S.auth.onAuthStateChanged(async u=>{S.user=u;const adm=fbIsAdmin(u);
    if(adm&&!S.admin){S.admin=true;S.loaded=false;render();await Promise.all([loadHp(),loadLop()]);S.loaded=true;if(!location.hash||location.hash==="#")location.hash="#home";render();if(typeof rsCheck==="function")rsCheck().then(ok=>{if(ok!==false&&typeof nhAutoSync==="function")nhAutoSync()});return}
    if(!adm&&S.admin){S.admin=false;S.loaded=false;if(typeof rsBar==="function")rsBar()}
    S.admin=adm;
    if(first){first=false;if(!adm&&!u){try{await S.auth.signInAnonymously()}catch(e){}return}}
    if(S.busy)return;
    if(!adm&&S.sv)await svCheckSession();
    render()})})();
