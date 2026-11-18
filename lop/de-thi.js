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
  await fs.doc("pnl_dg_de/"+dot).set(Object.assign({},de.P,{deId:de.id,at:FV().serverTimestamp()}));
  await fs.doc("pnl_dg_dap/"+dot).set(Object.assign({},de.K,{deId:de.id,at:FV().serverTimestamp()}));
  const part=Object.assign({deId:de.id,hps:[de.hp],hocPhan:"nh",hocPhanTen:de.hpTen,thoiGian:+de.tg||40,deNh:dtMeta(de)},extra||{});
  await fs.doc("pnl_dg_lop/"+dot).set(part,{merge:true});const ex=(S.dg||[]).find(x=>x.id===dot);if(ex)Object.assign(ex,part);else S.dg.push(Object.assign({id:dot},part));DT.bai[dot]=DT.bai[dot]||0}

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

/* ---------- trang: tạo / sửa một đề ---------- */
async function viewDeNhForm(hp,deId){const c=courseOf(hp);const tok=location.hash;const key=deId||"moi:"+hp;
  const crumb=`<a class="back" href="#nganhang/${encodeURIComponent(hp)}/de">${I.back}Đề kiểm tra ${esc(c.name)}</a><span class="sep">/</span><span class="sub">${deId?"Sửa đề":"Tạo đề mới"}</span>`;
  $("#app").innerHTML=shell("nganhang",`<div class="page"><div class="empty">Đang tải ngân hàng ${esc(c.name)}…</div></div>`,crumb);bindOut();
  let de=null;try{await nhChapters(hp);await nhLoad(hp);if(!NH.synced[hp])await nhSyncOnce(hp);if(deId){const d=await S.fs.doc("pnl_nh_de/"+deId).get();if(!d.exists)throw new Error("Không có đề "+deId);de=Object.assign({id:deId},d.data())}}
  catch(x){if(location.hash!==tok)return;$("#app").innerHTML=shell("nganhang",`<div class="page">${nhDenied(x)?nhRulesBox():`<div class="empty">Chưa tải được: ${esc(errMsg(x))}</div>`}</div>`,crumb);bindOut();return}
  if(location.hash!==tok)return;
  if(!DT.st[key])DT.st[key]=Object.assign(dtDefault(hp),de?JSON.parse(JSON.stringify(de.cfg||{})):{},{hp,ten:de?de.ten||"":""});
  const st=DT.st[key];const E=dtElig(hp,st.nguon);const chs=dtChs(st,E);const tong=dtTong(st),[a,b]=dtCauTH(st,E);
  const opt=(v,t,cur)=>`<option value="${esc(v)}"${String(cur)===String(v)?" selected":""}>${esc(t)}</option>`;
  const cell=(ch,lv)=>{const n=dtCnt(E,ch,lv),v=(st.mt[ch]||{})[lv]||0;return `<td><input type="number" min="0" max="${n}" value="${v||""}" placeholder="0" data-mt="${ch}|${lv}" class="dtn${v>n?" bad":""}"${n?"":" disabled"}><small>/ ${n}</small></td>`};
  const csCh=[...new Set(E.cs.map(v=>v.c.ch|0))].sort((x,y)=>x-y);const nDot=de?(de.dots||[]).length:0;
  const body=`<div class="page" style="max-width:1180px"><div class="bar"><div><h1 class="t">${deId?"Sửa đề "+esc(de.ten||deId):"Tạo đề kiểm tra mới"}</h1><span class="t-sub">${esc(c.name)} · chỉ dùng câu, tình huống <b>đã duyệt</b> trong ngân hàng</span></div></div>
  ${deId&&nDot?`<div class="scard" style="border-color:var(--warn);background:var(--warn-soft)">Đề đang giao cho ${nDot} đợt. Lưu thay đổi: các đợt <b>chưa có bài làm</b> nhận bản đề mới; đợt đã có bài làm giữ bản cũ để điểm đã chấm không sai.</div>`:""}
  <div class="scard"><div class="row2" style="grid-template-columns:2fr 1.3fr 1.3fr 1fr">
    <div class="fld"><label for="dt-ten">Tên đề</label><input id="dt-ten" maxlength="120" value="${esc(st.ten)}" placeholder="VD: Kiểm tra định kỳ lần 1 — Chương 1–3"></div>
    <div class="fld"><label for="dt-ng">Nguồn câu (đã duyệt)</label><select id="dt-ng">${opt("all","Tất cả câu đã duyệt",st.nguon)}${opt("kin","Chỉ câu kín (dành cho ĐGĐK)",st.nguon)}${opt("on","Chỉ câu ôn tập (không kín)",st.nguon)}</select></div>
    <div class="fld"><label for="dt-kieu">Kiểu đề</label><select id="dt-kieu">${opt("rieng","Mỗi SV một đề (rút theo ma trận)",st.kieu)}${opt("chung","Một đề chung cả lớp",st.kieu)}</select></div>
    <div class="fld"><label for="dt-tg">Thời gian (phút)</label><input id="dt-tg" type="number" min="5" max="180" value="${st.tg}"></div></div>
    <div style="display:flex;gap:18px;flex-wrap:wrap"><label style="font-weight:500"><input type="checkbox" id="dt-tc"${st.tronCau?" checked":""}> Đảo thứ tự câu</label><label style="font-weight:500"><input type="checkbox" id="dt-td"${st.tronDA?" checked":""}> Đảo thứ tự phương án</label></div></div>
  <section class="scard"><h2 class="sec" style="margin-top:0">1. Ma trận câu lý thuyết <span class="t-sub" style="font-weight:400">(số câu / số câu đã duyệt sẵn có; để 0 nếu đề không có phần lý thuyết)</span></h2>
    <div class="tools" style="align-items:center"><span class="t-sub">Chia nhanh:</span><input id="dt-tong" type="number" min="0" max="200" value="${st.tong}" style="width:80px" aria-label="Tổng số câu lý thuyết"><span class="t-sub">câu, tỉ lệ NB/TH/VD</span>
      ${st.tl.map((v,i)=>`<input type="number" min="0" max="100" value="${v}" data-tl="${i}" style="width:62px" aria-label="Tỉ lệ ${LVN[DT_LV[i]]}">`).join("")}<span class="t-sub">%</span><button type="button" class="btn sm" data-chia>Chia theo ngân hàng</button><button type="button" class="btn sm" data-xoa>Xóa ma trận</button></div>
    <div class="tbl"><table class="nht dtm"><thead><tr><th>Chương</th>${DT_LV.map(k=>`<th>${LVN[k]}</th>`).join("")}<th>Cộng</th></tr></thead><tbody>
    ${chs.map(ch=>`<tr><td>${esc(nhChName(hp,ch))}</td>${DT_LV.map(lv=>cell(ch,lv)).join("")}<td><b>${DT_LV.reduce((s,lv)=>s+(+((st.mt[ch]||{})[lv])||0),0)}</b></td></tr>`).join("")||`<tr><td colspan="5" class="empty" style="border:0">Ngân hàng học phần này chưa có câu đã duyệt.</td></tr>`}
    <tr><td><b>Cộng</b></td>${DT_LV.map(lv=>`<td><b>${Object.values(st.mt).reduce((s,r)=>s+(+r[lv]||0),0)}</b></td>`).join("")}<td><b>${tong}</b></td></tr></tbody></table></div></section>
  <section class="scard"><h2 class="sec" style="margin-top:0">2. Tình huống <span class="t-sub" style="font-weight:400">(${E.cs.length} tình huống đã duyệt có câu ABCD; để 0 nếu đề không có tình huống)</span></h2>
    <div class="row2" style="grid-template-columns:1fr 1fr 2fr"><div class="fld"><label for="dt-ths">Số tình huống mỗi đề</label><input id="dt-ths" type="number" min="0" max="${E.cs.length}" value="${st.thSo}"></div>
      <div class="fld"><label for="dt-thc">Số câu tối đa mỗi tình huống</label><input id="dt-thc" type="number" min="0" max="20" value="${st.thCau}"><span class="hint">0 = lấy đủ các câu của tình huống (giữ thứ tự)</span></div>
      <div class="fld"><label>Lấy từ chương <span class="hint" style="font-weight:400">(không chọn = mọi chương; các tình huống trong một đề khác chương nhau nếu đủ)</span></label><div class="hpchk" style="max-height:110px">${csCh.map(cc=>`<label><input type="checkbox" data-thch="${cc}"${st.thChs.includes(cc)?" checked":""}> Chương ${cc} (${E.cs.filter(v=>(v.c.ch|0)===cc).length})</label>`).join("")||'<span class="t-sub">Chưa có tình huống.</span>'}</div></div></div></section>
  <div class="scard dtsum"><div><b>Mỗi bài: ${tong+a}${a!==b?"–"+(tong+b):""} câu</b> · ${esc(dtMota(st,E))}<br><span class="t-sub">Điểm thang 10 = số câu đúng / tổng số câu × 10, máy chấm ngay khi sinh viên nộp.</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" data-xem>${I.eye}Xem thử một đề</button><button type="button" class="btn pri" data-luu>${deId?"Lưu thay đổi":"Lưu đề"}</button></div></div>
  <p class="err" id="dt-err">${esc(st.thieu||"")}</p></div>`;
  $("#app").innerHTML=shell("nganhang",body,crumb);bindOut();
  const re=()=>viewDeNhForm(hp,deId).then(()=>{});const on=(sel,f)=>{const el=$(sel);if(el)el.onchange=f};
  on("#dt-ten",e=>{st.ten=e.target.value.trim()});on("#dt-ng",e=>{st.nguon=e.target.value;re()});on("#dt-kieu",e=>{st.kieu=e.target.value;re()});
  on("#dt-tg",e=>{st.tg=Math.max(5,Math.min(180,+e.target.value||40));re()});on("#dt-tc",e=>{st.tronCau=e.target.checked;re()});on("#dt-td",e=>{st.tronDA=e.target.checked;re()});
  on("#dt-tong",e=>{st.tong=Math.max(0,+e.target.value||0)});$$("[data-tl]").forEach(x=>x.onchange=()=>{st.tl[+x.dataset.tl]=Math.max(0,+x.value||0)});
  on("#dt-ths",e=>{st.thSo=Math.max(0,+e.target.value||0);re()});on("#dt-thc",e=>{st.thCau=Math.max(0,+e.target.value||0);re()});
  $$("[data-thch]").forEach(x=>x.onchange=()=>{const cc=+x.dataset.thch;st.thChs=x.checked?[...new Set(st.thChs.concat(cc))]:st.thChs.filter(y=>y!==cc);re()});
  $$("[data-mt]").forEach(x=>x.onchange=()=>{st.thieu="";const [ch,lv]=x.dataset.mt.split("|");const n=Math.max(0,Math.min(+x.max||0,+x.value||0));(st.mt[ch]=st.mt[ch]||{NB:0,TH:0,VD:0})[lv]=n;re()});
  $("[data-chia]").onclick=()=>{dtChia(st,dtElig(hp,st.nguon));re()};$("[data-xoa]").onclick=()=>{st.mt={};re()};
  $("[data-xem]").onclick=()=>{let d;try{d=dtDraw(st,dtElig(hp,st.nguon))}catch(x){$("#dt-err").textContent=x.message;return}dlgDtXem(st,d)};
  $("[data-luu]").onclick=()=>dtSaveDe(hp,de,st,key)}
