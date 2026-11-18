"use strict";
/* PHÚC NGUYÊN LIBRARY — Ra đề đánh giá định kỳ từ Ngân hàng câu hỏi (18/11/2026), theo cách Azota:
   ma trận chương × mức độ (Nhận biết / Thông hiểu / Vận dụng), số tình huống, đề chung hoặc mỗi sinh viên một đề, đảo câu, đảo phương án.
   Ghi khi lưu:
     pnl_dg_de/{mã lớp}   đề nguồn KHÔNG kèm đáp án {hp, hpTen, kieu, tronCau, tronDA, mt[], thSo, thCau, q{qid:{q,o,g,lv,c?}}, cs{tid:{t,x,g,m[]}}, fixed?}
   pnl_dg_dap/{mã lớp}  đáp án, căn cứ, giải thích, mã câu gốc trong ngân hàng (chỉ quản trị — dùng khi chấm, xem bài)
     pnl_dg_lop/{mã lớp}  hocPhan:"nh", hocPhanTen, thoiGian, deNh (mô tả)
   Sinh viên làm bài ở trang danh-gia/ như cũ (mã lớp + mã SV); trang đó rút đề theo ma trận khi bắt đầu. */
const DT={st:{},bai:{}};
const DT_LV=["NB","TH","VD"];
function dtState(l){const ma=l.id;if(DT.st[ma])return DT.st[ma];const c=(l.deNh&&l.deNh.cfg)||{};const hps=lopHps(l);
  return DT.st[ma]=Object.assign({hp:hps[0]||"",nguon:"all",kieu:"rieng",tronCau:true,tronDA:true,tg:+l.thoiGian||40,mt:{},thSo:0,thCau:0,thChs:[],tong:30,tl:[30,40,30]},c)}
/* câu, tình huống dùng được: đã duyệt, đủ 4 phương án + đáp án, đã xếp chương; lọc theo nguồn (kín / ôn tập) */
function dtElig(hp,nguon){const all=NH.byHp[hp]||[];const ok=x=>nguon==="kin"?!!x.kin:nguon==="on"?!x.kin:true;
  const cases={};all.filter(x=>x.kieu==="th"&&x.st==="duyet"&&(x.ch|0)>0&&x.text&&ok(x)).forEach(c=>cases[c.id]={c,q:[]});
  const lt=[];all.filter(x=>nhIsQ(x)&&x.st==="duyet"&&nhValid(x)&&(x.ch|0)>0).forEach(x=>{if(x.th){if(cases[x.th])cases[x.th].q.push(x)}else if(ok(x))lt.push(x)});
  Object.values(cases).forEach(v=>v.q.sort(nhByOrd));return {lt,cs:Object.values(cases).filter(v=>v.q.length)}}
const dtCnt=(E,ch,lv)=>E.lt.filter(x=>(x.ch|0)===ch&&x.lv===lv).length;
function dtShuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function dtChs(st,E){const c=(NH.chs[st.hp]||[]).map(x=>x.n);const s=new Set(c.concat(E.lt.map(x=>x.ch|0),E.cs.map(v=>v.c.ch|0)));return [...s].filter(Boolean).sort((a,b)=>a-b)}
function dtTong(st){let n=0;Object.values(st.mt).forEach(r=>DT_LV.forEach(k=>n+=+r[k]||0));return n}
function dtCsPool(st,E){return E.cs.filter(v=>!st.thChs.length||st.thChs.includes(v.c.ch|0))}
function dtCauTH(st,E){const pool=dtCsPool(st,E);if(!st.thSo||!pool.length)return [0,0];const ns=pool.map(v=>st.thCau>0?Math.min(st.thCau,v.q.length):v.q.length).sort((a,b)=>a-b);
  return [ns.slice(0,st.thSo).reduce((a,b)=>a+b,0),ns.slice(-st.thSo).reduce((a,b)=>a+b,0)]}
