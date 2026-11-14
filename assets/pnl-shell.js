/* PHÚC NGUYÊN LIBRARY — khung trang theo PND và chế độ quản trị gộp chung (14/11/2026)
   - Đăng nhập Google bằng tài khoản quản trị: hiện nút thêm/sửa ngay trên trang (học phần, chương, tài liệu, thư mục, liên kết, mã lớp, đánh giá định kỳ).
   - Người vào bằng mã lớp: chỉ đọc.
   Dữ liệu Firestore (dự án phuc-nguyen-library):
     pnl_hp/{id}, pnl_hp_ch/{id}__{NN}  học phần thêm mới / phần bổ sung, nội dung chương (dàn ý, mind map, tóm tắt)
     pnl_docs/{id}     tài liệu: {title,url,driveId,mime,course,folder,star,note,added}
     pnl_folders/{id}  thư mục tài liệu trong học phần: {name,course,parent,order}
     pnl_links/{id}    liên kết thông dụng ở trang chủ: {name,url,order}
     pnl_ma/{MÃ}       mã lớp (giữ nguyên cấu trúc cũ)
   Tệp này được nạp TRƯỚC mã chính của index.html; các biến COURSES, TL, route, session… dùng tại thời điểm gọi. */
"use strict";
const SH={fs:null,docs:[],folders:[],links:[],hp:{},loaded:false,ma:null};
const SH_CLIENT_ID="842652271567-7d5orqj763rlrsiu2kq4ne0170fp9dsr.apps.googleusercontent.com";
const SH_DEF_LINKS=[{id:"_pnd",name:"Phúc Nguyên Digital (PND)",url:"https://luuhuongnnpl-apag.github.io/PN-degital/",c:["#173f66","#3c6ea3"],ab:"PND"},
  {id:"_tvpl",name:"Thư viện pháp luật",url:"https://thuvienphapluat.vn/",c:["#8a1c1c","#c0392b"],ab:"TVPL"}];
const SH_PALETTE=["#1d5677","#3d7fc1","#6fa8d6","#2e7d6b","#7aa62e","#e3b928","#e08a3c","#c0392b","#8e2c3f","#6a3fa0","#4a5d8a","#3e4a57","#8a5a1e","#607d8b"];
const SH_STATUS={an:["Ẩn","Chỉ quản trị thấy"],sap:["Sắp có","Hiện trong danh mục, ghi Sắp có"],mo:["Công khai","Người có mã được vào học"]};
const SH_TASKS=[["thithu","Thi thử","Đề trộn ngẫu nhiên, chấm điểm",["#173f66","#3c6ea3"],"exam"],["luyentap","Lý thuyết","Câu hỏi theo chương, mức độ",["#1f527d","#5c8fbf"],"q"],
  ["tinhhuong","Tình huống","Vận dụng giải quyết vụ việc",["#2f6f4f","#58a37a"],"case"],["vanban","Văn bản, án lệ","Văn bản hiện hành, án lệ",["#8a5a1e","#c08a45"],"law"],
  ["tomtat","Tóm tắt lý thuyết","Cây kiến thức có cơ sở pháp lý",["#6a3fa0","#9a73c9"],"tree"],["mindmap","Mind map","Sơ đồ tư duy từng chương",["#a5402d","#d36d52"],"map"]];
const SH_ICON={exam:'<path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 11l2 2 4-4M9 17h7" stroke="currentColor" stroke-width="1.7" fill="none"/>',
  q:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9.5 9.5a2.5 2.5 0 115 .5c0 1.6-2.5 2-2.5 3.5M12 17h.01" stroke="currentColor" stroke-width="1.8" fill="none"/>',
  case:'<path d="M4 7h16v12H4zM9 7V5h6v2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 12h16" stroke="currentColor" stroke-width="1.7"/>',
  law:'<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 006 0zM19 7l-3 7a3 3 0 006 0zM8 21h8" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  tree:'<path d="M5 4h6v5H5zM13 10h6v5h-6zM13 17h6v4h-6zM8 9v10h5M8 12.5h5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  map:'<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="4.5" cy="5" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="19.5" cy="5" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="4.5" cy="19" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="19.5" cy="19" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9.6 10.2L6 6.4M14.4 10.2L18 6.4M9.6 13.8L6 17.6M14.4 13.8L18 17.6" stroke="currentColor" stroke-width="1.4"/>',
  folder:'<path d="M3 6h7l2 2h9v11H3z" fill="none" stroke="currentColor" stroke-width="1.7"/>'};
const shSvg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${SH_ICON[k]||""}</svg>`;
const SH_HOME_IC='<span class="ic-home" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 10.6L12 3l9 7.6V20a1 1 0 01-1 1h-5.5v-6h-5v6H4a1 1 0 01-1-1z" fill="currentColor"/></svg></span>';
const shAdmin=()=>typeof isOwner!=="undefined"&&isOwner&&typeof FBW!=="undefined"&&FBW;
const shNow=()=>new Date().toISOString();
const shPad=n=>String(n).padStart(2,"0");
const shChId=(id,n)=>id+"__"+shPad(n);
function shSlug(s){return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)}
function shToast(t,ms){let el=document.querySelector(".toast2");if(!el){el=document.createElement("div");el.className="toast2";el.setAttribute("role","status");document.body.appendChild(el)}
  el.textContent=t;el.hidden=false;clearTimeout(shToast._t);shToast._t=setTimeout(()=>el.hidden=true,ms||3400)}
function shArm(btn,label,fn){btn.addEventListener("click",async e=>{e.stopPropagation();if(btn.dataset.armed!=="1"){btn.dataset.armed="1";const old=btn.textContent;btn.textContent=label||"Bấm lần nữa";btn.classList.add("armed");
  setTimeout(()=>{if(btn.isConnected&&btn.dataset.armed==="1"){btn.dataset.armed="";btn.textContent=old;btn.classList.remove("armed")}},4000);return}
  btn.dataset.armed="";btn.disabled=true;try{await fn()}catch(err){shToast("Chưa thực hiện được: "+(err.message||err))}finally{if(btn.isConnected)btn.disabled=false}})}
const shErrMsg=ex=>ex&&ex.code==="permission-denied"?"tài khoản chưa có quyền ghi (đăng nhập Google quản trị).":(ex&&ex.message)||String(ex);

/* ================= Nạp dữ liệu ================= */
async function shLoad(fs){SH.fs=fs;
  const get=async(n,q)=>{try{return (await (q||fs.collection(n)).get()).docs.map(d=>Object.assign({id:d.id},d.data()||{}))}catch(e){console.warn(n,e&&e.code);return []}};
  [SH.docs,SH.folders,SH.links]=await Promise.all([get("pnl_docs"),get("pnl_folders"),get("pnl_links")]);
  SH.loaded=true;await shLoadAdmin();shRefresh()}
async function shLoadAdmin(){if(!shAdmin()||!SH.fs)return;
  try{(await SH.fs.collection("pnl_hp").get()).docs.forEach(d=>{SH.hp[d.id]=Object.assign({id:d.id},d.data()||{})})}catch(e){}
  Object.values(SH.hp).forEach(h=>shApplyHp(h,true))}
function shRefresh(){shNav();shSide();if(typeof cur==="undefined")return;
  if(cur==="home"||course(cur)||/^tm:|^qt-/.test(cur))route(cur)}
/* Ghép một học phần (Firestore) vào danh mục đang chạy */
function shApplyHp(h,adminView){if(!h||h.kind!=="moi")return;
  let e=COURSES.find(c=>c.id===h.id);
  if(!e){if(!h.pub&&!adminView)return;e={id:h.id,name:h.name,c:h.c||"#1d5677",dyn:true};const i=h.after?COURSES.findIndex(c=>c.id===h.after):-1;if(i>=0)COURSES.splice(i+1,0,e);else COURSES.push(e);if(!ALL.some(c=>c.id===h.id))ALL.push(e)}
  e.name=h.name;e.c=h.c||e.c;e.dyn=true;e.status=h.status||"an";e.hidden=!h.pub;e.img=h.img||"";
  if(!TL[h.id])TL[h.id]={name:h.name,review:h.id,chapters:[],laws:[],refs:[],cases:[]};
  TL[h.id].name=h.name;
  (h.chapters||[]).forEach(x=>{let c=TL[h.id].chapters.find(y=>y.n===x.n);if(!c){c={n:x.n,t:x.t,maps:[]};TL[h.id].chapters.push(c)}c.t=x.t;
    if(x.has&&(!x.draft||adminView)&&!c.loaded){c.dyn=true;c.loaded=false;c.maps=new Array(Math.max(1,x.nmaps|0)).fill(null)}});
  TL[h.id].chapters=TL[h.id].chapters.filter(c=>(h.chapters||[]).some(x=>x.n===c.n)).sort((a,b)=>a.n-b.n);
  const d=DOCS.find(x=>x.id===h.id);if(!d)DOCS.push({id:h.id,name:h.name,img:h.img||coverSVG(h.name,h.c||"#1d5677"),tl:h.id});else{d.name=h.name;d.img=h.img||coverSVG(h.name,h.c||"#1d5677")}}
/* Mọi học phần đều có trang ôn tập: học phần chưa có trang riêng dùng trang chung hp/hoc-phan.html */
function shSrc(c){return c.src||("hp/hoc-phan.html?id="+encodeURIComponent(c.id)+"&ten="+encodeURIComponent(c.name))}
function shHasMaps(id){return !!(TL[id]&&TL[id].chapters.some(x=>x.maps.length))}

/* ================= Định tuyến ================= */
function shScope(id){if(/^on:/.test(id))return id.split(":")[1];if(/^tm:/.test(id)){const f=SH.folders.find(x=>x.id===id.slice(3));return f?f.course:""}if(/^qt-/.test(id))return "";return null}
function shKnown(id){return !!(id&&(/^(on|tm):/.test(id)||/^qt-(ma|dg|sl|gy)$/.test(id)))}
function shRoute(id,m){
  const lay=document.getElementById("layout");if(lay)lay.classList.toggle("no-tools",id!=="home");
  if(/^on:/.test(id)){const [,cid,tab]=id.split(":");const c=course(cid);if(!c){route("home");return true}
    if(tab==="mindmap"){route("tl-"+cid);return true}
    document.body.classList.add("in-course");m.innerHTML=`<section class="viewer"><iframe src="${shSrc(c)}${tab?"#"+tab:""}" title="Ôn tập ${esc(c.name)}"></iframe></section>`;return true}
  if(/^tm:/.test(id)){m.innerHTML=shFolderHTML(id.slice(3));shBindPage(m);return true}
  if(id==="qt-ma"){m.innerHTML=shGuard()||shMaHTML();if(shAdmin())shMaBind(m);else shBindPage(m);return true}
  if(id==="qt-dg"){m.innerHTML=shGuard()||`<section class="box"><h2 class="box-title">Quản trị đánh giá định kỳ<span class="sp"></span><a class="b2 sm" href="danh-gia/#quan-tri" target="_blank" rel="noopener">Mở thẻ mới ↗</a></h2><iframe src="danh-gia/?nhung=1#quan-tri" title="Quản trị đánh giá định kỳ" style="width:100%;height:calc(100vh - 220px);min-height:640px;border:1px solid var(--p-line);border-radius:6px"></iframe></section>`;shBindPage(m);return true}
  if(id==="qt-sl"){m.innerHTML=shGuard()||shBackupHTML();if(shAdmin())shBackupBind(m);else shBindPage(m);return true}
  const c=course(id);if(c){m.innerHTML=shCourseHTML(c);shBindPage(m);return true}
  return false}
