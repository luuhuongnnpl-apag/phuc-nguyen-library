"use strict";
/* PHÚC NGUYÊN LIBRARY — Giảng viên & phân quyền (27/11/2026)
   Quản trị (Google) cấp tài khoản giảng viên: ID = tên viết liền không dấu, mật khẩu = mã quản trị cấp (giảng viên tự đổi sau).
   Mỗi giảng viên được giao: lop[] (mã lớp gốc) và hp[] (học phần). Trong phạm vi được giao, giảng viên:
     - xem bài, chấm, sửa điểm; mở/khóa đợt kiểm tra, giao đề; quản lý danh sách sinh viên, điểm danh, bài tập, bảng tin;
     - sửa nội dung học phần (Ngân hàng câu hỏi, xuất bản lên web ôn tập) và các tính năng khác của lớp, học phần đó.
   Quy tắc Firestore (firebase/firestore-pnl.rules, bản 20261127a) chặn ở máy chủ mọi thao tác ngoài phạm vi.
   Dữ liệu: pnl_gv/{id} {ten, email, pw, pwDefault, lop, hp, khoa, created, updated}; pnl_gv_ma/{id} {ma} (bản rõ, chỉ quản trị). */
const GVQ={list:null,ma:{}};
const GV_CHU="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function gvMaMoi(){const a=new Uint32Array(8);crypto.getRandomValues(a);return [...a].map(x=>GV_CHU[x%GV_CHU.length]).join("")}
async function gvLoadAll(){const [q,m]=await Promise.all([S.fs.collection("pnl_gv").get(),S.fs.collection("pnl_gv_ma").get().catch(()=>({docs:[]}))]);
  GVQ.list=q.docs.map(d=>Object.assign({id:d.id},d.data()||{})).sort((a,b)=>String(a.ten||a.id).localeCompare(String(b.ten||b.id),"vi"));
  GVQ.ma={};m.docs.forEach(d=>GVQ.ma[d.id]=(d.data()||{}).ma||"");return GVQ.list}
