/* QUẢN TRỊ PHÚC NGUYÊN LIBRARY (13/11/2026)
   Một mục Quản trị duy nhất cho PNL: học phần, học liệu (Tóm tắt → mind map), gói & mã truy cập,
   đánh giá định kỳ, góp ý, sao lưu.
   Dữ liệu thêm thủ công lưu trên Firestore (dự án phuc-nguyen-library):
     pnl_hp/{id}            học phần thêm mới (kind "moi") hoặc phần bổ sung cho học phần có sẵn (kind "bo-sung")
     pnl_hp_ch/{id}__{NN}   nội dung một chương: dàn ý (md), mind map (maps), tóm tắt (ly)
     pnl_goi/{id}           gói truy cập (bộ học phần đặt sẵn để cấp mã nhanh)
     pnl_ma/{MÃ}            mã lớp — giữ nguyên cấu trúc cũ, sinh viên đang dùng mã không bị ảnh hưởng
   Nội dung có sẵn trên GitHub (index.html, hp/) chỉ đọc, không sửa từ trang này. */
"use strict";
const FB_CFG={apiKey:"AIzaSyCIYY-dzhJ4rUYsXvBQivIxcziUC3hR1-U",authDomain:"phuc-nguyen-library.firebaseapp.com",projectId:"phuc-nguyen-library",storageBucket:"phuc-nguyen-library.firebasestorage.app",messagingSenderId:"842652271567",appId:"1:842652271567:web:23b95b5c4d6061497988ba"};
const ADMIN_UID="smoIpuX7qseqTeu9nToc9RYigku1",ADMIN_EMAILS=["luuhuong.nnpl@gmail.com"];
const isAdmin=u=>!!u&&!u.isAnonymous&&(u.uid===ADMIN_UID||(!!u.email&&u.emailVerified!==false&&ADMIN_EMAILS.includes(u.email.toLowerCase())));

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad2=n=>String(n).padStart(2,"0");
const todayISO=()=>{const d=new Date();return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate())};
const fmtDate=iso=>{const p=String(iso||"").split("-");return p.length===3?p[2]+"/"+p[1]+"/"+p[0]:String(iso||"")};
const nowISO=()=>new Date().toISOString();
const chId=(id,n)=>id+"__"+pad2(n);
function slug(s){return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60)}
function toast(t,ms){let el=$(".toast");if(!el){el=document.createElement("div");el.className="toast";el.setAttribute("role","status");document.body.appendChild(el)}
  el.textContent=t;el.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>el.hidden=true,ms||3200)}
function arm(btn,label,fn){btn.addEventListener("click",async()=>{if(btn.dataset.armed!=="1"){btn.dataset.armed="1";const old=btn.textContent;btn.textContent=label||"Bấm lần nữa để xác nhận";btn.classList.add("armed");
  setTimeout(()=>{if(btn.isConnected&&btn.dataset.armed==="1"){btn.dataset.armed="";btn.textContent=old;btn.classList.remove("armed")}},4000);return}
  btn.dataset.armed="";btn.disabled=true;try{await fn()}finally{if(btn.isConnected)btn.disabled=false}})}
const normCode=s=>String(s||"").toUpperCase().replace(/\s+/g,"").replace(/[–—]/g,"-");
const okCode=c=>/^[A-Z0-9_-]{3,24}$/.test(c);
const PALETTE=["#1d5677","#3d7fc1","#6fa8d6","#2e7d6b","#7aa62e","#e3b928","#e08a3c","#c0392b","#8e2c3f","#6a3fa0","#4a5d8a","#3e4a57","#8a5a1e","#607d8b"];
const STATUS={an:["Ẩn","an","Chưa hiện trên trang chủ"],sap:["Sắp có","sap","Hiện trong danh sách, ghi Sắp có"],mo:["Công khai","mo","Sinh viên có mã được vào xem"]};

