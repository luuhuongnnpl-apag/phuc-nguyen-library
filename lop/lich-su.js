/* Lịch sử hoạt động sinh viên (26/11/2026) — đọc pnl_nk (assets/pnl-nk.js ghi) + dữ liệu bài làm pnl_dg_bai.
   Quản trị: tab "Lịch sử hoạt động" trong lớp (theo ngày cho cả lớp, hoặc toàn bộ lịch sử của một sinh viên).
   Sinh viên: "#sv/lichsu" — chỉ xem được của chính mình (quy tắc Firestore). Giờ là giờ máy chủ ghi nhận. */
const LS={};
const nkTen=k=>(window.PNK&&PNK.TEN[k])||k;
const nkMs=v=>!v?0:v.toMillis?v.toMillis():v.seconds?v.seconds*1000:+new Date(v)||0;
const nkGio=ms=>{if(!ms)return "–";const d=new Date(ms);const p=n=>String(n).padStart(2,"0");return p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds())+" "+p(d.getDate())+"/"+p(d.getMonth()+1)+"/"+d.getFullYear()};
const NK_XAU=new Set(["nop-loi","loi-vao","roi-trang","tu-nop"]),NK_TOT=new Set(["nop","bat-dau","thi-thu"]);
/* bài làm kiểm tra định kỳ → các mốc (có cả bài làm trước khi có nhật ký) */
function nkTuBai(b){const o=[],dot=b.maLop;
  if(b.startedAt)o.push({luc:nkMs(b.startedAt),loai:"bat-dau",dot,nd:"Theo dữ liệu bài làm",nguon:"bai"});
  if(b.luu&&b.status!=="da-nop")o.push({luc:nkMs(b.luu),loai:"luu",dot,nd:"Lần lưu cuối cùng (chưa nộp)",nguon:"bai"});
  if(b.submittedAt)o.push({luc:nkMs(b.submittedAt),loai:"nop",dot,nd:"Theo dữ liệu bài làm"+((b.roiTrang|0)?" · rời trang "+(b.roiTrang|0)+" lần":""),nguon:"bai"});
  return o.map(x=>Object.assign({mssv:b.mssv},x))}
function nkBang(xs,coTen,ten){if(!xs.length)return '<div class="empty">Chưa có hoạt động nào được ghi nhận.</div>';
  return `<div class="tbl"><table><thead><tr><th style="white-space:nowrap">Thời gian (máy chủ)</th>${coTen?"<th>Sinh viên</th>":""}<th>Hoạt động</th><th>Chi tiết</th><th>Thiết bị</th></tr></thead><tbody>
  ${xs.map(x=>`<tr><td style="white-space:nowrap;font-variant-numeric:tabular-nums">${nkGio(x.luc)}</td>${coTen?`<td><b>${esc(ten(x.mssv))}</b><br><span style="font-size:12px;color:var(--muted)">${esc(x.mssv)}</span></td>`:""}
    <td><span class="pill ${NK_XAU.has(x.loai)?"bad":NK_TOT.has(x.loai)?"":"gray"}">${esc(nkTen(x.loai))}</span>${x.nguon==="bai"?'<br><span style="font-size:11px;color:var(--muted)">từ bài làm</span>':""}</td>
    <td>${x.dot?"<b>"+esc(x.dot)+"</b> · ":""}${x.diem!=null?"Điểm "+String(x.diem).replace(".",",")+" · ":""}${esc(x.nd||(x.hp&&!x.dot?x.hp:"")||"")}</td><td style="font-size:12.5px;color:var(--muted)">${esc(x.tb||"")}</td></tr>`).join("")}</tbody></table></div>`}
async function nkCuaSv(mssv,admin){const q=await S.fs.collection("pnl_nk").where("mssv","==",mssv).get();let xs=q.docs.map(d=>Object.assign(d.data(),{luc:nkMs(d.data().luc)}));
  if(admin){try{(await S.fs.collection("pnl_dg_bai").where("mssv","==",mssv).get()).docs.forEach(d=>xs=xs.concat(nkTuBai(d.data())))}catch(e){console.warn(e)}}
  return xs.sort((a,b)=>b.luc-a.luc)}