const gvChip=(t,title)=>`<span class="pill gray" title="${esc(title||t)}" style="margin:2px 4px 2px 0">${esc(t)}</span>`;
async function viewGiangVien(){$("#app").innerHTML=shell("giangvien",`<div class="page"><div class="empty">Đang tải tài khoản giảng viên…</div></div>`);bindOut();
  let err="";try{await gvLoadAll()}catch(x){GVQ.list=[];err=x&&x.code==="permission-denied"?"Máy chủ dữ liệu chưa có quy tắc Giảng viên. Vào <a href=\"#hethong\">Đồng bộ &amp; quy tắc dữ liệu</a> bấm Cập nhật ngay, rồi mở lại mục này.":errMsg(x)}
  const q=strip(S.q);const list=GVQ.list.filter(g=>!q||strip(g.id+" "+(g.ten||"")+" "+(g.email||"")+" "+(g.lop||[]).join(" ")).includes(q));
  const hpTen=id=>(courseOf(id)||{}).name||id;
  const body=`<div class="page"><div class="bar"><div><h1 class="t">Giảng viên &amp; phân quyền</h1><span class="t-sub">${GVQ.list.length} tài khoản giảng viên · mỗi người chỉ thấy và làm việc trong lớp, học phần được giao</span></div>
      <div class="tools"><button type="button" class="btn pri" data-gvnew>${I.plus}Thêm giảng viên</button><label class="search" style="flex:0 1 300px"><span class="sr">Tìm</span><input type="search" id="q" value="${esc(S.q)}" placeholder="Tìm theo tên, ID, lớp…"></label></div></div>
    ${err?`<div class="empty" style="text-align:left;border-color:var(--warn);background:var(--warn-soft);color:var(--warn)">${err}</div>`:""}
    ${!GVQ.list.length&&!err?`<div class="empty">Chưa có tài khoản giảng viên. Bấm <b>Thêm giảng viên</b>, chọn lớp và học phần giao cho người đó; hệ thống cấp mã đăng nhập.</div>`:""}
    ${list.length?`<div class="scard" style="padding:0"><div class="tbl"><table><thead><tr><th>Giảng viên</th><th>Lớp được giao</th><th>Học phần được giao</th><th>Trạng thái</th><th class="acts"></th></tr></thead><tbody>
      ${list.map(g=>`<tr><td><div class="sv"><div class="av" style="background:${avc(g.ten||g.id)}">${esc(initials(g.ten||g.id))}</div><div><b>${esc(g.ten||g.id)}</b><span>ID: ${esc(g.id)}${g.email?" · "+esc(g.email):""}</span></div></div></td>
        <td>${(g.lop||[]).map(ma=>{const l=S.lop.find(x=>x.id===ma);return gvChip(ma,l?lopName(l):ma)}).join("")||'<span class="muted">—</span>'}</td>
        <td>${(g.hp||[]).map(h=>gvChip(hpTen(h))).join("")||'<span class="muted">—</span>'}</td>
        <td>${g.khoa?'<span class="pill bad">đã khóa</span>':g.pwDefault===false?'<span class="pill">đã đổi mật khẩu</span>':'<span class="pill warn">đang dùng mã được cấp</span>'}</td>
        <td class="acts"><button type="button" class="ico" data-gved="${esc(g.id)}" title="Sửa, giao lớp và học phần" aria-label="Sửa">${I.edit}</button> <button type="button" class="ico key" data-gvma="${esc(g.id)}" title="Cấp lại mã đăng nhập" aria-label="Cấp lại mã">${I.key}</button> <button type="button" class="ico" data-gvkhoa="${esc(g.id)}" title="${g.khoa?"Mở khóa":"Khóa tài khoản"}" aria-label="${g.khoa?"Mở khóa":"Khóa"}">${g.khoa?I.eye:I.out}</button> <button type="button" class="ico" data-gvdel="${esc(g.id)}" title="Xóa tài khoản" aria-label="Xóa">${I.del}</button></td></tr>`).join("")}
      </tbody></table></div></div>`:GVQ.list.length?'<div class="empty">Không có giảng viên nào khớp.</div>':""}
    <p class="note">Giảng viên đăng nhập ở <a href="./">trang Lớp học</a> bằng <b>ID</b> và <b>mã đăng nhập</b> sếp gửi, sau đó tự đổi mật khẩu. Trong lớp và học phần được giao, giảng viên: xem bài, chấm, sửa điểm; mở/khóa đợt kiểm tra, giao đề; quản lý danh sách sinh viên, điểm danh, bài tập, bảng tin; sửa Ngân hàng câu hỏi và xuất bản lên web ôn tập. Không tạo, xóa lớp; không đổi học phần gắn với lớp; không vào Đồng bộ quy tắc, Góp ý, Sinh viên toàn hệ.</p></div>`;
  $("#app").innerHTML=shell("giangvien",body);bindOut();
  $("#q").oninput=e=>{S.q=e.target.value;viewGiangVien().then(()=>keepFocus("#q"))};
  $("[data-gvnew]").onclick=()=>dlgGv(null);
  $$("[data-gved]").forEach(b=>b.onclick=()=>dlgGv(GVQ.list.find(g=>g.id===b.dataset.gved)));
  $$("[data-gvma]").forEach(b=>b.onclick=async()=>{const g=GVQ.list.find(x=>x.id===b.dataset.gvma);
    if(!await confirmDlg("Cấp lại mã đăng nhập cho "+(g.ten||g.id)+"?","Mật khẩu hiện tại của giảng viên hết hiệu lực; dùng mã mới để đăng nhập rồi tự đổi mật khẩu.","Cấp mã mới"))return;
    try{const ma=gvMaMoi();await gvLuu(g.id,{pw:await gvHash(g.id,ma),pwDefault:true},ma);gvBaoMa(g,ma)}catch(x){toast("Chưa cấp được: "+errMsg(x))}});
  $$("[data-gvkhoa]").forEach(b=>b.onclick=async()=>{const g=GVQ.list.find(x=>x.id===b.dataset.gvkhoa);
    try{await gvLuu(g.id,{khoa:!g.khoa});toast(g.khoa?"Đã khóa "+(g.ten||g.id)+".":"Đã mở khóa "+(g.ten||g.id)+".");viewGiangVien()}catch(x){toast("Chưa lưu được: "+errMsg(x))}});
  $$("[data-gvdel]").forEach(b=>b.onclick=async()=>{const g=GVQ.list.find(x=>x.id===b.dataset.gvdel);
    if(!await confirmDlg("Xóa tài khoản giảng viên "+(g.ten||g.id)+"?","Giảng viên không đăng nhập được nữa. Dữ liệu lớp, bài làm, điểm vẫn giữ nguyên.","Xóa tài khoản"))return;
    try{const b2=S.fs.batch();b2.delete(S.fs.doc("pnl_gv/"+g.id));b2.delete(S.fs.doc("pnl_gv_ma/"+g.id));await b2.commit();toast("Đã xóa tài khoản "+g.id+".");viewGiangVien()}catch(x){toast("Chưa xóa được: "+errMsg(x))}})}