/* Ảnh bìa tự sinh (dùng chung với trang chủ) */
function coverSVG(name,c){const n=String(name||"").toUpperCase(),words=n.split(/\s+/),lines=[];let cur="";
  words.forEach(w=>{if((cur+" "+w).trim().length>22){if(cur)lines.push(cur);cur=w}else cur=(cur+" "+w).trim()});if(cur)lines.push(cur);
  const L=lines.slice(0,4),y0=150-(L.length-1)*17;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="#12395c"/></linearGradient></defs><rect width="480" height="300" fill="url(#g)"/><circle cx="430" cy="40" r="90" fill="#fff" opacity=".08"/><circle cx="40" cy="290" r="70" fill="#fff" opacity=".07"/><path d="M0 250 L480 205 L480 300 L0 300Z" fill="#000" opacity=".12"/>${L.map((l,i)=>`<text x="240" y="${y0+i*34}" text-anchor="middle" font-family="Georgia,serif" font-weight="900" font-size="25" fill="#fff">${esc(l)}</text>`).join("")}<text x="240" y="272" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="13" letter-spacing="3" fill="#e8c766">PHÚC NGUYÊN LIBRARY</text></svg>`;
  return "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)}
const bookSVG=c=>`<svg class="bk" viewBox="0 0 30 24" aria-hidden="true"><path d="M3 5 L15 2 L27 5 L27 19 L15 22 L3 19 Z" fill="${c}"/><path d="M15 2 L15 22" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/><path d="M5 18 L15 20.5 L25 18" stroke="#fff" stroke-width="1.4" fill="none" opacity=".85"/></svg>`;

/* ================= Firebase ================= */
firebase.initializeApp(FB_CFG);
const fs=firebase.firestore(),auth=firebase.auth();
const col=n=>fs.collection(n),docRef=p=>fs.doc(p);
let USER=null;

/* ================= Dữ liệu ================= */
const S={sta:{courses:[],docs:[],tl:{}},hp:{},goi:[],ma:null,loaded:false};
async function loadStatic(){
  const r=await fetch("../index.html?t="+Date.now(),{cache:"no-store"});const t=await r.text();
  const grab=name=>{const m=t.match(new RegExp("const "+name+"=(\\[[\\s\\S]*?\\n\\]);"));if(!m)return [];try{return new Function("return "+m[1])()}catch(e){console.warn(name,e);return []}};
  S.sta.courses=grab("COURSES");S.sta.docs=grab("DOCS");
  const re=/^TL\["([^"]+)"\]=(\{.*\});$/gm;let m;
  while((m=re.exec(t))){try{const x=JSON.parse(m[2]);S.sta.tl[m[1]]={name:x.name,chapters:(x.chapters||[]).map(c=>({n:c.n,t:c.t,nmaps:(c.maps||[]).length}))}}catch(e){}}
}
async function loadHp(){S.hp={};(await col("pnl_hp").get()).docs.forEach(d=>S.hp[d.id]=Object.assign({id:d.id},d.data()))}
async function loadGoi(){S.goi=(await col("pnl_goi").get()).docs.map(d=>Object.assign({id:d.id},d.data())).sort((a,b)=>String(a.ten).localeCompare(String(b.ten),"vi"))}
async function loadMa(){const ms=await col("pnl_ma").get();const out=[];
  await Promise.all(ms.docs.map(async d=>{const x=d.data()||{};let used=null;try{used=(await col("pnl_ma/"+d.id+"/luot").get()).size+(x.usedBefore|0)}catch(e){}
    out.push({code:d.id,note:x.note||"",han:x.han||"",max:x.max||0,courses:Array.isArray(x.courses)&&x.courses.length?x.courses:["*"],goi:x.goi||"",used,created:x.created||""})}));
  S.ma=out.sort((a,b)=>String(b.created).localeCompare(String(a.created)));return S.ma}

/* Danh sách học phần hợp nhất (thứ tự như trang chủ) */
function allCourses(){
  const list=S.sta.courses.map(c=>{const ov=S.hp[c.id];const tl=S.sta.tl[c.id];
    return {id:c.id,name:c.name,c:c.c,src:c.src||"",kind:"gh",img:(S.sta.docs.find(d=>d.id===c.id)||{}).img||"",tl,ov}});
  const extra=Object.values(S.hp).filter(h=>h.kind==="moi").sort((a,b)=>(a.order||0)-(b.order||0)||String(a.created).localeCompare(String(b.created)));
  extra.forEach(h=>{const item={id:h.id,name:h.name,c:h.c||"#1d5677",kind:"moi",status:h.status||"an",img:h.img||"",doc:h};
    const i=h.after?list.findIndex(x=>x.id===h.after):-1;if(i>=0)list.splice(i+1,0,item);else list.push(item)});
  return list}
const courseName=id=>{if(id==="*")return "Tất cả học phần";const c=allCourses().find(x=>x.id===id);return c?c.name:id};
const scopeLabel=cs=>!cs||!cs.length||cs.includes("*")?"Tất cả học phần":cs.length<=2?cs.map(courseName).join(", "):cs.length+" học phần";

/* Chương của một học phần trong khu Học liệu */
function chaptersOf(c){
  if(c.kind==="moi")return (c.doc.chapters||[]).map(x=>({n:x.n,t:x.t,gh:false,has:!!x.has,draft:!!x.draft,nmaps:x.nmaps||0}));
  const out=[];const ov=(c.ov&&c.ov.chapters)||[];
  ((c.tl&&c.tl.chapters)||[]).forEach(x=>{const o=ov.find(y=>y.n===x.n);out.push({n:x.n,t:x.t,gh:x.nmaps>0,ghMaps:x.nmaps,has:!!(o&&o.has),draft:!!(o&&o.draft),nmaps:o?o.nmaps||0:0})});
  ov.forEach(o=>{if(!out.some(x=>x.n===o.n))out.push({n:o.n,t:o.t,gh:false,has:!!o.has,draft:!!o.draft,nmaps:o.nmaps||0,extra:true})});
  return out.sort((a,b)=>a.n-b.n)}

/* ================= Mind map: đọc dàn ý → Tóm tắt + sơ đồ (cùng quy tắc với tools/xay_dung.py) ================= */
const SO_MUC=/^(?:\d+(?:\.\d+)*\.?|[a-zđ]\)|[IVXLC]+\.)\s+/,DIEU=/\bĐiều\s+\d+/i,Y_CON=/^([^:]{2,70}):\s+(.+)$/;
const sach=s=>String(s).trim().replace(/\*\*|__/g,"").replace(/\s+/g," ");
function parseOutline(md,so,tenCh){
  const loi=[],cb=[],root={t:"Chương "+so+". "+tenCh};let stack=[root],cur=root;
  String(md||"").split(/\r?\n/).forEach((raw,i)=>{const line=raw.replace(/\s+$/,"");const L=i+1;
    if(!line.trim()||line.trim().startsWith("<!--"))return;
    const h=line.match(/^(#{1,6})\s+(.*)$/);
    if(h){const cap=h[1].length;let title=sach(h[2]);if(!title){loi.push(`Dòng ${L}: đề mục trống`);return}
      if(cap===1){const mc=title.match(/^Chương\s+(\d+)\s*[.:]\s*(.+)$/i);if(mc&&+mc[1]!==so)cb.push(`Dòng ${L}: ghi "Chương ${mc[1]}" nhưng đang soạn Chương ${so} — đã bỏ qua dòng này`);return}
      if(cap-1>stack.length){loi.push(`Dòng ${L}: nhảy cấp đề mục (từ ${"#".repeat(stack.length)} sang ${"#".repeat(cap)}) ở "${title}"`);return}
      title=title.replace(SO_MUC,"");
      if(DIEU.test(title))cb.push(`Dòng ${L}: tên đề mục có số điều luật — nên chuyển sang dòng CS: "${title}"`);
      if(title.split(/\s+/).length>14)cb.push(`Dòng ${L}: tên đề mục dài (${title.split(/\s+/).length} chữ), mind map sẽ khó đọc: "${title}"`);
      const node={t:title};stack.length=cap-1;(stack[stack.length-1].c=stack[stack.length-1].c||[]).push(node);stack.push(node);cur=node;return}
    const cs=line.match(/^\s*>?\s*CS\s*:\s*(.*)$/i);
    if(cs){const v=sach(cs[1]);if(cur.cs){cb.push(`Dòng ${L}: "${cur.t}" có hơn một dòng CS — đã nối lại`);cur.cs+="; "+v}else cur.cs=v;return}
    const b=line.match(/^\s*[-*+•]\s+(.*)$/);let v;
    if(b)v=sach(b[1]);else{v=sach(line);cb.push(`Dòng ${L}: dòng không có dấu "- " ở đầu, đã coi là một ý`)}
    if(/\[(KIỂM TRA|KIEM TRA)\]/i.test(v)){cb.push(`Dòng ${L}: còn nhãn [KIỂM TRA] (ẩn trên web, cần tra lại): ${v}`);v=v.replace(/\s*\[(KIỂM TRA|KIEM TRA)\]\s*/ig," ").trim()}
    if(v)(cur.b=cur.b||[]).push(v)});
  (function soat(n,path){if(!n.b&&!n.c)cb.push(`"${path.join(" › ")}" chưa có ý nội dung nào`);if(n!==root&&!n.cs)cb.push(`"${path.join(" › ")}" thiếu dòng CS (cơ sở pháp lý)`);(n.c||[]).forEach(k=>soat(k,path.concat(k.t)))})(root,["Chương "+so]);
  if(!root.c&&!root.b)loi.push("Chưa có nội dung. Bắt đầu bằng một mục ## rồi các ý - …");
  return {root,loi,cb}}
const boCham=s=>s.endsWith(".")&&!s.endsWith("..")?s.slice(0,-1):s;
function mmData(n){const out={t:n.t};let kids=n.c||[],bs=n.b||[];
  if(!kids.length&&bs.length>=2&&bs.every(x=>Y_CON.test(x))){kids=bs.map(x=>{const m=x.match(Y_CON),v=m[2].trim();return {t:m[1].trim(),b:[v.charAt(0).toUpperCase()+v.slice(1)]}});bs=[]}
  if(kids.length){out.c=kids.map(mmData);out.l=out.c.some(k=>k.c)?"row":kids.length>=5?"cols2":"stack"}
  else if(bs.length)out.d=bs.flatMap(x=>boCham(x).split(/\s*;\s+/)).filter(Boolean).map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" · ");
  return out}
/* Vẽ (giống hệt trang chủ) */
function mmBox(n,depth){const it=n.d?String(n.d).split(/\s*·\s*|\s*;\s*/).filter(Boolean):[];return `<div class="mm-box d${Math.min(depth,4)}${it.length?" has-d":""}">${esc(n.t)}${it.length>1?`<ol class="mm-d">${it.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>`:it.length?`<span class="mm-d">${esc(it[0])}</span>`:""}</div>`}
function mmNode(n,depth){const kids=n.c||[];const l=n.l||(depth<=1&&kids.some(k=>k.c&&k.c.length)?"row":"stack");return `<div class="mm-node">${mmBox(n,depth)}${kids.length?mmKids(kids,l,depth):""}</div>`}
function mmKids(kids,l,depth){
  if(l.indexOf("cols")===0){const N=+l.slice(4)||2,cols=[...Array(N)].map(()=>[]);kids.forEach((k,i)=>cols[i%N].push(k));
    return `<div class="mm-kids row">${cols.filter(c=>c.length).map(col=>`<div class="mm-kid"><div class="mm-col">${col.map((k,i)=>i?`<div class="mm-sk">${mmNode(k,depth+1)}</div>`:mmNode(k,depth+1)).join("")}</div></div>`).join("")}</div>`}
  if(l==="row")return `<div class="mm-kids row">${kids.map(k=>`<div class="mm-kid">${mmNode(k,depth+1)}</div>`).join("")}</div>`;
  return `<div class="mm-kids stack">${kids.map(k=>`<div class="mm-sk">${mmNode(k,depth+1)}</div>`).join("")}</div>`}
function mmHTML(m){const top=m.r?`<div class="mm-node">${mmBox({t:m.r},0)}${mmKids(m.c,"row",0)}</div>`:`<div class="mm-node mm-noroot">${mmKids(m.c,"row",0)}</div>`;
  return `<div class="mm-title"><div class="h1">${esc(m.h1)}</div>${m.h2?`<div class="h2">${esc(m.h2)}</div>`:""}${m.h3?`<div class="h3">${esc(m.h3)}</div>`:""}</div><div class="mm-tree">${top}</div>`}
const RONG_TACH=1500,RONG_TOI_DA=1720,CAO_GOP=1150;
function measure(sheet){const h=$("#measure");h.innerHTML=mmHTML(sheet);const r=[h.scrollWidth,h.scrollHeight];h.innerHTML="";return r}
function tenTo(ts){let s=ts.join(" · ");if(ts.length>1&&s.length>48)s=s.slice(0,46).replace(/\s+\S*$/,"").replace(/[ ·]+$/,"")+" …";return s}
function sinhMaps(root,so,tenCh){
  const h1="Chương "+so,muc=root.c||[];
  if(!muc.length)return [{k:"Sơ đồ Chương "+so,h1,h2:tenCh,c:[mmData({t:tenCh,b:root.b||[]})]}];
  const to=nodes=>({k:"",h1,h2:tenCh,c:nodes});const dv=[];
  muc.forEach(m=>{const top=mmData(m);if(top.c)top.l="row";const kids=top.c||[];
    if(!kids.length||measure(to([top]))[0]<=RONG_TACH){dv.push([[top],[m.t],null]);return}
    const nhom=[];let cur=[];
    kids.forEach(k=>{const thu=cur.concat([k]);if(cur.length&&measure(to([{t:top.t,l:"row",c:thu}]))[0]>RONG_TACH){nhom.push(cur);cur=[k]}else cur=thu});
    if(cur.length)nhom.push(cur);
    nhom.forEach((g,p)=>dv.push([[{t:top.t,l:"row",c:g}],[m.t],`(${p+1}/${nhom.length})`]))});
  const maps=[];let i=0;
  while(i<dv.length){let [nodes,ts,phan]=dv[i];nodes=nodes.slice();ts=ts.slice();let j=i+1;
    while(phan===null&&j<dv.length&&dv[j][2]===null){const [w,hh]=measure(to(nodes.concat(dv[j][0])));if(w>RONG_TOI_DA||hh>CAO_GOP)break;nodes=nodes.concat(dv[j][0]);ts=ts.concat(dv[j][1]);j++}
    const sheet=to(nodes);if(phan)sheet.h3=`${ts[0]} (phần ${phan.slice(1,-1)})`;
    sheet.k=dv.length>1?`${maps.length+1}. ${tenTo(ts)}${phan?" "+phan:""}`:"Sơ đồ Chương "+so;maps.push(sheet);i=j}
  if(maps.length===1)maps[0].k="Sơ đồ Chương "+so;
  return JSON.parse(JSON.stringify(maps))}
function lyHTML(root){const sec=(n,lv)=>`<section class="lv${lv}"><div class="lh">${esc(n.t)}</div>${n.cs?`<div class="cs">CS: ${esc(n.cs)}</div>`:""}${n.b?`<ul>${n.b.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}${(n.c||[]).map(k=>sec(k,lv+1)).join("")}</section>`;
  return `<div class="ly"><h4>${esc(root.t)}</h4>${root.cs?`<div class="cs">CS: ${esc(root.cs)}</div>`:""}${root.b?`<ul>${root.b.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}${(root.c||[]).map(k=>sec(k,1)).join("")}</div>`}
function sheetHTML(m){return `<p class="sheet-k">${esc(m.k)}</p><section class="sheet"><div class="sheet-deco" aria-hidden="true"></div><img class="sheet-logo" src="../assets/logo.png" alt=""><div class="mm-vp"><div class="mm-sizer"><div class="mm-canvas">${mmHTML(m)}</div></div></div></section>`}
function fitSheets(root){root.querySelectorAll(".mm-vp").forEach(vp=>{const sz=vp.querySelector(".mm-sizer"),cv=vp.querySelector(".mm-canvas");cv.style.transform="none";
  const w=cv.scrollWidth,h=cv.scrollHeight,s=Math.max(.35,Math.min(1,(vp.clientWidth-4)/w));cv.style.transform=`scale(${s})`;sz.style.width=Math.ceil(w*s)+"px";sz.style.height=Math.ceil(h*s)+"px"})}

/* ================= Khung trang ================= */
const NAV=[
  {id:"tong-quan",ic:"📊",t:"Tổng quan"},
  {id:"hoc-phan",ic:"📚",t:"Học phần"},
  {id:"hoc-lieu",ic:"🗺️",t:"Tóm tắt & Mind map"},
  {id:"ngan-hang",ic:"❓",t:"Ngân hàng câu hỏi",soon:"Đợt 2"},
  {id:"ma",ic:"🔑",t:"Gói & mã truy cập"},
  {id:"danh-gia",ic:"📝",t:"Đánh giá định kỳ"},
  {id:"gop-y",ic:"💬",t:"Góp ý, báo lỗi"},
  {id:"sao-luu",ic:"💾",t:"Sao lưu dữ liệu"}];
let CUR="tong-quan",ARG="";
function renderNav(){const cnt={"hoc-phan":allCourses().length,"ma":S.ma?S.ma.length:""};
  $("#catNav").innerHTML=NAV.map(n=>`<a class="cat${n.id===CUR?" on":""}" href="#${n.id}"><span class="ic">${n.ic}</span>${esc(n.t)}${n.soon?`<span class="soon">${esc(n.soon)}</span>`:cnt[n.id]!==undefined&&cnt[n.id]!==""?`<span class="ct">${cnt[n.id]}</span>`:""}</a>`).join("")}
async function renderSide(){const cs=allCourses(),t=todayISO();
  const nNew=cs.filter(c=>c.kind==="moi").length,nCh=Object.values(S.hp).reduce((a,h)=>a+(h.chapters||[]).filter(x=>x.has).length,0);
  const live=S.ma?S.ma.filter(x=>x.han>=t).length:"…";
  $("#sideStats").innerHTML=`<dt>Học phần</dt><dd>${cs.length}</dd><dt>Thêm trên Quản trị</dt><dd>${nNew}</dd><dt>Chương đã soạn</dt><dd>${nCh}</dd><dt>Mã đang hiệu lực</dt><dd>${live}</dd><dt>Gói truy cập</dt><dd>${S.goi.length}</dd>`}
function go(){const h=(location.hash||"#tong-quan").slice(1).split("/");CUR=NAV.some(n=>n.id===h[0])?h[0]:"tong-quan";ARG=decodeURIComponent(h[1]||"");
  renderNav();const n=NAV.find(x=>x.id===CUR);$("#secTitle").textContent=n.t;const m=$("#main");m.innerHTML='<div class="panel"><p class="msg">Đang tải…</p></div>';
  ({"tong-quan":vTong,"hoc-phan":vHocPhan,"hoc-lieu":vHocLieu,"ngan-hang":vNganHang,"ma":vMa,"danh-gia":vDanhGia,"gop-y":vGopY,"sao-luu":vSaoLuu}[CUR])(m).catch(e=>{console.error(e);m.innerHTML=`<div class="panel"><p class="err">Chưa tải được dữ liệu: ${esc(e.message||e)}</p><p class="msg">Kiểm tra mạng rồi tải lại trang.</p></div>`});
  window.scrollTo(0,0)}
window.addEventListener("hashchange",go);

/* ================= 1. Tổng quan ================= */
async function vTong(m){
  if(!S.ma)await loadMa();renderNav();renderSide();
  const cs=allCourses(),t=todayISO();let fb=0,lop=null;
  try{(await col("pnl_gopy").get()).docs.forEach(d=>fb+=((d.data()||{}).items||[]).length)}catch(e){}
  try{lop=(await col("pnl_dg_lop").get()).size}catch(e){}
  const users=S.ma.reduce((a,x)=>a+(x.used||0),0),live=S.ma.filter(x=>x.han>=t).length;
  const ready=cs.filter(c=>c.src||(c.kind==="moi"&&c.status==="mo")).length;
  m.innerHTML=`<div class="kpis">
    <button class="kpi" onclick="location.hash='hoc-phan'"><b>${cs.length}</b><span>Học phần trong thư viện</span><small>${ready} học phần đang mở cho sinh viên</small></button>
    <button class="kpi" onclick="location.hash='hoc-lieu'"><b>${Object.values(S.hp).reduce((a,h)=>a+(h.chapters||[]).filter(x=>x.has).length,0)}</b><span>Chương soạn trên Quản trị</span><small>Tóm tắt và mind map</small></button>
    <button class="kpi" onclick="location.hash='ma'"><b>${live}</b><span>Mã đang hiệu lực</span><small>${S.ma.length} mã · ${users} người đã dùng</small></button>
    <button class="kpi" onclick="location.hash='danh-gia'"><b>${lop==null?"—":lop}</b><span>Lớp đánh giá định kỳ</span><small>Lớp, danh sách, bảng điểm</small></button>
    <button class="kpi" onclick="location.hash='gop-y'"><b>${fb}</b><span>Góp ý, báo lỗi</span><small>Từ sinh viên</small></button>
  </div>
  <div class="panel"><h3>Việc thường làm</h3><div class="row">
    <a class="btn primary" href="#hoc-phan/moi">＋ Thêm học phần mới</a>
    <a class="btn" href="#hoc-lieu">🗺️ Soạn tóm tắt & mind map</a>
    <a class="btn" href="#ma/moi">🔑 Cấp mã cho lớp</a>
    <a class="btn" href="#danh-gia">📝 Mở đánh giá định kỳ</a></div></div>
  <div class="panel"><h3>Cách hệ thống lưu dữ liệu</h3>
    <p class="lead">Nội dung đang có trên GitHub giữ nguyên, trang này không sửa. Học phần, chương, mind map sếp thêm ở đây lưu trên Firebase và hiện ngay trên trang chủ sau khi bấm Lưu (sinh viên tải lại trang là thấy).</p>
    <p class="lead" style="margin:0">Mã lớp đang dùng giữ nguyên. <b>Gói truy cập</b> chỉ là bộ học phần đặt sẵn để cấp mã nhanh, không ảnh hưởng mã cũ.</p></div>`}

/* ================= 2. Học phần ================= */
async function vHocPhan(m){
  renderSide();
  if(ARG==="moi"||(ARG&&S.hp[ARG]&&S.hp[ARG].kind==="moi"))return formHocPhan(m,ARG==="moi"?null:S.hp[ARG]);
  const cs=allCourses();
  const card=c=>{const img=c.img?(c.img.startsWith("data:")||/^https?:/.test(c.img)?c.img:"../"+c.img):coverSVG(c.name,c.c||"#1d5677");
    const st=c.kind==="gh"?(c.src?'<span class="badge gh">Có sẵn trên GitHub</span>':'<span class="badge sap">Sắp có (GitHub)</span>'):`<span class="badge ${STATUS[c.status][1]}">${STATUS[c.status][0]}</span> <span class="badge">Thêm trên Quản trị</span>`;
    const chs=chaptersOf(c),soan=chs.filter(x=>x.has).length;
    const meta=c.kind==="gh"?`${(c.tl&&c.tl.chapters.length)||0} chương${soan?` · ${soan} chương bổ sung`:""}`:`${chs.length} chương · ${soan} đã soạn`;
    return `<div class="ccard"><div class="cv" style="background-image:url('${img.replace(/'/g,"%27")}')">${bookSVG(c.c||"#1d5677")}</div><div class="bd"><div class="nm">${esc(c.name)}</div><div>${st}</div><div class="mt">${meta}</div></div>
      <div class="ac">${c.kind==="moi"?`<a class="btn sm primary" href="#hoc-phan/${encodeURIComponent(c.id)}">Sửa</a>`:""}<a class="btn sm" href="#hoc-lieu/${encodeURIComponent(c.id)}">${c.kind==="gh"?"Bổ sung học liệu":"Học liệu"}</a><a class="btn sm" href="../index.html#${encodeURIComponent(c.id)}" target="_blank" rel="noopener">Xem ↗</a></div></div>`};
  m.innerHTML=`<div class="panel"><h3>Danh sách học phần <span class="sp"></span><a class="btn primary sm" href="#hoc-phan/moi">＋ Thêm học phần mới</a></h3>
    <p class="lead">Thứ tự giống cột Học phần ở trang chủ. Học phần <b>có sẵn trên GitHub</b> không sửa ở đây; với các học phần đó sếp chỉ <b>bổ sung</b> chương còn trống (ví dụ học phần đang ghi Sắp có).</p>
    <div class="cgrid">${cs.map(card).join("")}</div></div>`}
function formHocPhan(m,h){
  const isNew=!h;h=h||{name:"",c:PALETTE[0],status:"an",after:"",img:"",chapters:[]};
  const cs=allCourses().filter(c=>c.id!==h.id);
  const chText=(h.chapters||[]).map(c=>`Chương ${c.n}. ${c.t}`).join("\n");
  m.innerHTML=`<div class="panel"><h3>${isNew?"Thêm học phần mới":"Sửa học phần: "+esc(h.name)}<span class="sp"></span><a class="btn sm" href="#hoc-phan">← Danh sách</a></h3>
  <form id="hpForm" novalidate>
    <div class="grid2">
      <label class="fld"><span>Tên học phần</span><input id="hpName" maxlength="120" value="${esc(h.name)}" placeholder="Ví dụ: Luật Hôn nhân và gia đình" required></label>
      <label class="fld"><span>Mã học phần (đường dẫn)</span><input id="hpId" maxlength="60" value="${esc(h.id||"")}" ${isNew?"":"readonly"} placeholder="tự tạo từ tên"><small>${isNew?"Tự tạo từ tên, có thể sửa trước khi lưu lần đầu. Không đổi được sau khi lưu.":"Không đổi được."}</small></label>
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="fld"><span>Trạng thái</span><div class="seg" id="hpStatus">${Object.entries(STATUS).map(([k,v])=>`<button type="button" data-v="${k}" class="${h.status===k?"on":""}">${v[0]}</button>`).join("")}</div><small id="hpStatusHint">${STATUS[h.status][2]}</small></div>
      <label class="fld"><span>Vị trí trong cột Học phần</span><select id="hpAfter"><option value="">Cuối danh sách</option>${cs.map(c=>`<option value="${esc(c.id)}"${h.after===c.id?" selected":""}>Sau: ${esc(c.name)}</option>`).join("")}</select></label>
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="fld"><span>Màu sách (biểu tượng ở cột Học phần)</span><div class="swatches" id="hpColor">${PALETTE.map(p=>`<button type="button" data-c="${p}" style="background:${p}" class="${p===h.c?"on":""}" aria-label="Màu ${p}"></button>`).join("")}<input type="color" id="hpColorIn" value="${esc(h.c||PALETTE[0])}" title="Chọn màu khác"></div></div>
      <div class="fld"><span>Ảnh bìa (Mind-map học phần)</span>
        <div class="cover-pick" id="hpCover" tabindex="0" role="button" aria-label="Chọn ảnh bìa"><span class="pv" id="hpCoverPv"></span><span><b>Kéo thả, dán (Ctrl+V) hoặc bấm để chọn ảnh</b><small>Để trống: tự tạo bìa theo tên và màu học phần</small></span><input type="file" accept="image/*" hidden id="hpCoverIn"></div>
        <button type="button" class="btn sm" id="hpCoverClear" style="align-self:flex-start;margin-top:6px">Dùng bìa tự tạo</button></div>
    </div>
    <label class="fld" style="margin-top:12px"><span>Danh sách chương theo đề cương chi tiết — mỗi dòng một chương</span>
      <textarea id="hpCh" rows="8" placeholder="Chương 1. Khái quát chung về …&#10;Chương 2. …">${esc(chText)}</textarea>
      <small>Dán thẳng mục lục từ đề cương cũng được: dòng nào bắt đầu bằng "Chương N" sẽ được nhận; dòng không có số thì tự đánh số tiếp. Nội dung từng chương soạn ở mục <b>Tóm tắt & Mind map</b>.</small></label>
    <p class="err" id="hpErr" role="alert"></p>
    <div class="row" style="margin-top:10px"><button class="btn primary" type="submit" id="hpSave">${isNew?"Lưu học phần":"Lưu thay đổi"}</button><a class="btn" href="#hoc-phan">Hủy</a>
      ${isNew?"":`<span style="flex:1"></span><button type="button" class="btn danger" id="hpDel">Xóa học phần</button>`}<span class="msg" id="hpMsg" aria-live="polite"></span></div>
  </form></div>`;
  let color=h.c||PALETTE[0],status=h.status||"an",img=h.img||"";
  const pv=()=>{$("#hpCoverPv").style.backgroundImage=`url('${(img||coverSVG($("#hpName").value||"Học phần mới",color)).replace(/'/g,"%27")}')`};pv();
  $("#hpName").addEventListener("input",()=>{if(isNew&&!$("#hpId").dataset.touched)$("#hpId").value=slug($("#hpName").value);pv();$("#hpErr").textContent=""});
  $("#hpId").addEventListener("input",()=>{$("#hpId").dataset.touched="1"});
  $("#hpStatus").onclick=e=>{const b=e.target.closest("button");if(!b)return;status=b.dataset.v;$$("#hpStatus button").forEach(x=>x.classList.toggle("on",x===b));$("#hpStatusHint").textContent=STATUS[status][2]};
  $("#hpColor").onclick=e=>{const b=e.target.closest("button[data-c]");if(!b)return;color=b.dataset.c;$("#hpColorIn").value=color;$$("#hpColor button").forEach(x=>x.classList.toggle("on",x===b));pv()};
  $("#hpColorIn").oninput=e=>{color=e.target.value;$$("#hpColor button").forEach(x=>x.classList.remove("on"));pv()};
  coverPicker($("#hpCover"),$("#hpCoverIn"),d=>{img=d;pv()});$("#hpCoverClear").onclick=()=>{img="";pv()};
  if(!isNew)arm($("#hpDel"),"Bấm lần nữa để xóa hẳn",async()=>{
    const ids=(h.chapters||[]).map(c=>chId(h.id,c.n));for(const id of ids)await docRef("pnl_hp_ch/"+id).delete().catch(()=>{});
    await docRef("pnl_hp/"+h.id).delete();delete S.hp[h.id];toast("Đã xóa học phần "+h.name);location.hash="hoc-phan"});
  $("#hpForm").onsubmit=async e=>{e.preventDefault();const err=t=>{$("#hpErr").textContent=t};
    const name=$("#hpName").value.trim().replace(/\s+/g," "),id=isNew?slug($("#hpId").value||name):h.id;
    if(name.length<3)return err("Nhập tên học phần.");if(!id)return err("Mã học phần chưa hợp lệ.");
    if(isNew&&(S.sta.courses.some(c=>c.id===id)||S.hp[id]))return err("Đã có học phần dùng mã "+id+". Đổi tên hoặc sửa mã.");
    const chs=parseChapters($("#hpCh").value);if(!chs.length)return err("Nhập ít nhất một chương.");
    const nums=chs.map(c=>c.n);if(new Set(nums).size!==nums.length)return err("Có hai chương trùng số. Kiểm tra lại danh sách chương.");
    const old=h.chapters||[],gone=old.filter(o=>o.has&&!chs.some(c=>c.n===o.n));
    if(gone.length&&!confirm("Các chương sau đã có nội dung sẽ bị xóa: "+gone.map(x=>"Chương "+x.n).join(", ")+". Tiếp tục?"))return;
    const chapters=chs.map(c=>{const o=old.find(x=>x.n===c.n)||{};return {n:c.n,t:c.t,has:!!o.has,nmaps:o.nmaps||0,draft:!!o.draft}});
    const pub=status!=="an";const data={kind:"moi",name,c:color,status,pub,after:$("#hpAfter").value,img,chapters,updated:nowISO()};if(isNew)data.created=nowISO();
    if(img&&img.length>700000)return err("Ảnh bìa quá lớn, chọn ảnh khác.");
    $("#hpSave").disabled=true;$("#hpMsg").textContent="Đang lưu…";
    try{await docRef("pnl_hp/"+id).set(data,{merge:true});
      for(const g of gone)await docRef("pnl_hp_ch/"+chId(id,g.n)).delete().catch(()=>{});
      /* đồng bộ trạng thái công khai của từng chương; tên chương đổi thì cập nhật luôn */
      for(const c of chapters.filter(x=>x.has)){await docRef("pnl_hp_ch/"+chId(id,c.n)).set({pub:pub&&!c.draft,t:c.t},{merge:true}).catch(()=>{})}
      S.hp[id]=Object.assign({id},S.hp[id]||{},data);toast(isNew?"Đã thêm học phần "+name:"Đã lưu thay đổi");location.hash="hoc-phan"}
    catch(ex){err("Chưa lưu được: "+(ex.code==="permission-denied"?"tài khoản chưa có quyền ghi (cần đăng nhập quản trị).":ex.message))}
    finally{$("#hpSave").disabled=false;$("#hpMsg").textContent=""}}}