function shGuard(){return shAdmin()?"":`<section class="box"><h2 class="box-title">Dành cho quản trị</h2><p class="empty">Đăng nhập Google bằng tài khoản quản trị để dùng chức năng này.</p><div class="page-tools"><button type="button" class="hl" data-glogin>Đăng nhập Google</button><button type="button" data-home>Về trang chủ</button></div></section>`}
function shCrumbs(parts){return `<div class="crumbs"><a class="home-link" data-home>${SH_HOME_IC}Trang chủ</a>${parts.map((p,i)=>`<span>/</span>`+(i===parts.length-1||!p[1]?`<span>${esc(p[0])}</span>`:`<a data-go="${esc(p[1])}">${esc(p[0])}</a>`)).join("")}</div>`}

/* ================= Khung: thanh trên, danh mục, cột phải ================= */
function shWho(){const w=document.getElementById("who"),act=document.getElementById("topAct");if(!w||!act)return;
  const adm=shAdmin();
  w.textContent=adm?"Quản trị · "+((fbAuth&&fbAuth.currentUser&&fbAuth.currentUser.email)||""):session?(session.label||session.code)+" · đến "+fmtDate(session.han):"";
  act.querySelectorAll("[data-dyn]").forEach(x=>x.remove());
  const add=h=>w.insertAdjacentHTML("afterend",h);
  if(adm)add('<button type="button" class="tbtn" data-dyn data-glogout>Đăng xuất</button>');
  else{add('<button type="button" class="tbtn" data-dyn data-glogin title="Giảng viên đăng nhập để quản trị">Đăng nhập Google</button>');
    add(session?'<button type="button" class="tbtn" data-dyn data-chcode>Đổi mã</button>':'<button type="button" class="tbtn hl" data-dyn data-chcode>Nhập mã lớp</button>')}
  act.querySelectorAll("[data-glogin]").forEach(b=>b.onclick=shLogin);
  act.querySelectorAll("[data-glogout]").forEach(b=>b.onclick=shLogout);
  act.querySelectorAll("[data-chcode]").forEach(b=>b.onclick=()=>{if(session&&!session.admin){store.del(KEY);session=null;$("#code-in").value=""}pending=null;showGate();shWho()})}
async function shLogin(){if(!fbAuth){shToast("Chưa kết nối máy chủ, tải lại trang rồi thử lại.");return}
  const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:"select_account",login_hint:FB_ADMIN_EMAILS[0]});
  try{const r=await fbAuth.signInWithPopup(p);UID=r.user.uid;isOwner=fbIsAdmin(r.user);
    if(!isOwner){const em=r.user.email;await fbAuth.signOut();shToast("Tài khoản "+em+" không phải quản trị. Hãy chọn "+FB_ADMIN_EMAILS[0]+".",6000);return}
    grantAdmin();renderWho();await shLoadAdmin();shToast("Đã đăng nhập quản trị.");shRefresh()}
  catch(err){if(err.code==="auth/popup-blocked"||err.code==="auth/operation-not-supported-in-this-environment"){fbAuth.signInWithRedirect(p);return}
    if(err.code!=="auth/popup-closed-by-user"&&err.code!=="auth/cancelled-popup-request")shToast("Chưa đăng nhập được ("+(err.code||"lỗi mạng")+").")}}
async function shLogout(){if(!confirm("Đăng xuất quản trị trên máy này? (đăng xuất chung PNL, PNW, PND)"))return;try{await fbAuth.signOut()}catch(e){}location.href=location.pathname}
function shNav(){const nav=document.getElementById("catNav");if(!nav||typeof COURSES==="undefined")return;const adm=shAdmin();
  const curC=typeof cur==="undefined"?"":(shScope(cur)||(course(cur)?cur:(tlParse(cur)||{}).k||""));
  let h=`<button type="button" class="cat home${cur==="home"?" on":""}" data-home>${SH_HOME_IC}<span class="nm">TRANG CHỦ</span></button>`;
  COURSES.forEach(c=>{if(c.hidden&&!adm)return;const n=SH.docs.filter(d=>d.course===c.id).length,ready=c.src||shHasMaps(c.id)||c.dyn&&c.status==="mo";
    h+=`<button type="button" class="cat${curC===c.id?" on":""}${ready?"":" soon"}" data-go="${esc(c.id)}"><span class="dot" style="background:${esc(c.c||"#1d5677")}"></span><span class="nm">${esc(c.name)}</span>${c.hidden?'<span class="tag">Ẩn</span>':!ready?'<span class="tag">Sắp có</span>':n?`<span class="n">${n}</span>`:""}</button>`});
  if(adm){h+=`<button type="button" class="cat add" data-newcourse><span class="nm">＋ Thêm học phần</span></button>`}
  nav.innerHTML=h;
  const adminNav=document.getElementById("adminNav");
  if(adminNav){adminNav.hidden=!adm;if(adm)adminNav.querySelector(".catnav").innerHTML=[["qt-ma","🔑","Mã lớp"],["qt-dg","📝","Đánh giá định kỳ"],["gop-y","💬","Góp ý, báo lỗi"],["qt-sl","💾","Sao lưu dữ liệu"]].map(([k,ic,t])=>`<button type="button" class="cat${cur===k?" on":""}" data-go="${k}"><span style="width:18px;text-align:center">${ic}</span><span class="nm">${t}</span></button>`).join("")}
  shBindNav()}
function shBindNav(){document.querySelectorAll(".side-nav [data-go]").forEach(b=>b.onclick=()=>route(b.dataset.go));
  document.querySelectorAll(".side-nav [data-home]").forEach(b=>b.onclick=()=>route("home"));
  document.querySelectorAll(".side-nav [data-newcourse]").forEach(b=>b.onclick=()=>shCourseDlg(null))}
function shSide(){const s=document.getElementById("sideExtra");if(!s)return;
  const vis=typeof stats!=="undefined"&&stats&&stats.users!=null?stats.users:(typeof visits!=="undefined"?visits:null);
  s.innerHTML=`<section class="sbox"><h3 class="sbox-title">Hướng dẫn sử dụng</h3><ol class="guide2">
      <li><b>Nhập mã lớp</b> giảng viên cấp (nút trên cùng). Trình duyệt nhớ mã đến khi hết hạn.</li>
      <li>Chọn <b>học phần</b> ở cột Danh mục học phần bên trái.</li>
      <li>Đọc <b>Tóm tắt lý thuyết</b>, <b>Mind map</b> và tài liệu, giáo trình của học phần.</li>
      <li>Luyện <b>Lý thuyết</b>, <b>Tình huống</b>, rồi làm <b>Thi thử</b>; xem lại đáp án và căn cứ sau khi nộp.</li>
      <li><b>Đánh giá định kỳ</b>: nhập mã lớp và mã sinh viên ở khung trên trang chủ khi giảng viên mở bài.</li>
      <li>Thấy lỗi? Bấm <b>Gửi góp ý</b> để giảng viên sửa.</li></ol>
      <p class="muted" style="margin:8px 0 0">Thông tin cung cấp vì mục đích học thuật, không có yếu tố thương mại.</p></section>
    <section class="sbox"><h3 class="sbox-title">Góp ý, báo lỗi</h3><dl class="stats2"><dt>Lượng truy cập</dt><dd>${vis!=null?Number(vis).toLocaleString("vi-VN"):"…"}</dd><dt>Học phần</dt><dd>${COURSES.filter(c=>!c.hidden).length}</dd><dt>Tài liệu</dt><dd>${SH.loaded?SH.docs.length:"…"}</dd></dl>
      <button type="button" class="sbtn" data-go="gop-y">Gửi góp ý</button></section>`;
  s.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>route(b.dataset.go))}

/* ================= Trang chủ ================= */
function shHomeHTML(dgBox){const adm=shAdmin();
  const stars=SH.docs.filter(d=>d.star).sort((a,b)=>String(b.added||"").localeCompare(String(a.added||"")));
  const links=(SH.links.length?SH.links.slice().sort((a,b)=>(a.order||0)-(b.order||0)):SH_DEF_LINKS);
  return `${dgBox}
  <section class="box"><h2 class="box-title">Tài liệu, giáo trình ★<span class="sp"></span>${adm?'<button type="button" class="b2 sm" data-adddoc="">⤒ Thêm tài liệu</button>':""}</h2>
    ${stars.length?`<div class="docs-grid">${stars.map(shDocCard).join("")}</div>`:`<p class="empty">${SH.loaded?"Tài liệu, giáo trình được đánh dấu ★ sẽ hiện ở đây."+(adm?" (Đánh dấu ★ khi thêm tài liệu hoặc ở bảng tài liệu của học phần.)":""):"Đang tải…"}</p>`}</section>
  <section class="box"><h2 class="box-title">Liên kết thông dụng${adm&&!SH.links.length?'<small>(liên kết mặc định — thêm liên kết để thay)</small>':""}</h2>
    <div class="links">${links.map(l=>shLinkHTML(l,adm&&SH.links.length)).join("")}${adm?'<button type="button" class="lnk add" data-addlink>＋ Thêm liên kết</button>':'<span class="lnk soon"><span class="ic">＋</span><span><b>Đang bổ sung</b><small>Liên kết khác sẽ cập nhật thêm</small></span></span>'}</div></section>`}
function shLinkHTML(l,edit){const def=SH_DEF_LINKS.find(x=>x.url===l.url)||{};const c=l.c||def.c||["#1f527d","#5c8fbf"];let host="";try{host=new URL(l.url).hostname.replace(/^www\./,"")}catch(e){}
  const ab=l.ab||def.ab||String(l.name||"?").split(/\s+/).map(w=>w[0]).join("").slice(0,4).toUpperCase();
  return `<a class="lnk" href="${esc(l.url)}" target="_blank" rel="noopener" style="--c1:${c[0]};--c2:${c[1]}"><span class="ic">${esc(ab)}</span><span><b>${esc(l.name)}</b><small>${esc(host)}</small></span>${edit?`<button type="button" class="x" data-dellink="${esc(l.id)}" title="Xóa liên kết">✕</button>`:""}</a>`}
function shFmt(d){const u=String(d.url||""),m=String(d.mime||""),n=String(d.title||"")+" "+u;
  if(/pdf/i.test(m)||/\.pdf(\?|$)/i.test(n))return ["PDF",["#a5402d","#d36d52"]];
  if(/word|document/i.test(m)||/\.docx?(\?|$)/i.test(n)||/docs\.google\.com\/document/.test(u))return ["DOC",["#1f527d","#5c8fbf"]];
  if(/presentation|powerpoint/i.test(m)||/\.pptx?(\?|$)/i.test(n)||/docs\.google\.com\/presentation/.test(u))return ["PPT",["#b45309","#e08a3c"]];
  if(/sheet|excel/i.test(m)||/\.xlsx?(\?|$)/i.test(n)||/docs\.google\.com\/spreadsheets/.test(u))return ["XLS",["#2f6f4f","#58a37a"]];
  if(/image/i.test(m))return ["ẢNH",["#6a3fa0","#9a73c9"]];
  if(/video|youtube|youtu\.be/i.test(m+u))return ["VIDEO",["#8e2c3f","#c4566a"]];
  return [d.driveId?"TỆP":"LINK",["#3e4a57","#6b7a8c"]]}
function shDocCard(d){const [f,c]=shFmt(d);const hp=course(d.course);return `<button type="button" class="dcard" data-open="${esc(d.id)}" title="${esc(d.title)}"><span class="bk" style="--c1:${c[0]};--c2:${c[1]}"><span class="fmt">${f}</span><span class="tt">${esc(d.title)}</span><span class="hp">${esc(hp?hp.name:"Phúc Nguyên Library")}</span></span><span class="t">${esc(d.title)}</span></button>`}