/* chia tổng số câu theo tỉ lệ mức độ rồi theo số câu sẵn có của từng chương (phần dư lớn nhất), không vượt số sẵn có */
function dtChia(st,E){const chs=dtChs(st,E);const thieu=[];const sum=st.tl.reduce((a,b)=>a+(+b||0),0)||100;const mt={};chs.forEach(c=>mt[c]={NB:0,TH:0,VD:0});
  DT_LV.forEach((lv,i)=>{let need=Math.round(st.tong*(+st.tl[i]||0)/sum);const av=chs.map(c=>({c,n:dtCnt(E,c,lv)})).filter(x=>x.n>0);
    for(let guard=0;need>0&&av.length&&guard<50;guard++){const free=av.filter(x=>mt[x.c][lv]<x.n);if(!free.length)break;const tot=free.reduce((a,x)=>a+(x.n-mt[x.c][lv]),0);
      const sh=free.map(x=>{const f=need*(x.n-mt[x.c][lv])/tot;return {x,f,k:Math.min(Math.floor(f),x.n-mt[x.c][lv])}});let used=0;sh.forEach(s=>{mt[s.x.c][lv]+=s.k;used+=s.k});need-=used;
      if(need>0){sh.sort((a,b)=>(b.f-Math.floor(b.f))-(a.f-Math.floor(a.f)));for(const s of sh){if(need<=0)break;if(mt[s.x.c][lv]<s.x.n){mt[s.x.c][lv]++;need--}}}}
    if(need>0)thieu.push(need+" câu "+LVN[lv]+" (ngân hàng chỉ có "+av.reduce((a,x)=>a+x.n,0)+" câu lý thuyết mức này)")});
  st.mt=mt;st.thieu=thieu.length?"Chưa đủ tỉ lệ: thiếu "+thieu.join("; ")+". Có thể tăng mức khác, thêm tình huống (câu tình huống ở mức Vận dụng) hoặc bổ sung câu vào ngân hàng.":""}
/* rút một đề (dùng cho xem thử và đề chung) — cùng cách trang làm bài rút đề */
function dtDraw(st,E){const lt=[],used=new Set();
  Object.entries(st.mt).forEach(([ch,r])=>DT_LV.forEach(lv=>{const n=+r[lv]||0;if(!n)return;const p=dtShuffle(E.lt.filter(x=>(x.ch|0)===+ch&&x.lv===lv&&!used.has(x.id)));
    if(p.length<n)throw new Error("Chương "+ch+" chỉ có "+p.length+" câu "+LVN[lv]+" (cần "+n+").");p.slice(0,n).forEach(x=>{used.add(x.id);lt.push(x)})}));
  const pool=dtCsPool(st,E);const k=+st.thSo||0;if(pool.length<k)throw new Error("Chỉ có "+pool.length+" tình huống phù hợp (cần "+k+").");
  const by={};pool.forEach(v=>(by[v.c.ch]=by[v.c.ch]||[]).push(v));const picked=[];for(const g of dtShuffle(Object.keys(by))){if(picked.length>=k)break;picked.push(dtShuffle(by[g])[0])}
  const rest=dtShuffle(pool.filter(v=>!picked.includes(v)));while(picked.length<k&&rest.length)picked.push(rest.pop());
  const th=picked.map(v=>({c:v.c,q:st.thCau>0?v.q.slice(0,st.thCau):v.q.slice()}));
  return {lt:st.tronCau?dtShuffle(lt):lt,th:st.tronCau?dtShuffle(th):th}}
function dtMota(st,E){const n=dtTong(st),[a,b]=dtCauTH(st,E);const lv=DT_LV.map(k=>Object.values(st.mt).reduce((s,r)=>s+(+r[k]||0),0));
  return `${n} câu lý thuyết (${lv.map((x,i)=>x+" "+LVN[DT_LV[i]].toLowerCase()).join(", ")})${st.thSo?` và ${st.thSo} tình huống (${a===b?a:a+"–"+b} câu)`:""}; ${st.kieu==="chung"?"một đề chung cho cả lớp":"mỗi sinh viên một đề rút ngẫu nhiên theo ma trận"}${st.tronCau?", đảo thứ tự câu":""}${st.tronDA?", đảo phương án":""}; ${st.tg} phút.`}