function parseChapters(t){const out=[];let next=1;
  String(t||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).forEach(line=>{
    const m=line.match(/^(?:CHƯƠNG|Chương|chương)\s+(\d+|[IVXLC]+)\s*[.:\-–—]?\s*(.*)$/);
    let n,t;if(m){n=/^\d+$/.test(m[1])?+m[1]:roman(m[1]);t=m[2]}else{const k=line.match(/^(\d+)\s*[.)\-–]\s*(.+)$/);if(k){n=+k[1];t=k[2]}else{n=next;t=line}}
    t=sach(t).replace(/\.$/,"");if(!t)return;out.push({n,t});next=n+1});return out}
function roman(s){const v={I:1,V:5,X:10,L:50,C:100};let r=0;s=s.toUpperCase();for(let i=0;i<s.length;i++){const a=v[s[i]],b=v[s[i+1]]||0;r+=a<b?-a:a}return r}
function coverPicker(box,inp,cb){
  const take=f=>{if(!f||!/^image\//.test(f.type)){toast("Chọn tệp ảnh (JPG, PNG, WebP).");return}
    const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const W=640,H=400,cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
      const s=Math.max(W/im.width,H/im.height),w=im.width*s,h=im.height*s;g.drawImage(im,(W-w)/2,(H-h)/2,w,h);cb(cv.toDataURL("image/jpeg",.82))};im.src=rd.result};rd.readAsDataURL(f)};
  box.onclick=()=>inp.click();box.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();inp.click()}};
  inp.onchange=()=>take(inp.files[0]);
  box.ondragover=e=>{e.preventDefault();box.classList.add("drag")};box.ondragleave=()=>box.classList.remove("drag");
  box.ondrop=e=>{e.preventDefault();box.classList.remove("drag");take(e.dataTransfer.files[0])};
  box.onpaste=e=>{const it=[...(e.clipboardData||{}).items||[]].find(x=>x.type.startsWith("image/"));if(it)take(it.getAsFile())}}

