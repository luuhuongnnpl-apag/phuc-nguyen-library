"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const API="https://asia-southeast1-phuc-nguyen-library.cloudfunctions.net/vanDapApi";
  const FB={apiKey:"AIzaSyCIYY-dzhJ4rUYsXvBQivIxcziUC3hR1-U",authDomain:"phuc-nguyen-library.firebaseapp.com",projectId:"phuc-nguyen-library",appId:"1:842652271567:web:23b95b5c4d6061497988ba"};
  function report(m,bad=false){$("status").textContent=m;$("status").classList.toggle("error",bad)}
  if(typeof firebase==="undefined"){report("Không tải được thư viện Firebase.",true);return}
  if(!firebase.apps.length)firebase.initializeApp(FB);
  const auth=firebase.auth();
  async function request(action,settings,extra={}){
    const user=auth.currentUser;if(!user||user.isAnonymous)throw Error("Chưa đăng nhập bằng tài khoản quản trị.");
    const token=await user.getIdToken();
    let response;
    try{response=await fetch(API,{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({action,settings,...extra})})}
    catch{throw Error("Chưa kết nối được máy chủ khảo thí Firebase Functions. Đăng nhập Firebase đã thành công, nhưng dịch vụ vanDapApi có thể chưa được triển khai hoặc chưa cho phép truy cập. Cần kích hoạt máy chủ trước khi lưu cấu hình.");}
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||"Máy chủ không phản hồi: "+response.status);
    return data;
  }
  let pendingQuestionId=null;
  function fill(s){
    $("duration").value=String(s.durationMinutes||40);
    $("branches").value=String(s.targetBranches||4);
    $("gradingMode").value=s.gradingMode||"ai_review";
    $("rubricVersion").value=s.rubricVersion||"draft-1";
  }
  async function load(){
    report("Đang đọc cấu hình từ Firebase...");
    const r=await request("settings_get");fill(r.settings);
    $("settingsSection").hidden=false;$("questionSection").hidden=false;report("Đã tải cấu hình. Thay đổi chỉ có hiệu lực với phiên thi bắt đầu sau khi lưu.");
  }
  async function checkServer(){
    const btn=document.getElementById("checkServer");if(btn)btn.disabled=true;
    try{
      const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),8000);
      try{
        const response=await fetch(API,{method:"GET",cache:"no-store",signal:ctrl.signal});
        if(!response.ok)throw Error("HTTP "+response.status);
        const data=await response.json();
        if(!data.ok)throw Error("Phản hồi không hợp lệ");
        report("Máy chủ vanDapApi đã phản hồi. Nếu chưa tải được cấu hình, hãy kiểm tra quyền tài khoản.",false);
      }finally{clearTimeout(timeout)}
    }catch{
      report("Máy chủ khảo thí Firebase Functions chưa phản hồi. Website đã hoạt động nhưng không thể lưu cấu hình hay tổ chức thi khi vanDapApi chưa được triển khai và cấp quyền.",true);
    }finally{if(btn)btn.disabled=false}
  }
  document.getElementById("checkServer")?.addEventListener("click",checkServer);
  auth.onAuthStateChanged(async user=>{
    $("who").textContent=user&&!user.isAnonymous?(user.email||"Đã đăng nhập"):"";
    $("signOut").hidden=!(user&&!user.isAnonymous);
    $("settingsSection").hidden=true;$("questionSection").hidden=true;
    if(user&&!user.isAnonymous)try{await load()}catch(e){report("Không đọc được cấu hình: "+e.message,true)}
  });
  $("signIn").onclick=async()=>{const btn=$("signIn");btn.disabled=true;try{await auth.signInWithEmailAndPassword($("email").value.trim(),$("password").value);$("password").value=""}catch(e){report("Đăng nhập không thành công: "+e.message,true)}finally{btn.disabled=false}};
  $("signOut").onclick=()=>auth.signOut();
  $("reloadSettings").onclick=()=>load().catch(e=>report(e.message,true));
  $("createQuestion").onclick=async()=>{
    const btn=$("createQuestion");btn.disabled=true;
    try{
      const question={hocPhan:$("courseName").value.trim(),soDe:$("ticketNumber").value.trim(),
        tinhHuong:$("caseFacts").value.trim(),cauHoi:$("rootQuestion").value.trim()};
      const r=await request("question_create",null,{question});
      pendingQuestionId=r.id;$("publishQuestion").disabled=false;
      $("questionResult").textContent="Đã tạo đề nháp với mã "+r.id+". Kiểm tra lại tình huống rồi bấm duyệt.";
    }catch(e){$("questionResult").textContent="Lỗi tạo đề: "+e.message}finally{btn.disabled=false}
  };
  $("publishQuestion").onclick=async()=>{
    if(!pendingQuestionId)return;
    if(!confirm("Xác nhận đề đã được rà soát pháp lý và cho phép bốc thăm?"))return;
    const btn=$("publishQuestion");btn.disabled=true;
    try{
      await request("question_publish",null,{questionId:pendingQuestionId,published:true});
      $("questionResult").textContent="Đã duyệt và công bố đề. Hệ thống bốc thăm chỉ lấy các đề đã duyệt.";
      pendingQuestionId=null;
    }catch(e){btn.disabled=false;$("questionResult").textContent="Lỗi duyệt đề: "+e.message}
  };
  $("saveSettings").onclick=async()=>{
    const btn=$("saveSettings");btn.disabled=true;
    try{
      const settings={durationMinutes:Number($("duration").value),targetBranches:Number($("branches").value),gradingMode:$("gradingMode").value,rubricVersion:$("rubricVersion").value};
      const r=await request("settings_save",settings);fill(r.settings);
      report("Đã lưu cấu hình vào Firebase. Phiên thi đã bắt đầu không bị thay đổi.");
    }catch(e){report("Chưa lưu được cấu hình: "+e.message,true)}finally{btn.disabled=false}
  };
})();