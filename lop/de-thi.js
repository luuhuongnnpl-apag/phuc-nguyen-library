"use strict";
/* PHÚC NGUYÊN LIBRARY — ĐỀ KIỂM TRA ĐỊNH KỲ trong Ngân hàng câu hỏi (18/11/2026, bản 2).
   Quy trình: Ngân hàng câu hỏi › học phần › Đề kiểm tra › Tạo đề (ma trận riêng của từng đề) › Giao cho một hoặc nhiều lớp.
   Mỗi đề tự quyết kết cấu (không dùng chung kết cấu Luật Dân sự): số câu lý thuyết theo chương × mức độ, số tình huống,
   số câu mỗi tình huống, đề chung hay mỗi SV một đề, đảo câu/phương án, thời gian.
   Lưu:
     pnl_nh_de/{mã đề}      bản gốc của đề (chỉ quản trị): cfg (ma trận), P (đề nguồn), K (đáp án), dots[] (các đợt đã giao)
     pnl_dg_lop/{lớp-HP[-n]} một ĐỢT kiểm tra của một lớp: cha (mã lớp), deId, hocPhan:"nh", thoiGian, deNh (mô tả), mở/đóng
     pnl_dg_de/{đợt}        bản phát hành của đề cho đợt (không đáp án, ai biết mã đợt đọc được)
     pnl_dg_dap/{đợt}       đáp án của đợt (chỉ quản trị)
   Sửa đề: phát hành lại cho mọi đợt CHƯA có bài làm; đợt đã có bài giữ nguyên bản đã phát (không làm sai điểm đã chấm).
   Sinh viên làm bài bằng tài khoản lớp ở danh-gia/; trang đó rút đề theo ma trận của đợt khi bắt đầu. */
const DT={st:{},bai:{},des:{}};
const DT_LV=["NB","TH","VD"];
async function dtDem(dgs,force){await Promise.all(dgs.map(async e=>{if(DT.bai[e.id]!=null&&!force)return;try{DT.bai[e.id]=(await S.fs.collection("pnl_dg_bai").where("maLop","==",e.id).get()).size}catch(x){DT.bai[e.id]=0}}))}
function dtAbbr(hp){const n=String(courseOf(hp)?.name||hp).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[đĐ]/g,"D");return n.split(/[^A-Za-z0-9]+/).filter(Boolean).map(w=>w[0]).join("").toUpperCase().slice(0,6)||"HP"}
function dtNewDot(l,hp,taken){const base=l.id+"-"+dtAbbr(hp);const used=new Set([...(S.dg||[]).map(x=>x.id),...S.lop.map(x=>x.id),...(taken||[])]);let id=base,k=1;while(used.has(id))id=base+"-"+(++k);return id}
const dtTs=d=>firebase.firestore.Timestamp.fromDate(d);
const dtLocal=d=>{const p=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+"T"+p(d.getHours())+":"+p(d.getMinutes())};

/* ---------- đề của học phần ---------- */
async function dtLoadDes(hp,force){if(DT.des[hp]&&!force)return DT.des[hp];
  const q=await S.fs.collection("pnl_nh_de").where("hp","==",hp).get();
  DT.des[hp]=q.docs.map(d=>Object.assign({id:d.id},d.data())).sort((a,b)=>String(b.at||"").localeCompare(String(a.at||"")));return DT.des[hp]}
function dtDefault(hp){return {hp,ten:"",nguon:"all",kieu:"rieng",tronCau:true,tronDA:true,tg:40,mt:{},thSo:0,thCau:0,thChs:[],tong:30,tl:[30,40,30]}}
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
/* rút một đề (xem thử và đề chung) — cùng cách trang làm bài rút đề */
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
/* kiểm tra + biên dịch đề: P (đề nguồn không đáp án), K (đáp án) */
function dtCompile(st,E){const tong=dtTong(st);if(!tong&&!st.thSo)throw new Error("Ma trận đang trống: nhập số câu hoặc bấm Chia theo ngân hàng.");
  for(const [ch,r] of Object.entries(st.mt))for(const lv of DT_LV){if((+r[lv]||0)>dtCnt(E,+ch,lv))throw new Error("Chương "+ch+", "+LVN[lv]+": vượt số câu sẵn có.")}
  if(st.thSo>dtCsPool(st,E).length)throw new Error("Số tình huống vượt số tình huống sẵn có.");
  const fixedDraw=st.kieu==="chung"?dtDraw(st,E):null;
  /* đề chung = đúng các câu đã rút; mỗi SV một đề = mọi câu thuộc các ô ma trận có số câu > 0 và các tình huống thuộc chương đã chọn */
  const ltSrc=fixedDraw?fixedDraw.lt:E.lt.filter(x=>((st.mt[x.ch|0]||{})[x.lv]|0)>0);const csSrc=fixedDraw?fixedDraw.th.map(t=>({c:t.c,q:t.q})):(st.thSo?dtCsPool(st,E):[]);
  const P={hp:st.hp,hpTen:courseOf(st.hp)?.name||st.hp,kieu:st.kieu,tronCau:!!st.tronCau,tronDA:!!st.tronDA,thSo:+st.thSo||0,thCau:+st.thCau||0,mt:[],q:{},cs:{}};
  const K={a:{},b:{},e:{},src:{}};let qi=0,ti=0;const qid={};const putQ=(x,c)=>{const id="q"+(++qi);qid[x.id]=id;P.q[id]=Object.assign({q:x.q,o:x.o.slice(0,4),g:x.ch|0,lv:x.lv||"NB"},c?{c}:{});K.a[id]=x.a;K.b[id]=x.b||"";K.e[id]=x.e||"";K.src[id]=x.id;return id};
  ltSrc.forEach(x=>putQ(x));const tids=[];csSrc.forEach(v=>{const tid="t"+(++ti);tids.push(tid);P.cs[tid]={t:v.c.title||"",x:v.c.text||"",g:v.c.ch|0,m:v.q.map(x=>putQ(x,tid))};K.src[tid]=v.c.id});
  Object.entries(st.mt).forEach(([ch,r])=>{if(DT_LV.some(k=>+r[k]>0))P.mt.push({ch:+ch,NB:+r.NB||0,TH:+r.TH||0,VD:+r.VD||0})});
  if(fixedDraw)P.fixed={lt:fixedDraw.lt.map(x=>qid[x.id]),th:fixedDraw.th.map((t,i)=>({cid:tids[i],q:P.cs[tids[i]].m.slice()}))};
  const sz=JSON.stringify(P).length+JSON.stringify(K).length;if(sz>900000)throw new Error("Đề quá lớn ("+Math.round(sz/1024)+" KB) — giảm số chương hoặc chọn đề chung.");
  const [a]=dtCauTH(st,E);return {P,K,qi,ti,n:tong+(fixedDraw?fixedDraw.th.reduce((s,t)=>s+t.q.length,0):a),mota:dtMota(st,E)}}