/* ================= 3. Học liệu: Tóm tắt & Mind map ================= */
async function vHocLieu(m){
  renderSide();const cs=allCourses();const c=cs.find(x=>x.id===ARG);
  if(!c){m.innerHTML=`<div class="panel"><h3>Chọn học phần để soạn</h3>
    <p class="lead">Mỗi chương soạn bằng <b>dàn ý</b> (mục, tiểu mục, ý, cơ sở pháp lý). Web tự dựng <b>Tóm tắt lý thuyết</b> và <b>mind map</b> theo chuẩn chung (mẫu Chương 2 Luật Dân sự), xem trước ngay bên cạnh trước khi lưu.</p>
    <div class="tbl"><table><thead><tr><th>Học phần</th><th>Nguồn</th><th>Chương</th><th></th></tr></thead><tbody>${cs.map(x=>{const ch=chaptersOf(x),soan=ch.filter(y=>y.has).length,gh=ch.filter(y=>y.gh).length,trong=ch.filter(y=>!y.gh&&!y.has).length;
      return `<tr><td><span class="dot" style="background:${esc(x.c||"#1d5677")}"></span><b>${esc(x.name)}</b></td><td>${x.kind==="gh"?'<span class="badge gh">GitHub</span>':'<span class="badge">Quản trị</span>'}</td><td class="muted">${ch.length} chương${gh?` · ${gh} có sẵn`:""}${soan?` · ${soan} đã soạn`:""}${trong?` · ${trong} còn trống`:""}</td><td class="act"><a class="btn sm${trong||x.kind==="moi"?" primary":""}" href="#hoc-lieu/${encodeURIComponent(x.id)}">Mở</a></td></tr>`}).join("")}</tbody></table></div></div>`;return}
  const chs=chaptersOf(c);
  m.innerHTML=`<div class="panel"><h3><span class="dot" style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${esc(c.c||"#1d5677")}"></span>${esc(c.name)}<span class="sp"></span><a class="btn sm" href="#hoc-lieu">← Học phần khác</a></h3>
    ${c.kind==="gh"?`<p class="note">Học phần có sẵn trên GitHub: chương đã có mind map giữ nguyên, không sửa ở đây. Sếp soạn các chương <b>còn trống</b> hoặc thêm chương bổ sung.</p>`:""}
    ${chs.length?`<div class="chlist">${chs.map(x=>{const st=x.gh?`<span class="badge gh">Có sẵn trên GitHub · ${x.ghMaps} sơ đồ</span>`:x.has?(x.draft?'<span class="badge nhap">Nháp — chưa hiện</span>':`<span class="badge mo">Đã công bố · ${x.nmaps} sơ đồ</span>`):'<span class="badge an">Chưa soạn</span>';
      return `<div class="chrow"><span class="no">Chương ${x.n}</span><span class="tt">${esc(x.t)}</span>${st}${x.gh?`<a class="btn sm" href="../index.html#tl-${encodeURIComponent(c.id)}-${x.n}" target="_blank" rel="noopener">Xem ↗</a>`:`<button type="button" class="btn sm ${x.has?"":"primary"}" data-ed="${x.n}">${x.has?"Sửa":"Soạn"}</button>`}</div>`}).join("")}</div>`:`<p class="msg">Học phần chưa có chương nào.</p>`}
    <div class="row" style="margin-top:14px">${c.kind==="moi"?`<a class="btn" href="#hoc-phan/${encodeURIComponent(c.id)}">Sửa danh sách chương</a>`:`<button type="button" class="btn" id="addCh">＋ Thêm chương bổ sung</button>`}</div></div>`;
  $$("[data-ed]").forEach(b=>b.onclick=()=>openEditor(c,chs.find(x=>x.n===+b.dataset.ed)));
  const add=$("#addCh");if(add)add.onclick=()=>{const n=Math.max(0,...chs.map(x=>x.n))+1;const t=prompt("Tên Chương "+n+" (theo đề cương chi tiết):","");if(!t||!t.trim())return;openEditor(c,{n,t:sach(t),gh:false,has:false,draft:false,extra:true})}}

const TPL=`## Khái niệm
> CS: Điều … Bộ luật/Luật …
- Ý thứ nhất, một câu.
- Ý thứ hai.

### Đặc điểm
> CS: Điều …
- Nhãn A: nội dung (từ 2 ý cùng dạng "Nhãn: nội dung" sẽ tự tách nhánh con).
- Nhãn B: nội dung.

## Mục tiếp theo
> CS: …
- …`;
async function openEditor(c,ch){
  const ed=$("#editor");let rec=null;
  if(ch.has){try{const s=await docRef("pnl_hp_ch/"+chId(c.id,ch.n)).get();if(s.exists)rec=s.data()}catch(e){}}
  const md=rec?rec.md||"":"";let title=ch.t,dirty=false,last=null,tab="mm";
  ed.innerHTML=`<div class="ed-top"><h2>Chương ${ch.n}. <span id="edT">${esc(title)}</span><small>${esc(c.name)} · soạn dàn ý bên trái, xem trước bên phải</small></h2>
      <button type="button" class="tbtn" id="edRename">Đổi tên chương</button><button type="button" class="tbtn" id="edClose">✕ Đóng</button></div>
    <div class="ed-body">
      <div class="ed-src">
        <div class="ed-tools">
          <button type="button" class="btn" data-ins="## ">＋ Mục ##</button><button type="button" class="btn" data-ins="### ">＋ Tiểu mục ###</button><button type="button" class="btn" data-ins="#### ">＋ Ý con ####</button>
          <button type="button" class="btn" data-ins="- ">＋ Ý nội dung</button><button type="button" class="btn" data-ins="> CS: ">＋ Cơ sở pháp lý</button>
          <label class="btn">📂 Mở tệp .md/.txt<input type="file" accept=".md,.txt,text/plain,text/markdown" hidden id="edFile"></label>
          ${md?"":`<button type="button" class="btn" id="edTpl">Mẫu chương</button>`}
        </div>
        <textarea id="edSrc" spellcheck="false" placeholder="## Tên mục&#10;> CS: Điều … Luật …&#10;- Ý nội dung, một câu.&#10;&#10;### Tiểu mục&#10;> CS: …&#10;- …">${esc(md)}</textarea>
        <div class="ed-help"><code>##</code> mục · <code>###</code> tiểu mục · <code>####</code> ý con (xuống từng cấp) · <code>- </code> một ý · <code>&gt; CS:</code> căn cứ pháp lý (chỉ hiện ở Tóm tắt) · đề mục ngắn, không ghi số điều · ý chưa chắc thêm <code>[KIỂM TRA]</code>.</div>
      </div>
      <div class="ed-view">
        <div class="ed-tabs" role="tablist"><button type="button" data-tab="mm" class="on">Mind map</button><button type="button" data-tab="ly">Tóm tắt lý thuyết</button><button type="button" data-tab="ck">Kiểm tra <span id="edCk"></span></button></div>
        <div class="ed-pane" id="edPane"></div>
      </div>
    </div>
    <div class="ed-foot"><span class="msg" id="edMsg" aria-live="polite"></span><span class="sp"></span>
      <label class="chk"><input type="checkbox" id="edDraft" ${ch.draft?"checked":""}> Lưu nháp (chưa hiện cho sinh viên)</label>
      ${ch.has?`<button type="button" class="btn danger" id="edDel">Xóa nội dung chương</button>`:""}
      <button type="button" class="btn" id="edCancel">Hủy</button><button type="button" class="btn primary" id="edSave">Lưu</button></div>`;
  ed.hidden=false;document.body.style.overflow="hidden";
  const src=$("#edSrc");
  const build=()=>{const r=parseOutline(src.value,ch.n,title);let maps=[];if(!r.loi.length&&(r.root.c||r.root.b)){try{maps=sinhMaps(r.root,ch.n,title)}catch(e){r.loi.push("Chưa dựng được mind map: "+e.message)}}last={r,maps};return last};
  const show=()=>{const {r,maps}=last||build();const p=$("#edPane");
    $("#edCk").textContent=r.loi.length?`(${r.loi.length} lỗi)`:r.cb.length?`(${r.cb.length})`:"✓";
    if(tab==="mm")p.innerHTML=r.loi.length?`<p class="err">Sửa lỗi ở mục Kiểm tra trước khi xem mind map.</p>`:maps.length?maps.map(sheetHTML).join(""):`<p class="msg">Soạn dàn ý bên trái, mind map hiện ở đây.</p>`;
    else if(tab==="ly")p.innerHTML=lyHTML(r.root);
    else p.innerHTML=`${r.loi.length?`<h4 style="margin:0 0 6px;color:var(--err)">Lỗi phải sửa</h4><ul class="chkl">${r.loi.map(x=>`<li class="loi">${esc(x)}</li>`).join("")}</ul>`:'<p class="ok" style="font-weight:700">Không có lỗi.</p>'}
      ${r.cb.length?`<h4 style="margin:12px 0 6px;color:var(--warn)">Nên xem lại</h4><ul class="chkl">${r.cb.map(x=>`<li class="cb">${esc(x)}</li>`).join("")}</ul>`:""}
      <p class="msg" style="margin-top:12px">Chuẩn chung: mỗi đề mục có dòng CS và ít nhất một ý; nhánh cuối có ý cụ thể (điều kiện, các loại, quyền, nghĩa vụ, thời hạn…); đề mục cùng cấp nên từ 2 đến 7.</p>`;
    if(tab==="mm")requestAnimationFrame(()=>fitSheets(p))};
  let tm=null;const later=()=>{dirty=true;clearTimeout(tm);tm=setTimeout(()=>{build();show()},600)};
  src.addEventListener("input",later);
  src.addEventListener("keydown",e=>{if(e.key==="Tab"){e.preventDefault();document.execCommand("insertText",false,"  ")}});
  $$(".ed-tools [data-ins]").forEach(b=>b.onclick=()=>{const v=src.value,p=src.selectionStart,ls=v.lastIndexOf("\n",p-1)+1,lineHas=v.slice(ls,p).trim().length>0;
    const ins=(lineHas?"\n":"")+b.dataset.ins;src.focus();src.setSelectionRange(p,p);document.execCommand("insertText",false,ins);later()});
  $("#edFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{if(src.value.trim()&&!confirm("Thay toàn bộ dàn ý đang soạn bằng nội dung tệp?"))return;src.value=String(rd.result);later()};rd.readAsText(f,"utf-8")};
  if($("#edTpl"))$("#edTpl").onclick=()=>{if(src.value.trim()&&!confirm("Thay nội dung đang soạn bằng mẫu?"))return;src.value=TPL;later()};
  $$(".ed-tabs button").forEach(b=>b.onclick=()=>{tab=b.dataset.tab;$$(".ed-tabs button").forEach(x=>x.classList.toggle("on",x===b));show()});
  $("#edRename").onclick=()=>{const t=prompt("Tên chương:",title);if(!t||!t.trim())return;title=sach(t);$("#edT").textContent=title;later()};
  const close=()=>{if(dirty&&!confirm("Đóng mà không lưu thay đổi?"))return;ed.hidden=true;ed.innerHTML="";document.body.style.overflow="";go()};
  $("#edClose").onclick=close;$("#edCancel").onclick=close;
  if($("#edDel"))arm($("#edDel"),"Bấm lần nữa để xóa",async()=>{await docRef("pnl_hp_ch/"+chId(c.id,ch.n)).delete();await updChapterMeta(c,ch.n,title,null);toast("Đã xóa nội dung Chương "+ch.n);dirty=false;close()});
  $("#edSave").onclick=async()=>{clearTimeout(tm);if(document.fonts&&document.fonts.ready)await document.fonts.ready;const {r,maps}=build();show();
    if(r.loi.length){tab="ck";$$(".ed-tabs button").forEach(x=>x.classList.toggle("on",x.dataset.tab==="ck"));show();$("#edMsg").innerHTML='<span class="err">Còn lỗi, xem mục Kiểm tra.</span>';return}
    const draft=$("#edDraft").checked,coursePub=c.kind==="moi"?c.status!=="an":true;
    const data={hp:c.id,n:ch.n,t:title,md:src.value,maps,ly:JSON.parse(JSON.stringify(r.root)),draft,pub:coursePub&&!draft,updated:nowISO()};
    const size=new Blob([JSON.stringify(data)]).size;if(size>900000){$("#edMsg").innerHTML='<span class="err">Chương quá dài để lưu một lần (giới hạn khoảng 900 KB). Hãy tách bớt nội dung.</span>';return}
    $("#edSave").disabled=true;$("#edMsg").textContent="Đang lưu…";
    try{await docRef("pnl_hp_ch/"+chId(c.id,ch.n)).set(data);await updChapterMeta(c,ch.n,title,{has:true,nmaps:maps.length,draft});
      dirty=false;$("#edMsg").innerHTML=`<span class="ok">Đã lưu ${maps.length} sơ đồ${draft?" (nháp)":" — đã hiện trên trang chủ"}.</span>`;toast("Đã lưu Chương "+ch.n);ch.has=true;ch.draft=draft}
    catch(ex){$("#edMsg").innerHTML=`<span class="err">Chưa lưu được: ${esc(ex.code==="permission-denied"?"chưa có quyền ghi (đăng nhập quản trị).":ex.message)}</span>`}
    finally{$("#edSave").disabled=false}};
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;build();show()}
async function updChapterMeta(c,n,t,meta){
  const ref=docRef("pnl_hp/"+c.id);let h=S.hp[c.id];
  if(!h){h={kind:"bo-sung",name:c.name,c:c.c||"",pub:true,status:"mo",chapters:[],created:nowISO()}}
  const chs=(h.chapters||[]).filter(x=>x.n!==n);
  if(meta)chs.push({n,t,has:!!meta.has,nmaps:meta.nmaps|0,draft:!!meta.draft});
  else if(c.kind==="moi")chs.push({n,t,has:false,nmaps:0,draft:false});
  chs.sort((a,b)=>a.n-b.n);h=Object.assign({},h,{chapters:chs,updated:nowISO()});
  if(h.kind==="bo-sung"){h.pub=true;h.name=c.name;h.c=c.c||h.c||""}
  const {id,...data}=h;await ref.set(data);S.hp[c.id]=Object.assign({id:c.id},data)}

/* ================= 4. Ngân hàng câu hỏi (đợt 2) ================= */
async function vNganHang(m){renderSide();
  m.innerHTML=`<div class="panel"><h3>Ngân hàng câu hỏi <span class="badge sap">Đang xây — đợt 2</span></h3>
    <p class="lead">Ngân hàng hiện tại của từng học phần vẫn chạy bình thường trên các trang ôn tập. Đợt 2 sẽ thêm ở đây, theo phương án sếp đã chốt ngày 13/11/2026:</p>
    <ol class="chkl" style="font-size:13.5px">
      <li><b>Tự soạn từng câu</b>: câu ABCD hoặc tình huống, gắn chương, mức độ (Nhận biết, Thông hiểu, Vận dụng), căn cứ, giải thích.</li>
      <li><b>Tải tệp lên, hệ thống tự nhận câu hỏi</b>: Word, PDF hoặc văn bản theo mẫu "Câu… / A. B. C. D. / ĐÁP ÁN" như Azota; nhận xong hiện bảng để sếp duyệt từng câu.</li>
      <li><b>Liên kết để AI soạn rồi đẩy lên</b>: AI soạn theo lệnh mẫu, kết quả vào hàng chờ duyệt, không tự công bố.</li>
      <li><b>Sửa nội dung từng câu</b> ngay trong ngân hàng; câu có trạng thái Nháp hoặc Đã duyệt; câu đã dùng trong đánh giá định kỳ chỉ ẩn, không xóa.</li>
      <li>Tự kiểm tra câu trùng, 4 phương án trùng nội dung; rút đề đánh giá định kỳ theo ma trận chương × mức độ.</li></ol></div>`}

/* ================= 5. Gói & mã truy cập ================= */
async function vMa(m){
  await Promise.all([S.ma?null:loadMa(),loadGoi()]);renderNav();renderSide();
  const cs=allCourses().filter(c=>c.kind==="gh"||c.status!=="an"),t=todayISO();
  const d=new Date();d.setMonth(d.getMonth()+4);const def=d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
  const grid=(name)=>`<label class="chk"><input type="checkbox" class="${name}-all" checked> <b>Tất cả học phần</b></label><div class="grid3" style="margin-top:6px">${cs.map(c=>`<label class="chk"><input type="checkbox" class="${name}-c" value="${esc(c.id)}" disabled> ${esc(c.name)}${c.kind==="gh"&&!c.src?' <span class="badge sap">Sắp có</span>':c.kind==="moi"&&c.status==="sap"?' <span class="badge sap">Sắp có</span>':""}</label>`).join("")}</div>`;
  m.innerHTML=`<div class="note">Mã đang dùng giữ nguyên, sinh viên không phải nhập lại. <b>Gói</b> là bộ học phần đặt sẵn: chọn gói khi cấp mã là tự tích đúng học phần.</div>
  <div class="panel" id="maFrame"><h3 id="maTitle">Cấp mã cho lớp</h3>
    <form id="maForm" novalidate>
      <div class="grid3">
        <label class="fld"><span>Mã</span><input id="maCode" maxlength="24" placeholder="Ví dụ: K25D-LDS" style="text-transform:uppercase" autocomplete="off" spellcheck="false"></label>
        <label class="fld"><span>Số người được dùng mã</span><input id="maMax" type="number" min="1" max="1000" value="40"><small>Nên đặt dư khoảng 30% (một người dùng 2 thiết bị tính 2 lượt).</small></label>
        <label class="fld"><span>Hiệu lực đến hết ngày</span><input id="maHan" type="date" value="${def}"></label>
      </div>
      <div class="grid2" style="margin-top:12px">
        <label class="fld"><span>Lớp / ghi chú</span><input id="maNote" maxlength="80" placeholder="K25D – Luật Dân sự"></label>
        <label class="fld"><span>Gói truy cập</span><select id="maGoi"><option value="">— Tự chọn học phần —</option>${S.goi.map(g=>`<option value="${esc(g.id)}">${esc(g.ten)} (${esc(scopeLabel(g.courses))})</option>`).join("")}</select></label>
      </div>
      <div class="fld" style="margin-top:12px"><span>Học phần được mở</span>${grid("ma")}</div>
      <p class="err" id="maErr" role="alert"></p>
      <div class="row" style="margin-top:8px"><button class="btn primary" type="submit" id="maSave">Cấp mã</button><button type="button" class="btn" id="maCancel" hidden>Hủy sửa</button><span class="msg" id="maMsg" aria-live="polite"></span></div>
    </form></div>
  <div class="panel"><h3>Danh sách mã <span class="sp"></span><span class="msg">${S.ma.length} mã · ${S.ma.filter(x=>x.han>=t).length} đang hiệu lực</span></h3>
    <div class="tbl"><table><thead><tr><th>Mã</th><th>Lớp / ghi chú</th><th>Gói / học phần</th><th>Hạn dùng</th><th>Đã dùng</th><th>Trạng thái</th><th></th></tr></thead><tbody id="maBody"></tbody></table></div>
    <p class="msg" style="margin-top:8px">Mỗi trình duyệt trên một máy tính là một người. Xóa mã là thu hồi quyền: sinh viên dùng mã đó phải nhập mã mới.</p></div>
  <div class="panel"><h3>Gói truy cập <span class="sp"></span><button type="button" class="btn sm primary" id="goiNew">＋ Tạo gói</button></h3>
    <form id="goiForm" hidden novalidate style="margin-bottom:14px">
      <div class="grid2"><label class="fld"><span>Tên gói</span><input id="goiTen" maxlength="80" placeholder="Ví dụ: Gói Dân sự – Tố tụng dân sự"></label><label class="fld"><span>Ghi chú</span><input id="goiNote" maxlength="120"></label></div>
      <div class="fld" style="margin-top:10px"><span>Học phần trong gói</span>${grid("goi")}</div>
      <p class="err" id="goiErr"></p>
      <div class="row"><button class="btn primary" type="submit" id="goiSave">Lưu gói</button><button type="button" class="btn" id="goiCancel">Hủy</button><span class="msg" id="goiMsg"></span></div></form>
    <div class="tbl"><table><thead><tr><th>Gói</th><th>Học phần</th><th>Mã đang dùng gói</th><th></th></tr></thead><tbody id="goiBody"></tbody></table></div></div>`;
  const pick=(name,courses)=>{const all=!courses||!courses.length||courses.includes("*");$("."+name+"-all").checked=all;$$("."+name+"-c").forEach(x=>{x.disabled=all;x.checked=!all&&courses.includes(x.value)})};
  const read=name=>$("."+name+"-all").checked?["*"]:$$("."+name+"-c:checked").map(x=>x.value);
  ["ma","goi"].forEach(n=>$("."+n+"-all").addEventListener("change",e=>$$("."+n+"-c").forEach(x=>{x.disabled=e.target.checked;if(x.disabled)x.checked=false})));
  $("#maGoi").onchange=()=>{const g=S.goi.find(x=>x.id===$("#maGoi").value);if(g)pick("ma",g.courses)};
  $$(".ma-c,.ma-all").forEach(x=>x.addEventListener("change",()=>{$("#maGoi").value=""}));
  let EDIT=null;
  const drawMa=()=>{$("#maBody").innerHTML=S.ma.length?S.ma.map(x=>{const exp=t>x.han,full=x.max&&x.used!=null&&x.used>=x.max,g=S.goi.find(y=>y.id===x.goi);
    return `<tr><td><b>${esc(x.code)}</b></td><td>${esc(x.note)}</td><td>${g?`<span class="badge">${esc(g.ten)}</span> `:""}${esc(scopeLabel(x.courses))}</td><td>${fmtDate(x.han)}</td><td>${x.used==null?"?":x.used} / ${x.max||"—"}</td><td>${exp?'<span class="badge bad">Hết hạn</span>':full?'<span class="badge bad">Đủ người</span>':'<span class="badge mo">Đang hiệu lực</span>'}</td>
      <td class="act"><button type="button" class="btn sm" data-edit="${esc(x.code)}">Sửa</button> <button type="button" class="btn sm danger" data-del="${esc(x.code)}">Xóa</button></td></tr>`}).join(""):`<tr><td colspan="7" class="msg">Chưa có mã nào.</td></tr>`;
    $$("#maBody [data-edit]").forEach(b=>b.onclick=()=>startEdit(S.ma.find(x=>x.code===b.dataset.edit)));
    $$("#maBody [data-del]").forEach(b=>arm(b,"Xóa hẳn?",async()=>{const code=b.dataset.del;
      for(const d of (await col("pnl_ma/"+code+"/luot").get()).docs)await d.ref.delete();await docRef("pnl_ma/"+code).delete();
      S.ma=S.ma.filter(x=>x.code!==code);if(EDIT===code)stopEdit();drawMa();renderSide();toast("Đã xóa mã "+code)}))};
  const drawGoi=()=>{$("#goiBody").innerHTML=S.goi.length?S.goi.map(g=>`<tr><td><b>${esc(g.ten)}</b>${g.note?`<br><span class="muted">${esc(g.note)}</span>`:""}</td><td>${esc((g.courses||[]).includes("*")?"Tất cả học phần":(g.courses||[]).map(courseName).join("; "))}</td><td>${S.ma.filter(x=>x.goi===g.id).map(x=>esc(x.code)).join(", ")||'<span class="muted">—</span>'}</td><td class="act"><button type="button" class="btn sm" data-gedit="${esc(g.id)}">Sửa</button> <button type="button" class="btn sm danger" data-gdel="${esc(g.id)}">Xóa</button></td></tr>`).join(""):`<tr><td colspan="4" class="msg">Chưa có gói nào. Tạo gói khi nhiều lớp dùng chung một bộ học phần.</td></tr>`;
    $$("#goiBody [data-gedit]").forEach(b=>b.onclick=()=>goiEdit(S.goi.find(x=>x.id===b.dataset.gedit)));
    $$("#goiBody [data-gdel]").forEach(b=>arm(b,"Xóa gói?",async()=>{await docRef("pnl_goi/"+b.dataset.gdel).delete();S.goi=S.goi.filter(x=>x.id!==b.dataset.gdel);drawGoi();renderSide();toast("Đã xóa gói (mã đã cấp không đổi)")}))};
  function startEdit(x){EDIT=x.code;$("#maTitle").textContent="Sửa mã "+x.code;$("#maCode").value=x.code;$("#maCode").readOnly=true;$("#maMax").value=x.max||40;$("#maHan").value=x.han;$("#maNote").value=x.note;$("#maGoi").value=x.goi||"";pick("ma",x.courses);
    $("#maSave").textContent="Lưu thay đổi";$("#maCancel").hidden=false;$("#maErr").textContent="";$("#maFrame").scrollIntoView({behavior:"smooth"})}
  function stopEdit(){EDIT=null;$("#maTitle").textContent="Cấp mã cho lớp";$("#maCode").readOnly=false;$("#maCode").value="";$("#maNote").value="";$("#maMax").value=40;$("#maHan").value=def;$("#maGoi").value="";pick("ma",["*"]);$("#maSave").textContent="Cấp mã";$("#maCancel").hidden=true}
  $("#maCancel").onclick=stopEdit;
  $("#maForm").onsubmit=async e=>{e.preventDefault();const err=x=>{$("#maErr").textContent=x};
    const code=normCode($("#maCode").value),max=parseInt($("#maMax").value,10),han=$("#maHan").value,note=$("#maNote").value.trim().slice(0,80),goi=$("#maGoi").value,courses=read("ma");
    if(!okCode(code))return err("Mã gồm 3–24 ký tự: chữ không dấu, số, gạch ngang hoặc gạch dưới.");
    if(!(max>=1&&max<=1000))return err("Số người từ 1 đến 1000.");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(han)||han<t)return err("Chọn ngày hết hạn từ hôm nay trở đi.");
    if(!courses.length)return err("Chọn ít nhất một học phần hoặc Tất cả học phần.");
    err("");$("#maSave").disabled=true;$("#maMsg").textContent="Đang lưu…";
    try{const ref=docRef("pnl_ma/"+code);
      if(EDIT){const cur=(await ref.get()).data()||{};const it=S.ma.find(x=>x.code===code);
        if(it&&it.used!=null&&max<it.used&&!confirm(`Mã ${code} đã có ${it.used} người dùng, nhiều hơn ${max}. Người đã vào vẫn dùng được, chỉ người mới bị chặn. Vẫn lưu?`)){return}
        const data=Object.assign({},cur,{note,han,max,courses,goi,updated:nowISO()});await ref.set(data);Object.assign(it,{note,han,max,courses,goi});stopEdit();toast("Đã cập nhật mã "+code)}
      else{if((await ref.get()).exists)return err("Mã "+code+" đã có. Đặt mã khác.");
        const data={note,han,max,courses,goi,created:nowISO()};await ref.set(data);S.ma.unshift(Object.assign({code,used:0},data));$("#maCode").value="";$("#maNote").value="";toast("Đã cấp mã "+code+". Sinh viên dùng được ngay.")}
      drawMa();drawGoi();renderSide();renderNav()}
    catch(ex){err("Chưa lưu được: "+(ex.code==="permission-denied"?"chưa có quyền (đăng nhập quản trị).":ex.message))}
    finally{$("#maSave").disabled=false;$("#maMsg").textContent=""}};
  let GEDIT=null;
  function goiEdit(g){GEDIT=g?g.id:null;$("#goiForm").hidden=false;$("#goiTen").value=g?g.ten:"";$("#goiNote").value=g?g.note||"":"";pick("goi",g?g.courses:["*"]);$("#goiErr").textContent="";$("#goiTen").focus()}
  $("#goiNew").onclick=()=>goiEdit(null);$("#goiCancel").onclick=()=>{$("#goiForm").hidden=true;GEDIT=null};
  $("#goiForm").onsubmit=async e=>{e.preventDefault();const ten=$("#goiTen").value.trim(),courses=read("goi");
    if(ten.length<2){$("#goiErr").textContent="Nhập tên gói.";return}if(!courses.length){$("#goiErr").textContent="Chọn học phần cho gói.";return}
    $("#goiSave").disabled=true;
    try{const data={ten,note:$("#goiNote").value.trim(),courses,updated:nowISO()};
      if(GEDIT){await docRef("pnl_goi/"+GEDIT).set(data,{merge:true});Object.assign(S.goi.find(x=>x.id===GEDIT),data);
        const using=S.ma.filter(x=>x.goi===GEDIT);
        if(using.length&&confirm(`Áp dụng học phần mới của gói cho ${using.length} mã đang dùng gói (${using.map(x=>x.code).join(", ")})? Sinh viên không phải nhập lại mã.`)){
          for(const x of using){await docRef("pnl_ma/"+x.code).set({courses,updated:nowISO()},{merge:true});x.courses=courses}drawMa()}}
      else{data.created=nowISO();const r=await col("pnl_goi").add(data);S.goi.push(Object.assign({id:r.id},data))}
      $("#goiForm").hidden=true;GEDIT=null;drawGoi();renderSide();
      const sel=$("#maGoi"),v=sel.value;sel.innerHTML=`<option value="">— Tự chọn học phần —</option>`+S.goi.map(g=>`<option value="${esc(g.id)}">${esc(g.ten)} (${esc(scopeLabel(g.courses))})</option>`).join("");sel.value=v;toast("Đã lưu gói "+ten)}
    catch(ex){$("#goiErr").textContent="Chưa lưu được: "+ex.message}finally{$("#goiSave").disabled=false}};
  drawMa();drawGoi();
  if(ARG==="moi")setTimeout(()=>$("#maCode").focus(),50);
  else if(ARG&&S.ma.some(x=>x.code===ARG))startEdit(S.ma.find(x=>x.code===ARG))}

/* ================= 6. Đánh giá định kỳ ================= */
async function vDanhGia(m){renderSide();
  m.innerHTML=`<div class="panel" style="padding:12px 16px"><div class="row"><span class="msg" style="flex:1">Lớp kiểm tra, danh sách sinh viên (mẫu bảng điểm APAG), bài nộp, chấm tự luận và bảng điểm của mọi học phần.</span>
    <a class="btn sm" href="../danh-gia/#quan-tri" target="_blank" rel="noopener">Mở toàn màn hình ↗</a><a class="btn sm" href="../danh-gia/tu-luan-luat-dan-su.html#quan-tri" target="_blank" rel="noopener">Tự luận Luật Dân sự ↗</a></div></div>
    <iframe class="embed" src="../danh-gia/?nhung=1#quan-tri" title="Quản trị đánh giá định kỳ"></iframe>`}

/* ================= 7. Góp ý ================= */
async function vGopY(m){renderSide();const items=[];
  (await col("pnl_gopy").get()).docs.forEach(d=>((d.data()||{}).items||[]).forEach(x=>items.push(x)));
  items.sort((a,b)=>String(b.ts||b.time).localeCompare(String(a.ts||a.time)));
  const courses=[...new Set(items.map(x=>x.course||"Chung"))].sort((a,b)=>a.localeCompare(b,"vi"));
  m.innerHTML=`<div class="panel"><h3>Góp ý, báo lỗi từ sinh viên <span class="sp"></span><select id="gyF" class="btn sm"><option value="">Tất cả (${items.length})</option>${courses.map(c=>`<option>${esc(c)}</option>`).join("")}</select></h3>
    <p class="lead">Báo lỗi ở từng câu hỏi trong trang ôn tập vẫn gửi thẳng về email giảng viên như trước; ở đây là các góp ý gửi trên trang chủ.</p>
    <div class="tbl"><table><thead><tr><th>Ngày</th><th>Học phần</th><th>Nội dung</th></tr></thead><tbody id="gyB"></tbody></table></div></div>`;
  const draw=()=>{const f=$("#gyF").value,xs=items.filter(x=>!f||(x.course||"Chung")===f);
    $("#gyB").innerHTML=xs.length?xs.map(x=>`<tr><td style="white-space:nowrap">${esc(fmtDate(x.time))}</td><td>${esc(x.course||"Chung")}</td><td>${esc(x.text)}</td></tr>`).join(""):`<tr><td colspan="3" class="msg">Chưa có góp ý.</td></tr>`};
  $("#gyF").onchange=draw;draw()}

/* ================= 8. Sao lưu ================= */
async function vSaoLuu(m){renderSide();
  m.innerHTML=`<div class="panel"><h3>Sao lưu dữ liệu nhập trên Quản trị</h3>
    <p class="lead">Tải về một tệp JSON gồm học phần, chương (dàn ý, mind map), gói và mã lớp. Nên tải sau mỗi đợt soạn nhiều nội dung. Nội dung trên GitHub đã có lịch sử phiên bản riêng nên không cần sao lưu ở đây.</p>
    <div class="row"><button type="button" class="btn primary" id="bk">⬇ Tải bản sao lưu</button><span class="msg" id="bkMsg"></span></div></div>`;
  $("#bk").onclick=async()=>{$("#bk").disabled=true;$("#bkMsg").textContent="Đang gom dữ liệu…";
    try{const out={xuat:nowISO(),nguon:"Phúc Nguyên Library — Quản trị"};
      for(const n of ["pnl_hp","pnl_hp_ch","pnl_goi","pnl_ma"])out[n]=(await col(n).get()).docs.map(d=>Object.assign({_id:d.id},d.data()));
      const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:"application/json"}));a.download="PNL-sao-luu-"+todayISO()+".json";a.click();
      $("#bkMsg").textContent="Đã tải: "+out.pnl_hp.length+" học phần, "+out.pnl_hp_ch.length+" chương, "+out.pnl_goi.length+" gói, "+out.pnl_ma.length+" mã."}
    catch(ex){$("#bkMsg").textContent="Chưa tải được: "+ex.message}finally{$("#bk").disabled=false}}}