async function tabDeThi(l,head,ma){const st=dtState(l);const hps=lopHps(l);
  if(!hps.length)return `${head}<div class="empty">Lớp chưa gán học phần — bấm <b>Sửa lớp</b> để chọn học phần trước khi ra đề.</div>`;
  if(!hps.includes(st.hp))st.hp=hps[0];
  try{await nhChapters(st.hp);await nhLoad(st.hp);if(!NH.synced[st.hp])await nhSyncOnce(st.hp)}catch(x){if(nhDenied(x))return `${head}${nhRulesBox()}`;return `${head}<div class="empty">Chưa tải được ngân hàng: ${esc(errMsg(x))}</div>`}
  try{const q=await S.fs.collection("pnl_dg_bai").where("maLop","==",ma).get();DT.bai[ma]=q.size}catch(e){DT.bai[ma]=0}
  const nb=DT.bai[ma],khoa=nb>0;const E=dtElig(st.hp,st.nguon);const chs=dtChs(st,E);const tong=dtTong(st),[a,b]=dtCauTH(st,E);
  const cur=l.hocPhan==="nh"&&l.deNh?`<div class="scard" style="border-color:#bfe3cb;background:var(--ok-soft)"><b>Đề đang dùng:</b> ${esc(l.deNh.hpTen||"")} — ${esc(l.deNh.mota||"")}${khoa?` <span class="pill">${nb} bài đã làm</span>`:""}</div>`
    :l.hocPhan&&l.hocPhan!=="nh"?`<div class="scard" style="border-color:var(--warn);background:var(--warn-soft)"><b>Lớp đang dùng đề cũ của trang Đánh giá định kỳ</b> (${esc(l.hocPhanTen||l.hocPhan)}).${khoa?` Đã có ${nb} bài làm theo đề này nên <b>không đổi được</b> — muốn dùng đề từ ngân hàng, tạo lớp mới (hoặc đợt mới) cho lớp này.`:" Lưu đề dưới đây thì lớp chuyển sang đề rút từ ngân hàng câu hỏi."}</div>`:"";
  const lock=khoa?" disabled":"";const opt=(v,t,c)=>`<option value="${esc(v)}"${String(c)===String(v)?" selected":""}>${esc(t)}</option>`;
  const cell=(ch,lv)=>{const n=dtCnt(E,ch,lv),v=(st.mt[ch]||{})[lv]||0;return `<td><input type="number" min="0" max="${n}" value="${v||""}" placeholder="0" data-mt="${ch}|${lv}" class="dtn${v>n?" bad":""}"${lock}${n?"":" disabled"}><small>/ ${n}</small></td>`};
  const csCh=[...new Set(E.cs.map(v=>v.c.ch|0))].sort((x,y)=>x-y);
  return `${head}${cur}
  <div class="scard"><div class="row2" style="grid-template-columns:2fr 1.3fr 1fr 1fr">
    <div class="fld"><label for="dt-hp">Học phần ra đề</label><select id="dt-hp"${lock}>${hps.map(h=>opt(h,courseOf(h)?.name||h,st.hp)).join("")}</select></div>
    <div class="fld"><label for="dt-ng">Nguồn câu (đã duyệt)</label><select id="dt-ng"${lock}>${opt("all","Tất cả câu đã duyệt",st.nguon)}${opt("kin","Chỉ câu kín (dành cho ĐGĐK)",st.nguon)}${opt("on","Chỉ câu ôn tập (không kín)",st.nguon)}</select></div>
    <div class="fld"><label for="dt-kieu">Kiểu đề</label><select id="dt-kieu"${lock}>${opt("rieng","Mỗi SV một đề (rút theo ma trận)",st.kieu)}${opt("chung","Một đề chung cả lớp",st.kieu)}</select></div>
    <div class="fld"><label for="dt-tg">Thời gian (phút)</label><input id="dt-tg" type="number" min="5" max="180" value="${st.tg}"${lock}></div></div>
    <div style="display:flex;gap:18px;flex-wrap:wrap"><label style="font-weight:500"><input type="checkbox" id="dt-tc"${st.tronCau?" checked":""}${lock}> Đảo thứ tự câu</label><label style="font-weight:500"><input type="checkbox" id="dt-td"${st.tronDA?" checked":""}${lock}> Đảo thứ tự phương án</label></div></div>
  <section class="scard"><h2 class="sec" style="margin-top:0">1. Ma trận câu lý thuyết <span class="t-sub" style="font-weight:400">(số câu / số câu đã duyệt sẵn có)</span></h2>
    <div class="tools" style="align-items:center"><span class="t-sub">Chia nhanh:</span><input id="dt-tong" type="number" min="0" max="200" value="${st.tong}" style="width:80px" aria-label="Tổng số câu lý thuyết"${lock}><span class="t-sub">câu, tỉ lệ NB/TH/VD</span>
      ${st.tl.map((v,i)=>`<input type="number" min="0" max="100" value="${v}" data-tl="${i}" style="width:62px" aria-label="Tỉ lệ ${LVN[DT_LV[i]]}"${lock}>`).join("")}<span class="t-sub">%</span><button type="button" class="btn sm" data-chia${lock}>Chia theo ngân hàng</button><button type="button" class="btn sm" data-xoa${lock}>Xóa ma trận</button></div>
    <div class="tbl"><table class="nht dtm"><thead><tr><th>Chương</th>${DT_LV.map(k=>`<th>${LVN[k]}</th>`).join("")}<th>Cộng</th></tr></thead><tbody>
    ${chs.map(ch=>`<tr><td>${esc(nhChName(st.hp,ch))}</td>${DT_LV.map(lv=>cell(ch,lv)).join("")}<td><b>${DT_LV.reduce((s,lv)=>s+(+((st.mt[ch]||{})[lv])||0),0)}</b></td></tr>`).join("")||`<tr><td colspan="5" class="empty" style="border:0">Ngân hàng học phần này chưa có câu đã duyệt.</td></tr>`}
    <tr><td><b>Cộng</b></td>${DT_LV.map(lv=>`<td><b>${Object.values(st.mt).reduce((s,r)=>s+(+r[lv]||0),0)}</b></td>`).join("")}<td><b>${tong}</b></td></tr></tbody></table></div></section>
  <section class="scard"><h2 class="sec" style="margin-top:0">2. Tình huống <span class="t-sub" style="font-weight:400">(${E.cs.length} tình huống đã duyệt có câu ABCD)</span></h2>
    <div class="row2" style="grid-template-columns:1fr 1fr 2fr"><div class="fld"><label for="dt-ths">Số tình huống mỗi đề</label><input id="dt-ths" type="number" min="0" max="${E.cs.length}" value="${st.thSo}"${lock}></div>
      <div class="fld"><label for="dt-thc">Số câu tối đa mỗi tình huống</label><input id="dt-thc" type="number" min="0" max="20" value="${st.thCau}"${lock}><span class="hint">0 = lấy đủ các câu của tình huống (giữ thứ tự)</span></div>
      <div class="fld"><label>Lấy từ chương <span class="hint" style="font-weight:400">(không chọn = mọi chương; các tình huống trong một đề khác chương nhau nếu đủ)</span></label><div class="hpchk" style="max-height:110px">${csCh.map(c=>`<label><input type="checkbox" data-thch="${c}"${st.thChs.includes(c)?" checked":""}${lock}> Chương ${c} (${E.cs.filter(v=>(v.c.ch|0)===c).length})</label>`).join("")||'<span class="t-sub">Chưa có tình huống.</span>'}</div></div></div></section>
  <div class="scard dtsum"><div><b>Mỗi bài: ${tong+a}${a!==b?"–"+(tong+b):""} câu</b> · ${esc(dtMota(st,E))}<br><span class="t-sub">Điểm thang 10 = số câu đúng / tổng số câu × 10, máy chấm ngay khi sinh viên nộp. Mở/đóng đợt kiểm tra ở mục <a href="#lop/${encodeURIComponent(ma)}/bt">Kiểm tra, thi (ĐGĐK)</a>.</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-xem>${I.eye}Xem thử một đề</button><button type="button" class="btn pri" data-luu${lock}>Lưu đề cho lớp</button></div></div>
  <p class="err" id="dt-err">${esc(st.thieu||"")}</p>`}