const dtMeta=de=>({hp:de.hp,hpTen:de.hpTen,deId:de.id,ten:de.ten,n:de.n,thSo:de.thSo|0,kieu:de.kieu,mota:de.mota,at:de.at});
/* phát hành bản đề cho một đợt (ghi đề nguồn, đáp án, thông tin đợt) */
async function dtPublish(de,dot,extra){const fs=S.fs;
  /* 27/11/2026: ghi thông tin đợt TRƯỚC (đợt con có cha = lớp) để quy tắc giảng viên nhận ra đợt thuộc lớp được giao khi ghi đề, đáp án */
  const part=Object.assign({deId:de.id,hps:[de.hp],hocPhan:"nh",hocPhanTen:de.hpTen,thoiGian:+de.tg||40,deNh:dtMeta(de)},extra||{});
  if(S.lop.some(l=>l.id===dot)&&!(extra&&extra.cha)){delete part.hps;delete part.hocPhanTen}/* đề cũ gắn thẳng vào lớp: không đụng danh sách học phần của lớp */
  await fs.doc("pnl_dg_lop/"+dot).set(part,{merge:true});
  await fs.doc("pnl_dg_de/"+dot).set(Object.assign({},de.P,{deId:de.id,at:FV().serverTimestamp()}));
  await fs.doc("pnl_dg_dap/"+dot).set(Object.assign({},de.K,{deId:de.id,at:FV().serverTimestamp()}));
  const ex=(S.dg||[]).find(x=>x.id===dot);if(ex)Object.assign(ex,part);else S.dg.push(Object.assign({id:dot},part));DT.bai[dot]=DT.bai[dot]||0}

/* ---------- trang: danh sách đề của học phần ---------- */
async function viewDeNh(hp,sub){const c=courseOf(hp);if(!c){location.hash="#nganhang";return}const tok=location.hash;
  if(sub)return viewDeNhForm(hp,sub==="moi"?null:sub);
  const crumb=`<a class="back" href="#nganhang/${encodeURIComponent(hp)}">${I.back}Ngân hàng ${esc(c.name)}</a><span class="sep">/</span><span class="sub">Đề kiểm tra</span>`;
  $("#app").innerHTML=shell("nganhang",`<div class="page"><div class="empty">Đang tải đề kiểm tra…</div></div>`,crumb);bindOut();
  let des=[],err="";try{des=await dtLoadDes(hp,true);const dots=[];des.forEach(d=>(d.dots||[]).forEach(id=>dots.push(id)));const es=[];for(const id of dots){const e=await dgGet(id);if(e)es.push(e)}await dtDem(es,true)}catch(x){if(nhDenied(x))err="rules";else err=errMsg(x)}
  if(location.hash!==tok)return;
  const lopOf=id=>{const e=(S.dg||[]).find(x=>x.id===id);return e?S.lop.find(l=>l.id===e.cha):null};
  const body=`<div class="page" style="max-width:1180px"><div class="bar"><div><h1 class="t">Đề kiểm tra · ${esc(c.name)}</h1><span class="t-sub">Mỗi đề có kết cấu riêng (ma trận chương × mức độ, tình huống, thời gian). Tạo một lần, giao cho một hoặc nhiều lớp; sửa đề thì các đợt chưa có bài làm nhận bản mới.</span></div>
    <div class="tools"><a class="btn pri" href="#nganhang/${encodeURIComponent(hp)}/de/moi">${I.plus}Tạo đề mới</a></div></div>
    ${err==="rules"?nhRulesBox():err?`<div class="empty">Chưa tải được: ${esc(err)}</div>`:""}
    ${des.length?des.map(d=>{const dots=(d.dots||[]).map(id=>(S.dg||[]).find(x=>x.id===id)).filter(Boolean);return `<section class="scard"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start"><div><b style="font-size:16px">${esc(d.ten||d.id)}</b> <span class="pill gray">${esc(d.id)}</span><br><span class="t-sub">${esc(d.mota||"")} · ${d.n||0} câu mỗi bài</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn sm" href="#nganhang/${encodeURIComponent(hp)}/de/${encodeURIComponent(d.id)}">${I.edit}Sửa đề</a><button type="button" class="btn sm pri" data-giao="${esc(d.id)}">${I.lop}Giao cho lớp</button>${dots.length?"":`<button type="button" class="btn sm" data-xde="${esc(d.id)}">${I.del}Xóa</button>`}</div></div>
      ${dots.length?`<div class="tbl" style="margin-top:10px"><table><thead><tr><th>Đợt</th><th>Lớp</th><th>Trạng thái</th><th>Bài làm</th><th class="acts"></th></tr></thead><tbody>${dots.map(e=>{const l=lopOf(e.id);return `<tr><td><b>${esc(e.id)}</b></td><td>${esc(l?lopName(l):e.cha)}</td><td>${dgMo(e)?'<span class="pill live">đang mở</span>':'<span class="pill gray">chưa mở / đã đóng</span>'}</td><td>${DT.bai[e.id]||0}${DT.bai[e.id]?' <span class="t-sub">(giữ bản đề đã phát)</span>':""}</td><td class="acts"><a class="btn sm" href="#lop/${encodeURIComponent(e.cha)}/bt/${encodeURIComponent(e.id)}">Mở / đóng, xem bài</a></td></tr>`}).join("")}</tbody></table></div>`:'<p class="t-sub" style="margin:8px 0 0">Chưa giao cho lớp nào.</p>'}</section>`}).join("")
      :`<div class="empty">Học phần chưa có đề kiểm tra. Bấm <b>Tạo đề mới</b> để lập ma trận từ các câu đã duyệt.</div>`}</div>`;
  $("#app").innerHTML=shell("nganhang",body,crumb);bindOut();
  $$("[data-giao]").forEach(b=>b.onclick=()=>dlgGiaoDe(des.find(d=>d.id===b.dataset.giao),()=>viewDeNh(hp)));
  $$("[data-xde]").forEach(b=>b.onclick=async()=>{const d=des.find(x=>x.id===b.dataset.xde);if(!await confirmDlg("Xóa đề "+(d.ten||d.id)+"?","Đề chưa giao cho lớp nào. Câu hỏi trong ngân hàng không bị ảnh hưởng.","Xóa đề"))return;
    try{await S.fs.doc("pnl_nh_de/"+d.id).delete();toast("Đã xóa đề.");viewDeNh(hp)}catch(x){toast("Chưa xóa được: "+errMsg(x))}})}