/* ================= Trang học phần ================= */
function shCourseHTML(c){const adm=shAdmin();const has=shHasMaps(c.id);
  const st=c.dyn?(c.hidden?"Ẩn":SH_STATUS[c.status||"mo"][0]):c.src||has?"":"Sắp có";
  const tasks=SH_TASKS.map(([k,t,sub,col,ic])=>{const off=k==="mindmap"&&!has;
    return `<button type="button" class="card${off?" off":""}" ${off?"":`data-go="on:${esc(c.id)}:${k}"`} style="--c1:${col[0]};--c2:${col[1]}"><span class="cv">${shSvg(ic)}</span><span class="nm">${t}<small>${off?"Đang biên soạn":sub}</small></span></button>`}).join("");
  const tools=adm?`<div class="page-tools"><button type="button" class="hl" data-adddoc="${esc(c.id)}">⤒ Thêm tài liệu</button><button type="button" data-newfolder="${esc(c.id)}|">＋ Thư mục mới</button>
      ${c.dyn?`<button type="button" data-editcourse="${esc(c.id)}">✎ Sửa học phần</button>`:""}<button type="button" data-chapters="${esc(c.id)}">🗺 Soạn tóm tắt & mind map</button>
      <button type="button" disabled title="Bước 2">❓ Ngân hàng câu hỏi (bước 2)</button></div>`:"";
  return `<section class="box"><h2 class="box-title">${esc(c.name)}${st?`<small>· ${esc(st)}</small>`:""}</h2>${shCrumbs([[c.name,""]])}${tools}
    <div class="grp-title" style="margin-top:0">Nội dung học tập</div><div class="cards">${tasks}</div>
    ${adm?shChapterAdminHTML(c):""}
    ${shDocsBlock(c.id,"")}</section>`}
function shDocsBlock(cid,fid){const adm=shAdmin();
  const kids=SH.folders.filter(f=>f.course===cid&&(f.parent||"")===fid).sort((a,b)=>(a.order||0)-(b.order||0)||String(a.name).localeCompare(String(b.name),"vi"));
  const docs=SH.docs.filter(d=>d.course===cid&&(d.folder||"")===fid).sort((a,b)=>String(b.added||"").localeCompare(String(a.added||"")));
  const folders=kids.map(f=>{const n=SH.docs.filter(d=>d.folder===f.id).length;return `<div class="card-wrap"><button type="button" class="card" data-go="tm:${esc(f.id)}" style="--c1:#2e5c8a;--c2:#4f86b8"><span class="cv">${shSvg("folder")}</span><span class="nm">${esc(f.name)}<small>${n} tài liệu</small></span></button>${adm?`<span class="ftools"><button type="button" title="Đổi tên" data-renfolder="${esc(f.id)}">✎</button><button type="button" title="Xóa thư mục" data-delfolder="${esc(f.id)}">🗑</button></span>`:""}</div>`}).join("");
  if(!folders&&!docs.length&&!adm)return `<div class="grp-title">Tài liệu, giáo trình</div><p class="empty">${SH.loaded?"Giảng viên chưa đưa tài liệu lên mục này.":"Đang tải…"}</p>`;
  return `<div class="grp-title">${fid?"Nội dung thư mục":"Tài liệu, giáo trình"}</div>${folders||adm?`<div class="cards" style="margin-bottom:14px">${folders}${adm?`<button type="button" class="add-card" data-newfolder="${esc(cid)}|${esc(fid)}">＋ Thư mục mới</button><button type="button" class="add-card" data-adddoc="${esc(cid)}|${esc(fid)}">⤒ Thêm tài liệu${fid?" vào đây":""}</button>`:""}</div>`:""}
    ${docs.length?shDocTable(docs):folders?"":`<p class="empty">Chưa có tài liệu.</p>`}`}
function shDocTable(docs){const adm=shAdmin();
  return `<div class="dtbl"><table><thead><tr><th>Tài liệu</th><th>Loại</th><th>Ngày thêm</th>${adm?"<th></th>":""}</tr></thead><tbody>${docs.map(d=>{const [f,c]=shFmt(d);
    return `<tr><td><button type="button" class="dn" data-open="${esc(d.id)}"><span class="fi" style="--c1:${c[0]};--c2:${c[1]}">${f}</span><span>${d.star?'<span class="star-on">★</span> ':""}${esc(d.title)}${d.note?`<br><span class="muted">${esc(d.note)}</span>`:""}</span></button></td><td>${f}</td><td style="white-space:nowrap">${esc(fmtDate(String(d.added||"").slice(0,10)))}</td>
      ${adm?`<td class="act"><button type="button" class="${d.star?"on":""}" data-star="${esc(d.id)}" title="Đánh dấu ★ để hiện ở trang chủ">★</button><button type="button" data-editdoc="${esc(d.id)}">Sửa</button><button type="button" class="del" data-deldoc="${esc(d.id)}">Gỡ</button></td>`:""}</tr>`}).join("")}</tbody></table></div>`}
function shFolderHTML(fid){const f=SH.folders.find(x=>x.id===fid);if(!f)return `<section class="box"><p class="empty">${SH.loaded?"Không tìm thấy thư mục.":"Đang tải…"}</p><div class="page-tools"><button type="button" data-home>Về trang chủ</button></div></section>`;
  const c=course(f.course)||{id:f.course,name:f.course};const path=[];let p=f,g=0;while(p&&g++<10){path.unshift(p);p=SH.folders.find(x=>x.id===p.parent)}
  const adm=shAdmin();
  return `<section class="box"><h2 class="box-title">${esc(f.name)}</h2>${shCrumbs([[c.name,c.id]].concat(path.map((x,i)=>[x.name,i===path.length-1?"":"tm:"+x.id])))}
    ${adm?`<div class="page-tools"><button type="button" class="hl" data-adddoc="${esc(c.id)}|${esc(fid)}">⤒ Thêm tài liệu vào đây</button><button type="button" data-newfolder="${esc(c.id)}|${esc(fid)}">＋ Thư mục con</button><button type="button" data-renfolder="${esc(fid)}">✎ Đổi tên thư mục</button></div>`:""}
    ${shDocsBlock(c.id,fid)}</section>`}
function shChapterAdminHTML(c){const chs=shChaptersOf(c);
  return `<div class="grp-title">Tóm tắt & mind map theo chương <span class="muted" style="text-transform:none;font-weight:500">(chỉ quản trị thấy)</span></div>
    ${chs.length?`<div class="dtbl" style="margin-bottom:6px"><table><tbody>${chs.map(x=>`<tr><td style="width:110px"><b>Chương ${x.n}</b></td><td>${esc(x.t)}</td><td>${x.gh?`<span class="muted">Có sẵn trên GitHub · ${x.ghMaps} sơ đồ</span>`:x.has?(x.draft?'<span class="muted" style="color:#8a5a00">Nháp, chưa hiện</span>':`<span class="muted" style="color:#1b6e3a">Đã công bố · ${x.nmaps} sơ đồ</span>`):'<span class="muted">Chưa soạn</span>'}</td>
      <td class="act" style="text-align:right">${x.gh?`<button type="button" class="b2 sm" data-go="tl-${esc(c.id)}-${x.n}">Xem</button>`:`<button type="button" class="b2 sm${x.has?"":" pri"}" data-edch="${esc(c.id)}|${x.n}">${x.has?"Sửa":"Soạn"}</button>`}</td></tr>`).join("")}</tbody></table></div>`:`<p class="empty">Học phần chưa có danh sách chương.${c.dyn?" Bấm ✎ Sửa học phần để thêm chương (có thể đọc từ đề cương).":""}</p>`}
    ${!c.dyn?`<button type="button" class="b2 sm" data-addch="${esc(c.id)}">＋ Thêm chương bổ sung</button>`:""}`}
function shChaptersOf(c){const h=SH.hp[c.id]||{},ov=h.chapters||[],out=[];
  if(c.dyn){ov.forEach(x=>out.push({n:x.n,t:x.t,gh:false,has:!!x.has,draft:!!x.draft,nmaps:x.nmaps|0}));return out.sort((a,b)=>a.n-b.n)}
  ((TL[c.id]&&TL[c.id].chapters)||[]).forEach(x=>{const o=ov.find(y=>y.n===x.n);const gh=!x.dyn&&x.maps.length>0;out.push({n:x.n,t:x.t,gh,ghMaps:gh?x.maps.length:0,has:!!(o&&o.has),draft:!!(o&&o.draft),nmaps:o?o.nmaps|0:0})});
  ov.forEach(o=>{if(!out.some(x=>x.n===o.n))out.push({n:o.n,t:o.t,gh:false,has:!!o.has,draft:!!o.draft,nmaps:o.nmaps|0})});
  return out.sort((a,b)=>a.n-b.n)}
function shBindPage(m){
  m.querySelectorAll("[data-home]").forEach(b=>b.onclick=()=>route("home"));
  m.querySelectorAll("[data-go]").forEach(b=>b.onclick=e=>{e.preventDefault();route(b.dataset.go)});
  m.querySelectorAll("[data-glogin]").forEach(b=>b.onclick=shLogin);
  m.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>shOpenDoc(b.dataset.open));
  if(!shAdmin())return;
  m.querySelectorAll("[data-adddoc]").forEach(b=>b.onclick=()=>{const [c,f]=b.dataset.adddoc.split("|");shDocDlg(null,c||"",f||"")});
  m.querySelectorAll("[data-editdoc]").forEach(b=>b.onclick=()=>shDocDlg(SH.docs.find(d=>d.id===b.dataset.editdoc)));
  m.querySelectorAll("[data-star]").forEach(b=>b.onclick=async()=>{const d=SH.docs.find(x=>x.id===b.dataset.star);if(!d)return;d.star=!d.star;
    try{await SH.fs.doc("pnl_docs/"+d.id).set({star:d.star},{merge:true});shToast(d.star?"Đã đánh dấu ★ — hiện ở trang chủ":"Đã bỏ ★");route(cur)}catch(ex){d.star=!d.star;shToast("Chưa lưu được: "+shErrMsg(ex))}});
  m.querySelectorAll("[data-deldoc]").forEach(b=>shArm(b,"Gỡ?",async()=>{await SH.fs.doc("pnl_docs/"+b.dataset.deldoc).delete();SH.docs=SH.docs.filter(d=>d.id!==b.dataset.deldoc);shToast("Đã gỡ khỏi thư viện (tệp trên Drive vẫn giữ)");shRefresh()}));
  m.querySelectorAll("[data-newfolder]").forEach(b=>b.onclick=()=>{const [c,p]=b.dataset.newfolder.split("|");shFolderDlg(null,c,p||"")});
  m.querySelectorAll("[data-renfolder]").forEach(b=>b.onclick=e=>{e.stopPropagation();shFolderDlg(SH.folders.find(f=>f.id===b.dataset.renfolder))});
  m.querySelectorAll("[data-delfolder]").forEach(b=>shArm(b,"✓",async()=>{const id=b.dataset.delfolder;
    if(SH.docs.some(d=>d.folder===id)||SH.folders.some(f=>f.parent===id))throw new Error("Thư mục còn tài liệu hoặc thư mục con, chuyển hoặc gỡ trước.");
    await SH.fs.doc("pnl_folders/"+id).delete();SH.folders=SH.folders.filter(f=>f.id!==id);shToast("Đã xóa thư mục");shRefresh()}));
  m.querySelectorAll("[data-editcourse]").forEach(b=>b.onclick=()=>shCourseDlg(SH.hp[b.dataset.editcourse]));
  m.querySelectorAll("[data-chapters]").forEach(b=>b.onclick=()=>{const t=m.querySelector(".grp-title:nth-of-type(2)");const x=[...m.querySelectorAll(".grp-title")].find(g=>/Tóm tắt & mind map/.test(g.textContent));if(x)x.scrollIntoView({behavior:"smooth"})});
  m.querySelectorAll("[data-edch]").forEach(b=>b.onclick=()=>{const [cid,n]=b.dataset.edch.split("|");const c=course(cid);const ch=shChaptersOf(c).find(x=>x.n===+n);shEditor(c,ch)});
  m.querySelectorAll("[data-addch]").forEach(b=>b.onclick=()=>{const c=course(b.dataset.addch);const chs=shChaptersOf(c);const n=Math.max(0,...chs.map(x=>x.n))+1;
    shPrompt("Thêm chương bổ sung","Tên Chương "+n+" (theo đề cương chi tiết)","",t=>shEditor(c,{n,t,gh:false,has:false,draft:false}))});
  m.querySelectorAll("[data-addlink]").forEach(b=>b.onclick=()=>shLinkDlg());
  m.querySelectorAll("[data-dellink]").forEach(b=>shArm(b,"✓",async()=>{await SH.fs.doc("pnl_links/"+b.dataset.dellink).delete();SH.links=SH.links.filter(l=>l.id!==b.dataset.dellink);shRefresh()}));
  m.querySelectorAll("[data-dellink]").forEach(b=>b.addEventListener("click",e=>e.preventDefault()))}

