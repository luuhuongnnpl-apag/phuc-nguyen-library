"use strict";
/* PNL Gemini Live client — never embed the Gemini API key here. */
(function(){
 const $=s=>document.querySelector(s);
 const API="https://asia-southeast1-phuc-nguyen-library.cloudfunctions.net/vanDapApi";
 const WS="wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained";
 const FB={apiKey:"AIzaSyCIYY-dzhJ4rUYsXvBQivIxcziUC3hR1-U",authDomain:"phuc-nguyen-library.firebaseapp.com",projectId:"phuc-nguyen-library",appId:"1:842652271567:web:23b95b5c4d6061497988ba"};
 let tab="student",reconnects=0,checkpointTimer=null,drawnTicket=null;
 const state={running:false,finishing:false,preview:false,textOnly:false,ws:null,stream:null,ctx:null,src:null,processor:null,volume:null,
  timer:null,reconnect:null,start:0,end:0,ma:"",sv:"",history:[],input:"",output:"",playingUntil:0,muted:false,lastTokenAt:0};
 function status(message,error=false,selector="#health"){const el=$(selector);if(!el)return;el.textContent=message;el.classList.toggle("error",error)}
 function visible(el,show){$(el).hidden=!show}
 function msg(t){$("#notice").textContent=t}
 function time(ms){const sec=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
 function addBubble(role,text){const log=$("#log");if(log.querySelector(".muted"))log.replaceChildren();const node=document.createElement("div");node.className="bubble "+(role==="student"?"student":"");const b=document.createElement("b");b.textContent=role==="student"?"Sinh viên":"Giảng viên AI";const p=document.createElement("div");p.textContent=text;node.append(b,p);log.append(node);log.scrollTop=log.scrollHeight}
 function record(role,text){const t=String(text||"").trim();if(!t)return;state.history.push({role,text:t.slice(0,1800)});if(state.history.length>100)state.history.shift();addBubble(role,t);$("#turnCount").textContent=String(state.history.filter(x=>x.role==="student").length);scheduleCheckpoint()}
 function accumulate(old,text){text=String(text||"");if(!text)return old;if(text===old||old.endsWith(text))return old;if(text.startsWith(old))return text;return old+text}
 function flush(){if(state.input.trim()){record("student",state.input);state.input=""}if(state.output.trim()){record("teacher",state.output);state.output=""}}
 function scheduleCheckpoint(){
  if(state.preview||!state.running||state.finishing)return;
  if(checkpointTimer)clearTimeout(checkpointTimer);
  checkpointTimer=setTimeout(async()=>{checkpointTimer=null;
   if(!state.running||state.finishing||!state.history.length)return;
   try{await api("checkpoint",{ma:state.ma,sv:state.sv,transcript:state.history.slice(-100)},15000)}
   catch(e){console.warn("Không lưu được biên bản nháp",e.message)}
  },12000);
 }
 async function api(action,data={},timeout=22000){
  const user=firebase.auth().currentUser;
  if(!user)throw Error("Chưa đăng nhập Firebase. Hãy thử lại.");
  const c=new AbortController(),id=setTimeout(()=>c.abort(),timeout);
  try{const token=await user.getIdToken();const res=await fetch(API,{method:"POST",mode:"cors",signal:c.signal,
   headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({action,...data})});
   let body;try{body=await res.json()}catch{body={}}
   if(!res.ok)throw Error(body.error||("Lỗi máy chủ HTTP "+res.status));
   return body;
  }catch(e){if(e.name==="AbortError")throw Error("Hết thời gian kết nối Firebase. Kiểm tra mạng rồi thử lại.");throw e}
  finally{clearTimeout(id)}
 }
 async function healthCheck(){
  const c=new AbortController(),id=setTimeout(()=>c.abort(),9000);
  try{const res=await fetch(API,{signal:c.signal,cache:"no-store"});
   if(!res.ok)throw Error("HTTP "+res.status);
   const result=await res.json();if(!result.ok)throw Error("chưa sẵn sàng");
   status("Máy chủ PNL đã phản hồi. Đăng nhập và bấm Bắt đầu vấn đáp để mở phiên Gemini Live.");
  }catch(e){status("Chưa kết nối được máy chủ Firebase Functions. Mã nguồn đã chuẩn bị nhưng cần triển khai dịch vụ và cấu hình Gemini API key mới. Trang này không thể chạy Live trước khi máy chủ hoạt động.",true)}
  finally{clearTimeout(id)}
 }
 function selectTab(which){tab=which;visible("#drawPanel",which==="student");$("#studentTab").classList.toggle("active",which==="student");$("#teacherTab").classList.toggle("active",which==="teacher");visible("#studentPanel",which==="student");visible("#adminPanel",which==="teacher");msg(which==="teacher"?"Đăng nhập quản trị PNL trước khi thử Gemini Live.":"Lớp phải được bật thi vấn đáp bởi giảng viên.")}
 $("#drawTicket").onclick=async()=>{
  const btn=$("#drawTicket");btn.disabled=true;
  try{
    await ensureLogin();
    const {ma,sv}=validStudent();
    const data=await api("draw",{ma,sv});
    drawnTicket={ma,sv,...data.question};
    $("#drawInfo").textContent="Đề "+drawnTicket.questionNumber+": "+drawnTicket.tinhHuong+" — "+drawnTicket.cauHoi;
    status("Đã ghi nhận đề bốc thăm. Có thể bắt đầu bài thi.");
  }catch(e){status("Chưa bốc được đề: "+e.message,true)}
  finally{btn.disabled=!!drawnTicket}
 };
 $("#studentTab").onclick=()=>selectTab("student");
 $("#teacherTab").onclick=()=>selectTab("teacher");
 $("#adminLogin").onclick=async()=>{
  const b=$("#adminLogin");b.disabled=true;status("Đang đăng nhập quản trị…",false);
  try{const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:"select_account",login_hint:"luuhuong.nnpl@gmail.com"});await firebase.auth().signInWithPopup(p);
   const u=firebase.auth().currentUser;$("#adminName").textContent=u.email||"Đã đăng nhập";
   visible("#teacherTools",true);status("Đã đăng nhập Firebase. Có thể thử Gemini Live hoặc bật vấn đáp cho lớp.");
  }catch(e){status("Đăng nhập không thành công: "+e.message,true)}
  finally{b.disabled=false}
 };
 function validStudent(){const ma=$("#ma").value.trim().toUpperCase(),sv=$("#sv").value.trim().toUpperCase();
  if(!/^[A-Z0-9_-]{2,24}$/.test(ma)||!/^[A-Z0-9_-]{2,20}$/.test(sv))throw Error("Nhập đúng mã lớp và mã sinh viên.");
  return {ma,sv};
 }
 async function ensureLogin(){
  if(tab==="teacher"){
   const u=firebase.auth().currentUser;
   if(!u||u.isAnonymous)throw Error("Hãy đăng nhập tài khoản quản trị trước khi bắt đầu.");
  }else if(!firebase.auth().currentUser)await firebase.auth().signInAnonymously();
 }
 function pcmBase64(bytes){let str="";const chunk=8192;for(let i=0;i<bytes.length;i+=chunk)str+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(str)}
 function downsample(samples,rate){const factor=rate/16000,count=Math.floor(samples.length/factor),pcm=new Int16Array(count);
  for(let i=0;i<count;i++){const pos=Math.floor(i*factor),next=Math.min(samples.length,Math.floor((i+1)*factor));let sum=0,n=0;
   for(let k=pos;k<next;k++){sum+=samples[k];n++}
   const v=Math.max(-1,Math.min(1,n?sum/n:0));pcm[i]=v<0?v*32768:v*32767}
  return new Uint8Array(pcm.buffer);
 }
 function send(payload){if(state.ws&&state.ws.readyState===WebSocket.OPEN)state.ws.send(JSON.stringify(payload))}
 function stopInput(){try{state.processor?.disconnect();state.src?.disconnect();state.volume?.disconnect()}catch{}
  state.processor=null;state.src=null;state.volume=null}
 function attachMicro(){
  if(!state.stream||!state.ctx||state.textOnly||state.muted)return;
  stopInput();const ctx=state.ctx,source=ctx.createMediaStreamSource(state.stream),proc=ctx.createScriptProcessor(2048,1,1),gain=ctx.createGain();
  gain.gain.value=0;source.connect(proc);proc.connect(gain);gain.connect(ctx.destination);
  proc.onaudioprocess=e=>{
   if(!state.running||state.muted||!state.ws||state.ws.readyState!==1)return;
   const pcm=downsample(e.inputBuffer.getChannelData(0),ctx.sampleRate);
   if(pcm.byteLength)send({realtimeInput:{audio:{data:pcmBase64(pcm),mimeType:"audio/pcm;rate=16000"}}});
  };
  state.src=source;state.processor=proc;state.volume=gain;
 }
 function playPCM(b64,mime){
  if(!state.ctx||!b64)return;
  try{const bin=atob(b64),size=Math.floor(bin.length/2),bytes=new Int16Array(size);
   for(let i=0;i<size;i++){let k=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8);if(k>=32768)k-=65536;bytes[i]=k}
   const rate=Number(/rate=(\d+)/.exec(mime||"")?.[1])||24000,ctx=state.ctx,buf=ctx.createBuffer(1,size,rate),float=buf.getChannelData(0);
   for(let i=0;i<size;i++)float[i]=bytes[i]/32768;
   const node=ctx.createBufferSource();node.buffer=buf;node.connect(ctx.destination);
   const when=Math.max(ctx.currentTime+.035,state.playingUntil);node.start(when);state.playingUntil=when+buf.duration;
  }catch(e){status("Không phát được âm thanh Gemini. Có thể xem nội dung văn bản.",true)}
 }
 function serverMessage(obj){
  if(obj.setupComplete){
   status("Đã kết nối Gemini Live. Hãy lắng nghe câu hỏi và trả lời qua micro.");
   $("#liveState").textContent="Đang đối thoại";
   state.muted=true;$("#mute").textContent="Bắt đầu trả lời";$("#finishTurn").disabled=true;
   send({clientContent:{turns:[{role:"user",parts:[{text:state.history.length?"Hãy tiếp tục bài vấn đáp từ những lượt đã có; đừng lặp lại tình huống mở đầu.":"Bắt đầu phần thi vấn đáp. Xin mời giảng viên nêu câu hỏi đầu tiên."}]}],turnComplete:true}});
  }
  const sc=obj.serverContent||{};
  if(sc.interrupted){state.playingUntil=state.ctx?.currentTime||0}
  if(sc.inputTranscription?.text)state.input=accumulate(state.input,sc.inputTranscription.text);
  if(sc.outputTranscription?.text)state.output=accumulate(state.output,sc.outputTranscription.text);
  const parts=sc.modelTurn?.parts||[];
  for(const p of parts){if(p.inlineData?.data&&/audio\/pcm/i.test(p.inlineData.mimeType||"audio/pcm"))playPCM(p.inlineData.data,p.inlineData.mimeType)}
  if(sc.turnComplete||sc.generationComplete){flush();if(!state.textOnly&&state.running&&state.muted){$("#mute").disabled=false;$("#mute").textContent="Bắt đầu trả lời"}}
  if(obj.goAway){status("Gemini sắp ngắt kết nối theo giới hạn phiên. PNL sẽ thử nối lại.",false)}
 }
 function connectSocket(token,model){
  return new Promise((resolve,reject)=>{
   const ws=new WebSocket(WS+"?access_token="+encodeURIComponent(token));state.ws=ws;
   let settled=false;const timer=setTimeout(()=>{if(!settled){settled=true;ws.close();reject(Error("Gemini Live không mở được kết nối trong 15 giây."))}},15000);
   ws.onopen=()=>{try{ws.send(JSON.stringify({setup:{model:"models/"+model,generationConfig:{responseModalities:["AUDIO"]},realtimeInputConfig:{automaticActivityDetection:{disabled:true}},inputAudioTranscription:{},outputAudioTranscription:{}}}))}catch(e){if(!settled){settled=true;clearTimeout(timer);reject(e)}}};
   ws.onmessage=async e=>{try{const raw=typeof e.data==="string"?e.data:await e.data.text(),obj=JSON.parse(raw);
    if(obj.setupComplete&&!settled){settled=true;clearTimeout(timer);resolve()}
    serverMessage(obj);
   }catch(error){console.warn("Gemini Live message",error)}};
   ws.onerror=()=>{if(!settled){settled=true;clearTimeout(timer);reject(Error("Kết nối WebSocket Gemini Live bị từ chối."))}};
   ws.onclose=()=>{if(!settled){settled=true;clearTimeout(timer);reject(Error("Gemini đóng phiên trước khi bắt đầu."))}
    if(state.running&&!state.finishing&&Date.now()<state.end-5000){$("#liveState").textContent="Mất kết nối";status("Phiên Live gián đoạn. PNL đang nối lại…",true);scheduleReconnect()}}
  });
 }
 async function connect(){
  const response=await api("prepare",{preview:state.preview,ma:state.ma,sv:state.sv,previous:state.history.slice(-16)});
  state.lastTokenAt=Date.now();if(!state.start){state.start=response.startedAt;state.end=response.endsAt}
  await connectSocket(response.token,response.model);
  reconnects=0;
 }
 function scheduleReconnect(){
  if(state.reconnect||state.finishing||!state.running)return;
  const elapsed=Date.now()-state.lastTokenAt,delay=Math.max(3500,48000-elapsed);
  state.reconnect=setTimeout(async()=>{state.reconnect=null;if(!state.running||state.finishing)return;
   if(++reconnects>4){status("Không nối lại được Gemini Live. Có thể kết thúc và nộp bản ghi đang có.",true);return}
   try{stopInput();await connect();$("#liveState").textContent="Đang đối thoại"}catch(e){status("Nối lại thất bại: "+e.message,true);scheduleReconnect()}
  },delay);
 }
 function timerTick(){const remain=state.end-Date.now();$("#clock").textContent=time(remain);if(remain<=0&&state.running)finish(true)}
 async function getMic(){
  if(!navigator.mediaDevices?.getUserMedia)throw Error("Trình duyệt không hỗ trợ micro. Hãy mở bằng Safari, hoặc chọn văn bản dự phòng.");
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  return stream;
 }
 async function start(textOnly){
  if(state.running)return;
  const b=$("#startLive"),t=$("#startText");b.disabled=true;t.disabled=true;
  if(!$("#consent").checked){status("Cần xác nhận đồng ý ghi nhận nội dung hỏi đáp để dự thi.",true);b.disabled=false;t.disabled=false;return}
  try{
   state.preview=tab==="teacher";({ma:state.ma,sv:state.sv}=state.preview?{ma:"",sv:""}:validStudent());
   if(!state.preview&&(!drawnTicket||drawnTicket.ma!==state.ma||drawnTicket.sv!==state.sv))throw Error("Hãy bốc thăm đề trước khi bắt đầu thi.");
   state.textOnly=!!textOnly;state.history=[];state.input="";state.output="";state.start=0;state.end=0;state.finishing=false;state.muted=true;reconnects=0;
   if(!textOnly){
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)throw Error("Thiết bị không hỗ trợ phát/thu âm thanh thời gian thực.");
    state.ctx=new AC({latencyHint:"interactive"});
    const unlocked=state.ctx.resume(),mic=getMic();
    const ready=await Promise.all([unlocked,mic]);state.stream=ready[1];
   }else{const AC=window.AudioContext||window.webkitAudioContext;if(AC){state.ctx=new AC();await state.ctx.resume()}}
   await ensureLogin();
   status("Đang xin phiên Gemini Live từ Firebase…");state.running=true;
   visible("#examPanel",true);visible("#entryPanel",false);$("#log").replaceChildren();$("#turnCount").textContent="0";
   $("#mute").disabled=textOnly;$("#mute").textContent="Bắt đầu trả lời";$("#finishTurn").disabled=true;$("#liveState").textContent="Đang kết nối";
   await connect();
   state.timer=setInterval(timerTick,1000);timerTick();
  }catch(e){
   status("Không bắt đầu được vấn đáp: "+e.message,true);
   stopResources();visible("#examPanel",false);visible("#entryPanel",true);b.disabled=false;t.disabled=false;
  }
 }
 function stopResources(){
  state.running=false;if(state.timer)clearInterval(state.timer);if(state.reconnect)clearTimeout(state.reconnect);if(checkpointTimer)clearTimeout(checkpointTimer);checkpointTimer=null;
  state.timer=null;state.reconnect=null;stopInput();
  if(state.ws){const ws=state.ws;state.ws=null;try{ws.onclose=null;ws.close()}catch{}}
  if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null}
  if(state.ctx){try{state.ctx.close()}catch{}state.ctx=null}state.playingUntil=0;
 }
 async function finish(auto){
  if(state.finishing||!state.running)return;state.finishing=true;flush();$("#endLive").disabled=true;
  status(auto?"Đã hết 40 phút. Đang nộp bài…":"Đang kết thúc và lưu biên bản thi…");
  const transcript=state.history.slice(),preview=state.preview,ma=state.ma,sv=state.sv;
  stopResources();
  try{
   if(preview){$("#reviewMessage").textContent="Đã kết thúc buổi thử nghiệm. Số lượt ghi nhận: "+transcript.length+". Không ghi điểm thử lên Firebase."}
   else{const r=await api("finish",{ma,sv,transcript},55000);
    $("#reviewMessage").textContent="Bài thi đã được ghi nhận. Kết quả sẽ được giảng viên phụ trách xem xét và phê duyệt theo quy định.";
   }
   visible("#examPanel",false);visible("#reviewPanel",true);status("Đã kết thúc phiên. Giảng viên có thể xem biên bản và quyết định điểm cuối cùng.");
  }catch(e){
   status("Không nộp được bài: "+e.message+". Hãy báo giảng viên; không tự coi đây là bài đã nộp.",true);
   visible("#reviewPanel",true);$("#reviewMessage").textContent="Bản ghi hiện chỉ ở trên trình duyệt, chưa được xác nhận lưu.";
  }
  $("#startLive").disabled=false;$("#startText").disabled=false;state.finishing=false;
 }
 $("#startLive").onclick=()=>start(false);
 $("#startText").onclick=()=>start(true);
 $("#sendText").onclick=()=>{
  const text=$("#typed").value.trim();if(!text||!state.running)return;
  if(!state.ws||state.ws.readyState!==1){status("Chưa có kết nối Gemini. Hãy chờ nối lại.",true);return}
  record("student",text);$("#typed").value="";
  send({clientContent:{turns:[{role:"user",parts:[{text}]}],turnComplete:true}});
 };
 $("#mute").onclick=()=>{
  if(state.textOnly||!state.running||state.finishing||!state.muted)return;
  if(!state.ws||state.ws.readyState!==WebSocket.OPEN){status("Chưa có kết nối Gemini Live.",true);return}
  state.muted=false;send({realtimeInput:{activityStart:{}}});attachMicro();$("#mute").disabled=true;$("#finishTurn").disabled=false;
  status("Đang nghe. Bấm Tôi đã trả lời xong sau khi kết thúc câu trả lời.");
 };
 $("#finishTurn").onclick=()=>{
  if(!state.running||state.finishing||state.muted)return;
  state.muted=true;stopInput();$("#finishTurn").disabled=true;
  send({realtimeInput:{activityEnd:{}}});
  $("#mute").textContent="Đang chờ câu hỏi tiếp";$("#mute").disabled=true;
  status("Đã kết thúc lượt trả lời. Hội đồng AI sẽ tiếp tục hỏi nhánh mở rộng.");
 };
 $("#endLive").onclick=()=>{if(confirm("Kết thúc bài vấn đáp và nộp ngay?"))finish(false)};
 async function adminAction(action,extras={}){
  const ma=$("#adminClass").value.trim().toUpperCase();
  if(!/^[A-Z0-9_-]{2,24}$/.test(ma)){status("Nhập mã lớp hợp lệ.",true);return}
  const data=await api(action,{ma,...extras});return data;
 }
 async function toggle(enabled){try{await adminAction("configure",{enabled});$("#adminInfo").textContent="Đã "+(enabled?"bật":"tắt")+" vấn đáp cho lớp."}catch(e){status("Không thể thay đổi lớp: "+e.message,true)}}
 $("#enableClass").onclick=()=>toggle(true);$("#disableClass").onclick=()=>toggle(false);
 $("#loadClass").onclick=async()=>{try{const data=await adminAction("list");renderAdmin(data.rows||[])}catch(e){status("Không đọc được kết quả: "+e.message,true)}};
 function renderAdmin(rows){
  const box=$("#resultList");box.replaceChildren();
  if(!rows.length){box.textContent="Lớp chưa có bài vấn đáp.";return}
  const table=document.createElement("table");table.className="table";
  const thead=document.createElement("thead");const tr=document.createElement("tr");
  ["Mã SV","Họ tên","Trạng thái","Điểm AI","Thao tác"].forEach(n=>{const th=document.createElement("th");th.textContent=n;tr.append(th)});thead.append(tr);table.append(thead);
  const body=document.createElement("tbody");
  for(const x of rows){
   const tr=document.createElement("tr");
   [x.mssv,x.hoTen,x.status,x.score==null?"—":x.score+"/10"].forEach(v=>{const td=document.createElement("td");td.textContent=v||"";tr.append(td)});
   const td=document.createElement("td");
   const detail=document.createElement("details"),summary=document.createElement("summary");summary.textContent="Xem và duyệt";
   const pre=document.createElement("pre");pre.textContent=(x.transcript||[]).map(y=>(y.role==="student"?"Sinh viên":"AI")+": "+y.text).join("\n\n")||"Chưa có biên bản.";
   const note=document.createElement("textarea");note.placeholder="Nhận xét giảng viên";note.value=x.suggestion?.feedback||"";
   const point=document.createElement("input");point.type="number";point.min="0";point.max="10";point.step="0.05";point.value=x.finalScore??x.score??0;
   const approve=document.createElement("button");approve.textContent="Duyệt điểm";approve.onclick=async()=>{try{await adminAction("approve",{sv:x.mssv,finalScore:Number(point.value),note:note.value});approve.textContent="Đã duyệt";$("#adminInfo").textContent="Điểm đã được giảng viên xác nhận."}catch(e){status("Lỗi duyệt điểm: "+e.message,true)}};
   detail.append(summary,pre,point,note,approve);td.append(detail);tr.append(td);body.append(tr);
  }
  table.append(body);box.append(table);
 }
 window.addEventListener("beforeunload",e=>{if(state.running){e.preventDefault();e.returnValue=""}});
 window.addEventListener("unhandledrejection",e=>{console.warn("PNL Live",e.reason);status("Đã xảy ra lỗi: "+(e.reason?.message||"Không rõ nguyên nhân")+". Có thể dùng văn bản dự phòng.",true)});
 try{
  if(typeof firebase==="undefined")throw Error("Không tải được Firebase SDK. Hãy kiểm tra Internet và mở bằng Safari.");
  if(!firebase.apps.length)firebase.initializeApp(FB);
  firebase.auth().onAuthStateChanged(u=>{if(u&&!u.isAnonymous){$("#adminName").textContent=u.email||"Đã đăng nhập";visible("#teacherTools",true)}});
  healthCheck();
 }catch(e){status(e.message,true)}
})();