/* ---------- trang: tạo / sửa một đề ----------
   Sửa ô nào chỉ cập nhật số liệu tại chỗ (không tải lại trang); chỉ đổi Nguồn câu mới dựng lại bảng. Thay đổi giữ trong bộ nhớ đến khi bấm Lưu. */
async function viewDeNhForm(hp,deId){const c=courseOf(hp);const tok=location.hash;const key=deId||"moi:"+hp;
  const crumb=`<a class="back" href="#nganhang/${encodeURIComponent(hp)}/de">${I.back}Đề kiểm tra ${esc(c.name)}</a><span class="sep">/</span><span class="sub">${deId?"Sửa đề":"Tạo đề mới"}</span>`;
  if(!DT.st[key])$("#app").innerHTML=shell("nganhang",`<div class="page"><div class="empty">Đang tải ngân hàng ${esc(c.name)}…</div></div>`,crumb),bindOut();
  let de=DT.deCur&&DT.deCur.id===deId?DT.deCur:null;
  try{await nhChapters(hp);await nhLoad(hp);if(!NH.synced[hp])await nhSyncOnce(hp);if(deId&&!de){const d=await S.fs.doc("pnl_nh_de/"+deId).get();if(!d.exists)throw new Error("Không có đề "+deId);de=DT.deCur=Object.assign({id:deId},d.data())}}
  catch(x){if(location.hash!==tok)return;$("#app").innerHTML=shell("nganhang",`<div class="page">${nhDenied(x)?nhRulesBox():`<div class="empty">Chưa tải được: ${esc(errMsg(x))}</div>`}</div>`,crumb);bindOut();return}
  if(location.hash!==tok)return;
  if(!DT.st[key])DT.st[key]=Object.assign(dtDefault(hp),de?JSON.parse(JSON.stringify(de.cfg||{})):{},{hp,ten:de?de.ten||"":"",dirty:false});
  const st=DT.st[key];let E=dtElig(hp,st.nguon);const chs=dtChs(st,E);
  const opt=(v,t,cur)=>`<option value="${esc(v)}"${String(cur)===String(v)?" selected":""}>${esc(t)}</option>`;
  const cell=(ch,lv)=>{const n=dtCnt(E,ch,lv),v=(st.mt[ch]||{})[lv]||0;return `<td><input type="number" min="0" max="${n}" value="${v||""}" placeholder="0" data-mt="${ch}|${lv}" class="dtn${v>n?" bad":""}"${n?"":" disabled"}><small>/ ${n}</small></td>`};
  const csCh=[...new Set(E.cs.map(v=>v.c.ch|0))].sort((x,y)=>x-y);const nDot=de?(de.dots||[]).length:0;
  const body=`<div class="page" style="max-width:1180px"><div class="bar"><div><h1 class="t">${deId?"Sửa đề "+esc(de.ten||deId):"Tạo đề kiểm tra mới"}</h1><span class="t-sub">${esc(c.name)} · chỉ dùng câu, tình huống <b>đã duyệt</b> trong ngân hàng</span></div></div>
  ${deId&&nDot?`<div class="scard" style="border-color:var(--warn);background:var(--warn-soft)">Đề đang giao cho ${nDot} đợt. Lưu thay đổi: các đợt <b>chưa có bài làm</b> nhận bản đề mới; đợt đã có bài làm giữ bản cũ để điểm đã chấm không sai.</div>`:""}
  <div class="scard"><div class="dtg" style="grid-template-columns:2fr 1.3fr 1.3fr 1fr">
    <div class="fld"><label for="dt-ten">Tên đề *</label><input id="dt-ten" maxlength="120" value="${esc(st.ten)}" placeholder="VD: Kiểm tra định kỳ lần 1 — Chương 1–3"></div>
    <div class="fld"><label for="dt-ng">Nguồn câu (đã duyệt)</label><select id="dt-ng">${opt("all","Tất cả câu đã duyệt",st.nguon)}${opt("kin","Chỉ câu kín (dành cho ĐGĐK)",st.nguon)}${opt("on","Chỉ câu ôn tập (không kín)",st.nguon)}</select></div>
    <div class="fld"><label for="dt-kieu">Kiểu đề</label><select id="dt-kieu">${opt("rieng","Mỗi SV một đề (rút theo ma trận)",st.kieu)}${opt("chung","Một đề chung cả lớp",st.kieu)}</select></div>
    <div class="fld"><label for="dt-tg">Thời gian (phút)</label><input id="dt-tg" type="number" min="5" max="180" value="${st.tg}"></div></div>
    <div style="display:flex;gap:18px;flex-wrap:wrap"><label style="font-weight:500"><input type="checkbox" id="dt-tc"${st.tronCau?" checked":""}> Đảo thứ tự câu</label><label style="font-weight:500"><input type="checkbox" id="dt-td"${st.tronDA?" checked":""}> Đảo thứ tự phương án</label></div></div>
  <section class="scard"><h2 class="sec" style="margin-top:0">1. Ma trận câu lý thuyết <span class="t-sub" style="font-weight:400">(số câu / số câu đã duyệt sẵn có; để 0 nếu đề không có phần lý thuyết)</span></h2>
    <div class="tools" style="align-items:center"><span class="t-sub">Chia nhanh:</span><input id="dt-tong" type="number" min="0" max="200" value="${st.tong}" style="width:80px" aria-label="Tổng số câu lý thuyết"><span class="t-sub">câu, tỉ lệ NB/TH/VD</span>
      ${st.tl.map((v,i)=>`<input type="number" min="0" max="100" value="${v}" data-tl="${i}" style="width:62px" aria-label="Tỉ lệ ${LVN[DT_LV[i]]}">`).join("")}<span class="t-sub">%</span><button type="button" class="btn sm" data-chia>Chia theo ngân hàng</button><button type="button" class="btn sm" data-max>Lấy hết câu sẵn có</button><button type="button" class="btn sm" data-xoa>Xóa ma trận</button></div>
    <div class="tbl"><table class="nht dtm"><thead><tr><th>Chương</th>${DT_LV.map(k=>`<th>${LVN[k]}</th>`).join("")}<th>Cộng</th></tr></thead><tbody>
    ${chs.map(ch=>`<tr><td>${esc(nhChName(hp,ch))}</td>${DT_LV.map(lv=>cell(ch,lv)).join("")}<td><b data-rt="${ch}">0</b></td></tr>`).join("")||`<tr><td colspan="5" class="empty" style="border:0">Ngân hàng học phần này chưa có câu đã duyệt.</td></tr>`}
    <tr><td><b>Cộng</b></td>${DT_LV.map(lv=>`<td><b data-ct="${lv}">0</b></td>`).join("")}<td><b data-gt>0</b></td></tr></tbody></table></div></section>
  <section class="scard"><h2 class="sec" style="margin-top:0">2. Tình huống <span class="t-sub" style="font-weight:400">(${E.cs.length} tình huống đã duyệt có câu ABCD; để 0 nếu đề không có tình huống)</span></h2>
    <div class="dtg" style="grid-template-columns:1fr 1fr 2fr"><div class="fld"><label for="dt-ths">Số tình huống mỗi đề</label><input id="dt-ths" type="number" min="0" max="${E.cs.length}" value="${st.thSo}"></div>
      <div class="fld"><label for="dt-thc">Số câu tối đa mỗi tình huống</label><input id="dt-thc" type="number" min="0" max="20" value="${st.thCau}"><span class="hint">0 = lấy đủ các câu của tình huống (giữ thứ tự)</span></div>
      <div class="fld"><label>Lấy từ chương <span class="hint" style="font-weight:400">(không chọn = mọi chương)</span> ${csCh.length?`<button type="button" class="lnk" data-chkall="[data-thch]">Chọn tất cả</button> · <button type="button" class="lnk" data-chknone="[data-thch]">Bỏ chọn</button>`:""}</label><div class="hpchk" style="max-height:110px">${csCh.map(cc=>`<label><input type="checkbox" data-thch="${cc}"${st.thChs.includes(cc)?" checked":""}> Chương ${cc} (${E.cs.filter(v=>(v.c.ch|0)===cc).length})</label>`).join("")||'<span class="t-sub">Chưa có tình huống.</span>'}</div></div></div></section>
  <div class="scard dtsum" style="position:sticky;bottom:0;z-index:5;box-shadow:0 -6px 18px rgba(16,40,60,.08)"><div><b data-mb></b> · <span data-sum></span> <span class="pill warn" data-dirty hidden>chưa lưu</span><br><span class="t-sub">Điểm thang 10 = số câu đúng / tổng số câu × 10, máy chấm ngay khi sinh viên nộp.</span><p class="err" id="dt-err" style="margin:4px 0 0">${esc(st.thieu||"")}</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-xem>${I.eye}Xem thử / in đề</button><a class="btn" href="#nganhang/${encodeURIComponent(hp)}/de" data-huy>Hủy</a><button type="button" class="btn pri" data-luu>${deId?"Lưu thay đổi":"Lưu đề"}</button></div></div></div>`;
  const main=$("main");const sy=main?main.scrollTop:0,wy=window.scrollY;
  $("#app").innerHTML=shell("nganhang",body,crumb);bindOut();const m2=$("main");if(m2)m2.scrollTop=sy;window.scrollTo(0,wy);
  const dirty=()=>{st.dirty=true;const d=$("[data-dirty]");if(d)d.hidden=false};
  /* cập nhật tại chỗ: tổng hàng, cột, số câu mỗi bài, mô tả */
  const live=()=>{chs.forEach(ch=>{const el=$(`[data-rt="${ch}"]`);if(el)el.textContent=DT_LV.reduce((s2,lv)=>s2+(+((st.mt[ch]||{})[lv])||0),0)});
    DT_LV.forEach(lv=>{const el=$(`[data-ct="${lv}"]`);if(el)el.textContent=Object.values(st.mt).reduce((s2,r)=>s2+(+r[lv]||0),0)});
    const tong=dtTong(st),[a,b]=dtCauTH(st,E);$("[data-gt]").textContent=tong;$("[data-mb]").textContent="Mỗi bài: "+(tong+a)+(a!==b?"–"+(tong+b):"")+" câu";$("[data-sum]").textContent=dtMota(st,E);
    $$("[data-mt]").forEach(x=>{const [ch,lv]=x.dataset.mt.split("|");const v=(st.mt[ch]||{})[lv]||0;if(+x.value!==v)x.value=v||"";x.classList.toggle("bad",v>dtCnt(E,+ch,lv))});
    const d=$("[data-dirty]");if(d)d.hidden=!st.dirty;$("#dt-err").textContent=st.thieu||""};
  const on=(sel,ev,f)=>{const el=$(sel);if(el)el.addEventListener(ev,e=>{f(e);dirty();live()})};
  on("#dt-ten","input",e=>{st.ten=e.target.value.trim()});on("#dt-kieu","change",e=>{st.kieu=e.target.value});
  on("#dt-tg","input",e=>{st.tg=Math.max(5,Math.min(180,+e.target.value||40))});on("#dt-tc","change",e=>{st.tronCau=e.target.checked});on("#dt-td","change",e=>{st.tronDA=e.target.checked});
  on("#dt-tong","input",e=>{st.tong=Math.max(0,+e.target.value||0)});$$("[data-tl]").forEach(x=>x.addEventListener("input",()=>{st.tl[+x.dataset.tl]=Math.max(0,+x.value||0);dirty()}));
  on("#dt-ths","input",e=>{st.thSo=Math.max(0,Math.min(E.cs.length,+e.target.value||0))});on("#dt-thc","input",e=>{st.thCau=Math.max(0,+e.target.value||0)});
  $$("[data-thch]").forEach(x=>x.addEventListener("change",()=>{st.thChs=$$("[data-thch]:checked").map(y=>+y.dataset.thch);dirty();live()}));
  $$("[data-mt]").forEach(x=>x.addEventListener("input",()=>{st.thieu="";const [ch,lv]=x.dataset.mt.split("|");(st.mt[ch]=st.mt[ch]||{NB:0,TH:0,VD:0})[lv]=Math.max(0,+x.value||0);dirty();live()}));
  $$("[data-mt]").forEach(x=>x.addEventListener("change",()=>{const [ch,lv]=x.dataset.mt.split("|");(st.mt[ch]=st.mt[ch]||{NB:0,TH:0,VD:0})[lv]=Math.max(0,Math.min(+x.max||0,+x.value||0));live()}));
  $("#dt-ng").onchange=e=>{st.nguon=e.target.value;st.dirty=true;viewDeNhForm(hp,deId)};
  $("[data-chia]").onclick=()=>{dtChia(st,E);dirty();live()};$("[data-xoa]").onclick=()=>{st.mt={};st.thieu="";dirty();live()};
  $("[data-max]").onclick=()=>{chs.forEach(ch=>{st.mt[ch]={NB:dtCnt(E,ch,"NB"),TH:dtCnt(E,ch,"TH"),VD:dtCnt(E,ch,"VD")}});st.thieu="";dirty();live()};
  $("[data-xem]").onclick=()=>{let d;try{d=dtDraw(st,E)}catch(x){$("#dt-err").textContent=x.message;return}dlgDtXem(st,d,c.name)};
  $("[data-huy]").onclick=e=>{if(st.dirty&&!confirm("Bỏ các thay đổi chưa lưu?")){e.preventDefault();return}delete DT.st[key]};
  $("[data-luu]").onclick=()=>dtSaveDe(hp,de,st,key);live()}