/* ================= Xem tài liệu toàn màn hình ================= */
function shOpenDoc(id){const d=SH.docs.find(x=>x.id===id);if(!d)return;
  const prev=d.driveId?"https://drive.google.com/file/d/"+encodeURIComponent(d.driveId)+"/preview":/docs\.google\.com\/(document|presentation|spreadsheets)\/d\//.test(d.url)?d.url.replace(/\/(edit|view)[^/]*$/,"/preview"):"";
  if(!prev){window.open(d.url,"_blank","noopener");return}
  const v=document.createElement("div");v.className="dview";v.innerHTML=`<div class="dview-top"><b>${esc(d.title)}</b><a class="tbtn" href="${esc(d.url)}" target="_blank" rel="noopener">Mở thẻ mới ↗</a><button type="button" class="tbtn" data-x>✕ Đóng</button></div><iframe src="${esc(prev)}" title="${esc(d.title)}" allow="autoplay"></iframe>`;
  document.body.appendChild(v);document.body.style.overflow="hidden";const close=()=>{v.remove();document.body.style.overflow="";document.removeEventListener("keydown",k)};const k=e=>{if(e.key==="Escape")close()};
  v.querySelector("[data-x]").onclick=close;document.addEventListener("keydown",k)}

/* ================= Hộp thoại chung ================= */
function shDlg(title,body,foot,wide){const d=document.createElement("div");d.className="dlg";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");
  d.innerHTML=`<div class="dlg-card"${wide?' style="width:min(900px,100%)"':""}><div class="dlg-head"><h3>${esc(title)}</h3><button type="button" data-x aria-label="Đóng">×</button></div><div class="dlg-body">${body}</div><div class="dlg-foot">${foot}</div></div>`;
  document.body.appendChild(d);const close=()=>{d.remove();document.removeEventListener("keydown",k)};const k=e=>{if(e.key==="Escape")close()};
  d.querySelectorAll("[data-x]").forEach(b=>b.onclick=close);document.addEventListener("keydown",k);d.close=close;
  setTimeout(()=>{const f=d.querySelector("input:not([type=file]):not([type=checkbox]):not([readonly]),textarea");if(f)f.focus()},40);return d}
function shPrompt(title,label,val,cb){const d=shDlg(title,`<label class="fld2"><span>${esc(label)}</span><input data-v value="${esc(val||"")}" maxlength="160"></label>`,`<button type="button" class="b2" data-x>Hủy</button><button type="button" class="b2 pri" data-ok>Đồng ý</button>`);
  const ok=()=>{const v=d.querySelector("[data-v]").value.trim().replace(/\s+/g," ");if(!v)return;d.close();cb(v)};d.querySelector("[data-ok]").onclick=ok;d.querySelector("[data-v]").onkeydown=e=>{if(e.key==="Enter")ok()}}

/* ---- Học phần ---- */
function shCourseDlg(h){if(!shAdmin())return;const isNew=!h;h=h||{name:"",c:SH_PALETTE[0],status:"an",after:"",img:"",chapters:[]};
  const others=COURSES.filter(c=>c.id!==h.id);
  const d=shDlg(isNew?"Thêm học phần":"Sửa học phần",`
    <div class="row2"><label class="fld2"><span>Tên học phần</span><input data-f="name" maxlength="120" value="${esc(h.name)}" placeholder="Ví dụ: Luật Hôn nhân và gia đình"></label>
      <label class="fld2"><span>Vị trí trong danh mục</span><select data-f="after"><option value="">Cuối danh mục</option>${others.map(c=>`<option value="${esc(c.id)}"${h.after===c.id?" selected":""}>Sau: ${esc(c.name)}</option>`).join("")}</select></label></div>
    <div class="row2"><div class="fld2"><span>Trạng thái</span><div class="seg2" data-f="status">${Object.entries(SH_STATUS).map(([k,v])=>`<button type="button" data-v="${k}" class="${h.status===k?"on":""}">${v[0]}</button>`).join("")}</div><small data-hint>${SH_STATUS[h.status||"an"][1]}</small></div>
      <div class="fld2"><span>Màu sách (chấm màu ở danh mục)</span><div class="sw2" data-f="color">${SH_PALETTE.map(p=>`<button type="button" data-c="${p}" style="background:${p}" class="${p===h.c?"on":""}" aria-label="Màu ${p}"></button>`).join("")}<input type="color" data-f="colorIn" value="${esc(h.c||SH_PALETTE[0])}" style="width:38px;height:28px;padding:0;border:1px solid #cbd5e1;border-radius:4px"></div></div></div>
    <div class="fld2"><span>Ảnh bìa</span><div style="display:flex;gap:12px;align-items:center"><span class="cvprev" data-cv></span><div class="drop2" data-cover style="flex:1" tabindex="0"><b>Kéo thả, dán (Ctrl+V) hoặc bấm để chọn ảnh</b>Để trống: tự tạo bìa theo tên và màu<input type="file" accept="image/*" hidden data-coverin></div><button type="button" class="b2 sm" data-coverclr>Bìa tự tạo</button></div></div>
    <div class="fld2"><span>Danh sách chương — mỗi dòng một chương</span>
      <div class="drop2" data-dc tabindex="0"><b>⤒ Tải đề cương chi tiết học phần (PDF, Word .docx, .txt) để đọc danh sách chương</b>Hệ thống tìm các dòng "Chương 1…", "Chương 2…" trong đề cương; sếp xem lại trước khi lưu.<input type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" hidden data-dcin></div>
      <p class="ok2" data-dcmsg></p>
      <textarea data-f="ch" rows="9" placeholder="Chương 1. Khái quát chung về …&#10;Chương 2. …">${esc((h.chapters||[]).map(c=>"Chương "+c.n+". "+c.t).join("\n"))}</textarea>
      <small>Học phần mới tự có đủ các mục: Thi thử, Lý thuyết, Tình huống, Văn bản & án lệ, Tóm tắt lý thuyết, Mind map và Tài liệu, giáo trình.</small></div>
    <p class="err2" data-err role="alert"></p>`,
    `${isNew?"":`<button type="button" class="b2 danger" data-del>Xóa học phần</button>`}<span class="sp"></span><span class="muted" data-msg></span><button type="button" class="b2" data-x>Hủy</button><button type="button" class="b2 pri" data-save>${isNew?"Tạo học phần":"Lưu"}</button>`,true);
  const q=s=>d.querySelector(s);let color=h.c||SH_PALETTE[0],status=h.status||"an",img=h.img||"";
  const pv=()=>{q("[data-cv]").style.backgroundImage=`url('${(img||coverSVG(q('[data-f=name]').value||"Học phần mới",color)).replace(/'/g,"%27")}')`};pv();
  q("[data-f=name]").oninput=pv;
  q("[data-f=status]").onclick=e=>{const b=e.target.closest("button");if(!b)return;status=b.dataset.v;d.querySelectorAll("[data-f=status] button").forEach(x=>x.classList.toggle("on",x===b));q("[data-hint]").textContent=SH_STATUS[status][1]};
  q("[data-f=color]").onclick=e=>{const b=e.target.closest("button[data-c]");if(!b)return;color=b.dataset.c;q("[data-f=colorIn]").value=color;d.querySelectorAll("[data-f=color] button").forEach(x=>x.classList.toggle("on",x===b));pv()};
  q("[data-f=colorIn]").oninput=e=>{color=e.target.value;pv()};
  shPicker(q("[data-cover]"),q("[data-coverin]"),f=>shResizeImg(f).then(u=>{img=u;pv()}));q("[data-coverclr]").onclick=()=>{img="";pv()};
  shPicker(q("[data-dc]"),q("[data-dcin]"),async f=>{q("[data-dcmsg]").className="ok2";q("[data-dcmsg]").textContent="Đang đọc "+f.name+"…";
    try{const txt=await shReadText(f,t=>{q("[data-dcmsg]").textContent=t});const chs=shChaptersFromText(txt);
      if(!chs.length){q("[data-dcmsg]").className="err2";q("[data-dcmsg]").textContent="Không tìm thấy dòng nào bắt đầu bằng \"Chương …\" trong tệp. Hãy dán danh sách chương bằng tay.";return}
      const ta=q("[data-f=ch]");if(ta.value.trim()&&!confirm("Thay danh sách chương đang có bằng "+chs.length+" chương đọc được từ đề cương?"))return;
      ta.value=chs.map(c=>"Chương "+c.n+". "+c.t).join("\n");q("[data-dcmsg]").textContent="Đã đọc "+chs.length+" chương từ "+f.name+". Sếp xem lại tên chương trước khi lưu."}
    catch(ex){q("[data-dcmsg]").className="err2";q("[data-dcmsg]").textContent="Chưa đọc được tệp: "+(ex.message||ex)}},true);
  if(!isNew)shArm(q("[data-del]"),"Bấm lần nữa để xóa hẳn",async()=>{for(const c of (h.chapters||[]))await SH.fs.doc("pnl_hp_ch/"+shChId(h.id,c.n)).delete().catch(()=>{});
    await SH.fs.doc("pnl_hp/"+h.id).delete();delete SH.hp[h.id];const i=COURSES.findIndex(c=>c.id===h.id);if(i>=0)COURSES.splice(i,1);d.close();shToast("Đã xóa học phần "+h.name);route("home")});
  q("[data-save]").onclick=async()=>{const err=t=>{q("[data-err]").textContent=t};
    const name=q("[data-f=name]").value.trim().replace(/\s+/g," "),id=isNew?shSlug(name):h.id;
    if(name.length<3)return err("Nhập tên học phần.");
    if(isNew&&(course(id)||SH.hp[id]))return err("Đã có học phần trùng tên (mã "+id+"). Đổi tên khác.");
    const chs=shParseChapters(q("[data-f=ch]").value);if(!chs.length)return err("Nhập ít nhất một chương (hoặc tải đề cương để đọc).");
    if(new Set(chs.map(c=>c.n)).size!==chs.length)return err("Có hai chương trùng số, kiểm tra lại.");
    const old=h.chapters||[],gone=old.filter(o=>o.has&&!chs.some(c=>c.n===o.n));
    if(gone.length&&!confirm("Các chương đã có nội dung sẽ bị xóa: "+gone.map(x=>"Chương "+x.n).join(", ")+". Tiếp tục?"))return;
    const chapters=chs.map(c=>{const o=old.find(x=>x.n===c.n)||{};return {n:c.n,t:c.t,has:!!o.has,nmaps:o.nmaps|0,draft:!!o.draft}});
    const pub=status!=="an",data={kind:"moi",name,c:color,status,pub,after:q("[data-f=after]").value,img,chapters,updated:shNow()};if(isNew)data.created=shNow();
    q("[data-save]").disabled=true;q("[data-msg]").textContent="Đang lưu…";
    try{await SH.fs.doc("pnl_hp/"+id).set(data,{merge:true});
      for(const g of gone)await SH.fs.doc("pnl_hp_ch/"+shChId(id,g.n)).delete().catch(()=>{});
      for(const c of chapters.filter(x=>x.has))await SH.fs.doc("pnl_hp_ch/"+shChId(id,c.n)).set({pub:pub&&!c.draft,t:c.t},{merge:true}).catch(()=>{});
      SH.hp[id]=Object.assign({id},SH.hp[id]||{},data);
      if(!isNew){const i=COURSES.findIndex(c=>c.id===id);if(i>=0){const e=COURSES.splice(i,1)[0];const j=data.after?COURSES.findIndex(c=>c.id===data.after):-1;if(j>=0)COURSES.splice(j+1,0,e);else COURSES.push(e)}}
      shApplyHp(SH.hp[id],true);d.close();shToast(isNew?"Đã tạo học phần "+name+" với đủ các mục mặc định":"Đã lưu học phần");shNav();route(id)}
    catch(ex){err("Chưa lưu được: "+shErrMsg(ex))}finally{q("[data-save]").disabled=false;q("[data-msg]").textContent=""}}}