function bindDeThi(l,ma){const st=DT.st[ma];if(!st)return;const re=()=>viewLopDetail(ma,"de");const E=()=>dtElig(st.hp,st.nguon);
  const on=(sel,f)=>{const el=$(sel);if(el)el.onchange=f};
  on("#dt-hp",e=>{st.hp=e.target.value;st.mt={};st.thChs=[];re()});on("#dt-ng",e=>{st.nguon=e.target.value;re()});on("#dt-kieu",e=>{st.kieu=e.target.value;re()});
  on("#dt-tg",e=>{st.tg=Math.max(5,Math.min(180,+e.target.value||40))});on("#dt-tc",e=>{st.tronCau=e.target.checked;re()});on("#dt-td",e=>{st.tronDA=e.target.checked;re()});
  on("#dt-tong",e=>{st.tong=Math.max(0,+e.target.value||0)});$$("[data-tl]").forEach(x=>x.onchange=()=>{st.tl[+x.dataset.tl]=Math.max(0,+x.value||0)});
  on("#dt-ths",e=>{st.thSo=Math.max(0,+e.target.value||0);re()});on("#dt-thc",e=>{st.thCau=Math.max(0,+e.target.value||0);re()});
  $$("[data-thch]").forEach(x=>x.onchange=()=>{const c=+x.dataset.thch;st.thChs=x.checked?[...new Set(st.thChs.concat(c))]:st.thChs.filter(y=>y!==c);re()});
  $$("[data-mt]").forEach(x=>x.onchange=()=>{st.thieu="";const [ch,lv]=x.dataset.mt.split("|");const n=Math.max(0,Math.min(+x.max||0,+x.value||0));(st.mt[ch]=st.mt[ch]||{NB:0,TH:0,VD:0})[lv]=n;re()});
  const ch=$("[data-chia]");if(ch)ch.onclick=()=>{dtChia(st,E());re()};const xo=$("[data-xoa]");if(xo)xo.onclick=()=>{st.mt={};re()};
  const xem=$("[data-xem]");if(xem)xem.onclick=()=>{let d;try{d=dtDraw(st,E())}catch(x){$("#dt-err").textContent=x.message;return}dlgDtXem(st,d)};
  const lu=$("[data-luu]");if(lu)lu.onclick=()=>dtSave(l,ma,st)}