function dlgDtXem(st,d,hpTen){const dlg=$("#dlg");let n=0;const qh=x=>{n++;return `<div class="dtq"><b>Câu ${n}.</b> <span class="pill gray">${x.lv} · Ch.${x.ch}</span> ${esc(x.q)}<ol class="nho">${x.o.map((o,j)=>`<li class="${j===x.a?"ok":""}">${esc(o)}</li>`).join("")}</ol>${x.b?`<span class="nhb">Căn cứ: ${esc(x.b)}</span>`:""}</div>`};
  dlg.className="wide nhx";dlg.innerHTML=`<div class="dh"><h3>Xem thử một đề (${d.lt.length+d.th.reduce((s,t)=>s+t.q.length,0)} câu)</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <div class="prev" style="max-height:70vh">${d.lt.map(qh).join("")}${d.th.map((t,i)=>`<div class="case" style="background:#f3f8fb;border-radius:10px;padding:10px 12px;margin:10px 0"><b>Tình huống ${i+1}: ${esc(t.c.title)}</b><p style="white-space:pre-line;margin:6px 0 0">${esc(t.c.text)}</p></div>${t.q.map(qh).join("")}`).join("")}</div>
  <p class="note" style="margin:0">${st.kieu==="chung"?"Bấm Lưu đề để chốt một đề chung — đề chốt là một lần rút mới, có thể khác đề xem thử này.":"Mỗi sinh viên nhận một đề rút ngẫu nhiên theo cùng ma trận; đây là một ví dụ."} Đáp án tô xanh chỉ hiện với giảng viên.</p>
  <div class="df"><button type="button" class="btn" data-in>In đề (kèm đáp án riêng)</button><button type="button" class="btn" data-x>Đóng</button></div>`;dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());
  $("[data-in]",dlg).onclick=()=>dtPrint(st,d,hpTen)}