function shParseChapters(t){const out=[];let next=1;
  String(t||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).forEach(line=>{
    const m=line.match(/^(?:CHƯƠNG|Chương|chương)\s+(\d+|[IVXLC]+)\s*[.:\-–—]?\s*(.*)$/);let n,tt;
    if(m){n=/^\d+$/.test(m[1])?+m[1]:shRoman(m[1]);tt=m[2]}else{const k=line.match(/^(\d+)\s*[.)\-–]\s*(.+)$/);if(k){n=+k[1];tt=k[2]}else{n=next;tt=line}}
    tt=String(tt).replace(/\s+/g," ").replace(/[.;:,]+$/,"").trim();if(!tt)return;out.push({n,t:tt});next=n+1});return out}
function shRoman(s){const v={I:1,V:5,X:10,L:50,C:100};let r=0;s=s.toUpperCase();for(let i=0;i<s.length;i++){const a=v[s[i]],b=v[s[i+1]]||0;r+=a<b?-a:a}return r}
/* Đọc chương từ đề cương: lấy các dòng "Chương N…"; tên chương nằm ở dòng sau nếu dòng đó trống tên; mỗi số chương lấy tên đầy đủ nhất */
function shChaptersFromText(txt){const lines=String(txt||"").split(/\r?\n/).map(x=>x.replace(/\s+/g," ").trim());const found={};
  lines.forEach((l,i)=>{const m=l.match(/^(?:CHƯƠNG|Chương)\s+(\d{1,2}|[IVX]{1,5})\s*[.:\-–—]?\s*(.*)$/);if(!m)return;
    const n=/^\d+$/.test(m[1])?+m[1]:shRoman(m[1]);if(!(n>=1&&n<=30))return;
    let t=m[2]||"";if(t.length<4&&lines[i+1]&&!/^(?:CHƯƠNG|Chương)\s/.test(lines[i+1]))t=(t+" "+lines[i+1]).trim();
    t=t.replace(/\s*\(?\d+\s*(tiết|giờ)\)?.*$/i,"").replace(/(\s+\d+(?:[.,]\d+)?){1,6}\s*$/,"").replace(/[.;:,\s]+$/,"").trim();
    if(t.length<4)return;if(/^[A-ZĐÀ-Ỹ\s,;]+$/.test(t)&&t.length>6)t=t.charAt(0)+t.slice(1).toLowerCase();
    const cur=found[n];if(!cur||(t.length>cur.length&&t.length<220))found[n]=t});
  return Object.keys(found).map(Number).sort((a,b)=>a-b).map(n=>({n,t:found[n]}))}
function shLoadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Không tải được thư viện đọc tệp"));document.head.appendChild(s)})}
/* Đọc chữ trong tệp: .txt/.md, .docx (mammoth), PDF có chữ (pdf.js); PDF scan (ảnh) → nhận dạng chữ tiếng Việt bằng Tesseract ngay trên máy */
async function shReadText(f,prog){const nm=f.name.toLowerCase();prog=prog||(()=>{});
  if(/\.(txt|md)$/.test(nm)||/^text\//.test(f.type))return await f.text();
  if(/\.docx$/.test(nm)){if(!window.mammoth)await shLoadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    return (await mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()})).value}
  if(/\.pdf$/.test(nm)||f.type==="application/pdf"){if(!window.pdfjsLib){await shLoadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"}
    const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;let out=[];
    for(let p=1;p<=pdf.numPages;p++){const tc=await (await pdf.getPage(p)).getTextContent();const rows={};
      tc.items.forEach(it=>{if(!it.str)return;const y=Math.round(it.transform[5]/3)*3;(rows[y]=rows[y]||[]).push(it)});
      Object.keys(rows).map(Number).sort((a,b)=>b-a).forEach(y=>out.push(rows[y].sort((a,b)=>a.transform[4]-b.transform[4]).map(x=>x.str).join(" ")))}
    const txt=out.join("\n");
    if(txt.replace(/\s/g,"").length>=60*Math.min(pdf.numPages,5))return txt;
    /* Bản scan: nhận dạng chữ từng trang (tối đa 40 trang) */
    if(!window.Tesseract)await shLoadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
    prog("Tệp là bản scan, đang chuẩn bị nhận dạng chữ tiếng Việt (lần đầu tải khoảng 15 MB)…");
    const worker=await Tesseract.createWorker("vie",1,{workerPath:"https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",corePath:"https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1",langPath:"https://cdn.jsdelivr.net/npm/@tesseract.js-data/vie/4.0.0_best_int"});
    const lines=[];const N=Math.min(pdf.numPages,40);
    try{for(let p=1;p<=N;p++){prog("Đang nhận dạng chữ trang "+p+"/"+N+"…");const page=await pdf.getPage(p);const vp=page.getViewport({scale:2});const cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;
        await page.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;const r=await worker.recognize(cv);lines.push(r.data.text)}}
    finally{await worker.terminate()}
    return lines.join("\n")}
  if(/\.doc$/.test(nm))throw new Error("Tệp .doc cũ chưa đọc được, hãy lưu lại thành .docx hoặc PDF.");
  throw new Error("Chỉ đọc được PDF, .docx hoặc .txt.")}
function shPicker(box,inp,cb,anyFile){
  const take=f=>{if(!f)return;if(!anyFile&&!/^image\//.test(f.type)){shToast("Chọn tệp ảnh (JPG, PNG, WebP).");return}cb(f)};
  box.onclick=e=>{if(e.target!==inp)inp.click()};box.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();inp.click()}};
  inp.onchange=()=>{take(inp.files[0]);inp.value=""};
  box.ondragover=e=>{e.preventDefault();box.classList.add("drag")};box.ondragleave=()=>box.classList.remove("drag");
  box.ondrop=e=>{e.preventDefault();box.classList.remove("drag");take(e.dataTransfer.files[0])};
  if(!anyFile)box.onpaste=e=>{const it=[...((e.clipboardData||{}).items||[])].find(x=>x.type.startsWith("image/"));if(it)take(it.getAsFile())}}
function shResizeImg(f,W,H){W=W||640;H=H||400;return new Promise((res,rej)=>{const rd=new FileReader();rd.onerror=rej;rd.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{const cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
  const s=Math.max(W/im.width,H/im.height),w=im.width*s,h=im.height*s;g.drawImage(im,(W-w)/2,(H-h)/2,w,h);res(cv.toDataURL("image/jpeg",.82))};im.src=rd.result};rd.readAsDataURL(f)})}