async function tabLichSu(l,rows,head,ma){const st=LS[ma]||(LS[ma]={ngay:todayISO(),sv:"",loai:""});let xs=[],err="";
  const tenOf=m=>(rows.find(r=>normId(r.mssv)===m)||{}).hoTen||"";
  try{if(st.sv)xs=await nkCuaSv(st.sv,true);
    else{const q=await S.fs.collection("pnl_nk").where("lop","array-contains",ma).where("ngay","==",st.ngay).get();xs=q.docs.map(d=>Object.assign(d.data(),{luc:nkMs(d.data().luc)})).sort((a,b)=>b.luc-a.luc)}}
  catch(e){err=e&&e.code==="permission-denied"?"Máy chủ chưa mở quyền đọc lịch sử — bấm “Cập nhật ngay” trên thanh quy tắc ở đầu trang Quản trị.":errMsg(e)}
  const loaiCo=[...new Set(xs.map(x=>x.loai))];const ds=st.loai?xs.filter(x=>x.loai===st.loai):xs;
  const svSo=new Set(xs.map(x=>x.mssv)).size;
  return `${head}<form class="tools" id="ls-f" style="align-items:flex-end;flex-wrap:wrap;gap:10px">
    <div class="fld" style="margin:0"><label for="ls-sv">Sinh viên</label><select id="ls-sv"><option value="">Cả lớp (theo ngày)</option>${rows.map(r=>`<option value="${esc(normId(r.mssv))}"${st.sv===normId(r.mssv)?" selected":""}>${esc(r.hoTen)} · ${esc(normId(r.mssv))}</option>`).join("")}</select></div>
    <div class="fld" style="margin:0"><label for="ls-ngay">Ngày</label><input type="date" id="ls-ngay" value="${esc(st.ngay)}"${st.sv?" disabled":""}></div>
    <div class="fld" style="margin:0"><label for="ls-loai">Hoạt động</label><select id="ls-loai"><option value="">Tất cả</option>${loaiCo.map(k=>`<option value="${esc(k)}"${st.loai===k?" selected":""}>${esc(nkTen(k))}</option>`).join("")}</select></div>
    <button type="submit" class="btn pri">${I.search||""}Xem</button></form>
  ${err?`<div class="empty" style="text-align:left;border-color:var(--warn);background:var(--warn-soft);color:var(--warn)">${esc(err)}</div>`:""}
  <p class="t-sub">${st.sv?`Toàn bộ lịch sử của <b>${esc(tenOf(st.sv)||st.sv)}</b>: ${ds.length} mốc (gồm nhật ký hoạt động và mốc bắt đầu/nộp lấy từ bài làm).`:`Ngày ${esc(fmtISO(st.ngay))}: ${ds.length} hoạt động của ${svSo} sinh viên.`} Giờ là giờ máy chủ ghi nhận, sinh viên không sửa được. Nhật ký bắt đầu ghi từ 26/11/2026; trước đó chỉ có mốc bắt đầu/nộp trong bài làm.</p>
  ${nkBang(ds,!st.sv,tenOf)}`}
function bindLichSu(ma){const f=$("#ls-f");if(!f)return;const st=LS[ma];
  $("#ls-sv").onchange=e=>{$("#ls-ngay").disabled=!!e.target.value};
  f.onsubmit=e=>{e.preventDefault();st.sv=$("#ls-sv").value;st.ngay=$("#ls-ngay").value||todayISO();st.loai=$("#ls-loai").value;viewLopDetail(ma,"ls")}}
async function viewSvLichSu(){const me=svMe();let xs=[],err="";
  if(S.sv){try{xs=await nkCuaSv(me.mssv,false)}catch(e){err=e&&e.code==="permission-denied"?"Chưa xem được lịch sử (máy chủ chưa cập nhật quyền hoặc phiên đăng nhập hết hạn — đăng xuất rồi đăng nhập lại).":errMsg(e)}
    try{(await S.fs.collection("pnl_dg_bai").where("uid","==",S.sv.uid).get()).docs.forEach(d=>{if(d.data().mssv===me.mssv)xs=xs.concat(nkTuBai(d.data()))});xs.sort((a,b)=>b.luc-a.luc)}catch(e){}}
  const body=`<main>${svHead(me,`<a class="back" href="#sv">${I.back}Bảng điều khiển</a><span class="sep">/</span><span class="sub">Lịch sử hoạt động</span>`)}
  <div class="page"><h1 class="t">Lịch sử hoạt động của tôi</h1>
  <p class="note">Hệ thống tự ghi mỗi lần bạn đăng nhập, ôn tập, thi thử, vào/bắt đầu/lưu/nộp bài kiểm tra, rời trang khi đang làm bài và khi nộp bài không thành công. Thời gian là giờ máy chủ. Khi thắc mắc “đã làm bài mà không có điểm”, hãy xem mục này trước: chỉ bài có dòng <b>Nộp bài kiểm tra</b> mới được tính là đã nộp.</p>
  ${err?`<div class="empty" style="text-align:left;border-color:var(--warn);background:var(--warn-soft);color:var(--warn)">${esc(err)}</div>`:""}
  ${S.sv?nkBang(xs,false):'<div class="empty">Trang này hiện lịch sử khi sinh viên đăng nhập bằng tài khoản của mình.</div>'}</div></main>`;
  $("#app").innerHTML=rail(SV_RAIL(),true,"lichsu")+body;bindOut()}