function dlgDtXem(st,d){const dlg=$("#dlg");let n=0;const qh=x=>{n++;return `<div class="dtq"><b>Câu ${n}.</b> <span class="pill gray">${x.lv} · Ch.${x.ch}</span> ${esc(x.q)}<ol class="nho">${x.o.map((o,j)=>`<li class="${j===x.a?"ok":""}">${esc(o)}</li>`).join("")}</ol>${x.b?`<span class="nhb">Căn cứ: ${esc(x.b)}</span>`:""}</div>`};
  dlg.className="wide nhx";dlg.innerHTML=`<div class="dh"><h3>Xem thử một đề (${d.lt.length+d.th.reduce((s,t)=>s+t.q.length,0)} câu)</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <div class="prev" style="max-height:70vh">${d.lt.map(qh).join("")}${d.th.map((t,i)=>`<div class="case" style="background:#f3f8fb;border-radius:10px;padding:10px 12px;margin:10px 0"><b>Tình huống ${i+1}: ${esc(t.c.title)}</b><p style="white-space:pre-line;margin:6px 0 0">${esc(t.c.text)}</p></div>${t.q.map(qh).join("")}`).join("")}</div>
  <p class="note" style="margin:0">${st.kieu==="chung"?"Bấm Lưu đề để chốt một đề chung — đề chốt là một lần rút mới, có thể khác đề xem thử này.":"Mỗi sinh viên nhận một đề rút ngẫu nhiên theo cùng ma trận; đây là một ví dụ."} Đáp án tô xanh chỉ hiện với giảng viên.</p>
  <div class="df"><button type="button" class="btn" data-x>Đóng</button></div>`;dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close())}
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
    delete DT.st[key];DT.des[hp]=null;toast(old?"Đã lưu đề"+(lai.length?", phát hành lại cho "+lai.length+" đợt.":"."):"Đã lưu đề. Bấm Giao cho lớp để đưa vào kiểm tra định kỳ.",5000);location.hash="#nganhang/"+encodeURIComponent(hp)+"/de"}
  catch(x){nhDenied(x);err("Chưa lưu được: "+errMsg(x)+(x&&x.code==="permission-denied"?" — cần cập nhật quy tắc dữ liệu (thanh Cập nhật ngay).":""))}}