/* ---- Tài liệu ---- */
function shDocDlg(doc,cid,fid){if(!shAdmin())return;const isNew=!doc;doc=doc||{title:"",url:"",course:cid||"",folder:fid||"",star:false,note:""};
  const folderOpts=c=>`<option value="">— Thư mục gốc của học phần —</option>`+SH.folders.filter(f=>f.course===c).map(f=>`<option value="${esc(f.id)}"${doc.folder===f.id?" selected":""}>${esc(f.name)}</option>`).join("");
  const d=shDlg(isNew?"Thêm tài liệu":"Sửa tài liệu",`
    ${isNew?`<div class="seg2" data-src><button type="button" data-v="file" class="on">⤒ Tải tệp lên Google Drive</button><button type="button" data-v="link">🔗 Dán liên kết</button></div>`:""}
    ${isNew?`<div class="drop2" data-file tabindex="0"><b>Kéo thả tệp vào đây hoặc bấm để chọn</b>PDF, Word, PowerPoint, Excel, ảnh… Tệp lưu vào Google Drive của sếp (thư mục "PNL - Phúc Nguyên Library"), mở chế độ ai có link được xem.<input type="file" hidden data-filein></div><p class="muted" data-fname></p>`:""}
    <label class="fld2" data-linkrow ${isNew?"hidden":""}><span>Liên kết (Google Drive, Google Docs, trang web…)</span><input data-f="url" value="${esc(doc.url)}" placeholder="https://drive.google.com/…"></label>
    <label class="fld2"><span>Tên tài liệu</span><input data-f="title" maxlength="200" value="${esc(doc.title)}" placeholder="Ví dụ: Giáo trình Luật Dân sự tập 1"></label>
    <div class="row2"><label class="fld2"><span>Học phần</span><select data-f="course"><option value="">— Chung (chỉ hiện ở trang chủ khi có ★) —</option>${COURSES.map(c=>`<option value="${esc(c.id)}"${doc.course===c.id?" selected":""}>${esc(c.name)}</option>`).join("")}</select></label>
      <label class="fld2"><span>Thư mục</span><select data-f="folder">${folderOpts(doc.course)}</select></label></div>
    <label class="fld2"><span>Ghi chú (không bắt buộc)</span><input data-f="note" maxlength="200" value="${esc(doc.note||"")}" placeholder="Ví dụ: Bản cập nhật 2026, dùng cho chương 3–5"></label>
    <label class="chk2"><input type="checkbox" data-f="star" ${doc.star?"checked":""}> ★ Tài liệu, giáo trình thông dụng — hiện ở trang chủ</label>
    <p class="err2" data-err role="alert"></p>`,
    `<span class="sp"></span><span class="muted" data-msg></span><button type="button" class="b2" data-x>Hủy</button><button type="button" class="b2 pri" data-save>${isNew?"Thêm tài liệu":"Lưu"}</button>`);
  const q=s=>d.querySelector(s);let mode="file",file=null;
  q("[data-f=course]").onchange=e=>{doc.folder="";q("[data-f=folder]").innerHTML=folderOpts(e.target.value)};
  if(isNew){q("[data-src]").onclick=e=>{const b=e.target.closest("button");if(!b)return;mode=b.dataset.v;d.querySelectorAll("[data-src] button").forEach(x=>x.classList.toggle("on",x===b));q("[data-file]").hidden=mode!=="file";q("[data-fname]").hidden=mode!=="file";q("[data-linkrow]").hidden=mode!=="link"};
    shPicker(q("[data-file]"),q("[data-filein]"),f=>{file=f;q("[data-fname]").textContent="Đã chọn: "+f.name+" ("+Math.round(f.size/1024)+" KB)";if(!q("[data-f=title]").value.trim())q("[data-f=title]").value=f.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ")},true)}
  q("[data-save]").onclick=async()=>{const err=t=>{q("[data-err]").textContent=t};const title=q("[data-f=title]").value.trim();
    if(title.length<2)return err("Nhập tên tài liệu.");
    const data={title,course:q("[data-f=course]").value,folder:q("[data-f=folder]").value,note:q("[data-f=note]").value.trim(),star:q("[data-f=star]").checked,updated:shNow()};
    q("[data-save]").disabled=true;
    try{if(isNew&&mode==="file"){if(!file)throw new Error("Chọn tệp cần tải lên.");q("[data-msg]").textContent="Đang kết nối Google Drive…";
        const parent=await shDriveFolder(data.course);q("[data-msg]").textContent="Đang tải lên "+file.name+"…";
        const up=await shDriveUpload(file,parent);await shDriveShare(up.id);Object.assign(data,{url:up.webViewLink||("https://drive.google.com/file/d/"+up.id+"/view"),driveId:up.id,mime:up.mimeType||file.type||"",size:file.size|0})}
      else{const url=q("[data-f=url]").value.trim();if(!/^https?:\/\//i.test(url))throw new Error("Dán liên kết bắt đầu bằng https://");data.url=url;const m=url.match(/\/d\/([A-Za-z0-9_-]{20,})/)||url.match(/[?&]id=([A-Za-z0-9_-]{20,})/);data.driveId=/drive\.google\.com/.test(url)&&m?m[1]:""}
      q("[data-msg]").textContent="Đang lưu…";
      if(isNew){data.added=shNow();const r=await SH.fs.collection("pnl_docs").add(data);SH.docs.push(Object.assign({id:r.id},data))}
      else{await SH.fs.doc("pnl_docs/"+doc.id).set(data,{merge:true});Object.assign(SH.docs.find(x=>x.id===doc.id),data)}
      d.close();shToast(isNew?"Đã thêm tài liệu "+title:"Đã lưu");shRefresh()}
    catch(ex){err(shErrMsg(ex))}finally{q("[data-save]").disabled=false;q("[data-msg]").textContent=""}}}
function shFolderDlg(f,cid,parent){if(!shAdmin())return;
  shPrompt(f?"Đổi tên thư mục":"Thư mục mới","Tên thư mục",f?f.name:"",async name=>{
    try{if(f){await SH.fs.doc("pnl_folders/"+f.id).set({name},{merge:true});f.name=name}
      else{const data={name,course:cid,parent:parent||"",order:SH.folders.filter(x=>x.course===cid&&(x.parent||"")===(parent||"")).length,created:shNow()};const r=await SH.fs.collection("pnl_folders").add(data);SH.folders.push(Object.assign({id:r.id},data))}
      shToast(f?"Đã đổi tên":"Đã tạo thư mục "+name);shRefresh()}catch(ex){shToast("Chưa lưu được: "+shErrMsg(ex))}})}
function shLinkDlg(){const d=shDlg("Thêm liên kết thông dụng",`<label class="fld2"><span>Tên hiển thị</span><input data-f="name" maxlength="60" placeholder="Ví dụ: Cổng thông tin điện tử Chính phủ"></label><label class="fld2"><span>Địa chỉ</span><input data-f="url" placeholder="https://…"></label><p class="note2">Liên kết đầu tiên sếp thêm sẽ thay bộ mặc định; em tự đưa PND và Thư viện pháp luật vào danh sách để không mất.</p><p class="err2" data-err></p>`,
    `<button type="button" class="b2" data-x>Hủy</button><button type="button" class="b2 pri" data-save>Thêm</button>`);
  const q=s=>d.querySelector(s);
  q("[data-save]").onclick=async()=>{const name=q("[data-f=name]").value.trim(),url=q("[data-f=url]").value.trim();
    if(!name||!/^https?:\/\//i.test(url)){q("[data-err]").textContent="Nhập tên và địa chỉ bắt đầu bằng https://";return}
    try{if(!SH.links.length)for(const [i,l] of SH_DEF_LINKS.entries()){const r=await SH.fs.collection("pnl_links").add({name:l.name,url:l.url,order:i});SH.links.push({id:r.id,name:l.name,url:l.url,order:i})}
      const data={name,url,order:SH.links.length};const r=await SH.fs.collection("pnl_links").add(data);SH.links.push(Object.assign({id:r.id},data));d.close();shRefresh()}
    catch(ex){q("[data-err]").textContent="Chưa lưu được: "+shErrMsg(ex)}}}

/* ---- Google Drive (chỉ quyền drive.file: tệp, thư mục do thư viện tạo) ---- */
let shDriveTok=null;
function shDriveToken(prompt){return new Promise((res,rej)=>{
  if(shDriveTok&&shDriveTok.exp>Date.now()+60000)return res(shDriveTok.t);
  if(!(window.google&&google.accounts&&google.accounts.oauth2))return rej(new Error("Chưa tải được dịch vụ đăng nhập Google, tải lại trang rồi thử lại."));
  const hint=(fbAuth&&fbAuth.currentUser&&fbAuth.currentUser.email)||FB_ADMIN_EMAILS[0];
  const c=google.accounts.oauth2.initTokenClient({client_id:SH_CLIENT_ID,scope:"https://www.googleapis.com/auth/drive.file",hint,login_hint:hint,prompt:prompt||"",
    callback:r=>{if(r&&r.access_token){shDriveTok={t:r.access_token,exp:Date.now()+(r.expires_in|0)*1000};res(r.access_token)}else rej(new Error((r&&r.error)||"Chưa cấp quyền Drive"))},
    error_callback:e=>rej(new Error(e&&e.type==="popup_closed"?"Cửa sổ cấp quyền Google Drive đã đóng.":"Chưa mở được cửa sổ cấp quyền Google Drive (cho phép cửa sổ bật lên)."))});
  c.requestAccessToken({prompt:prompt||"",hint,login_hint:hint})})}
async function shDrive(url,opt){const tk=await shDriveToken();const r=await fetch(url,Object.assign({},opt,{headers:Object.assign({},(opt||{}).headers||{},{Authorization:"Bearer "+tk})}));
  const j=await r.json().catch(()=>({}));if(r.status===401){shDriveTok=null}if(!r.ok)throw new Error((j.error&&j.error.message)||"Google Drive "+r.status);return j}
async function shDriveFolder(cid){const meta=SH.fs.doc("pnl_meta/drive");let m={};try{m=(await meta.get()).data()||{}}catch(e){}
  const make=async(name,parent)=>(await shDrive("https://www.googleapis.com/drive/v3/files?fields=id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder",parents:parent?[parent]:undefined})})).id;
  const alive=async id=>{if(!id)return false;try{const j=await shDrive("https://www.googleapis.com/drive/v3/files/"+id+"?fields=id,trashed");return !j.trashed}catch(e){return false}};
  if(!(await alive(m.root))){m.root=await make("PNL - Phúc Nguyên Library");m.courses={}}
  m.courses=m.courses||{};const key=cid||"_chung";
  if(!(await alive(m.courses[key]))){const c=course(cid);m.courses[key]=await make(c?c.name:"Tài liệu chung",m.root)}
  await meta.set(m,{merge:true});return m.courses[key]}
async function shDriveUpload(file,parent){const tk=await shDriveToken();
  const start=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink",{method:"POST",headers:{Authorization:"Bearer "+tk,"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Type":file.type||"application/octet-stream"},body:JSON.stringify({name:file.name,parents:[parent]})});
  if(!start.ok)throw new Error("Không khởi tạo được tải lên Drive ("+start.status+").");
  const r=await fetch(start.headers.get("Location"),{method:"PUT",headers:{"Content-Type":file.type||"application/octet-stream"},body:file});const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error((j.error&&j.error.message)||"Tải lên lỗi "+r.status);return j}
const shDriveShare=id=>shDrive("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(id)+"/permissions?sendNotificationEmail=false",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:"reader",type:"anyone"})});

/* ================= Soạn Tóm tắt & Mind map của một chương ================= */
const SH_SO_MUC=/^(?:\d+(?:\.\d+)*\.?|[a-zđ]\)|[IVXLC]+\.)\s+/,SH_DIEU=/\bĐiều\s+\d+/i,SH_Y_CON=/^([^:]{2,70}):\s+(.+)$/;
const shClean=s=>String(s).trim().replace(/\*\*|__/g,"").replace(/\s+/g," ");
function shOutline(md,so,tenCh){const loi=[],cb=[],root={t:"Chương "+so+". "+tenCh};let stack=[root],cur0=root;
  String(md||"").split(/\r?\n/).forEach((raw,i)=>{const line=raw.replace(/\s+$/,"");const L=i+1;
    if(!line.trim()||line.trim().startsWith("<!--"))return;
    const h=line.match(/^(#{1,6})\s+(.*)$/);
    if(h){const cap=h[1].length;let title=shClean(h[2]);if(!title){loi.push(`Dòng ${L}: đề mục trống`);return}
      if(cap===1)return;
      if(cap-1>stack.length){loi.push(`Dòng ${L}: nhảy cấp đề mục (từ ${"#".repeat(stack.length)} sang ${"#".repeat(cap)}) ở "${title}"`);return}
      title=title.replace(SH_SO_MUC,"");
      if(SH_DIEU.test(title))cb.push(`Dòng ${L}: tên đề mục có số điều luật — nên chuyển sang dòng CS: "${title}"`);
      if(title.split(/\s+/).length>14)cb.push(`Dòng ${L}: tên đề mục dài, mind map sẽ khó đọc: "${title}"`);
      const node={t:title};stack.length=cap-1;(stack[stack.length-1].c=stack[stack.length-1].c||[]).push(node);stack.push(node);cur0=node;return}
    const cs=line.match(/^\s*>?\s*CS\s*:\s*(.*)$/i);
    if(cs){const v=shClean(cs[1]);if(cur0.cs){cb.push(`Dòng ${L}: "${cur0.t}" có hơn một dòng CS — đã nối lại`);cur0.cs+="; "+v}else cur0.cs=v;return}
    const b=line.match(/^\s*[-*+•]\s+(.*)$/);let v;
    if(b)v=shClean(b[1]);else{v=shClean(line);cb.push(`Dòng ${L}: dòng không có dấu "- " ở đầu, đã coi là một ý`)}
    if(/\[(KIỂM TRA|KIEM TRA)\]/i.test(v)){cb.push(`Dòng ${L}: còn nhãn [KIỂM TRA] (ẩn trên web, cần tra lại)`);v=v.replace(/\s*\[(KIỂM TRA|KIEM TRA)\]\s*/ig," ").trim()}
    if(v)(cur0.b=cur0.b||[]).push(v)});
  (function soat(n,path){if(!n.b&&!n.c)cb.push(`"${path.join(" › ")}" chưa có ý nội dung nào`);if(n!==root&&!n.cs)cb.push(`"${path.join(" › ")}" thiếu dòng CS (cơ sở pháp lý)`);(n.c||[]).forEach(k=>soat(k,path.concat(k.t)))})(root,["Chương "+so]);
  if(!root.c&&!root.b)loi.push("Chưa có nội dung. Bắt đầu bằng một mục ## rồi các ý - …");
  return {root,loi,cb}}
const shBoCham=s=>s.endsWith(".")&&!s.endsWith("..")?s.slice(0,-1):s;
function shMmData(n){const out={t:n.t};let kids=n.c||[],bs=n.b||[];
  if(!kids.length&&bs.length>=2&&bs.every(x=>SH_Y_CON.test(x))){kids=bs.map(x=>{const m=x.match(SH_Y_CON),v=m[2].trim();return {t:m[1].trim(),b:[v.charAt(0).toUpperCase()+v.slice(1)]}});bs=[]}
  if(kids.length){out.c=kids.map(shMmData);out.l=out.c.some(k=>k.c)?"row":kids.length>=5?"cols2":"stack"}
  else if(bs.length)out.d=bs.flatMap(x=>shBoCham(x).split(/\s*;\s+/)).filter(Boolean).map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" · ");
  return out}
function shMeasure(sheet){let h=document.getElementById("shMeasure");if(!h){h=document.createElement("div");h.id="shMeasure";h.className="mm-canvas";h.setAttribute("aria-hidden","true");h.style.cssText="position:absolute;left:-99999px;top:0;visibility:hidden;width:max-content";document.body.appendChild(h)}
  h.innerHTML=mmHTML(sheet);const r=[h.scrollWidth,h.scrollHeight];h.innerHTML="";return r}
function shTenTo(ts){let s=ts.join(" · ");if(ts.length>1&&s.length>48)s=s.slice(0,46).replace(/\s+\S*$/,"").replace(/[ ·]+$/,"")+" …";return s}
function shMaps(root,so,tenCh){const h1="Chương "+so,muc=root.c||[];const W1=1500,W2=1720,H2=1150;
  if(!muc.length)return [{k:"Sơ đồ Chương "+so,h1,h2:tenCh,c:[shMmData({t:tenCh,b:root.b||[]})]}];
  const to=nodes=>({k:"",h1,h2:tenCh,c:nodes});const dv=[];
  muc.forEach(m=>{const top=shMmData(m);if(top.c)top.l="row";const kids=top.c||[];
    if(!kids.length||shMeasure(to([top]))[0]<=W1){dv.push([[top],[m.t],null]);return}
    const nhom=[];let g=[];kids.forEach(k=>{const thu=g.concat([k]);if(g.length&&shMeasure(to([{t:top.t,l:"row",c:thu}]))[0]>W1){nhom.push(g);g=[k]}else g=thu});if(g.length)nhom.push(g);
    nhom.forEach((x,p)=>dv.push([[{t:top.t,l:"row",c:x}],[m.t],`(${p+1}/${nhom.length})`]))});
  const maps=[];let i=0;
  while(i<dv.length){let [nodes,ts,phan]=dv[i];nodes=nodes.slice();ts=ts.slice();let j=i+1;
    while(phan===null&&j<dv.length&&dv[j][2]===null){const [w,hh]=shMeasure(to(nodes.concat(dv[j][0])));if(w>W2||hh>H2)break;nodes=nodes.concat(dv[j][0]);ts=ts.concat(dv[j][1]);j++}
    const sheet=to(nodes);if(phan)sheet.h3=`${ts[0]} (phần ${phan.slice(1,-1)})`;sheet.k=dv.length>1?`${maps.length+1}. ${shTenTo(ts)}${phan?" "+phan:""}`:"Sơ đồ Chương "+so;maps.push(sheet);i=j}
  if(maps.length===1)maps[0].k="Sơ đồ Chương "+so;return JSON.parse(JSON.stringify(maps))}
function shSheetHTML(m){return `<p style="font:700 13px var(--p-sans);color:var(--p-navy);margin:0 0 6px">${esc(m.k)}</p><section class="sheet" style="margin:0 0 16px"><div class="sheet-deco" aria-hidden="true"></div><img class="sheet-logo" src="assets/logo.png" alt=""><div class="mm-vp" style="overflow:auto"><div class="mm-sizer"><div class="mm-canvas">${mmHTML(m)}</div></div></div></section>`}
function shFit(root){root.querySelectorAll(".mm-vp").forEach(vp=>{const sz=vp.querySelector(".mm-sizer"),cv=vp.querySelector(".mm-canvas");cv.style.transform="none";cv.style.transformOrigin="0 0";
  const w=cv.scrollWidth,h=cv.scrollHeight,s=Math.max(.35,Math.min(1,(vp.clientWidth-4)/w));cv.style.transform=`scale(${s})`;sz.style.width=Math.ceil(w*s)+"px";sz.style.height=Math.ceil(h*s)+"px"})}
const SH_TPL="## Khái niệm\n> CS: Điều … Bộ luật/Luật …\n- Ý thứ nhất, một câu.\n- Ý thứ hai.\n\n### Đặc điểm\n> CS: Điều …\n- Nhãn A: nội dung (từ 2 ý cùng dạng \"Nhãn: nội dung\" sẽ tự tách nhánh con).\n- Nhãn B: nội dung.\n\n## Mục tiếp theo\n> CS: …\n- …";
async function shEditor(c,ch){if(!shAdmin()||!c||!ch)return;let rec=null;
  if(ch.has){try{const s=await SH.fs.doc("pnl_hp_ch/"+shChId(c.id,ch.n)).get();if(s.exists)rec=s.data()}catch(e){}}
  const md=rec?rec.md||"":"";let title=ch.t,dirty=false,last=null,tab="mm";
  const ed=document.createElement("div");ed.className="dlg";ed.style.cssText="padding:0;align-items:stretch";
  ed.innerHTML=`<div style="background:var(--p-bg);width:100%;display:flex;flex-direction:column;height:100vh">
    <div class="dview-top"><b>Chương ${ch.n}. <span data-t>${esc(title)}</span> <span style="font-weight:400;color:#cfe0ea">· ${esc(c.name)} · soạn dàn ý bên trái, xem trước bên phải</span></b><button type="button" class="tbtn" data-ren>Đổi tên chương</button><button type="button" class="tbtn" data-close>✕ Đóng</button></div>
    <div style="flex:1;min-height:0;display:grid;grid-template-columns:minmax(320px,42%) minmax(0,1fr)" class="ed-grid">
      <div style="display:flex;flex-direction:column;min-height:0;background:#fff;border-right:1px solid var(--p-line)">
        <div style="display:flex;gap:6px;flex-wrap:wrap;padding:8px 10px;border-bottom:1px solid var(--p-line);background:#f8fafc">
          <button type="button" class="b2 sm" data-ins="## ">＋ Mục ##</button><button type="button" class="b2 sm" data-ins="### ">＋ Tiểu mục ###</button><button type="button" class="b2 sm" data-ins="#### ">＋ Ý con ####</button>
          <button type="button" class="b2 sm" data-ins="- ">＋ Ý nội dung</button><button type="button" class="b2 sm" data-ins="> CS: ">＋ Cơ sở pháp lý</button>
          <label class="b2 sm">📂 Mở tệp (.md, .txt, .docx)<input type="file" accept=".md,.txt,.docx,text/plain" hidden data-file></label>${md?"":'<button type="button" class="b2 sm" data-tpl>Mẫu chương</button>'}</div>
        <textarea data-src spellcheck="false" style="flex:1;min-height:0;border:0;resize:none;padding:14px 16px;font:14px/1.65 var(--p-sans);outline:none" placeholder="## Tên mục&#10;> CS: Điều … Luật …&#10;- Ý nội dung, một câu.">${esc(md)}</textarea>
        <div class="muted" style="border-top:1px solid var(--p-line);padding:8px 14px;background:#f8fafc">## mục · ### tiểu mục · #### ý con · "- " một ý · "&gt; CS:" căn cứ pháp lý (hiện ở Tóm tắt) · đề mục ngắn, không ghi số điều.</div></div>
      <div style="display:flex;flex-direction:column;min-height:0">
        <div class="seg2" data-tabs style="margin:8px 12px;align-self:flex-start"><button type="button" data-v="mm" class="on">Mind map</button><button type="button" data-v="ly">Tóm tắt lý thuyết</button><button type="button" data-v="ck">Kiểm tra <span data-ck></span></button></div>
        <div data-pane style="flex:1;min-height:0;overflow:auto;padding:4px 16px 16px"></div></div></div>
    <div class="dlg-foot"><span class="muted" data-msg></span><span class="sp"></span><label class="chk2"><input type="checkbox" data-draft ${ch.draft?"checked":""}> Lưu nháp (chưa hiện cho sinh viên)</label>
      ${ch.has?'<button type="button" class="b2 danger" data-del>Xóa nội dung chương</button>':""}<button type="button" class="b2" data-close>Hủy</button><button type="button" class="b2 pri" data-save>Lưu</button></div></div>`;
  document.body.appendChild(ed);document.body.style.overflow="hidden";
  if(innerWidth<860)ed.querySelector(".ed-grid").style.gridTemplateColumns="minmax(0,1fr)";
  const q=s=>ed.querySelector(s),src=q("[data-src]");
  const build=()=>{const r=shOutline(src.value,ch.n,title);let maps=[];if(!r.loi.length&&(r.root.c||r.root.b)){try{maps=shMaps(r.root,ch.n,title)}catch(e){r.loi.push("Chưa dựng được mind map: "+e.message)}}last={r,maps};return last};
  const show=()=>{const {r,maps}=last||build(),p=q("[data-pane]");q("[data-ck]").textContent=r.loi.length?`(${r.loi.length} lỗi)`:r.cb.length?`(${r.cb.length})`:"✓";
    if(tab==="mm")p.innerHTML=r.loi.length?'<p class="err2">Sửa lỗi ở mục Kiểm tra trước khi xem mind map.</p>':maps.length?maps.map(shSheetHTML).join(""):'<p class="empty">Soạn dàn ý bên trái, mind map hiện ở đây.</p>';
    else if(tab==="ly")p.innerHTML=`<section class="frame"><div class="ftitle">${esc(r.root.t)}</div>${lyHTML(r.root)}</section>`;
    else p.innerHTML=`${r.loi.length?`<h4 style="color:var(--p-err);margin:6px 0">Lỗi phải sửa</h4><ul>${r.loi.map(x=>`<li class="err2">${esc(x)}</li>`).join("")}</ul>`:'<p class="ok2" style="font-weight:700">Không có lỗi.</p>'}${r.cb.length?`<h4 style="color:#8a5a00;margin:12px 0 6px">Nên xem lại</h4><ul>${r.cb.map(x=>`<li style="color:#8a5a00;font-size:13px">${esc(x)}</li>`).join("")}</ul>`:""}<p class="muted">Chuẩn chung: mỗi đề mục có dòng CS và ít nhất một ý; nhánh cuối có ý cụ thể; đề mục cùng cấp nên từ 2 đến 7.</p>`;
    if(tab==="mm")requestAnimationFrame(()=>shFit(p))};
  let tm=null;const later=()=>{dirty=true;clearTimeout(tm);tm=setTimeout(()=>{build();show()},600)};
  src.addEventListener("input",later);
  ed.querySelectorAll("[data-ins]").forEach(b=>b.onclick=()=>{const v=src.value,p=src.selectionStart,ls=v.lastIndexOf("\n",p-1)+1;const ins=(v.slice(ls,p).trim()?"\n":"")+b.dataset.ins;src.focus();src.setSelectionRange(p,p);document.execCommand("insertText",false,ins);later()});
  q("[data-file]").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f)return;try{const t=await shReadText(f);if(src.value.trim()&&!confirm("Thay toàn bộ dàn ý đang soạn bằng nội dung tệp?"))return;src.value=t;later()}catch(ex){shToast(ex.message)}};
  if(q("[data-tpl]"))q("[data-tpl]").onclick=()=>{if(src.value.trim()&&!confirm("Thay nội dung đang soạn bằng mẫu?"))return;src.value=SH_TPL;later()};
  q("[data-tabs]").onclick=e=>{const b=e.target.closest("button");if(!b)return;tab=b.dataset.v;ed.querySelectorAll("[data-tabs] button").forEach(x=>x.classList.toggle("on",x===b));show()};
  q("[data-ren]").onclick=()=>shPrompt("Đổi tên chương","Tên chương",title,t=>{title=t;q("[data-t]").textContent=t;later()});
  const close=(force)=>{if(!force&&dirty&&!confirm("Đóng mà không lưu thay đổi?"))return;ed.remove();document.body.style.overflow="";route(cur)};
  ed.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>close());
  if(q("[data-del]"))shArm(q("[data-del]"),"Bấm lần nữa để xóa",async()=>{await SH.fs.doc("pnl_hp_ch/"+shChId(c.id,ch.n)).delete();await shChMeta(c,ch.n,title,null);shToast("Đã xóa nội dung Chương "+ch.n);close(true)});
  q("[data-save]").onclick=async()=>{clearTimeout(tm);if(document.fonts&&document.fonts.ready)await document.fonts.ready;const {r,maps}=build();show();
    if(r.loi.length){tab="ck";ed.querySelectorAll("[data-tabs] button").forEach(x=>x.classList.toggle("on",x.dataset.v==="ck"));show();q("[data-msg]").innerHTML='<span class="err2">Còn lỗi, xem mục Kiểm tra.</span>';return}
    const draft=q("[data-draft]").checked,h=SH.hp[c.id],coursePub=c.dyn?!!(h&&h.pub):true;
    const data={hp:c.id,n:ch.n,t:title,md:src.value,maps,ly:JSON.parse(JSON.stringify(r.root)),draft,pub:coursePub&&!draft,updated:shNow()};
    if(new Blob([JSON.stringify(data)]).size>900000){q("[data-msg]").innerHTML='<span class="err2">Chương quá dài để lưu một lần (khoảng 900 KB). Hãy tách bớt.</span>';return}
    q("[data-save]").disabled=true;q("[data-msg]").textContent="Đang lưu…";
    try{await SH.fs.doc("pnl_hp_ch/"+shChId(c.id,ch.n)).set(data);await shChMeta(c,ch.n,title,{has:true,nmaps:maps.length,draft});
      const T=TL[c.id]||(TL[c.id]={name:c.name,review:c.id,chapters:[],laws:[],refs:[],cases:[]});let tc=T.chapters.find(x=>x.n===ch.n);if(!tc){tc={n:ch.n,t:title,maps:[]};T.chapters.push(tc);T.chapters.sort((a,b)=>a.n-b.n)}
      Object.assign(tc,{t:title,maps,ly:data.ly,dyn:true,loaded:true});if(!DOCS.some(x=>x.id===c.id))DOCS.push({id:c.id,name:c.name,img:coverSVG(c.name,c.c||"#1d5677"),tl:c.id});
      dirty=false;ch.has=true;ch.draft=draft;q("[data-msg]").innerHTML=`<span class="ok2">Đã lưu ${maps.length} sơ đồ${draft?" (nháp)":" — đã hiện cho sinh viên"}.</span>`;shToast("Đã lưu Chương "+ch.n)}
    catch(ex){q("[data-msg]").innerHTML=`<span class="err2">Chưa lưu được: ${esc(shErrMsg(ex))}</span>`}finally{q("[data-save]").disabled=false}};
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;build();show()}
async function shChMeta(c,n,t,meta){let h=SH.hp[c.id];if(!h)h={kind:"bo-sung",name:c.name,c:c.c||"",pub:true,status:"mo",chapters:[],created:shNow()};
  const chs=(h.chapters||[]).filter(x=>x.n!==n);
  if(meta)chs.push({n,t,has:!!meta.has,nmaps:meta.nmaps|0,draft:!!meta.draft});else if(h.kind==="moi")chs.push({n,t,has:false,nmaps:0,draft:false});
  chs.sort((a,b)=>a.n-b.n);h=Object.assign({},h,{chapters:chs,updated:shNow()});if(h.kind==="bo-sung"){h.pub=true;h.name=c.name}
  const {id,...data}=h;await SH.fs.doc("pnl_hp/"+c.id).set(data);SH.hp[c.id]=Object.assign({id:c.id},data);
  if(!meta&&TL[c.id]){const tc=TL[c.id].chapters.find(x=>x.n===n);if(tc&&tc.dyn){tc.maps=[];tc.ly=null}}}

/* ================= Mã lớp ================= */
function shMaHTML(){return `<section class="box"><h2 class="box-title">Mã lớp</h2><p class="note2" style="margin-bottom:14px">Mỗi mã mở một hoặc nhiều học phần cho một lớp, có hạn dùng và số người tối đa. Mỗi trình duyệt trên một máy là một người. Mã đã cấp giữ nguyên, sinh viên không phải nhập lại.</p>
  <div data-maform></div></section><section class="box"><h2 class="box-title">Danh sách mã<span class="sp"></span><small data-masum></small></h2><div class="dtbl"><table><thead><tr><th>Mã</th><th>Lớp / ghi chú</th><th>Học phần</th><th>Hạn dùng</th><th>Đã dùng</th><th></th></tr></thead><tbody data-mabody><tr><td colspan="6" class="empty">Đang tải…</td></tr></tbody></table></div></section>`}
async function shMaBind(m){shBindPage(m);const t=todayISO();
  const d0=new Date();d0.setMonth(d0.getMonth()+4);const def=d0.getFullYear()+"-"+shPad(d0.getMonth()+1)+"-"+shPad(d0.getDate());
  const cs=COURSES.filter(c=>!c.hidden);
  m.querySelector("[data-maform]").innerHTML=`<div class="row2" style="grid-template-columns:repeat(3,minmax(0,1fr))"><label class="fld2"><span>Mã</span><input data-f="code" maxlength="24" placeholder="Ví dụ: K25D-LDS" style="text-transform:uppercase" autocomplete="off"></label>
    <label class="fld2"><span>Số người tối đa</span><input data-f="max" type="number" min="1" max="1000" value="40"><small>Nên dư khoảng 30%.</small></label><label class="fld2"><span>Hiệu lực đến hết ngày</span><input data-f="han" type="date" value="${def}"></label></div>
    <label class="fld2" style="margin-top:10px"><span>Lớp / ghi chú</span><input data-f="note" maxlength="80" placeholder="K25D – Luật Dân sự"></label>
    <div class="fld2" style="margin-top:10px"><span>Học phần được mở</span><label class="chk2"><input type="checkbox" data-all checked> <b>Tất cả học phần</b></label>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px 12px;margin-top:4px">${cs.map(c=>`<label class="chk2"><input type="checkbox" data-c value="${esc(c.id)}" disabled> ${esc(c.name)}</label>`).join("")}</div></div>
    <p class="err2" data-err></p><div class="page-tools" style="margin:8px 0 0"><button type="button" class="hl" data-save>Cấp mã</button><button type="button" data-cancel hidden>Hủy sửa</button></div>`;
  const q=s=>m.querySelector(s);let EDIT=null;
  const pick=xs=>{const all=!xs||!xs.length||xs.includes("*");q("[data-all]").checked=all;m.querySelectorAll("[data-c]").forEach(x=>{x.disabled=all;x.checked=!all&&xs.includes(x.value)})};
  q("[data-all]").onchange=e=>m.querySelectorAll("[data-c]").forEach(x=>{x.disabled=e.target.checked;if(x.disabled)x.checked=false});
  const load=async()=>{const ms=await SH.fs.collection("pnl_ma").get();const out=[];
    await Promise.all(ms.docs.map(async d=>{const x=d.data()||{};let used=null;try{used=(await SH.fs.collection("pnl_ma/"+d.id+"/luot").get()).size+(x.usedBefore|0)}catch(e){}
      out.push({code:d.id,note:x.note||"",han:x.han||"",max:x.max|0,courses:Array.isArray(x.courses)&&x.courses.length?x.courses:["*"],used,created:x.created||""})}));
    SH.ma=out.sort((a,b)=>String(b.created).localeCompare(String(a.created)))};
  const nm=id=>{const c=course(id);return c?c.name:id};
  const draw=()=>{q("[data-masum]").textContent=SH.ma.length+" mã · "+SH.ma.filter(x=>x.han>=t).length+" đang hiệu lực";
    q("[data-mabody]").innerHTML=SH.ma.length?SH.ma.map(x=>{const exp=t>x.han,full=x.max&&x.used!=null&&x.used>=x.max;
      return `<tr><td><b>${esc(x.code)}</b></td><td>${esc(x.note)}</td><td>${esc(x.courses.includes("*")?"Tất cả học phần":x.courses.map(nm).join("; "))}</td><td style="white-space:nowrap">${fmtDate(x.han)}${exp?' <span class="muted" style="color:#a1251b">hết hạn</span>':""}</td><td>${x.used==null?"?":x.used} / ${x.max||"—"}${full?' <span class="muted" style="color:#a1251b">đủ</span>':""}</td><td class="act"><button type="button" data-edit="${esc(x.code)}">Sửa</button><button type="button" class="del" data-del="${esc(x.code)}">Xóa</button></td></tr>`}).join(""):'<tr><td colspan="6" class="empty">Chưa có mã nào.</td></tr>';
    m.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{const x=SH.ma.find(y=>y.code===b.dataset.edit);EDIT=x.code;q("[data-f=code]").value=x.code;q("[data-f=code]").readOnly=true;q("[data-f=max]").value=x.max||40;q("[data-f=han]").value=x.han;q("[data-f=note]").value=x.note;pick(x.courses);q("[data-save]").textContent="Lưu thay đổi";q("[data-cancel]").hidden=false;window.scrollTo({top:0,behavior:"smooth"})});
    m.querySelectorAll("[data-del]").forEach(b=>shArm(b,"Xóa hẳn?",async()=>{const code=b.dataset.del;for(const d of (await SH.fs.collection("pnl_ma/"+code+"/luot").get()).docs)await d.ref.delete();await SH.fs.doc("pnl_ma/"+code).delete();SH.ma=SH.ma.filter(x=>x.code!==code);draw();shToast("Đã xóa mã "+code)}))};
  const stop=()=>{EDIT=null;q("[data-f=code]").readOnly=false;q("[data-f=code]").value="";q("[data-f=note]").value="";q("[data-f=max]").value=40;q("[data-f=han]").value=def;pick(["*"]);q("[data-save]").textContent="Cấp mã";q("[data-cancel]").hidden=true};
  q("[data-cancel]").onclick=stop;
  q("[data-save]").onclick=async()=>{const err=x=>{q("[data-err]").textContent=x};const code=String(q("[data-f=code]").value).toUpperCase().replace(/\s+/g,"").replace(/[–—]/g,"-"),max=parseInt(q("[data-f=max]").value,10),han=q("[data-f=han]").value,note=q("[data-f=note]").value.trim().slice(0,80);
    const courses=q("[data-all]").checked?["*"]:[...m.querySelectorAll("[data-c]:checked")].map(x=>x.value);
    if(!/^[A-Z0-9_-]{3,24}$/.test(code))return err("Mã gồm 3–24 ký tự: chữ không dấu, số, gạch ngang hoặc gạch dưới.");if(!(max>=1&&max<=1000))return err("Số người từ 1 đến 1000.");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(han)||han<t)return err("Chọn ngày hết hạn từ hôm nay trở đi.");if(!courses.length)return err("Chọn ít nhất một học phần.");err("");
    q("[data-save]").disabled=true;
    try{const ref=SH.fs.doc("pnl_ma/"+code);
      if(EDIT){const curd=(await ref.get()).data()||{};await ref.set(Object.assign({},curd,{note,han,max,courses,updated:shNow()}));Object.assign(SH.ma.find(x=>x.code===code),{note,han,max,courses});stop();shToast("Đã cập nhật mã "+code)}
      else{if((await ref.get()).exists)return err("Mã "+code+" đã có. Đặt mã khác.");const data={note,han,max,courses,created:shNow()};await ref.set(data);SH.ma.unshift(Object.assign({code,used:0},data));q("[data-f=code]").value="";q("[data-f=note]").value="";shToast("Đã cấp mã "+code+". Sinh viên dùng được ngay.")}
      draw()}catch(ex){err("Chưa lưu được: "+shErrMsg(ex))}finally{q("[data-save]").disabled=false}};
  try{await load();draw()}catch(ex){q("[data-mabody]").innerHTML=`<tr><td colspan="6" class="err2">Chưa tải được: ${esc(shErrMsg(ex))}</td></tr>`}}