function dlgDtXem(st,d){const dlg=$("#dlg");let n=0;const qh=x=>{n++;return `<div class="dtq"><b>Câu ${n}.</b> <span class="pill gray">${x.lv} · Ch.${x.ch}</span> ${esc(x.q)}<ol class="nho">${x.o.map((o,j)=>`<li class="${j===x.a?"ok":""}">${esc(o)}</li>`).join("")}</ol>${x.b?`<span class="nhb">Căn cứ: ${esc(x.b)}</span>`:""}</div>`};
  dlg.className="wide nhx";dlg.innerHTML=`<div class="dh"><h3>Xem thử một đề (${d.lt.length+d.th.reduce((s,t)=>s+t.q.length,0)} câu)</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <div class="prev" style="max-height:70vh">${d.lt.map(qh).join("")}${d.th.map((t,i)=>`<div class="case" style="background:#f3f8fb;border-radius:10px;padding:10px 12px;margin:10px 0"><b>Tình huống ${i+1}: ${esc(t.c.title)}</b><p style="white-space:pre-line;margin:6px 0 0">${esc(t.c.text)}</p></div>${t.q.map(qh).join("")}`).join("")}</div>
  <p class="note" style="margin:0">${st.kieu==="chung"?"Bấm Lưu đề để chốt một đề chung — đề chốt là một lần rút mới, có thể khác đề xem thử này.":"Mỗi sinh viên nhận một đề rút ngẫu nhiên theo cùng ma trận; đây là một ví dụ."} Đáp án tô xanh chỉ hiện với giảng viên.</p>
  <div class="df"><button type="button" class="btn" data-x>Đóng</button></div>`;dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close())}
