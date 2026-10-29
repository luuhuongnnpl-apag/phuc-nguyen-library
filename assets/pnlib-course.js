/* Phúc Nguyên Library — khuôn web ôn tập dùng chung cho mọi học phần.
   Dữ liệu học phần đặt trong <script id="pn-data" type="application/json">.
   Mẫu chuẩn: Luật Dân sự. Các học phần khác dùng chung file này để thống nhất giao diện và cách làm bài. */
(function(){
"use strict";
/* Nơi nhận báo lỗi, góp ý: email giảng viên qua dịch vụ FormSubmit (lần đầu cần bấm xác nhận trong thư). */
const REPORT_TO="luuhuong.nnpl@gmail.com";
const REPORT_URL="https://formsubmit.co/ajax/"+REPORT_TO;

const D=JSON.parse(document.getElementById("pn-data").textContent);
const M=D.meta||{};
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const P="pn:"+M.id+":v2:";
const store={get(k,d){try{const v=localStorage.getItem(P+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(P+k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(P+k)}catch(e){}}};
const L="ABCD";
const LV={NB:"Nhận biết",TH:"Thông hiểu",VD:"Vận dụng"}, LVK=["NB","TH","VD"];
function fnv(s){let h=0x811c9dc5;for(const c of String(s)){h^=c.codePointAt(0);h=Math.imul(h,0x01000193)>>>0}return h.toString(36)}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const pad2=n=>String(n).padStart(2,"0");
const fmtTime=ms=>{ms=Math.max(0,ms);const s=Math.round(ms/1000);return pad2(Math.floor(s/60))+":"+pad2(s%60)};
const fmtWhen=t=>{const d=new Date(t);return pad2(d.getDate())+"/"+pad2(d.getMonth()+1)+"/"+d.getFullYear()+" "+pad2(d.getHours())+":"+pad2(d.getMinutes())};
const grade10=(r,n)=>n?(Math.round(r/n*100)/10).toFixed(1).replace(".",","):"0";

/* ---------- Ngân hàng câu hỏi ---------- */
const GROUPS=D.chapters||[];const GN={};GROUPS.forEach(g=>GN[g.n]=g.name);
const Q=(D.q||[]).map(x=>Object.assign({},x,{key:x.id+"@"+fnv(x.q+"|"+x.o.join("|")+"|"+x.a)}));
const byKey={};Q.forEach(q=>byKey[q.key]=q);
const isRight=(q,c)=>c!==undefined&&c!==null&&c===q.a;
const byId={};Q.forEach(q=>byId[q.id]=q);
/* Câu hỏi gắn với tình huống: q.cid trỏ tới tình huống (th[].items[].cid) */
const CTX={};(D.th||[]).forEach(t=>t.items.forEach(c=>{if(c.cid)CTX[c.cid]={title:c.title,text:c.text}}));
const QT=Q.filter(q=>!q.cid), HASCASEQ=Q.some(q=>q.cid);
/* Tình huống có câu ABCD: dùng để bốc nguyên tình huống vào đề thi thử */
const CASEQ=[];(D.th||[]).forEach(t=>t.items.forEach(c=>{const qs=(c.mcq||[]).map(id=>Q.find(q=>q.id===id)).filter(Boolean);if(qs.length)CASEQ.push({cid:c.cid,g:qs[0].g,keys:qs.map(q=>q.key)})}));

/* ---------- Liên kết văn bản pháp luật ---------- */
const DOCS=[];/* {re, url} từ danh mục văn bản */
(D.vb||[]).forEach(s=>s.rows.forEach(r=>{if(!r.url)return;const m=r.t.match(/\d+\/\d{4}\/[A-ZĐa-zđ0-9\-]+/);if(m)DOCS.push({k:m[0],url:r.url})}));
const ALS={};(D.al||[]).forEach(a=>{if(a.url)ALS[a.so]=a.url});
const LAWS=(M.laws||[]).map(l=>({re:new RegExp(l.re),base:l.base,doc:l.doc}));
function lawHTML(b){
  if(!b)return "";
  return String(b).split(/;\s*/).map(seg=>{
    let h=esc(seg);
    const law=LAWS.find(l=>l.re.test(seg));
    if(law&&law.base){h=h.replace(/Điều\s+(\d+)/g,(m,n)=>`<a class="lawlink" href="${law.base}/dieu-${n}" target="_blank" rel="noopener">${m}</a>`)}
    else if(law&&law.doc){h+=` <a class="lawlink" href="${law.doc}" target="_blank" rel="noopener">mở văn bản</a>`}
    DOCS.forEach(d=>{if(seg.includes(d.k))h=h.replace(esc(d.k),`<a class="lawlink" href="${d.url}" target="_blank" rel="noopener">${esc(d.k)}</a>`)});
    h=h.replace(/(\d{2}\/\d{4}\/AL)/g,(m)=>ALS[m]?`<a class="lawlink" href="${ALS[m]}" target="_blank" rel="noopener">${m}</a>`:m);
    return h}).join("; ");
}

/* ---------- Khung trang ---------- */
const ICON={
 thithu:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="27" r="15" fill="#f6d77a" stroke="#8a5a00" stroke-width="2.5"/><rect x="20" y="5" width="8" height="6" rx="2" fill="#c0392b"/><path d="M24 27V18M24 27l7 4" stroke="#1f3a5a" stroke-width="3" stroke-linecap="round"/></svg>',
 luyentap:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="31" width="34" height="8" rx="2" fill="#c0392b"/><rect x="9" y="23" width="30" height="8" rx="2" fill="#2e7d4f"/><rect x="6" y="15" width="34" height="8" rx="2" fill="#2f6db0"/><rect x="11" y="8" width="26" height="7" rx="2" fill="#e3a23b"/></svg>',
 tinhhuong:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="16" cy="15" r="7" fill="#f2c9a0"/><path d="M9 14c0-6 14-7 14 0" fill="#3b2a20"/><path d="M4 42c1-10 6-15 12-15s11 5 12 15z" fill="#d9534f"/><circle cx="33" cy="16" r="6.5" fill="#f2c9a0"/><path d="M26 15c0-7 14-7 14 0l1 7c-4-3-11-3-15 0z" fill="#5a3a26"/><path d="M21 42c1-9 6-14 12-14s11 5 12 14z" fill="#3f6fb5"/></svg>',
 vanban:'<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 8h22a5 5 0 0 1 0 10H12z" fill="#e8d3a0"/><path d="M12 8c-3 0-5 2-5 5s2 5 5 5h3V8z" fill="#c9a96a"/><path d="M15 18h19v18a5 5 0 0 1-5 5H15z" fill="#f3e4bd"/><path d="M15 36a5 5 0 1 0 10 0" fill="#c9a96a"/><path d="M19 24h11M19 29h11M19 34h7" stroke="#8a6a2a" stroke-width="2" stroke-linecap="round"/><path d="M38 30l3 10-4-2-3 3-1-10z" fill="#c0392b"/></svg>',
 tomtat:'<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="7" width="30" height="36" rx="3" fill="#e9824a"/><rect x="13" y="12" width="22" height="28" rx="1.5" fill="#fff"/><rect x="18" y="4" width="12" height="7" rx="2" fill="#7a8794"/><path d="M17 19h14M17 25h14M17 31h10" stroke="#e9824a" stroke-width="2.4" stroke-linecap="round"/></svg>',
 lichsu:'<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="25" cy="25" r="16" fill="#dbe7f3" stroke="#2f6db0" stroke-width="2.5"/><path d="M25 16v10l7 4" stroke="#1f3a5a" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M6 22l4 5 5-5" stroke="#c0392b" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>'};
const VIEWS=[["thithu","Thi thử"],["luyentap","Lý thuyết"],["tinhhuong","Tình huống"],["vanban","Văn bản, án lệ"],["tomtat","Tóm tắt lý thuyết"],["lichsu","Lịch sử làm bài"]]
  .filter(([v])=>v!=="tinhhuong"||(D.th&&D.th.length)).filter(([v])=>v!=="tomtat"||D.ly);
document.title=(M.title||("Tài liệu "+M.name))+" · Phúc Nguyên Library";
const app=document.getElementById("pn-app");
app.innerHTML=`<header class="pn-band"><div class="pn-wrap"><img class="pn-logo" src="../assets/logo.png" alt="Logo Phúc Nguyên Library"><div class="pn-titles"><div class="pn-kicker">Thư viện Phúc Nguyên</div><h1>${esc(M.title||("Tài liệu "+M.name))}</h1><div class="pn-copy">Bản quyền thuộc Phúc Nguyên</div></div></div></header>
<div class="pn-layout pn-wrap">
  <div class="pn-homebar"><a class="pn-home" href="../index.html" id="pn-home"><span class="ic"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" fill="currentColor"/></svg></span>Trang chủ</a><button type="button" class="linkbtn report-btn" id="pn-report-general">Báo lỗi, góp ý học phần</button></div>
  ${M.note?`<p class="pn-note">${esc(M.note)}</p>`:""}
  <div class="pn-top"><aside class="pn-frame pn-menu"><div class="pn-ftitle">${esc(M.menuTitle||M.name)}</div><ul>${VIEWS.map(([v,t])=>`<li><button type="button" data-pn="${v}">${ICON[v]}<span>${t}</span></button></li>`).join("")}</ul></aside>
  <section class="pn-frame pn-ctrl" id="pn-ctrl" aria-live="polite"></section></div>
  <section class="pn-frame pn-body" id="pn-body"></section>
</div>
<dialog class="pn-dialog" id="pn-dlg"></dialog>`;
$("#pn-home").addEventListener("click",e=>{if(window.parent&&window.parent!==window){e.preventDefault();try{window.parent.postMessage({pn:"home"},"*")}catch(err){}}});
const CTRL=$("#pn-ctrl"),BODY=$("#pn-body");
let view="";const R={};
function show(v,noScroll){if(!R[v])v="thithu";view=v;store.set("tab",v);
  $$(".pn-menu [data-pn]").forEach(b=>b.setAttribute("aria-current",String(b.dataset.pn===v)));
  stopTimer();R[v]();if(!noScroll&&window.innerWidth<820)CTRL.scrollIntoView({behavior:"smooth",block:"start"})}
$$(".pn-menu [data-pn]").forEach(b=>b.onclick=()=>show(b.dataset.pn));
function head(v,intro){const t=(VIEWS.find(x=>x[0]===v)||[])[1]||"";return `<div class="pn-vh">${t}</div>${intro?`<p class="intro">${intro}</p>`:""}`}

/* Lượt truy cập trên thiết bị */
(function(){const s=store.get("visits",{n:0,first:Date.now()});s.n++;s.prev=s.last||null;s.last=Date.now();store.set("visits",s)})();

/* ---------- Hiển thị một câu hỏi ---------- */
function qHTML(q,c,mode,num){/* mode: "exam" (chưa chấm) | "practice" | "review" */
  const answered=c!==undefined&&c!==null, reveal=mode==="review"||((mode==="practice"||mode==="case")&&answered);
  const ok=isRight(q,c);
  let h=`<div class="qmeta"><span class="qnum">${num||("Câu "+esc(q.id))}</span><span class="tag">${esc(GN[q.g]?("Chương "+q.g+". "+GN[q.g]):"")}</span>${q.lv?`<span class="tag lv">${LV[q.lv]}</span>`:""}<span class="sp"></span>${reveal?`<button type="button" class="linkbtn report-btn" data-report="${esc(q.key)}">Báo lỗi câu này</button>`:""}</div>
  ${q.cid&&CTX[q.cid]&&mode!=="case"?`<div class="qctx"><b>Tình huống: ${esc(CTX[q.cid].title)}</b><p>${esc(CTX[q.cid].text)}</p></div>`:""}<p class="qtext">${esc(q.q)}</p><div class="opts">`;
  h+=q.o.map((o,i)=>{let cls="opt",mk="";
    if(reveal){if(i===q.a){cls+=" right";mk=i===c?"Bạn chọn · Đúng":"Đáp án đúng"}else if(i===c){cls+=" wrong";mk="Bạn chọn"}}
    else if(answered&&i===c)cls+=" sel";
    return `<button type="button" class="${cls}" data-v="${i}" ${reveal?"disabled":""}><span class="k">${L[i]}</span><span class="t">${esc(o)}</span>${mk?`<span class="mk">${mk}</span>`:""}</button>`}).join("")+"</div>";
  if(reveal){const st=!answered?"na":ok?"ok":"no";
    h+=`<div class="verdict ${st}" role="status"><h3>${!answered?"Chưa trả lời":ok?"Chính xác":"Chưa chính xác"} · Đáp án đúng: ${L[q.a]}</h3>${q.e?`<p>${esc(q.e)}</p>`:""}<p class="basis"><b>Căn cứ pháp lý</b>${lawHTML(q.b)}</p></div>`}
  return h}
function bindReport(root){$$("[data-report]",root).forEach(b=>b.onclick=()=>{const q=byKey[b.dataset.report];report(q?{kind:"Câu hỏi",ref:q.id,text:q.q+"\n"+q.o.map((o,i)=>L[i]+". "+o).join("\n")+"\nĐáp án trên web: "+L[q.a]+"\nCăn cứ: "+q.b}:{kind:"Nội dung",ref:b.dataset.report,text:b.dataset.text||""})})}

/* ---------- Thi thử ---------- */
let exam=store.get("exam",null),tick=null,exI=0,reviewFilter="all";
const cfg=Object.assign({n:20,min:30,lv:["NB","TH","VD"],groups:GROUPS.map(g=>g.n),nc:2},store.get("cfg",{}));
if(cfg.nc===undefined)cfg.nc=2;delete cfg.th;
function stopTimer(){clearInterval(tick);tick=null}
function pool(groups,lvs){return QT.filter(q=>groups.includes(q.g)&&(!q.lv||lvs.includes(q.lv)))}
function casePool(groups){return CASEQ.filter(c=>groups.includes(c.g))}
/* Bốc nguyên tình huống, rải đều các chương; câu hỏi giữ đúng thứ tự trong tình huống */
function pickCases(groups,k){const by={};shuffle(casePool(groups)).forEach(c=>(by[c.g]=by[c.g]||[]).push(c));
  const gs=shuffle(Object.keys(by)),out=[];let j=0;while(out.length<k&&gs.some(g=>by[g].length)){const g=gs[j%gs.length];if(by[g].length)out.push(by[g].shift());j++}return out}
function buildExam(){
  const p=pool(cfg.groups,cfg.lv),n=Math.min(cfg.n,p.length);
  /* Rải đều theo chương và mức độ đã chọn */
  const buckets={};p.forEach(q=>{const k=q.g+"|"+(q.lv||"");(buckets[k]=buckets[k]||[]).push(q)});
  const keys=shuffle(Object.keys(buckets));keys.forEach(k=>buckets[k]=shuffle(buckets[k]));
  const pick=[];let j=0;while(pick.length<n){const k=keys[j%keys.length];const q=buckets[k].shift();if(q)pick.push(q.key);j++;if(j>keys.length*400)break}
  const cs=pickCases(cfg.groups,cfg.nc||0);
  return {ids:shuffle(pick).concat(cs.flatMap(c=>c.keys)),nt:pick.length,c:{},start:Date.now(),end:Date.now()+cfg.min*60000,min:cfg.min,cfg:JSON.parse(JSON.stringify(cfg)),done:false}
}
R.thithu=function(){
  if(exam&&!exam.done&&exam.ids.some(k=>!byKey[k])){exam=null;store.del("exam")}
  if(!exam)return examSetup();
  if(exam.done)return examResult(exam,true);
  if(Date.now()>=exam.end)return submit();
  examRun()};
function examSetup(){
  CTRL.innerHTML=head("thithu","Đề thi thử gồm hai phần: <b>câu hỏi lý thuyết</b> trộn ngẫu nhiên theo mức độ và chương bạn chọn, sau đó là <b>tình huống</b> (mỗi tình huống một vụ việc, các câu hỏi nối tiếp nhau theo trình tự giải). Đáp án chỉ hiện sau khi <b>nộp bài</b>; khi xem lại, mỗi câu có đáp án đúng, giải thích và căn cứ pháp lý (bấm để mở văn bản).");
  const cnt=(g,l)=>QT.filter(q=>(g==null||q.g===g)&&(l==null||q.lv===l)).length;
  const ncnt=g=>CASEQ.filter(c=>c.g===g).length;
  BODY.innerHTML=`<div class="card setup">
    <div class="field"><span class="lab">Số câu lý thuyết</span><div class="row"><div class="chips" id="c-n">${[10,20,30,40,50].map(v=>`<button type="button" class="chip" data-v="${v}" aria-pressed="${cfg.n===v}">${v} câu</button>`).join("")}</div><label class="lab" for="c-n-in">hoặc nhập</label><input type="number" id="c-n-in" min="0" max="${QT.length}" value="${cfg.n}"></div></div>
    ${CASEQ.length?`<div class="field"><span class="lab">Số tình huống</span><div class="row"><div class="chips" id="c-nc">${[0,1,2,3].map(v=>`<button type="button" class="chip" data-v="${v}" aria-pressed="${cfg.nc===v}">${v?v+" tình huống":"Không có"}</button>`).join("")}</div></div></div>`:""}
    <div class="field"><span class="lab">Thời gian làm bài</span><div class="row"><div class="chips" id="c-min">${[15,30,45,60].map(v=>`<button type="button" class="chip" data-v="${v}" aria-pressed="${cfg.min===v}">${v} phút</button>`).join("")}</div><label class="lab" for="c-min-in">hoặc nhập</label><input type="number" id="c-min-in" min="5" max="180" value="${cfg.min}"></div></div>
    <div class="field"><span class="lab">Mức độ câu hỏi</span><div class="picks" id="c-lv">${LVK.map(l=>`<label><input type="checkbox" value="${l}" ${cfg.lv.includes(l)?"checked":""}><span>${LV[l]} <small>(${cnt(null,l)} câu)</small></span></label>`).join("")}</div></div>
    <div class="field"><span class="lab">Phạm vi nội dung</span><div class="chips"><button type="button" class="chip" id="g-all">Chọn tất cả</button><button type="button" class="chip" id="g-none">Bỏ chọn</button></div>
      <div class="picks" id="c-g">${GROUPS.map(g=>`<label><input type="checkbox" value="${g.n}" ${cfg.groups.includes(g.n)?"checked":""}><span>Chương ${g.n}. ${esc(g.name)} <small>(${cnt(g.n,null)} câu${ncnt(g.n)?", "+ncnt(g.n)+" tình huống":""})</small></span></label>`).join("")}</div></div>
    <div class="nav-row" style="margin-top:0"><span class="intro" id="cfg-note" style="margin:0"></span><button type="button" class="btn primary" id="go">Bắt đầu làm bài</button></div>
  </div>`;
  const sync=()=>{cfg.lv=$$("#c-lv input").filter(x=>x.checked).map(x=>x.value);cfg.groups=$$("#c-g input").filter(x=>x.checked).map(x=>+x.value);
    const nv=parseInt($("#c-n-in").value,10);cfg.n=Math.max(0,Math.min(isNaN(nv)?20:nv,QT.length));cfg.min=Math.max(5,Math.min(+$("#c-min-in").value||30,180));store.set("cfg",cfg);
    $$("#c-n .chip").forEach(x=>x.setAttribute("aria-pressed",String(+x.dataset.v===cfg.n)));$$("#c-min .chip").forEach(x=>x.setAttribute("aria-pressed",String(+x.dataset.v===cfg.min)));$$("#c-nc .chip").forEach(x=>x.setAttribute("aria-pressed",String(+x.dataset.v===cfg.nc)));
    const have=Math.min(cfg.n,cfg.lv.length?pool(cfg.groups,cfg.lv).length:0),hc=Math.min(cfg.nc||0,casePool(cfg.groups).length),hq=pickCasesCount(hc);$("#go").disabled=!(have+hc);
    $("#cfg-note").textContent=!cfg.groups.length?"Chọn ít nhất một chương.":!(have+hc)?"Chọn ít nhất một mức độ hoặc một tình huống.":`Đề gồm ${have} câu lý thuyết${hc?` và ${hc} tình huống (khoảng ${hq} câu)`:""}${have<cfg.n?` (phạm vi đã chọn chỉ có ${have} câu lý thuyết)`:""}${hc<(cfg.nc||0)?` (phạm vi đã chọn chỉ có ${hc} tình huống)`:""}, làm trong ${cfg.min} phút.`};
  const pickCasesCount=k=>{const p=casePool(cfg.groups);return p.length?Math.round(p.reduce((a,c)=>a+c.keys.length,0)/p.length*k):0};
  $$("#c-nc .chip").forEach(b=>b.onclick=()=>{cfg.nc=+b.dataset.v;sync()});
  $$("#c-n .chip").forEach(b=>b.onclick=()=>{$("#c-n-in").value=b.dataset.v;sync()});
  $$("#c-min .chip").forEach(b=>b.onclick=()=>{$("#c-min-in").value=b.dataset.v;sync()});
  $("#c-n-in").oninput=sync;$("#c-min-in").oninput=sync;$$("#c-lv input,#c-g input").forEach(x=>x.onchange=sync);
  $("#g-all").onclick=()=>{$$("#c-g input").forEach(x=>x.checked=true);sync()};$("#g-none").onclick=()=>{$$("#c-g input").forEach(x=>x.checked=false);sync()};
  $("#go").onclick=()=>{exam=buildExam();exI=0;store.set("exam",exam);examRun();scrollTo(0,0)};
  sync()}
function examRun(){
  const e=exam,i=Math.min(exI,e.ids.length-1),q=byKey[e.ids[i]],c=e.c[q.key];
  const nA=e.ids.filter(k=>e.c[k]!==undefined).length;
  CTRL.innerHTML=head("thithu","Chọn một phương án cho mỗi câu. Lựa chọn được tô <b>màu tím</b> và có thể đổi trước khi nộp; đáp án đúng chỉ hiện sau khi nộp bài. Bài tự nộp khi hết giờ.")+
    `<div class="stats"><span>Đã trả lời <b>${nA}</b>/${e.ids.length}</span><span>Thời gian <b>${e.min}</b> phút</span></div><div class="bar"><i style="width:${nA*100/e.ids.length}%"></i></div>`;
  BODY.innerHTML=`<div class="examhead"><div><span class="lab">Thời gian còn lại</span><div class="timer" id="timer">${fmtTime(e.end-Date.now())}</div></div><div id="sub-box"><button type="button" class="btn primary" id="sub">Nộp bài</button></div></div>
  <div class="card">${e.nt!==undefined&&i===e.nt?`<p class="intro" style="margin:0 0 10px"><b>Phần tình huống.</b> Các câu hỏi dưới đây gắn với cùng một vụ việc, làm theo thứ tự.</p>`:""}${qHTML(q,c,"exam",`Câu ${i+1}/${e.ids.length}`)}
  <div class="nav-row"><button type="button" class="btn ghost" id="eprev" ${i===0?"disabled":""}>← Câu trước</button>${c!==undefined?`<button type="button" class="linkbtn" id="eclear">Bỏ chọn</button>`:""}<button type="button" class="btn primary" id="enext" ${i===e.ids.length-1?"disabled":""}>Câu tiếp →</button></div></div>
  <div class="grid-title">Phiếu trả lời</div>
  <div class="qgrid">${e.ids.map((k,j)=>`<button type="button" class="${e.c[k]!==undefined?"a":""}${j===i?" cur":""}" data-j="${j}" aria-label="Câu ${j+1}">${j+1}</button>`).join("")}</div>
  <div class="legend"><span class="la">Đã trả lời</span><span>Chưa trả lời</span></div>
  <p class="kbd">Phím tắt: <kbd>A</kbd>–<kbd>D</kbd> chọn phương án · <kbd>←</kbd> <kbd>→</kbd> chuyển câu</p>`;
  /* Không tự chuyển câu sau khi chọn, tránh chạm nhầm làm câu kế tiếp tự có đáp án */
  $$(".card .opt",BODY).forEach(b=>b.onclick=()=>{e.c[q.key]=+b.dataset.v;store.set("exam",e);examRun()});
  if($("#eclear"))$("#eclear").onclick=()=>{delete e.c[q.key];store.set("exam",e);examRun()};
  $$(".qgrid button",BODY).forEach(b=>b.onclick=()=>{exI=+b.dataset.j;examRun()});
  $("#eprev").onclick=()=>{exI=i-1;examRun()};$("#enext").onclick=()=>{exI=i+1;examRun()};
  $("#sub").onclick=()=>{const left=e.ids.length-nA;
    $("#sub-box").innerHTML=`<div class="confirm">${left?`Còn ${left} câu chưa trả lời. `:""}Nộp bài? <button type="button" class="btn danger sm" id="sy">Nộp</button><button type="button" class="btn ghost sm" id="sn">Làm tiếp</button></div>`;
    $("#sy").onclick=submit;$("#sn").onclick=examRun};
  stopTimer();tick=setInterval(()=>{const t=$("#timer");if(!t||view!=="thithu"){stopTimer();return}const left=exam.end-Date.now();if(left<=0){submit();return}t.textContent=fmtTime(left);t.classList.toggle("low",left<5*60000)},1000)}
function score(e){return e.ids.filter(k=>byKey[k]&&isRight(byKey[k],e.c[k])).length}
function submit(){stopTimer();const e=exam;if(!e)return;e.done=true;e.used=Math.min(Date.now(),e.end)-e.start;e.r=score(e);store.set("exam",e);
  const hist=store.get("hist",[]);hist.unshift({t:Date.now(),ids:e.ids,c:e.c,r:e.r,n:e.ids.length,min:e.min,used:e.used,cfg:e.cfg});store.set("hist",hist.slice(0,30));
  reviewFilter="all";examResult(e,true);scrollTo(0,0)}
function examResult(e,current){
  const ids=e.ids.filter(k=>byKey[k]),r=score(e),n=ids.length,blank=ids.filter(k=>e.c[k]===undefined).length;
  const per={},perL={};ids.forEach(k=>{const q=byKey[k],ok=isRight(q,e.c[k]);(per[q.g]=per[q.g]||{r:0,n:0}).n++;if(ok)per[q.g].r++;if(q.lv){(perL[q.lv]=perL[q.lv]||{r:0,n:0}).n++;if(ok)perL[q.lv].r++}});
  CTRL.innerHTML=head(current?"thithu":"lichsu",`Kết quả bài làm lúc ${fmtWhen(e.start||e.t)}. Xem lại từng câu bên dưới: phương án bạn chọn, đáp án đúng, giải thích và căn cứ pháp lý.`)+
    `<div class="toolbar"><span class="lab">Xem lại</span><div class="chips" id="rv"><button type="button" class="chip" data-v="all" aria-pressed="${reviewFilter==="all"}">Tất cả ${n} câu</button><button type="button" class="chip" data-v="wrong" aria-pressed="${reviewFilter==="wrong"}">Sai và bỏ trống (${n-r})</button><button type="button" class="chip" data-v="right" aria-pressed="${reviewFilter==="right"}">Làm đúng (${r})</button></div></div>`;
  const list=ids.filter(k=>{const ok=isRight(byKey[k],e.c[k]);return reviewFilter==="all"||(reviewFilter==="wrong"?!ok:ok)});
  const tbl=(rows,lab)=>`<div class="tbl"><table><thead><tr><th>${lab}</th><th>Đúng</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  BODY.innerHTML=`<div class="card result"><span class="lab">Điểm bài thi thử (thang 10)</span><div class="big">${grade10(r,n)}</div><p class="sub">${r}/${n} câu đúng · ${blank} câu bỏ trống · làm trong ${fmtTime(e.used||0)} / ${e.min} phút</p>
    <div class="nav-row" style="justify-content:center">${current?`<button type="button" class="btn primary" id="again">Làm đề mới cùng cấu hình</button><button type="button" class="btn" id="cfgb">Đổi cấu hình</button>`:`<button type="button" class="btn" id="back">← Về lịch sử làm bài</button>`}</div></div>
  <div class="grid-title">Kết quả theo mức độ</div>${tbl(LVK.filter(l=>perL[l]).map(l=>`<tr><td>${LV[l]}</td><td class="num">${perL[l].r}/${perL[l].n}<span class="meter"><i style="width:${perL[l].r*100/perL[l].n}%"></i></span></td></tr>`).join(""),"Mức độ")}
  <div class="grid-title">Kết quả theo chương</div>${tbl(Object.keys(per).sort((a,b)=>a-b).map(g=>`<tr><td>Chương ${g}. ${esc(GN[g])}</td><td class="num">${per[g].r}/${per[g].n}<span class="meter"><i style="width:${per[g].r*100/per[g].n}%"></i></span></td></tr>`).join(""),"Chương")}
  <div class="review">${list.map(k=>{const q=byKey[k],c=e.c[k],st=c===undefined?"na":isRight(q,c)?"ok":"no";return `<div class="mini is-${st}">${qHTML(q,c,"review","Câu "+(ids.indexOf(k)+1))}</div>`}).join("")||'<div class="mini empty">Không có câu nào trong mục này.</div>'}</div>`;
  if($("#again"))$("#again").onclick=()=>{Object.assign(cfg,e.cfg||{});exam=buildExam();exI=0;store.set("exam",exam);examRun();scrollTo(0,0)};
  if($("#cfgb"))$("#cfgb").onclick=()=>{exam=null;store.del("exam");examSetup()};
  if($("#back"))$("#back").onclick=()=>R.lichsu();
  $$("#rv .chip").forEach(b=>b.onclick=()=>{reviewFilter=b.dataset.v;examResult(e,current)});
  bindReport(BODY)}

/* ---------- Lý thuyết (luyện tập từng câu) ---------- */
let ans=store.get("ans",{});
const st={g:"",lv:"",mode:"seq",list:[],i:0};
R.luyentap=function(){
  CTRL.innerHTML=head("luyentap",`${QT.length} câu trắc nghiệm theo chương và mức độ. Chọn đáp án để xem ngay đúng hay sai, kèm giải thích và căn cứ pháp lý; có thể <b>Làm lại câu này</b>. Kết quả lưu trên trình duyệt của bạn.`)+
  `<div class="toolbar"><label class="lab" for="f-g">Chương</label><select id="f-g"><option value="">Tất cả các chương (${QT.length} câu)</option>${GROUPS.map(g=>`<option value="${g.n}" ${String(g.n)===st.g?"selected":""}>Chương ${g.n}. ${esc(g.name)}</option>`).join("")}</select></div>
  <div class="toolbar"><div class="chips" id="f-lv">${[["","Mọi mức độ"]].concat(LVK.map(l=>[l,LV[l]])).map(([v,t])=>`<button type="button" class="chip" data-v="${v}" aria-pressed="${st.lv===v}">${t}</button>`).join("")}</div>
  <div class="chips" id="f-mode"><button type="button" class="chip" data-v="seq" aria-pressed="${st.mode==="seq"}">Lần lượt</button><button type="button" class="chip" data-v="wrong" aria-pressed="${st.mode==="wrong"}">Ôn câu đã làm sai</button></div></div>
  <div class="stats" id="stats"></div><div class="bar"><i id="pbar"></i></div>`;
  $("#f-g").onchange=e=>{st.g=e.target.value;rebuild()};
  $$("#f-lv .chip").forEach(b=>b.onclick=()=>{st.lv=b.dataset.v;$$("#f-lv .chip").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));rebuild()});
  $$("#f-mode .chip").forEach(b=>b.onclick=()=>{st.mode=b.dataset.v;$$("#f-mode .chip").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));rebuild()});
  rebuild()};
function rebuild(){const p=QT.filter(q=>(!st.g||q.g==st.g)&&(!st.lv||q.lv===st.lv));
  if(st.mode==="wrong"){st.list=p.filter(q=>q.key in ans&&!isRight(q,ans[q.key])).map(q=>q.key);st.i=0}
  else{st.list=p.map(q=>q.key);const k=st.list.findIndex(id=>!(id in ans));st.i=k<0?0:k}
  practice()}
function practice(){
  const Ls=st.list,done=Ls.filter(k=>ans[k]!==undefined),right=done.filter(k=>isRight(byKey[k],ans[k]));
  $("#stats").innerHTML=`<span>Đã làm <b>${done.length}</b>/${Ls.length}</span><span>Đúng <b>${right.length}</b></span><span>Tỷ lệ <b>${done.length?Math.round(right.length*100/done.length):0}%</b></span>`;
  $("#pbar").style.width=(Ls.length?done.length*100/Ls.length:0)+"%";
  if(!Ls.length){BODY.innerHTML=`<div class="card empty">${st.mode==="wrong"?"Chưa có câu nào làm sai trong phạm vi đã chọn.":"Không có câu hỏi phù hợp bộ lọc."}</div>`;return}
  st.i=Math.max(0,Math.min(st.i,Ls.length-1));const q=byKey[Ls[st.i]],c=ans[q.key];
  BODY.innerHTML=`<div class="card">${qHTML(q,c,"practice",`Câu ${st.i+1}/${Ls.length}`)}
  <div class="nav-row"><button type="button" class="btn ghost" id="pprev" ${st.i===0?"disabled":""}>← Câu trước</button>${c!==undefined?`<button type="button" class="btn" id="retry">Làm lại câu này</button>`:""}<button type="button" class="btn primary" id="pnext" ${st.i===Ls.length-1?"disabled":""}>Câu tiếp →</button></div></div>
  <div class="grid-title">Bảng câu hỏi (bấm để chuyển nhanh)</div>
  <div class="qgrid">${Ls.map((k,j)=>{const a=ans[k];return `<button type="button" class="${a===undefined?"":isRight(byKey[k],a)?"r":"w"}${j===st.i?" cur":""}" data-j="${j}" aria-label="Câu ${j+1}">${j+1}</button>`}).join("")}</div>
  <div class="legend"><span class="lr">Làm đúng</span><span class="lw">Làm sai</span><span>Chưa làm</span></div>
  <div class="nav-row" style="margin-top:22px"><div id="reset-box"><button type="button" class="btn ghost sm" id="rs">Xóa kết quả luyện tập</button></div></div>
  <p class="kbd">Phím tắt: <kbd>A</kbd>–<kbd>D</kbd> chọn phương án · <kbd>←</kbd> <kbd>→</kbd> chuyển câu</p>`;
  $$(".card .opt",BODY).forEach(b=>b.onclick=()=>{if(ans[q.key]!==undefined)return;ans[q.key]=+b.dataset.v;store.set("ans",ans);practice()});
  if($("#retry"))$("#retry").onclick=()=>{delete ans[q.key];store.set("ans",ans);practice()};
  $("#pprev").onclick=()=>{st.i--;practice()};$("#pnext").onclick=()=>{st.i++;practice()};
  $$(".qgrid button",BODY).forEach(b=>b.onclick=()=>{st.i=+b.dataset.j;practice()});
  $("#rs").onclick=()=>{$("#reset-box").innerHTML='<div class="confirm">Xóa toàn bộ kết quả luyện tập trên trình duyệt này? <button type="button" class="btn danger sm" id="rs-y">Xóa</button><button type="button" class="btn ghost sm" id="rs-n">Giữ lại</button></div>';
    $("#rs-y").onclick=()=>{ans={};store.set("ans",ans);rebuild()};$("#rs-n").onclick=practice};
  bindReport(BODY)}
document.addEventListener("keydown",e=>{if(/TEXTAREA|SELECT|INPUT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey||$("#pn-dlg").open)return;const k=e.key.toLowerCase(),i="abcd".indexOf(k);
  if(view==="luyentap"&&st.list.length){const q=byKey[st.list[st.i]];
    if(k==="arrowright"&&st.i<st.list.length-1){st.i++;practice()}else if(k==="arrowleft"&&st.i>0){st.i--;practice()}
    else if(i>=0&&i<q.o.length&&ans[q.key]===undefined){ans[q.key]=i;store.set("ans",ans);practice()}}
  else if(view==="thithu"&&exam&&!exam.done){const q=byKey[exam.ids[exI]];
    if(k==="arrowright"&&exI<exam.ids.length-1){exI++;examRun()}else if(k==="arrowleft"&&exI>0){exI--;examRun()}
    else if(i>=0&&q&&i<q.o.length){exam.c[q.key]=i;store.set("exam",exam);examRun()}}});

/* ---------- Tình huống ---------- */
let drafts=store.get("drafts",{}),opened=store.get("opened",{}),cg="";
const CASES=[];(D.th||[]).forEach((t,gi)=>t.items.forEach((c,i)=>CASES.push(Object.assign({},c,{id:(gi+1)+"."+(i+1),g:gi+1,gname:t.name}))));
R.tinhhuong=function(){
  CTRL.innerHTML=head("tinhhuong",HASCASEQ?"Mỗi tình huống là một vụ việc; các câu hỏi nối tiếp nhau theo trình tự giải: xác định vấn đề → áp dụng quy định vào dữ kiện → kết luận → hướng xử lý. Chọn đáp án để xem ngay đúng hay sai, kèm giải thích và căn cứ pháp lý."+(CASES.some(c=>(c.guide||[]).length)?" Sau đó tự giải phần <b>Yêu cầu</b> vào ô nháp rồi bấm <b>Xem hướng dẫn giải</b> để đối chiếu.":"")+" Kết quả lưu trên trình duyệt của bạn.":"Tự giải theo trình tự: xác định vấn đề pháp lý, nêu căn cứ (điều, khoản), áp dụng vào dữ kiện, kết luận. Ghi bài làm vào ô nháp rồi bấm <b>Xem hướng dẫn giải</b> để đối chiếu. Bài nháp chỉ lưu trên trình duyệt của bạn.")+
  `<div class="toolbar"><div class="chips" id="c-group"><button type="button" class="chip" data-g="" aria-pressed="${!cg}">Tất cả</button>${(D.th||[]).map((t,i)=>`<button type="button" class="chip" data-g="${i+1}" aria-pressed="${cg==String(i+1)}">${/^Chương/.test(t.name)?esc(t.name):"Nhóm "+(i+1)+". "+esc(t.name)}</button>`).join("")}</div></div>
  <div class="toolbar"><label class="lab" for="c-jump">Chuyển nhanh</label><select id="c-jump"></select></div><div class="stats" id="c-stats"></div>`;
  $$("#c-group .chip").forEach(b=>b.onclick=()=>{cg=b.dataset.g;$$("#c-group .chip").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));cases()});
  cases()};
function cases(){const list=CASES.filter(c=>!cg||c.g==cg);
  const cqk=list.flatMap(c=>(c.mcq||[]).map(id=>byId[id]).filter(Boolean).map(q=>q.key));
  $("#c-stats").innerHTML=`<span>Tình huống <b>${list.length}</b></span>${cqk.length?`<span>Đã làm <b>${cqk.filter(k=>ans[k]!==undefined).length}</b>/${cqk.length} câu, đúng <b>${cqk.filter(k=>isRight(byKey[k],ans[k])).length}</b></span>`:""}${list.some(c=>(c.guide||[]).length)?`<span>Đã xem hướng dẫn <b>${list.filter(c=>opened[c.id]).length}</b>/${list.length}</span>`:""}`;
  $("#c-jump").innerHTML='<option value="">— Chọn tình huống —</option>'+list.map(c=>`<option value="${c.id}">${c.id}. ${esc(c.title)}</option>`).join("");
  $("#c-jump").onchange=e=>{const el=document.getElementById("case-"+e.target.value.replace(".","-"));if(el)el.scrollIntoView({behavior:"smooth",block:"start"})};
  BODY.innerHTML=list.map(c=>{const k=c.id.replace(".","-");return `<article class="case" id="case-${k}">
    <h3>Tình huống ${c.id}. ${esc(c.title)}${opened[c.id]?'<span class="done">Đã đối chiếu</span>':""}</h3>
    <p style="white-space:pre-line">${esc(c.text)}</p>
    ${(c.mcq||[]).length?`<div class="cqs">${c.mcq.map((id,j)=>{const q=byId[id];return q?`<div class="cq" data-qk="${esc(q.key)}" data-num="Câu ${j+1}">${qHTML(q,ans[q.key],"case","Câu "+(j+1))}</div>`:""}).join("")}</div>`:""}
    ${(c.ask||[]).length?`<div class="q-list"><span class="lab">Yêu cầu</span><ol>${c.ask.map(a=>`<li>${esc(a)}</li>`).join("")}</ol></div>
    <label class="draft-label" for="d-${k}">Bài làm nháp</label><textarea id="d-${k}" data-id="${c.id}" placeholder="Vấn đề pháp lý → Căn cứ → Áp dụng → Kết luận">${esc(drafts[c.id]||"")}</textarea>`:""}
    <div class="case-actions">${(c.guide||[]).length?`<button type="button" class="btn primary" data-toggle="${c.id}" aria-expanded="false">Xem hướng dẫn giải</button><span class="saved" data-saved="${c.id}"></span>`:""}<span style="flex:1"></span><button type="button" class="linkbtn report-btn" data-report="Tình huống ${c.id}" data-text="${esc(c.title+"\n"+c.text)}">Báo lỗi tình huống</button></div>
    ${(c.guide||[]).length?`<div class="answer" data-ans="${c.id}" hidden><h4>Hướng dẫn giải</h4><ul>${c.guide.map(x=>`<li style="white-space:pre-line">${esc(x)}</li>`).join("")}</ul>${c.basis?`<p class="basis"><b>Căn cứ chính:</b> ${lawHTML(c.basis)}</p>`:""}</div>`:""}</article>`}).join("");
  const bindCq=box=>{$$(".opt",box).forEach(b=>b.onclick=()=>{const key=box.dataset.qk;if(ans[key]!==undefined)return;ans[key]=+b.dataset.v;store.set("ans",ans);box.innerHTML=qHTML(byKey[key],ans[key],"case",box.dataset.num)+`<p style="margin:8px 0 0"><button type="button" class="linkbtn" data-redo>Làm lại câu này</button></p>`;bindCq(box);bindReport(box)});
    const rd=$("[data-redo]",box);if(rd)rd.onclick=()=>{delete ans[box.dataset.qk];store.set("ans",ans);box.innerHTML=qHTML(byKey[box.dataset.qk],undefined,"case",box.dataset.num);bindCq(box)}};
  $$(".cq",BODY).forEach(bindCq);
  $$("textarea",BODY).forEach(t=>{let tm;t.oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>{drafts[t.dataset.id]=t.value;store.set("drafts",drafts);const s=$(`[data-saved="${t.dataset.id}"]`);if(s)s.textContent="Đã lưu nháp"},400)}});
  $$("[data-toggle]",BODY).forEach(b=>b.onclick=()=>{const id=b.dataset.toggle,a=$(`[data-ans="${id}"]`);a.hidden=!a.hidden;b.setAttribute("aria-expanded",String(!a.hidden));b.textContent=a.hidden?"Xem hướng dẫn giải":"Ẩn hướng dẫn giải";if(!a.hidden&&!opened[id]){opened[id]=1;store.set("opened",opened)}});
  bindReport(BODY)}

/* ---------- Văn bản, án lệ ---------- */
R.vanban=function(){
  CTRL.innerHTML=head("vanban","Văn bản quy phạm pháp luật và án lệ dùng để trả lời câu hỏi, giải tình huống. Bấm <b>Đọc</b> để mở văn bản ở thẻ mới; nên đối chiếu bản đã cập nhật các lần sửa đổi, bổ sung.")+
  `<div class="toolbar"><input type="search" id="law-q" placeholder="Tìm văn bản, số án lệ hoặc nội dung (ví dụ: đặt cọc, thừa kế, 2022)" aria-label="Tìm văn bản hoặc án lệ"></div>`;
  const draw=term=>{const t=(term||"").trim().toLowerCase(),m=s=>!t||s.toLowerCase().includes(t);
    const go=u=>u?`<a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener">Đọc ↗</a>`:"";
    let h=(D.vb||[]).map(sec=>{const rows=sec.rows.filter(r=>m([r.t,r.d,r.org,r.note].join(" ")));if(!rows.length)return "";
      return `<h2>${esc(sec.name)}</h2><div class="tbl"><table><thead><tr><th>STT</th><th>Tên văn bản</th><th>Ngày ban hành</th><th>Ghi chú</th><th></th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td class="num">${i+1}</td><td>${esc(r.t)}<br><small style="color:var(--muted)">${esc(r.org||"")}</small></td><td class="date">${esc(r.d||"")}</td><td>${esc(r.note||"")}</td><td>${go(r.url)}</td></tr>`).join("")}</tbody></table></div>`}).join("");
    const al=(D.al||[]).filter(a=>m([a.so,a.nd,a.lv].join(" ")));
    if(al.length)h+=`<h2>Án lệ tham khảo (${al.length})</h2><div class="tbl"><table><thead><tr><th>Số án lệ</th><th>Nội dung</th><th>Lĩnh vực</th><th></th></tr></thead><tbody>${al.map(a=>`<tr><td class="date">${esc(a.so)}</td><td>${esc(a.nd)}</td><td>${esc(a.lv||"")}</td><td>${go(a.url)}</td></tr>`).join("")}</tbody></table></div>`;
    BODY.innerHTML=`<div class="law">${h||'<p class="empty">Không tìm thấy văn bản hoặc án lệ phù hợp.</p>'}</div>`};
  $("#law-q").oninput=e=>draw(e.target.value);draw("")};

/* ---------- Tóm tắt lý thuyết ---------- */
R.tomtat=function(){
  const K=D.ly,ix={},order=[];
  CTRL.innerHTML=head("tomtat",`Sơ đồ ý chính toàn học phần theo bài giảng. Bấm vào một ý để đọc nội dung và cơ sở pháp lý ở khung bên cạnh. Dùng <b>Mục lục</b> hoặc nút <b>Mục trước / Mục sau</b> để chuyển nhanh giữa các mục mà không phải quay lại từ đầu.`)+
    `<div class="kbar"><label class="lab" for="k-jump">Mục lục</label><select id="k-jump"></select></div><div class="kbar"><button type="button" class="btn ghost sm" id="kn-open">Mở tất cả các nhánh</button><button type="button" class="btn ghost sm" id="kn-close">Thu gọn</button></div>`;
  const col=i=>`var(--b${i%7+1})`,cols=i=>`var(--b${i%7+1}s)`;
  function li(n,id,path,ci,parent){ix[id]={n,path,ci,parent};order.push(id);
    const kids=n.c?`<ul hidden>${n.c.map((x,j)=>li(x,id+"."+j,path.concat(n.t),ci,id)).join("")}</ul>`:"";
    return `<li><button type="button" class="kn${id.split(".").length===1?" chn":""}${n.c?" par":""}" data-n="${id}"${n.c?' aria-expanded="false"':""}>${esc(n.t)}</button>${kids}</li>`}
  const tree=K.ch.map((c,i)=>`<li style="--bc:${col(i)};--bcs:${cols(i)}">${li(c,String(i),[],i,null).slice(4,-5)}</li>`).join("");
  if(K.upd){ix.upd={n:K.upd,path:["Ghi chú biên tập"],ci:-1,parent:null};order.push("upd")}
  BODY.innerHTML=`<div class="kt"><div class="ktree"><button type="button" class="kroot" data-n="root">${esc(K.root)}</button><ul>${tree}${K.upd?`<li style="--bc:var(--seal);--bcs:var(--seal-soft)"><button type="button" class="kn upd" data-n="upd">${esc(K.upd.t)}</button></li>`:""}</ul></div><aside class="kp" id="kp" aria-live="polite"></aside></div>`;
  $("#k-jump").innerHTML='<option value="root">— Toàn học phần —</option>'+order.map(id=>{const d=id==="upd"?0:id.split(".").length-1;return `<option value="${id}">${"   ".repeat(d)}${d?"· ":""}${esc(ix[id].n.t)}</option>`}).join("");
  const kp=$("#kp");
  const setOpen=(btn,o)=>{const ul=btn.nextElementSibling;if(ul&&ul.tagName==="UL"){ul.hidden=!o;btn.setAttribute("aria-expanded",String(o))}};
  function showN(id,scroll){
    const btn=$(`[data-n="${id}"]`,BODY);$$(".kn[aria-current]",BODY).forEach(x=>x.removeAttribute("aria-current"));$("#k-jump").value=id;store.set("ly-last",id);
    if(id==="root"){kp.style.setProperty("--bc","var(--acc)");kp.innerHTML=`<div class="crumb">Học phần</div><h3>${esc(M.name)}</h3><p class="kintro">Sơ đồ ý chính ${K.ch.length} chương theo đề cương. Bấm vào một ý để xem nội dung ở khung này.</p><div class="kgroup"><span class="lab">Các chương</span><div class="kids">${K.ch.map((c,i)=>`<button type="button" class="chip" data-go="${i}">${esc(c.t)}</button>`).join("")}</div></div><div class="knav"><span></span>${order.length?`<button type="button" class="btn sm" data-go="${order[0]}"><span>${esc(ix[order[0]].n.t)}</span> →</button>`:""}</div>`}
    else{const {n,path,ci,parent}=ix[id];btn.setAttribute("aria-current","true");
      let p=btn.parentElement.parentElement;while(p&&p.tagName==="UL"&&!p.parentElement.classList.contains("ktree")){p.hidden=false;const b=p.previousElementSibling;b&&b.setAttribute("aria-expanded","true");p=p.parentElement.parentElement}
      setOpen(btn,true);kp.style.setProperty("--bc",ci<0?"var(--seal)":col(ci));
      const sib=id==="upd"?[]:(parent==null?K.ch.map((_,j)=>String(j)):ix[parent].n.c.map((_,j)=>parent+"."+j));
      const k=order.indexOf(id),prev=k>0?order[k-1]:"root",next=k<order.length-1?order[k+1]:null;
      kp.innerHTML=`<div class="crumb">${esc(path.join(" › ")||"Chương")}</div><h3>${esc(n.t)}</h3>${n.b&&n.b.length?`<ul>${n.b.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}${n.cs?`<p class="kcs"><b>Cơ sở pháp lý:</b> ${lawHTML(n.cs)}</p>`:""}
      ${n.c?`<div class="kgroup"><span class="lab">Ý con</span><div class="kids">${n.c.map((x,j)=>`<button type="button" class="chip" data-go="${id}.${j}">${esc(x.t)}</button>`).join("")}</div></div>`:""}
      ${sib.length>1?`<div class="kgroup"><span class="lab">Cùng cấp</span><div class="kids">${sib.map(s=>`<button type="button" class="chip" data-go="${s}" ${s===id?'aria-current="true"':""}>${esc(ix[s].n.t)}</button>`).join("")}</div></div>`:""}
      <div class="knav"><button type="button" class="btn sm" data-go="${prev}">← <span>${esc(prev==="root"?"Toàn học phần":ix[prev].n.t)}</span></button>${next?`<button type="button" class="btn sm" data-go="${next}"><span>${esc(ix[next].n.t)}</span> →</button>`:"<span></span>"}</div>
      <div class="knav" style="border:0;padding-top:4px"><span></span><button type="button" class="linkbtn report-btn" data-report="Tóm tắt: ${esc(path.concat(n.t).join(" › "))}" data-text="${esc((n.b||[]).join("\n")+"\nCơ sở pháp lý: "+(n.cs||""))}">Báo lỗi mục này</button></div>`}
    $$("[data-go]",kp).forEach(b=>b.onclick=()=>showN(b.dataset.go,true));bindReport(kp);
    if(scroll&&window.matchMedia("(max-width:760px)").matches)kp.scrollIntoView({behavior:"smooth",block:"start"})}
  $$("[data-n]",BODY).forEach(b=>b.onclick=()=>{const id=b.dataset.n;
    if(id!=="root"&&b.getAttribute("aria-current")==="true"&&b.classList.contains("par")){setOpen(b,b.getAttribute("aria-expanded")!=="true");return}showN(id,true)});
  $("#k-jump").onchange=e=>showN(e.target.value,true);
  $("#kn-open").onclick=()=>$$(".kn.par",BODY).forEach(b=>setOpen(b,true));$("#kn-close").onclick=()=>$$(".kn.par",BODY).forEach(b=>setOpen(b,false));
  const last=store.get("ly-last","root");showN(last in ix?last:"root",false)};

/* ---------- Lịch sử làm bài ---------- */
R.lichsu=function(){
  const hist=store.get("hist",[]),vs=store.get("visits",{n:1});
  const done=Object.keys(ans).filter(k=>byKey[k]),right=done.filter(k=>isRight(byKey[k],ans[k]));
  CTRL.innerHTML=head("lichsu","Lịch sử truy cập và các bài thi thử được lưu trên trình duyệt của thiết bị này (không cần đăng nhập). Bấm <b>Xem lại</b> để mở lại toàn bộ bài làm kèm đáp án, giải thích và căn cứ pháp lý.")+
    `<div class="stats"><span>Số lần truy cập <b>${vs.n||1}</b></span>${vs.prev?`<span>Lần trước <b>${fmtWhen(vs.prev)}</b></span>`:""}<span>Bài thi đã nộp <b>${hist.length}</b></span><span>Luyện tập <b>${done.length}</b>/${Q.length} câu, đúng <b>${right.length}</b></span></div>`;
  const perG=GROUPS.map(g=>{const ks=Q.filter(q=>q.g===g.n).map(q=>q.key),d=ks.filter(k=>ans[k]!==undefined);return {g,n:ks.length,d:d.length,r:d.filter(k=>isRight(byKey[k],ans[k])).length}});
  BODY.innerHTML=`<div class="grid-title" style="margin-top:0">Các bài thi thử đã nộp</div>
  ${hist.length?`<div class="tbl"><table><thead><tr><th>Thời điểm</th><th>Điểm</th><th>Đúng</th><th>Thời gian</th><th>Phạm vi</th><th></th></tr></thead><tbody>${hist.map((x,i)=>`<tr><td class="date">${fmtWhen(x.t)}</td><td class="num"><b>${grade10(x.r,x.n)}</b></td><td class="num">${x.r}/${x.n}</td><td class="num">${fmtTime(x.used)} / ${x.min} phút</td><td>${x.cfg?esc((x.cfg.lv||[]).map(l=>LV[l]).join(", ")+" · "+(x.cfg.groups||[]).length+" chương"):""}</td><td><button type="button" class="btn sm" data-h="${i}">Xem lại</button></td></tr>`).join("")}</tbody></table></div>
  <div class="nav-row"><span></span><div id="hclr"><button type="button" class="btn ghost sm" id="hc">Xóa lịch sử thi thử</button></div></div>`:'<div class="card empty">Chưa có bài thi thử nào. Vào mục <b>Thi thử</b> để làm bài.</div>'}
  <div class="grid-title">Tiến độ luyện tập theo chương</div>
  <div class="tbl"><table><thead><tr><th>Chương</th><th>Đã làm</th><th>Đúng</th></tr></thead><tbody>${perG.map(x=>`<tr><td>Chương ${x.g.n}. ${esc(x.g.name)}</td><td class="num">${x.d}/${x.n}<span class="meter"><i style="width:${x.n?x.d*100/x.n:0}%"></i></span></td><td class="num">${x.r}</td></tr>`).join("")}</tbody></table></div>`;
  $$("[data-h]",BODY).forEach(b=>b.onclick=()=>{const x=hist[+b.dataset.h];reviewFilter="all";examResult({ids:x.ids,c:x.c,used:x.used,min:x.min,start:x.t,t:x.t},false);scrollTo(0,0)});
  if($("#hc"))$("#hc").onclick=()=>{$("#hclr").innerHTML='<div class="confirm">Xóa toàn bộ lịch sử thi thử? <button type="button" class="btn danger sm" id="hy">Xóa</button><button type="button" class="btn ghost sm" id="hn">Giữ lại</button></div>';$("#hy").onclick=()=>{store.set("hist",[]);R.lichsu()};$("#hn").onclick=R.lichsu}};

/* ---------- Báo lỗi, góp ý (gửi về email giảng viên) ---------- */
let lastSent=0;
function report(ctx){
  const dlg=$("#pn-dlg");ctx=ctx||{kind:"Học phần",ref:M.name,text:""};
  const TYPES=ctx.kind==="Câu hỏi"?["Nhầm lẫn điều, khoản hoặc căn cứ pháp lý","Không có đáp án đúng / đáp án trên web sai","Có hơn một đáp án đúng","Câu hỏi hoặc phương án khó hiểu","Lỗi chính tả, trình bày","Khác"]:["Sai nội dung, sai căn cứ pháp lý","Văn bản đã hết hiệu lực hoặc link không mở được","Lỗi hiển thị, không dùng được chức năng","Góp ý cải thiện","Khác"];
  dlg.innerHTML=`<form method="dialog" id="rp-f" novalidate><h2>Báo lỗi, góp ý</h2>
    <div class="ctx"><b>Học phần:</b> ${esc(M.name)}<br><b>${esc(ctx.kind)}:</b> ${esc(ctx.ref)}${ctx.text?`<br><span style="white-space:pre-line">${esc(ctx.text.slice(0,600))}</span>`:""}</div>
    <div class="types">${TYPES.map((t,i)=>`<label><input type="radio" name="rp-t" value="${esc(t)}" ${i===0?"checked":""}><span>${esc(t)}</span></label>`).join("")}</div>
    <label class="lab" for="rp-m">Mô tả lỗi hoặc đề xuất sửa (ví dụ: đúng phải là khoản 2 Điều 132)</label><textarea id="rp-m" maxlength="2000" required></textarea>
    <label class="lab" for="rp-n">Họ tên, lớp (không bắt buộc)</label><input type="text" id="rp-n" maxlength="80" autocomplete="name">
    <div class="err" id="rp-err" role="alert"></div>
    <div class="acts"><button type="button" class="btn ghost" id="rp-x">Đóng</button><button type="submit" class="btn primary" id="rp-s">Gửi cho giảng viên</button></div></form>`;
  dlg.showModal();$("#rp-m").focus();
  $("#rp-x").onclick=()=>dlg.close();
  $("#rp-f").onsubmit=async e=>{e.preventDefault();const msg=$("#rp-m").value.trim();
    if(msg.length<5){$("#rp-err").textContent="Viết vài dòng mô tả lỗi trước khi gửi.";return}
    if(Date.now()-lastSent<20000){$("#rp-err").textContent="Bạn vừa gửi; vui lòng đợi ít giây rồi gửi tiếp.";return}
    const type=($("input[name=rp-t]:checked")||{}).value||"";
    const body={_subject:`[Phúc Nguyên Library] Báo lỗi ${M.name} – ${ctx.ref}`,_template:"box",_captcha:"false",
      "Học phần":M.name,"Vị trí":ctx.kind+": "+ctx.ref,"Loại lỗi":type,"Mô tả":msg,"Người gửi":$("#rp-n").value.trim()||"(không ghi tên)","Nội dung đang xem":ctx.text||"","Trang":location.href,"Thời điểm":fmtWhen(Date.now())};
    const btn=$("#rp-s");btn.disabled=true;btn.textContent="Đang gửi…";$("#rp-err").textContent="";
    let ok=false;try{const r=await fetch(REPORT_URL,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));ok=r.ok&&String(j.success)==="true"}catch(err){ok=false}
    if(ok){lastSent=Date.now();dlg.querySelector("form").innerHTML='<h2>Đã gửi</h2><p class="ok">Cảm ơn bạn! Báo lỗi đã được gửi tới giảng viên để kiểm tra và sửa.</p><div class="acts"><button type="button" class="btn primary" id="rp-x2">Đóng</button></div>';$("#rp-x2").onclick=()=>dlg.close()}
    else{btn.disabled=false;btn.textContent="Gửi lại";
      const mail="mailto:"+REPORT_TO+"?subject="+encodeURIComponent(body._subject)+"&body="+encodeURIComponent(Object.entries(body).filter(([k])=>k[0]!=="_").map(([k,v])=>k+": "+v).join("\n"));
      $("#rp-err").innerHTML=`Chưa gửi được qua web. Bấm <a href="${mail}">gửi bằng email</a> (nội dung đã điền sẵn).`}}}
$("#pn-report-general").onclick=()=>report({kind:"Mục",ref:(VIEWS.find(v=>v[0]===view)||["","Chung"])[1],text:""});

/* ---------- Khởi động ---------- */
const h0=(location.hash||"").slice(1);show(R[h0]?h0:store.get("tab","thithu"),true);
})();