/* ================= Sao lưu ================= */
function shBackupHTML(){return `<section class="box"><h2 class="box-title">Sao lưu dữ liệu</h2><p class="empty">Tải một tệp JSON gồm học phần, chương (dàn ý, mind map), tài liệu, thư mục, liên kết và mã lớp nhập trên trang. Nội dung trên GitHub có lịch sử riêng nên không cần sao lưu ở đây.</p><div class="page-tools" style="margin-top:12px"><button type="button" class="hl" data-bk>⬇ Tải bản sao lưu</button><span class="muted" data-bkmsg></span></div></section>`}
function shBackupBind(m){shBindPage(m);m.querySelector("[data-bk]").onclick=async()=>{const msg=m.querySelector("[data-bkmsg]");msg.textContent="Đang gom dữ liệu…";
  try{const out={xuat:shNow(),nguon:"Phúc Nguyên Library"};for(const n of ["pnl_hp","pnl_hp_ch","pnl_docs","pnl_folders","pnl_links","pnl_ma"])out[n]=(await SH.fs.collection(n).get()).docs.map(d=>Object.assign({_id:d.id},d.data()));
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:"application/json"}));a.download="PNL-sao-luu-"+todayISO()+".json";a.click();
    msg.textContent="Đã tải: "+out.pnl_hp.length+" học phần, "+out.pnl_hp_ch.length+" chương, "+out.pnl_docs.length+" tài liệu, "+out.pnl_ma.length+" mã."}catch(ex){msg.textContent="Chưa tải được: "+shErrMsg(ex)}}}