/* ================= Khởi động ================= */
async function start(u){
  USER=u;$("#loginView").hidden=true;$("#layout").hidden=false;$("#btnLogout").hidden=false;$("#whoami").textContent=u.email||"Quản trị";
  if(!S.loaded){$("#main").innerHTML='<div class="panel"><p class="msg">Đang tải dữ liệu…</p></div>';
    await Promise.all([loadStatic().catch(e=>console.warn("static",e)),loadHp(),loadGoi().catch(()=>{})]);S.loaded=true}
  go()}
function showLogin(msg){$("#layout").hidden=true;$("#loginView").hidden=false;$("#btnLogout").hidden=true;$("#whoami").textContent="";$("#loginErr").textContent=msg||""}
$("#btnGoogle").onclick=async()=>{const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:"select_account",login_hint:ADMIN_EMAILS[0]});$("#loginErr").textContent="Đang mở cửa sổ đăng nhập Google…";
  try{const r=await auth.signInWithPopup(p);if(!isAdmin(r.user)){const em=r.user.email;await auth.signOut();showLogin("Tài khoản "+em+" không phải quản trị. Hãy chọn "+ADMIN_EMAILS[0]+".")}}
  catch(err){if(err.code==="auth/popup-blocked"||err.code==="auth/operation-not-supported-in-this-environment"){auth.signInWithRedirect(p);return}
    $("#loginErr").textContent=err.code==="auth/popup-closed-by-user"||err.code==="auth/cancelled-popup-request"?"Cửa sổ đăng nhập đã đóng.":"Chưa đăng nhập được ("+(err.code||"lỗi mạng")+")."}};
$("#btnLogout").onclick=async()=>{if(!confirm("Đăng xuất quản trị trên máy này? (đăng xuất chung PNL, PNW, PND)"))return;await auth.signOut();location.reload()};
auth.onAuthStateChanged(u=>{if(isAdmin(u)){if(!USER||USER.uid!==u.uid)start(u)}else{USER=null;showLogin(u&&!u.isAnonymous?"Tài khoản "+(u.email||"")+" không phải quản trị.":"")}});