/* ---------- giao đề cho lớp (một hoặc nhiều lớp) ---------- */
function dlgGiaoDe(de,after,chon){const dlg=$("#dlg");const hp=de.hp;const now=new Date(),end=new Date(now.getTime()+7*864e5);
  const giao=new Set((de.dots||[]).map(id=>((S.dg||[]).find(x=>x.id===id)||{}).cha).filter(Boolean));
  const ls=S.lop.filter(l=>!l.luuTru).sort((a,b)=>(lopHps(b).includes(hp)-lopHps(a).includes(hp))||String(a.id).localeCompare(String(b.id)));
  dlg.className="wide";dlg.innerHTML=`<div class="dh"><h3>Giao đề “${esc(de.ten||de.id)}” cho lớp</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <p class="t-sub" style="margin:0 0 8px">${esc(de.mota||"")}</p>
  <div class="fld"><label>Lớp nhận đề <span class="hint" style="font-weight:400">(mỗi lớp được chọn có một đợt kiểm tra riêng; lớp chưa gán học phần ${esc(de.hpTen)} sẽ được gán thêm)</span></label>
    <div class="hpchk" style="max-height:240px">${ls.map(l=>{const da=giao.has(l.id);return `<label><input type="checkbox" data-gl="${esc(l.id)}"${chon===l.id&&!da?" checked":""}${da?" disabled":""}> <b>${esc(l.id)}</b> · ${esc(lopName(l))}${lopHps(l).includes(hp)?"":' <span class="pill gray">chưa gán HP</span>'}${da?' <span class="pill">đã giao</span>':""}</label>`}).join("")||'<span class="t-sub">Chưa có lớp nào.</span>'}</div></div>
  <div class="row2" style="grid-template-columns:1fr 1fr"><div class="fld"><label for="gd-a">Mở từ</label><input type="datetime-local" id="gd-a" value="${dtLocal(now)}"></div><div class="fld"><label for="gd-b">Đóng lúc</label><input type="datetime-local" id="gd-b" value="${dtLocal(end)}"></div></div>
  <label style="font-weight:500"><input type="checkbox" id="gd-open"> Mở ngay cho sinh viên làm bài trong khung giờ trên (để trống: giao trước, mở sau ở mục Kiểm tra, thi của lớp)</label>
  <p class="err" id="gd-err"></p><div class="df"><button type="button" class="btn" data-x>Hủy</button><button type="button" class="btn pri" data-ok>Giao đề</button></div>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());
  $("[data-ok]",dlg).onclick=async()=>{const err=$("#gd-err");const ids=$$("[data-gl]:checked",dlg).map(x=>x.dataset.gl);if(!ids.length){err.textContent="Chọn ít nhất một lớp.";return}
    const A=new Date($("#gd-a").value),B=new Date($("#gd-b").value);if(isNaN(A)||isNaN(B)||B<=A){err.textContent="Giờ đóng phải sau giờ mở.";return}
    const btn=$("[data-ok]",dlg);btn.disabled=true;btn.textContent="Đang giao…";
    try{const full=de.P?de:Object.assign({id:de.id},(await S.fs.doc("pnl_nh_de/"+de.id).get()).data());const made=[];
      for(const ma of ids){const l=S.lop.find(x=>x.id===ma);const dot=dtNewDot(l,hp,made);made.push(dot);
        await dtPublish(full,dot,{cha:l.id,ten:l.ten||l.id,namHoc:l.namHoc||"",open:$("#gd-open").checked,openAt:dtTs(A),closeAt:dtTs(B),created:FV().serverTimestamp()});
        const lp={dgs:FV().arrayUnion(dot)};const hps=lopHps(l);if(!hps.includes(hp))lp.hps=hps.concat(hp);await S.fs.doc("pnl_dg_lop/"+l.id).set(lp,{merge:true});
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