async function gvLuu(id,part,ma){const b=S.fs.batch();b.set(S.fs.doc("pnl_gv/"+id),Object.assign({},part,{updated:FV().serverTimestamp()}),{merge:true});
  if(ma)b.set(S.fs.doc("pnl_gv_ma/"+id),{ma,luc:FV().serverTimestamp()});await b.commit();
  const g=(GVQ.list||[]).find(x=>x.id===id);if(g)Object.assign(g,part);if(ma)GVQ.ma[id]=ma}
function gvBaoMa(g,ma){const dlg=$("#dlg");dlg.className="";const txt=`Tài khoản giảng viên Phúc Nguyên Library\nĐăng nhập: ${new URL("./",location.href).href}\nID: ${g.id}\nMã đăng nhập: ${ma}\n(Đăng nhập xong vào Tài khoản của tôi để đổi mật khẩu.)`;
  dlg.innerHTML=`<div class="dh"><h3>Mã đăng nhập của ${esc(g.ten||g.id)}</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
    <div style="display:flex;flex-direction:column;gap:12px"><div class="row"><span>ID</span><b>${esc(g.id)}</b></div><div class="row"><span>Mã đăng nhập</span><b style="font-size:20px;letter-spacing:.12em">${esc(ma)}</b></div>
    <p class="note" style="margin:0">Gửi ID và mã này cho giảng viên. Sếp xem lại mã ở nút sửa tài khoản khi giảng viên chưa đổi mật khẩu.</p>
    <div class="df"><button type="button" class="btn" data-copy>${I.save}Chép nội dung gửi</button><button type="button" class="btn pri" data-x>Xong</button></div></div>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>{dlg.close();viewGiangVien()});
  $("[data-copy]",dlg).onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast("Đã chép.")}catch(e){toast("Trình duyệt chặn chép — chép tay ID và mã.")}}}
function dlgGv(g){const dlg=$("#dlg");const isNew=!g;g=g||{id:"",ten:"",email:"",lop:[],hp:[]};
  const lops=S.lop.slice().sort((a,b)=>(!!a.luuTru-!!b.luuTru)||String(a.id).localeCompare(String(b.id),"vi"));
  const ma=!isNew&&g.pwDefault!==false?GVQ.ma[g.id]:"";
  dlg.className="wide";dlg.innerHTML=`<div class="dh"><h3>${isNew?"Thêm giảng viên":"Sửa tài khoản "+esc(g.ten||g.id)}</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <form id="f-gv"><div class="row2"><div class="fld"><label for="g-ten">Họ và tên *</label><input id="g-ten" value="${esc(g.ten||"")}" required placeholder="VD: Nguyễn Đức Thiện"></div>
    <div class="fld"><label for="g-id">ID đăng nhập *</label><input id="g-id" value="${esc(g.id)}" ${isNew?"":"readonly"} required placeholder="VD: nguyenducthien"><span class="hint">Tên viết liền không dấu, chữ thường; tự gợi ý theo họ tên.</span></div></div>
    <div class="row2"><div class="fld"><label for="g-em">Email (để liên hệ, không bắt buộc)</label><input id="g-em" type="email" value="${esc(g.email||"")}" placeholder="ten@apag.edu.vn"></div>
    <div class="fld"><label>Mã đăng nhập</label><div class="t-sub" style="padding:9px 0">${isNew?"Hệ thống tự cấp khi lưu.":ma?"Đang dùng mã: <b>"+esc(ma)+"</b>":"Giảng viên đã đổi mật khẩu riêng (nút chìa khóa để cấp lại mã)."}</div></div></div>
    <div class="fld"><label>Lớp được giao <button type="button" class="lnk" data-chkall="#g-lop input">Chọn tất cả</button> · <button type="button" class="lnk" data-chknone="#g-lop input">Bỏ chọn</button></label>
      <div class="hpchk" id="g-lop">${lops.map(l=>`<label><input type="checkbox" value="${esc(l.id)}"${(g.lop||[]).includes(l.id)?" checked":""}> ${esc(lopName(l))}${l.luuTru?" (lưu trữ)":""} <span class="hint">· ${esc(lopHpTen(l))}</span></label>`).join("")||'<span class="hint">Chưa có lớp.</span>'}</div>
      <span class="hint">Giảng viên quản lý danh sách, điểm danh, bài tập, đề và điểm của các lớp này.</span></div>
    <div class="fld"><label>Học phần được giao <button type="button" class="lnk" data-gvhplop>Theo lớp đã chọn</button> · <button type="button" class="lnk" data-chknone="#g-hp input">Bỏ chọn</button></label>
      <div class="hpchk" id="g-hp">${S.courses.map(c=>`<label><input type="checkbox" value="${esc(c.id)}"${(g.hp||[]).includes(c.id)?" checked":""}> ${esc(c.name)}</label>`).join("")}</div>
      <span class="hint">Giảng viên sửa nội dung (Ngân hàng câu hỏi, đề, xuất bản web ôn tập) của các học phần này.</span></div>
    <p class="err" id="g-err"></p><div class="df"><button type="button" class="btn" data-x>Hủy</button><button type="submit" class="btn pri">${isNew?"Tạo tài khoản":"Lưu"}</button></div></form>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());
  let idTay=!isNew;$("#g-id").oninput=()=>{idTay=true};
  $("#g-ten").oninput=e=>{if(!idTay)$("#g-id").value=normGv(e.target.value)};
  $("[data-gvhplop]",dlg).onclick=e=>{e.preventDefault();const ids=new Set($$("#g-lop input:checked").flatMap(x=>lopHps(S.lop.find(l=>l.id===x.value))));$$("#g-hp input").forEach(x=>{if(ids.has(x.value))x.checked=true})};
  $("#f-gv").onsubmit=async e=>{e.preventDefault();const err=$("#g-err");err.textContent="";
    const id=normGv($("#g-id").value),ten=$("#g-ten").value.trim().replace(/\s+/g," "),email=$("#g-em").value.trim().toLowerCase();
    if(id.length<3){err.textContent="ID từ 3 ký tự: chữ thường không dấu, số, dấu . _ -";return}if(!ten){err.textContent="Nhập họ và tên.";return}
    const lop=$$("#g-lop input:checked").map(x=>x.value),hp=$$("#g-hp input:checked").map(x=>x.value);
    if(!lop.length&&!hp.length){err.textContent="Giao ít nhất một lớp hoặc một học phần.";return}
    const btn=$("button[type=submit]",dlg);btn.disabled=true;
    try{if(isNew){if((await S.fs.doc("pnl_gv/"+id).get()).exists)throw new Error("ID "+id+" đã có. Đặt ID khác (thêm số hoặc tên đệm).");
        const ma=gvMaMoi();const d={ten,email,lop,hp,khoa:false,pw:await gvHash(id,ma),pwDefault:true,created:FV().serverTimestamp()};
        await gvLuu(id,d,ma);dlg.close();gvBaoMa({id,ten},ma)}
      else{await gvLuu(id,{ten,email,lop,hp});dlg.close();toast("Đã lưu phân quyền của "+ten+".");viewGiangVien()}}
    catch(x){err.textContent="Chưa lưu được: "+(x.message||errMsg(x))}finally{btn.disabled=false}}}