/* in đề (hoặc lưu PDF từ hộp in của trình duyệt): đề không đáp án + trang đáp án riêng */
function dtPrint(st,d,hpTen){const w=window.open("","_blank");if(!w){toast("Trình duyệt chặn cửa sổ in — cho phép cửa sổ bật lên rồi thử lại.");return}let n=0;const ks=[];
  const qh=x=>{n++;ks.push(n+"."+ABCD[x.a]);return `<div class="q"><b>Câu ${n}.</b> ${esc(x.q)}<div class="o">${x.o.map((o,j)=>`<div>${ABCD[j]}. ${esc(o)}</div>`).join("")}</div></div>`};
  const body=d.lt.map(qh).join("")+d.th.map((t,i)=>`<div class="th"><b>Tình huống ${i+1}${t.c.title?": "+esc(t.c.title):""}</b><p>${esc(t.c.text)}</p></div>${t.q.map(qh).join("")}`).join("");
  w.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>${esc(st.ten||"Đề kiểm tra")}</title><style>body{font:13pt/1.45 "Times New Roman",serif;margin:18mm}h1{font-size:15pt;text-align:center;margin:0 0 4px}.sub{text-align:center;margin:0 0 14px}.q{margin:0 0 10px;break-inside:avoid}.o{margin:3px 0 0 18px}.th{border:1px solid #999;padding:6px 10px;margin:12px 0 8px;break-inside:avoid}.th p{white-space:pre-line;margin:4px 0 0}.key{break-before:page}.key div{columns:5}</style></head><body>
  <h1>${esc(st.ten||"ĐỀ KIỂM TRA ĐỊNH KỲ")}</h1><p class="sub">Học phần: ${esc(hpTen||"")} · Thời gian: ${st.tg} phút · ${n} câu</p>${body}
  <section class="key"><h1>ĐÁP ÁN</h1><div>${ks.map(k=>`<p style="margin:2px 0">${k}</p>`).join("")}</div></section></body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),300)}
