"use strict";
/* PHÚC NGUYÊN LIBRARY — Tự cập nhật quy tắc Firestore cho PNL (18/11/2026).
   Khi quản trị đăng nhập: đọc thử pnl_rules_v/<phiên bản trong firebase/firestore-pnl.rules>.
   Bị chặn = quy tắc trên máy chủ cũ hơn kho → hiện thanh "Cập nhật ngay". Bấm: đăng nhập Google (tài khoản có quyền
   trên dự án Firebase), đọc bản quy tắc đang chạy, thay đúng khối PNL (dòng "===== PNL" … dòng "Hết khối PNL" cuối),
   giữ nguyên phần PNW, PND, rồi xuất bản qua Firebase Rules API. Máy chủ kiểm tra cú pháp trước; lỗi thì không đổi gì. */
const RS={v:null,ok:null,busy:false};
const RS_API="https://firebaserules.googleapis.com/v1/";
async function rsRepo(){const t=await (await fetch("../firebase/firestore-pnl.rules?t="+Date.now(),{cache:"no-store"})).text();
  const m=t.match(/pnl_rules_v\/\{v\}\s*\{\s*allow get: if v == '([^']+)'/);if(!m)throw new Error("Không đọc được phiên bản quy tắc trong kho.");return {text:t,v:m[1]}}
function rsMerge(live,repo){const block=t=>{const L=t.split("\n");const a=L.findIndex(l=>/=====\s*PNL\b/.test(l));let b=-1;L.forEach((l,i)=>{if(/Hết khối PNL/.test(l))b=i});return a<0||b<a?null:{L,a,b}};
  const r=block(repo),l=block(live);if(!r)throw new Error("Kho GitHub thiếu khối quy tắc PNL.");
  if(!l)throw new Error("Quy tắc đang chạy không có dấu mốc khối PNL (dòng \"===== PNL\" và \"Hết khối PNL\") — báo Claude xử lý.");
  return l.L.slice(0,l.a).concat(r.L.slice(r.a,r.b+1),l.L.slice(l.b+1)).join("\n")}
/* Đọc thử bằng REST KHÔNG đăng nhập (như sinh viên/khách): quản trị có quyền đọc mọi thứ nên không dùng phiên quản trị để thử.
   404 = được phép, chưa có tài liệu → quy tắc đã cập nhật; 403 = bị chặn → quy tắc cũ; lỗi mạng → không rõ (null). */
async function rsProbe(v){try{const r=await fetch("https://firestore.googleapis.com/v1/projects/"+FB_CFG.projectId+"/databases/(default)/documents/pnl_rules_v/"+encodeURIComponent(v)+"?key="+FB_CFG.apiKey,{cache:"no-store"});
    if(r.status===403)return false;if(r.status===404||r.ok)return true;return null}catch(e){return null}}
async function rsCheck(){if(!S.admin)return RS.ok;try{const r=await rsRepo();RS.v=r.v;RS.ok=await rsProbe(r.v)}catch(e){RS.ok=null}rsBar();return RS.ok}
function rsBar(){let b=document.getElementById("rs-bar");if(RS.ok!==false||!S.admin){if(b)b.remove();return}
  if(!b){b=document.createElement("div");b.id="rs-bar";b.setAttribute("role","status");document.body.appendChild(b)}
  b.innerHTML=`<div><b>Máy chủ dữ liệu cần cập nhật quy tắc</b> để chạy tính năng mới (Ngân hàng câu hỏi…).<br><span>Bấm <b>Cập nhật ngay</b> → chọn tài khoản Google đã tạo dự án Firebase. Nếu Google báo "chưa xác minh", bấm <b>Nâng cao</b> → <b>Đi tới…</b>.</span><span id="rs-msg"></span></div><button type="button" class="btn sm pri" id="rs-go">Cập nhật ngay</button>`;
  document.getElementById("rs-go").onclick=rsRun}
function rsErr(x){const c=x&&x.code||"";if(c==="auth/popup-closed-by-user"||c==="auth/cancelled-popup-request")return "Cửa sổ đăng nhập đã đóng — bấm Cập nhật ngay để thử lại.";
  if(c==="auth/popup-blocked")return "Trình duyệt chặn cửa sổ đăng nhập — cho phép cửa sổ bật lên rồi bấm lại.";
  if(x&&x.status===403)return "Tài khoản vừa chọn chưa có quyền sửa quy tắc của dự án Firebase. Bấm lại và chọn tài khoản Google khác (tài khoản đã tạo dự án).";
  if(x&&x.status===400)return "Máy chủ báo quy tắc mới có lỗi nên chưa đổi gì: "+(x.message||"")+" — báo Claude.";
  return "Chưa cập nhật được: "+((x&&x.message)||x)}
async function rsRun(){if(RS.busy)return;RS.busy=true;const msg=t=>{const m=document.getElementById("rs-msg");if(m)m.textContent=t;const m2=document.getElementById("nh-rsmsg");if(m2)m2.textContent=t};
  const btns=[...document.querySelectorAll("#rs-go,[data-rsgo]")];btns.forEach(b=>b.disabled=true);let auth2=null;
  try{msg("Đang mở cửa sổ đăng nhập Google…");const repo=await rsRepo();
    const app2=firebase.apps.find(a=>a.name==="pnl-rules")||firebase.initializeApp(FB_CFG,"pnl-rules");auth2=app2.auth();
    const p=new firebase.auth.GoogleAuthProvider();p.addScope("https://www.googleapis.com/auth/firebase");p.setCustomParameters({prompt:"select_account"});
    const r=await auth2.signInWithPopup(p);const tok=r&&r.credential&&r.credential.accessToken;if(!tok)throw new Error("Google không cấp quyền truy cập.");
    const call=async(url,opt)=>{const res=await fetch(url,Object.assign({headers:{Authorization:"Bearer "+tok,"Content-Type":"application/json"}},opt||{}));
      const j=await res.json().catch(()=>({}));if(!res.ok){const e=new Error((j.error&&j.error.message)||("HTTP "+res.status));e.status=res.status;throw e}return j};
    msg("Đang đọc quy tắc đang chạy…");const proj="projects/"+FB_CFG.projectId;
    const rel=await call(RS_API+proj+"/releases/cloud.firestore");const cur=await call(RS_API+rel.rulesetName);
    const files=(cur.source&&cur.source.files)||[];const f=files.find(x=>/=====\s*PNL\b/.test(x.content||""))||files[0];if(!f)throw new Error("Không đọc được tệp quy tắc đang chạy.");
    const merged=rsMerge(f.content,repo.text);
    if(merged!==f.content){msg("Đang kiểm tra và xuất bản quy tắc mới…");
      const nr=await call(RS_API+proj+"/rulesets",{method:"POST",body:JSON.stringify({source:{files:files.map(x=>x===f?{name:x.name,content:merged}:{name:x.name,content:x.content})}})});
      await call(RS_API+proj+"/releases/cloud.firestore",{method:"PATCH",body:JSON.stringify({release:{name:proj+"/releases/cloud.firestore",rulesetName:nr.name}})})}
    msg("Đã xuất bản. Đang chờ máy chủ áp dụng (tối đa khoảng 1 phút)…");
    let ok=false;for(let i=0;i<18&&!ok;i++){ok=(await rsProbe(repo.v))===true;if(!ok)await new Promise(z=>setTimeout(z,5000))}
    RS.ok=ok;if(ok){toast("Đã cập nhật quy tắc dữ liệu. Tính năng mới dùng được ngay.",5000);if(typeof nhAutoSync==="function"){NH_AUTO.done=false;nhAutoSync()}if(typeof NH!=="undefined"){NH.denied=false;NH.all=null;NH.byHp={};NH.tomb={};NH.syncRes=null;NH.synced={}}rsBar();render()}
    else msg("Đã xuất bản nhưng máy chủ chưa áp dụng. Chờ 1–2 phút rồi tải lại trang.")}
  catch(x){msg(rsErr(x))}
  finally{RS.busy=false;btns.forEach(b=>b.disabled=false);try{if(auth2)await auth2.signOut()}catch(e){}}}