/* Tài khoản của giảng viên: thông tin, phạm vi được giao, đổi mật khẩu */
async function viewGvTaiKhoan(){if(!S.gv){location.hash="#home";return}const g=S.gv;
  const body=`<div class="page" style="max-width:900px"><h1 class="t">Tài khoản của tôi</h1>
    <div class="grid2"><section class="scard"><h2 class="sec">Thông tin</h2><div class="row"><span>Họ và tên</span><b>${esc(g.ten)}</b></div><div class="row"><span>ID</span><b>${esc(g.id)}</b></div>
      <div class="row"><span>Lớp được giao</span><b style="text-align:right">${(g.lop||[]).map(esc).join("<br>")||"—"}</b></div>
      <div class="row"><span>Học phần được giao</span><b style="text-align:right">${(g.hp||[]).map(h=>esc((courseOf(h)||{}).name||h)).join("<br>")||"—"}</b></div>
      <div class="row"><span>Mật khẩu</span>${g.pwDefault?'<span class="pill warn">đang dùng mã quản trị cấp — nên đổi</span>':'<span class="pill">đã đổi mật khẩu riêng</span>'}</div></section>
    <section class="scard"><h2 class="sec">Đổi mật khẩu</h2><form id="f-gpw" style="display:flex;flex-direction:column;gap:12px"><div class="fld"><label for="gp-old">Mật khẩu hiện tại</label><input id="gp-old" type="password" autocomplete="current-password" required></div>
      <div class="fld"><label for="gp-new">Mật khẩu mới (từ 8 ký tự)</label><input id="gp-new" type="password" autocomplete="new-password" minlength="8" required></div><div class="fld"><label for="gp-new2">Nhập lại mật khẩu mới</label><input id="gp-new2" type="password" autocomplete="new-password" minlength="8" required></div>
      <p class="err" id="gp-err"></p><button type="submit" class="btn pri" style="justify-content:center">Đổi mật khẩu</button></form></section></div>
    <p class="note">Phạm vi do quản trị giao. Cần thêm lớp hoặc học phần, báo quản trị.</p></div>`;
  $("#app").innerHTML=shell("taikhoan",body);bindOut();
  $("#f-gpw").onsubmit=async e=>{e.preventDefault();const f=e.target,err=$("#gp-err");err.textContent="";const o=$("#gp-old").value,n=$("#gp-new").value;
    if(n!==$("#gp-new2").value){err.textContent="Hai lần nhập mật khẩu mới chưa giống nhau.";return}if(n===o){err.textContent="Mật khẩu mới phải khác mật khẩu hiện tại.";return}
    const btn=$("button",f);btn.disabled=true;
    try{const hOld=await gvHash(g.id,o),hNew=await gvHash(g.id,n);
      try{await S.fs.doc("pnl_phien_gv/"+g.uid).set({gv:g.id,h:hOld,at:FV().serverTimestamp()})}catch(x){if(x.code==="permission-denied")throw new Error("Mật khẩu hiện tại chưa đúng.");throw x}
      await S.fs.doc("pnl_gv/"+g.id).update({pw:hNew,pwDefault:false,doiLuc:FV().serverTimestamp()});
      await S.fs.doc("pnl_phien_gv/"+g.uid).set({gv:g.id,h:hNew,at:FV().serverTimestamp()});
      g.pwDefault=false;store.set(GV_KEY,g);toast("Đã đổi mật khẩu. Lần sau đăng nhập bằng mật khẩu mới.");viewGvTaiKhoan()}
    catch(x){err.textContent=x.message||errMsg(x)}finally{btn.disabled=false}}}
