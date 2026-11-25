/* Nhật ký hoạt động sinh viên — PNL (26/11/2026)
   Mỗi việc sinh viên làm khi đã đăng nhập tài khoản lớp (đăng nhập, ôn tập, thi thử, vào/bắt đầu/lưu/nộp bài kiểm tra,
   rời trang, lỗi nộp bài, xem điểm…) được ghi một dòng vào pnl_nk. Giờ ghi là giờ máy chủ (không sửa được từ máy sinh viên).
   Sinh viên chỉ xem được nhật ký của chính mình; quản trị xem theo lớp / theo sinh viên (lop/ → Lịch sử hoạt động).
   Dùng: PNK.log(loai, {dot, hp, nd, diem}, {once:"khóa", ms:thời gian}) — once: không ghi lặp trong khoảng ms (mặc định 1 giờ). */
(function(){
  const acc=()=>{try{const x=JSON.parse(localStorage.getItem("pnl-lop-sv")||"null");return x&&x.mssv&&x.uid?x:null}catch(e){return null}};
  const thietBi=()=>{const u=navigator.userAgent||"";
    const os=/Android/.test(u)?"Android":/iPhone|iPad|iPod/.test(u)?"iOS":/Windows/.test(u)?"Windows":/Mac OS/.test(u)?"macOS":/CrOS/.test(u)?"ChromeOS":/Linux/.test(u)?"Linux":"khác";
    const br=/Edg\//.test(u)?"Edge":/OPR\/|Opera/.test(u)?"Opera":/CocCoc|coc_coc/i.test(u)?"Cốc Cốc":/CriOS|Chrome\//.test(u)?"Chrome":/FxiOS|Firefox/.test(u)?"Firefox":/Safari/.test(u)?"Safari":"khác";
    return (/Mobi|iPhone|Android(?!.*Tablet)/.test(u)?"Điện thoại":"Máy tính")+" · "+os+" · "+br};
  const ngayVN=()=>{const d=new Date(Date.now()+7*36e5);return d.toISOString().slice(0,10)};
  const sach=o=>{const r={};if(!o)return r;
    if(o.dot)r.dot=String(o.dot).slice(0,60);if(o.hp)r.hp=String(o.hp).slice(0,60);if(o.nd)r.nd=String(o.nd).slice(0,400);
    if(o.diem!=null&&!isNaN(+o.diem))r.diem=+o.diem;return r};
  async function log(loai,o,opt){
    try{
      if(!window.firebase||!firebase.apps||!firebase.apps.length)return false;
      const a=acc(),u=firebase.auth().currentUser;if(!a||!u||u.uid!==a.uid)return false;
      if(opt&&opt.once){const k="pnl-nk:"+a.mssv+":"+loai+":"+opt.once;
        try{const t=+sessionStorage.getItem(k)||0;if(Date.now()-t<(opt.ms||36e5))return false;sessionStorage.setItem(k,String(Date.now()))}catch(e){}}
      await firebase.firestore().collection("pnl_nk").add(Object.assign({mssv:a.mssv,uid:u.uid,lop:Array.isArray(a.lop)?a.lop.slice(0,10).map(String):[],
        loai:String(loai).slice(0,29),ngay:ngayVN(),tb:thietBi(),luc:firebase.firestore.FieldValue.serverTimestamp()},sach(o)));
      return true;
    }catch(e){console.warn("Nhật ký hoạt động:",e&&(e.code||e.message));return false}
  }
  /* tên hiển thị của từng loại việc (dùng chung cho trang quản trị và trang sinh viên) */
  const TEN={"dang-nhap":"Đăng nhập","dang-xuat":"Đăng xuất","doi-mk":"Đổi mật khẩu","on-tap":"Mở trang ôn tập","on-tap-muc":"Ôn tập","thi-thu":"Nộp bài thi thử",
    "vao-kt":"Vào trang Kiểm tra, thi","bat-dau":"Bắt đầu bài kiểm tra","tiep-tuc":"Mở lại bài đang làm","luu":"Lưu bài","roi-trang":"Rời trang làm bài",
    "nop":"Nộp bài kiểm tra","tu-nop":"Hệ thống tự nộp bài","nop-loi":"Nộp bài KHÔNG thành công","loi-vao":"Không vào được bài","xem-diem":"Xem điểm","xem-lai":"Xem lại bài làm"};
  window.PNK={log,acc,TEN};
})();