async function dtSave(l,ma,st){const err=m=>{const e=$("#dt-err");if(e)e.textContent=m};const E=dtElig(st.hp,st.nguon);
  if(DT.bai[ma]>0)return err("Lớp đã có bài làm — không sửa đề được nữa.");
  const tong=dtTong(st);if(!tong&&!st.thSo)return err("Ma trận đang trống: nhập số câu hoặc bấm Chia theo ngân hàng.");
  for(const [ch,r] of Object.entries(st.mt))for(const lv of DT_LV){if((+r[lv]||0)>dtCnt(E,+ch,lv))return err("Chương "+ch+", "+LVN[lv]+": vượt số câu sẵn có.")}
  if(st.thSo>dtCsPool(st,E).length)return err("Số tình huống vượt số tình huống sẵn có.");
  let fixedDraw=null;if(st.kieu==="chung"){try{fixedDraw=dtDraw(st,E)}catch(x){return err(x.message)}}
  /* đề nguồn: đề chung = đúng các câu đã rút; mỗi SV một đề = mọi câu thuộc các ô ma trận có số câu > 0 và các tình huống thuộc chương đã chọn */
  const ltSrc=fixedDraw?fixedDraw.lt:E.lt.filter(x=>((st.mt[x.ch|0]||{})[x.lv]|0)>0);const csSrc=fixedDraw?fixedDraw.th.map(t=>({c:t.c,q:t.q})):(st.thSo?dtCsPool(st,E):[]);
  const P={hp:st.hp,hpTen:courseOf(st.hp)?.name||st.hp,kieu:st.kieu,tronCau:!!st.tronCau,tronDA:!!st.tronDA,thSo:+st.thSo||0,thCau:+st.thCau||0,mt:[],q:{},cs:{},at:FV().serverTimestamp()};
  const K={a:{},b:{},e:{},src:{}};let qi=0,ti=0;const qid={};const putQ=(x,c)=>{const id="q"+(++qi);qid[x.id]=id;P.q[id]=Object.assign({q:x.q,o:x.o.slice(0,4),g:x.ch|0,lv:x.lv||"NB"},c?{c}:{});K.a[id]=x.a;K.b[id]=x.b||"";K.e[id]=x.e||"";K.src[id]=x.id;return id};
  ltSrc.forEach(x=>putQ(x));const tids=[];csSrc.forEach(v=>{const tid="t"+(++ti);tids.push(tid);P.cs[tid]={t:v.c.title||"",x:v.c.text||"",g:v.c.ch|0,m:v.q.map(x=>putQ(x,tid))};K.src[tid]=v.c.id});
  Object.entries(st.mt).forEach(([ch,r])=>{if(DT_LV.some(k=>+r[k]>0))P.mt.push({ch:+ch,NB:+r.NB||0,TH:+r.TH||0,VD:+r.VD||0})});
  if(fixedDraw)P.fixed={lt:fixedDraw.lt.map(x=>qid[x.id]),th:fixedDraw.th.map((t,i)=>({cid:tids[i],q:P.cs[tids[i]].m.slice()}))};
  const js=JSON.stringify(P);if(js.length>900000)return err("Đề nguồn quá lớn ("+Math.round(js.length/1024)+" KB) — giảm số chương hoặc chọn đề chung.");
  const [a,b]=dtCauTH(st,E);const mota=dtMota(st,E);
  if(!await confirmDlg("Lưu đề cho lớp "+ma+"?",`${mota} Đề nguồn gồm ${qi} câu${ti?", "+ti+" tình huống":""} từ ngân hàng ${P.hpTen}. Đáp án lưu riêng, sinh viên không đọc được.${l.hocPhan&&l.hocPhan!=="nh"?" Lớp chuyển từ đề cũ ("+(l.hocPhanTen||l.hocPhan)+") sang đề rút từ ngân hàng.":""}`,"Lưu đề"))return;
  try{await S.fs.doc("pnl_dg_de/"+ma).set(P);await S.fs.doc("pnl_dg_dap/"+ma).set(Object.assign(K,{at:FV().serverTimestamp()}));
    const cfg=JSON.parse(JSON.stringify({hp:st.hp,nguon:st.nguon,kieu:st.kieu,tronCau:st.tronCau,tronDA:st.tronDA,tg:st.tg,mt:st.mt,thSo:st.thSo,thCau:st.thCau,thChs:st.thChs,tong:st.tong,tl:st.tl}));
    const deNh={hp:st.hp,hpTen:P.hpTen,n:dtTong(st)+a,thSo:+st.thSo||0,kieu:st.kieu,mota,cfg,at:new Date().toISOString()};
    await S.fs.doc("pnl_dg_lop/"+ma).set({hocPhan:"nh",hocPhanTen:P.hpTen,thoiGian:st.tg,deNh},{merge:true});Object.assign(l,{hocPhan:"nh",hocPhanTen:P.hpTen,thoiGian:st.tg,deNh});
    toast("Đã lưu đề cho lớp "+ma+". Mở đợt kiểm tra ở mục Kiểm tra, thi.",5000);viewLopDetail(ma,"de")}catch(x){nhDenied(x);err("Chưa lưu được: "+errMsg(x)+(x&&x.code==="permission-denied"?" — cần cập nhật quy tắc dữ liệu (thanh Cập nhật ngay).":""))}}