async function dtSaveDe(hp,old,st,key){const err=m=>{const e=$("#dt-err");if(e)e.textContent=m};const E=dtElig(hp,st.nguon);
  st.ten=($("#dt-ten")||{}).value?$("#dt-ten").value.trim():st.ten;if(!st.ten)return err("Đặt tên đề (VD: Kiểm tra định kỳ lần 1).");
  let C;try{C=dtCompile(st,E)}catch(x){return err(x.message)}
  const id=old?old.id:"DE-"+dtAbbr(hp)+"-"+Date.now().toString(36).toUpperCase();
  const dots=old?(old.dots||[]):[];const es=[];for(const d of dots){const e=await dgGet(d);if(e)es.push(e)}await dtDem(es,true);
  const lai=es.filter(e=>!(DT.bai[e.id]>0)),giu=es.filter(e=>DT.bai[e.id]>0);
  if(!await confirmDlg((old?"Lưu thay đổi đề ":"Lưu đề ")+st.ten+"?",`${esc(C.mota)} Đề nguồn gồm ${C.qi} câu${C.ti?", "+C.ti+" tình huống":""}. Đáp án lưu riêng, sinh viên không đọc được.${old&&dots.length?` Phát hành lại cho ${lai.length} đợt chưa có bài làm${giu.length?"; "+giu.length+" đợt đã có bài làm ("+giu.map(e=>e.id).join(", ")+") giữ bản cũ":""}.`:""}`,old?"Lưu thay đổi":"Lưu đề"))return;
  const cfg=JSON.parse(JSON.stringify({nguon:st.nguon,kieu:st.kieu,tronCau:st.tronCau,tronDA:st.tronDA,tg:st.tg,mt:st.mt,thSo:st.thSo,thCau:st.thCau,thChs:st.thChs,tong:st.tong,tl:st.tl}));
  const de={id,hp,hpTen:C.P.hpTen,ten:st.ten,cfg,P:C.P,K:C.K,mota:C.mota,n:C.n,thSo:+st.thSo||0,kieu:st.kieu,tg:st.tg,dots,at:new Date().toISOString()};
  try{await S.fs.doc("pnl_nh_de/"+id).set(Object.assign({},de,{created:old&&old.created?old.created:FV().serverTimestamp()}));
    for(const e of lai)await dtPublish(de,e.id);
    delete DT.st[key];DT.deCur=null;DT.des[hp]=null;toast(old?"Đã lưu đề"+(lai.length?", phát hành lại cho "+lai.length+" đợt.":"."):"Đã lưu đề. Bấm Giao cho lớp để đưa vào kiểm tra định kỳ.",5000);location.hash="#nganhang/"+encodeURIComponent(hp)+"/de"}
  catch(x){nhDenied(x);err("Chưa lưu được: "+errMsg(x)+(x&&x.code==="permission-denied"?" — cần cập nhật quy tắc dữ liệu (thanh Cập nhật ngay).":""))}}

