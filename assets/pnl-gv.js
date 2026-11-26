/* PHÚC NGUYÊN LIBRARY — phiên giảng viên dùng chung cho các trang quản trị Đánh giá định kỳ (27/11/2026).
   Giảng viên đăng nhập ở lop/ (ID + mã quản trị cấp): localStorage "pnl-lop-gv" {id, uid, …} + pnl_phien_gv/{uid} trên máy chủ.
   PNGV.check(db,user) → {id, ten, lop[], hp[]} nếu phiên còn hợp lệ, ngược lại null.
   Quy tắc Firestore (bản 20261127a) giới hạn giảng viên trong lớp, đợt (cha = lớp) và học phần được giao. */
(function(){
  "use strict";
  const KEY="pnl-lop-gv";
  async function check(db,u){
    try{const s=JSON.parse(localStorage.getItem(KEY)||"null");
      if(!s||!s.id||!u||!u.isAnonymous||s.uid!==u.uid)return null;
      const p=await db.doc("pnl_phien_gv/"+u.uid).get();if(!p.exists||p.data().gv!==s.id)return null;
      const a=(await db.doc("pnl_gv/"+s.id).get()).data()||{};if(a.khoa)return null;
      return {id:s.id,ten:a.ten||s.id,lop:a.lop||[],hp:a.hp||[]}}
    catch(e){return null}}
  /* lớp hoặc đợt thuộc phạm vi giảng viên */
  const allowed=(gv,l)=>!!gv&&!!l&&((gv.lop||[]).includes(l.id)||(!!l.cha&&(gv.lop||[]).includes(l.cha)));
  /* các lớp được giao và đợt con của chúng (đọc từng tài liệu: giảng viên không liệt kê được toàn bộ pnl_dg_lop) */
  async function classes(db,gv){const out=[];
    await Promise.all((gv.lop||[]).map(async ma=>{try{const d=await db.doc("pnl_dg_lop/"+ma).get();if(!d.exists)return;const l={id:ma,...d.data()};out.push(l);
      await Promise.all((l.dgs||[]).map(async id=>{try{const e=await db.doc("pnl_dg_lop/"+id).get();if(e.exists)out.push({id,...e.data()})}catch(x){}}))}catch(x){}}));
    return out}
  window.PNGV={check,allowed,classes};
})();
