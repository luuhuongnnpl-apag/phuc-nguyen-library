"use strict";
(function(){
  const $=id=>document.getElementById(id);
  const API="https://asia-southeast1-phuc-nguyen-library.cloudfunctions.net/vanDapApi";
  const FB={apiKey:"AIzaSyCIYY-dzhJ4rUYsXvBQivIxcziUC3hR1-U",authDomain:"phuc-nguyen-library.firebaseapp.com",projectId:"phuc-nguyen-library",appId:"1:842652271567:web:23b95b5c4d6061497988ba"};
  function report(m,bad=false){$("status").textContent=m;$("status").classList.toggle("error",bad)}
  if(typeof firebase==="undefined"){report("Không tải được thư viện Firebase.",true);return}
  if(!firebase.apps.length)firebase.initializeApp(FB);
  const auth=firebase.auth();
  async function request(action,settings){
    const user=auth.currentUser;if(!user||user.isAnonymous)throw Error("Chưa đăng nhập bằng tài khoản quản trị.");
    const token=await user.getIdToken();
    const response=await fetch(API,{method:"POST",headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({action,settings})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||"Máy chủ không phản hồi: "+response.status);
    return data;
  }
  function fill(s){
    $("duration").value=String(s.durationMinutes||40);
    $("branches").value=String(s.targetBranches||4);
    $("gradingMode").value=s.gradingMode||"ai_review";
    $("rubricVersion").value=s.rubricVersion||"draft-1";
  }
  async function load(){
    report("Đang đọc cấu hình từ Firebase...");
    const r=await request("settings_get");fill(r.settings);
    $("settingsSection").hidden=false;report("Đã tải cấu hình. Thay đổi chỉ có hiệu lực với phiên thi bắt đầu sau khi lưu.");
  }
  auth.onAuthStateChanged(async user=>{
    $("who").textContent=user&&!user.isAnonymous?(user.email||"Đã đăng nhập"):"";
    $("signOut").hidden=!(user&&!user.isAnonymous);
    $("settingsSection").hidden=true;
    if(user&&!user.isAnonymous)try{await load()}catch(e){report("Không đọc được cấu hình: "+e.message,true)}
  });
  $("signIn").onclick=async()=>{const btn=$("signIn");btn.disabled=true;try{await auth.signInWithEmailAndPassword($("email").value.trim(),$("password").value);$("password").value=""}catch(e){report("Đăng nhập không thành công: "+e.message,true)}finally{btn.disabled=false}};
  $("signOut").onclick=()=>auth.signOut();
  $("reloadSettings").onclick=()=>load().catch(e=>report(e.message,true));
  $("saveSettings").onclick=async()=>{
    const btn=$("saveSettings");btn.disabled=true;
    try{
      const settings={durationMinutes:Number($("duration").value),targetBranches:Number($("branches").value),gradingMode:$("gradingMode").value,rubricVersion:$("rubricVersion").value};
      const r=await request("settings_save",settings);fill(r.settings);
      report("Đã lưu cấu hình vào Firebase. Phiên thi đã bắt đầu không bị thay đổi.");
    }catch(e){report("Chưa lưu được cấu hình: "+e.message,true)}finally{btn.disabled=false}
  };
})();