/* ---------- giao đề cho lớp (một hoặc nhiều lớp) ---------- */
function dlgGiaoDe(de,after,chon){const dlg=$("#dlg");const hp=de.hp;const now=new Date(),end=new Date(now.getTime()+7*864e5);
  const giao=new Set((de.dots||[]).map(id=>((S.dg||[]).find(x=>x.id===id)||{}).cha).filter(Boolean));
  const ls=S.lop.filter(l=>!l.luuTru).sort((a,b)=>(lopHps(b).includes(hp)-lopHps(a).includes(hp))||String(a.id).localeCompare(String(b.id)));
  dlg.className="wide";dlg.innerHTML=`<div class="dh"><h3>Giao đề “${esc(de.ten||de.id)}” cho lớp</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div><div class="dbody">
  <p class="t-sub" style="margin:0">${esc(de.mota||"")}</p>
  <div class="fld"><label>Lớp nhận đề <span class="hint" style="font-weight:400">(mỗi lớp được chọn có một đợt kiểm tra riêng; lớp chưa gán học phần ${esc(de.hpTen)} sẽ được gán thêm)</span></label>
    <div class="tools" style="align-items:center;margin:0 0 6px"><input type="search" id="gd-q" placeholder="Lọc theo mã, tên lớp…" style="flex:1 1 220px"><button type="button" class="btn sm" data-chkall="[data-gl]">Chọn tất cả</button><button type="button" class="btn sm" data-chknone="[data-gl]">Bỏ chọn</button><span class="t-sub" id="gd-n">Đã chọn 0</span></div>
    <div class="hpchk" style="max-height:240px">${ls.map(l=>{const da=giao.has(l.id);return `<label data-gq="${esc(strip(l.id+" "+lopName(l)))}"><input type="checkbox" data-gl="${esc(l.id)}"${chon===l.id&&!da?" checked":""}${da?" disabled":""}> <b>${esc(l.id)}</b> · ${esc(lopName(l))}${lopHps(l).includes(hp)?"":' <span class="pill gray">chưa gán HP</span>'}${da?' <span class="pill">đã giao</span>':""}</label>`}).join("")||'<span class="t-sub">Chưa có lớp nào.</span>'}</div></div>
  <div class="dtg" style="grid-template-columns:1fr 1fr"><div class="fld"><label for="gd-a">Mở từ</label><input type="datetime-local" id="gd-a" value="${dtLocal(now)}"></div><div class="fld"><label for="gd-b">Đóng lúc</label><input type="datetime-local" id="gd-b" value="${dtLocal(end)}"></div></div>
  <label style="font-weight:500"><input type="checkbox" id="gd-open"> Mở ngay cho sinh viên làm bài trong khung giờ trên (để trống: giao trước, mở sau ở mục Kiểm tra, thi của lớp)</label>
  <p class="err" id="gd-err"></p><div class="df"><button type="button" class="btn" data-x>Hủy</button><button type="button" class="btn pri" data-ok>Giao đề</button></div></div>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());
  const cnt=()=>{$("#gd-n").textContent="Đã chọn "+$$("[data-gl]:checked",dlg).length};cnt();dlg.addEventListener("change",cnt);
  $("#gd-q").oninput=e=>{const q=strip(e.target.value);$$("[data-gq]",dlg).forEach(x=>x.style.display=!q||x.dataset.gq.includes(q)?"":"none")};
  $("[data-ok]",dlg).onclick=async()=>{const err=$("#gd-err");const ids=$$("[data-gl]:checked",dlg).map(x=>x.dataset.gl);if(!ids.length){err.textContent="Chọn ít nhất một lớp.";return}
    const A=new Date($("#gd-a").value),B=new Date($("#gd-b").value);if(isNaN(A)||isNaN(B)||B<=A){err.textContent="Giờ đóng phải sau giờ mở.";return}
    const btn=$("[data-ok]",dlg);btn.disabled=true;btn.textContent="Đang giao…";
    try{const full=de.P?de:Object.assign({id:de.id},(await S.fs.doc("pnl_nh_de/"+de.id).get()).data());const made=[];
      for(const ma of ids){const l=S.lop.find(x=>x.id===ma);const dot=dtNewDot(l,hp,made);made.push(dot);
        await dtPublish(full,dot,{cha:l.id,ten:l.ten||l.id,namHoc:l.namHoc||"",open:$("#gd-open").checked,openAt:dtTs(A),closeAt:dtTs(B),created:FV().serverTimestamp()});
        const lp={dgs:FV().arrayUnion(dot)};const hps=lopHps(l);if(!hps.includes(hp)&&S.admin)lp.hps=hps.concat(hp);/* giảng viên không đổi học phần gắn lớp */await S.fs.doc("pnl_dg_lop/"+l.id).set(lp,{merge:true});
        l.dgs=[...new Set([...(l.dgs||[]),dot])];if(lp.hps)l.hps=lp.hps}
      await S.fs.doc("pnl_nh_de/"+de.id).set({dots:FV().arrayUnion(...made)},{merge:true});de.dots=[...(de.dots||[]),...made];DT.des[hp]=null;
      dlg.close();toast("Đã giao đề cho "+made.length+" lớp: "+made.join(", ")+($("#gd-open").checked?" — đang mở theo khung giờ.":" — mở đợt ở mục Kiểm tra, thi của lớp."),6000);if(after)after()}
    catch(x){nhDenied(x);err.textContent="Chưa giao được: "+errMsg(x);btn.disabled=false;btn.textContent="Giao đề"}}}

/* ---------- tab "Đề kiểm tra" của một lớp: các đợt đã giao + giao thêm đề từ ngân hàng ---------- */
async function tabDeThi(l,head,ma){const hps=lopHps(l);const dgs=await lopDgs(l);await dtDem(dgs);
  let des=[];const errs=[];for(const h of hps){try{des=des.concat(await dtLoadDes(h))}catch(x){if(nhDenied(x))errs.push("rules");else errs.push(errMsg(x))}}
  DT.lopDes=des;
  return `${head}${errs.includes("rules")?nhRulesBox():""}
  <div class="scard"><h2 class="sec" style="margin-top:0">Đợt kiểm tra định kỳ của lớp <span class="t-sub" style="font-weight:400">(sinh viên của lớp thấy ngay trong tài khoản, mục Kiểm tra, thi)</span></h2>
    ${dgs.length?dgs.map(e=>`<div class="row" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--line)"><div><b>${esc(dgTen(e))}</b>${e.deNh&&e.deNh.ten?" — "+esc(e.deNh.ten):""} <span class="pill gray">${esc(e.id)}</span> ${dgMo(e)?'<span class="pill live">đang mở</span>':'<span class="pill gray">chưa mở / đã đóng</span>'}<br><span class="t-sub">${esc(e.deNh?e.deNh.mota:"Đề của trang Đánh giá định kỳ ("+(e.hocPhanTen||e.hocPhan)+")")} · ${DT.bai[e.id]||0} bài đã làm</span></div><a class="btn sm" href="#lop/${encodeURIComponent(ma)}/bt/${encodeURIComponent(e.id)}">${I.exam}Mở / đóng, xem bài</a></div>`).join("")
      :'<p class="t-sub" style="margin:0">Lớp chưa có đợt kiểm tra nào.</p>'}</div>
  <div class="scard"><h2 class="sec" style="margin-top:0">Giao đề từ Ngân hàng câu hỏi</h2>
    ${!hps.length?'<p class="t-sub">Lớp chưa gán học phần — bấm <b>Sửa lớp</b> để chọn học phần.</p>':hps.map(h=>{const ds=des.filter(d=>d.hp===h);return `<div style="padding:8px 0;border-top:1px solid var(--line)"><b>${esc(courseOf(h)?.name||h)}</b> <a class="btn sm" href="#nganhang/${encodeURIComponent(h)}/de/moi" style="margin-left:8px">${I.plus}Tạo đề mới</a> <a class="btn sm" href="#nganhang/${encodeURIComponent(h)}/de">Quản lý đề</a>
      ${ds.length?`<div style="margin-top:6px">${ds.map(d=>`<div class="row" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:4px 0"><span>${esc(d.ten||d.id)} <span class="t-sub">· ${esc(d.mota||"")}</span></span><button type="button" class="btn sm pri" data-giaode="${esc(d.id)}">Giao cho lớp này</button></div>`).join("")}</div>`:'<p class="t-sub" style="margin:6px 0 0">Chưa có đề — bấm Tạo đề mới.</p>'}</div>`}).join("")}
    <p class="t-sub" style="margin:8px 0 0">Đề tạo và sửa ở <b>Ngân hàng câu hỏi › Đề kiểm tra</b>; một đề giao được cho nhiều lớp, mỗi lớp một đợt riêng (mở/đóng, giờ làm bài riêng).</p></div>`}
function bindDeThi(l,ma){$$("[data-giaode]").forEach(b=>b.onclick=()=>{const d=(DT.lopDes||[]).find(x=>x.id===b.dataset.giaode);if(d)dlgGiaoDe(d,()=>viewLopDetail(ma,"de"),ma)})}

/* ---------- công nhận đề đã ra (trước khi có Đề kiểm tra trong ngân hàng) ----------
   Đề đã lưu cho lớp/đợt (deNh, pnl_dg_de, pnl_dg_dap) được chép thành một đề gốc pnl_nh_de và gắn deId — không phải ra lại.
   Chạy một lần mỗi phiên quản trị, bỏ qua nếu quy tắc dữ liệu chưa cập nhật. */
async function dtCongNhan(){if(DT.cn)return 0;DT.cn=true;let n=0;
  const xs=[...S.lop,...(S.dg||[])].filter(e=>e.hocPhan==="nh"&&e.deNh&&e.deNh.hp&&!e.deId);
  for(const e of xs){try{const [p,k]=await Promise.all([S.fs.doc("pnl_dg_de/"+e.id).get(),S.fs.doc("pnl_dg_dap/"+e.id).get()]);if(!p.exists||!k.exists)continue;
      const P=p.data(),K=k.data();delete P.at;delete K.at;const hp=e.deNh.hp;const id="DE-"+dtAbbr(hp)+"-"+e.id;const l=e.cha?S.lop.find(x=>x.id===e.cha):e;
      const cfg=Object.assign({},e.deNh.cfg||{});delete cfg.hp;const ten="Đề đã ra — lớp "+(l?l.id:e.id);
      const de={id,hp,hpTen:e.deNh.hpTen||P.hpTen||hp,ten,cfg,P,K,mota:e.deNh.mota||"",n:e.deNh.n||0,thSo:e.deNh.thSo|0,kieu:e.deNh.kieu||P.kieu||"rieng",tg:+e.thoiGian||40,dots:[e.id],at:e.deNh.at||new Date().toISOString(),congNhan:true,created:FV().serverTimestamp()};
      const ex=await S.fs.doc("pnl_nh_de/"+id).get();if(!ex.exists)await S.fs.doc("pnl_nh_de/"+id).set(de);
      const deNh=Object.assign({},e.deNh,{deId:id,ten});await S.fs.doc("pnl_dg_lop/"+e.id).set({deId:id,deNh},{merge:true});Object.assign(e,{deId:id,deNh});DT.des[hp]=null;n++}
    catch(x){if(nhDenied(x)){DT.cn=false;return 0}console.warn("công nhận đề",e.id,x)}}
  if(n)toast("Đã công nhận "+n+" đề đã ra vào Ngân hàng câu hỏi › Đề kiểm tra (không phải ra lại).",6000);return n}
