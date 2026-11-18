"use strict";
/* PHÚC NGUYÊN LIBRARY — Ngân hàng câu hỏi (bước 2, 18/11/2026). Chạy sau app.js, dùng chung tiện ích và trạng thái S.
   Dữ liệu Firestore (quy tắc: firebase/firestore-pnl.rules, khối 18/11):
     pnl_nh/{id}      kho kín, chỉ quản trị đọc/ghi
        câu hỏi     {kieu:"cau", hp, ch, lv NB|TH|VD, q, o[4], a 0–3, b căn cứ, e giải thích, th (id tình huống | ""),
                     st nhap|duyet, kin (dành cho đánh giá định kỳ), nguon tay|dan|file|ai, ord, created, updated}
        tình huống  {kieu:"th", hp, ch, title, text, ask[], guide[], st, kin, nguon, ord, created, updated}
     pnl_nh_pub/{hp}  bản xuất bản cho web ôn tập {data: chuỗi JSON {q[], th[{n, items[]}]}, soCau, soTH, at}
   Chỉ câu "Đã duyệt", không "kín", đủ 4 phương án + đáp án và đã xếp chương mới được xuất bản.
   Web ôn tập (assets/pnlib-course.js) tự ghép bản xuất bản vào sau câu sẵn có của học phần — không sửa nội dung cũ. */

const NH={byHp:{},pub:{},chs:{},web:{},all:null,sel:new Set(),f:{ch:"",lv:"",st:"",loai:"",q:""},lim:60,open:{},denied:false};
const LVN={NB:"Nhận biết",TH:"Thông hiểu",VD:"Vận dụng"},LVK=["NB","TH","VD"],ABCD="ABCD";
const NH_RULES=`    // --- Ngân hàng câu hỏi (18/11/2026): kho kín chỉ quản trị; bản xuất bản cho web ôn tập ai cũng đọc ---
    match /pnl_nh/{id} { allow read, write: if isAdmin(); }
    match /pnl_nh_pub/{hp} { allow read: if true; allow write: if isAdmin(); }`;
const NH_LIBS={jszip:["https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js","https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"]};
function nhLib(name,glob){if(window[glob])return Promise.resolve(window[glob]);return new Promise((ok,no)=>{let i=0;const next=()=>{if(i>=NH_LIBS[name].length)return no(new Error("Không tải được thư viện đọc file Word"));const s=document.createElement("script");s.src=NH_LIBS[name][i++];s.onload=()=>ok(window[glob]);s.onerror=next;document.head.appendChild(s)};next()})}

/* ---------- chuẩn hóa ---------- */
const nhKey=s=>strip(s).replace(/[^a-z0-9]+/g,"");
function nhLv(s){const t=strip(s).trim();if(!t)return"";if(/^(nb|1|nhan ?biet|biet)\b/.test(t))return"NB";if(/^(th|2|thong ?hieu|hieu)\b/.test(t))return"TH";if(/^(vd|3|4|van ?dung)\b/.test(t))return"VD";return""}
function nhAns(s){const t=String(s==null?"":s).trim();let m=t.match(/^\*?\s*([A-Da-d])\b/);if(m)return ABCD.indexOf(m[1].toUpperCase());m=t.match(/^([1-4])$/);if(m)return +m[1]-1;
  m=strip(t).match(/(?:dap an|phuong an|chon)\s*(?:dung)?\s*[:：]?\s*([abcd])\b/);return m?ABCD.indexOf(m[1].toUpperCase()):null}
const nhTs=t=>t&&t.toMillis?t.toMillis():(t&&t.seconds?t.seconds*1000:(t?new Date(t).getTime()||0:0));
const nhByOrd=(a,b)=>(a.ch|0)-(b.ch|0)||(a.ord||0)-(b.ord||0);
const nhIsQ=x=>x.kieu!=="th";
function nhValid(x){return !!(String(x.q||"").trim()&&Array.isArray(x.o)&&x.o.length===4&&x.o.every(o=>String(o).trim())&&x.a>=0&&x.a<=3&&new Set(x.o.map(nhKey)).size===4)}
function nhDenied(x){if(x&&x.code==="permission-denied"){NH.denied=true;return true}return false}

/* ---------- dữ liệu ---------- */
async function nhLoad(hp,force){if(NH.byHp[hp]&&!force)return NH.byHp[hp];
  const snap=await S.fs.collection("pnl_nh").where("hp","==",hp).get();NH.denied=false;
  NH.byHp[hp]=snap.docs.map(d=>Object.assign({id:d.id},d.data()));
  try{const p=await S.fs.doc("pnl_nh_pub/"+hp).get();NH.pub[hp]=p.exists?p.data():null}catch(e){NH.pub[hp]=null}
  return NH.byHp[hp]}
async function nhLoadAll(){const snap=await S.fs.collection("pnl_nh").get();NH.denied=false;const by={};
  snap.docs.forEach(d=>{const x=Object.assign({id:d.id},d.data());(by[x.hp]=by[x.hp]||[]).push(x)});
  Object.keys(by).forEach(hp=>NH.byHp[hp]=by[hp]);
  try{(await S.fs.collection("pnl_nh_pub").get()).docs.forEach(d=>NH.pub[d.id]=d.data())}catch(e){}
  NH.all=true;return by}
/* Chương và câu sẵn có trên web học phần: đọc khối pn-data của trang học phần (để chọn chương, soát trùng) */
async function nhChapters(hp){if(NH.chs[hp])return NH.chs[hp];const c=courseOf(hp)||{};let chs=[],web=[];
  const src=c.src&&!c.fb?String(c.src).split("#")[0]:"";
  if(src){try{const t=await (await fetch("../"+src,{cache:"no-store"})).text();const m=t.match(/<script id="pn-data" type="application\/json">([\s\S]*?)<\/script>/);
    if(m){const d=JSON.parse(m[1]);chs=(d.chapters||[]).map(x=>({n:+x.n,t:x.name||x.t||""}));web=(d.q||[]).map(x=>({k:nhKey(x.q),id:x.id}))}}catch(e){}}
  const h=S.hp[hp];if(!chs.length&&h&&(h.chapters||[]).length)chs=h.chapters.map(x=>({n:+x.n,t:x.t||x.name||""}));
  NH.chs[hp]=chs.filter(x=>x.n>0).sort((a,b)=>a.n-b.n);NH.web[hp]=web;return NH.chs[hp]}
const nhChName=(hp,n)=>{const c=(NH.chs[hp]||[]).find(x=>x.n===+n);return c?"Chương "+n+". "+c.t:(n?"Chương "+n:"Chưa xếp chương")};
function nhStats(list){const qs=(list||[]).filter(nhIsQ),ths=(list||[]).filter(x=>x.kieu==="th");
  return {tong:qs.length,duyet:qs.filter(x=>x.st==="duyet").length,nhap:qs.filter(x=>x.st!=="duyet").length,kin:qs.filter(x=>x.kin).length,th:ths.length,
    sua:Math.max(0,...(list||[]).map(x=>nhTs(x.updated)))}}
function nhPubState(hp){const p=NH.pub[hp];const st=nhStats(NH.byHp[hp]);if(!p)return {txt:"Chưa xuất bản",cls:"gray",p};
  const at=nhTs(p.at);const doi=st.sua>at;return {txt:(doi?"Có thay đổi chưa xuất bản":"Đã xuất bản")+" · "+(p.soCau|0)+" câu, "+(p.soTH|0)+" tình huống"+(at?" · "+new Date(at).toLocaleString("vi-VN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"}):""),cls:doi?"warn":"",p}}

/* ---------- bộ đọc nội dung dán (mẫu Azota mở rộng) ---------- */
const RX={
  ch:/^chương\s+(\d{1,2})\b\s*[.:：\-–]?\s*(.*)$/i,
  th:/^tình\s*huống(?:\s+(?:số\s+)?(\d+))?\s*(?:[.:：\-–)]\s*(.*))?$/i,
  cau:/^(?:\[(NB|TH|VD)\]\s*)?câu\s*(\d+)\s*(?:[\[(]([^\])]{1,20})[\])])?\s*[.:：)]\s*(.*)$/i,
  opt:/^(\*)?\s*([A-D])\s*[.)]\s*(.*)$/,
  ans:/^(?:đáp\s*án(?:\s*đúng)?|đ\/a)\s*[:：]?\s*\*?([A-Da-d1-4])\b\.?\s*$/i,
  keyHead:/^(?:bảng\s+)?đáp\s*án\s*[:：]?\s*$/i,
  keyLine:/^(?:bảng\s+)?đáp\s*án\s*[:：]\s*(.+)$/i,
  cc:/^(?:căn\s*cứ(?:\s*pháp\s*lý)?|cơ\s*sở\s*pháp\s*lý)\s*[:：]\s*(.*)$/i,
  gt:/^(?:giải\s*thích|lời\s*giải)\s*[:：]\s*(.*)$/i,
  muc:/^(?:mức\s*độ|cấp\s*độ)\s*[:：]\s*(.+)$/i,
  yc:/^(?:yêu\s*cầu|câu\s*hỏi\s*tự\s*luận)\s*[:：]\s*(.*)$/i,
  gy:/^(?:gợi\s*ý(?:\s*giải)?|hướng\s*dẫn(?:\s*giải)?|ý\s*chính)\s*[:：]\s*(.*)$/i,
  end:/^(?:-{3,}|_{3,}|hết|hết tình huống|kết thúc tình huống)\.?$/i,
  lvTail:/\s*[\[(](NB|TH|VD|nhận biết|thông hiểu|vận dụng)[\])]\s*$/i};
function nhSplitOpts(s){/* "A. x   B. y   C. z   D. w" trên một dòng → 4 dòng */
  if(!/^\*?\s*A\s*[.)]\s/.test(s)||!/\s\*?\s*B\s*[.)]\s/.test(s))return [s];
  return s.split(/\s+(?=\*?\s*[B-D]\s*[.)]\s)/)}
function nhParseText(txt,def){def=def||{};const out={items:[],cases:[],stray:[],key:0};
  const lines=String(txt||"").replace(/\r/g,"").replace(/ /g," ").split("\n");
  let ch=+def.ch||0,lv=def.lv||"",cur=null,cs=null,csMode="",field="",inKey=false,hNums=null;const key=[];
  const pushQ=()=>{if(cur){out.items.push(cur);cur=null}field=""};
  const endCase=()=>{pushQ();cs=null;csMode=""};
  for(const raw of lines){
    for(const s0 of nhSplitOpts(raw.trim())){const s=s0.trim();let m;
      if(!s){if(cur&&field==="q"&&!cur.o.length)cur.q+="\n";continue}
      const midQ=cur&&!cur.o.length&&field==="q"; // đang ghi thân câu hỏi: dòng "Chương…", "Tình huống…" coi là chữ
      if(inKey){const pairs=[...s.matchAll(/(\d+)\s*[.:\-–)]?\s*([A-Da-d])\b/g)];if(pairs.length&&!RX.cau.test(s)&&!RX.th.test(s)){pairs.forEach(p=>key.push([+p[1],p[2].toUpperCase()]));continue}inKey=false}
      if(RX.keyHead.test(s)||/^câu\s+đáp\s*án$/i.test(s)){pushQ();inKey=true;continue}
      if(/^câu(?:\s+\d+){2,}$/i.test(s)){pushQ();hNums=s.match(/\d+/g).map(Number);continue}
      if(hNums&&(m=s.match(/^đáp\s*án((?:\s+[A-Da-d]){2,})$/i))){m[1].trim().split(/\s+/).forEach((l,i)=>{if(hNums[i])key.push([hNums[i],l.toUpperCase()])});hNums=null;continue}
      if((m=s.match(RX.keyLine))&&/\d\s*[.:\-–)]?\s*[A-Da-d]\b.*\d\s*[.:\-–)]?\s*[A-Da-d]\b/.test(m[1])){pushQ();[...m[1].matchAll(/(\d+)\s*[.:\-–)]?\s*([A-Da-d])\b/g)].forEach(p=>key.push([+p[1],p[2].toUpperCase()]));inKey=true;continue}
      if(!midQ&&s.length<160&&(m=s.match(RX.ch))&&!/[?]$/.test(s)){endCase();ch=+m[1];continue}
      if(!midQ&&RX.end.test(s)){endCase();continue}
      if(!midQ&&(m=s.match(RX.th))&&(m[1]||m[2]!==undefined)){endCase();cs={title:(m[2]||"").trim()||("Tình huống "+(m[1]||out.cases.length+1)),text:"",ask:[],guide:[],ch,warn:[]};out.cases.push(cs);csMode="text";continue}
      if((m=s.match(RX.cau))){pushQ();const tag=nhLv(m[1]||"")||nhLv(m[3]||"");
        cur={num:+m[2],q:m[4].trim(),o:[],a:null,b:"",e:"",lv:tag||(cs?(cs.lv||"VD"):lv),ch:cs?cs.ch:ch,thIdx:cs?out.cases.length-1:null,warn:[]};field="q";if(cs)csMode="q";continue}
      if(cur&&(m=s.match(RX.opt))){const i=ABCD.indexOf(m[2]);if(i===cur.o.length&&i<4){cur.o.push(m[3].trim());if(m[1])cur.a=i;field="o";continue}}
      if(cur&&(m=s.match(RX.ans))){const a=nhAns(m[1]);if(a!=null)cur.a=a;field="";continue}
      if(cur&&(m=s.match(RX.cc))){cur.b=m[1].trim();field="b";continue}
      if(cur&&cur.o.length&&(m=s.match(RX.gt))){cur.e=m[1].trim();field="e";continue}
      if((m=s.match(RX.muc))){const v=nhLv(m[1]);if(cur)cur.lv=v||cur.lv;else if(cs)cs.lv=v||cs.lv;else lv=v||lv;continue}
      if(cs&&!cur&&(m=s.match(RX.yc))){csMode="ask";if(m[1].trim())cs.ask.push(m[1].trim());continue}
      if(cs&&!cur&&((m=s.match(RX.gy))||(m=s.match(RX.gt)))){csMode="guide";if(m[1].trim())cs.guide.push(m[1].trim());continue}
      /* dòng tiếp nối */
      if(cur){if(field==="b")cur.b+=" "+s;else if(field==="e")cur.e+="\n"+s;else if(field==="q"&&!cur.o.length)cur.q+="\n"+s;
        else if(field==="o"&&cur.o.length&&cur.o.length<4)cur.o[cur.o.length-1]+=" "+s;else cur.warn.push("Dòng chưa nhận diện: "+s.slice(0,60));continue}
      if(cs){const t=s.replace(/^(?:[-–•+]|\d+[.)])\s+/,"");if(csMode==="ask")cs.ask.push(t);else if(csMode==="guide")cs.guide.push(t);else cs.text+=(cs.text?"\n":"")+s;continue}
      out.stray.push(s)}}
  pushQ();
  if(key.length){out.key=key.length;const nums=out.items.map(x=>x.num);const uniq=new Set(nums).size===nums.length;
    key.forEach(([n,l])=>{const it=uniq?out.items.find(x=>x.num===n):out.items[n-1];if(it)it.a=ABCD.indexOf(l)})}
  out.items.forEach(x=>{x.q=x.q.replace(/\n{3,}/g,"\n\n").trim();const m=x.q.match(RX.lvTail);if(m){x.lv=nhLv(m[1])||x.lv;x.q=x.q.replace(RX.lvTail,"").trim()}x.e=(x.e||"").trim();x.b=(x.b||"").trim();if(!x.lv)x.lv=def.lv||"NB"});
  out.cases.forEach(c=>{c.text=c.text.trim()});
  return out}

/* ---------- đọc file ---------- */
async function nhReadFile(f,def){const ext=(f.name.split(".").pop()||"").toLowerCase();
  if(ext==="docx")return {text:await nhDocxText(f)};
  if(ext==="txt"||ext==="md")return {text:await f.text()};
  if(["xlsx","xls","csv"].includes(ext))return {res:await nhReadSheet(f,def)};
  if(ext==="doc")throw new Error("File .doc (Word cũ) chưa đọc được: mở bằng Word, chọn Lưu thành .docx rồi tải lại.");
  if(ext==="pdf")throw new Error("Chưa đọc trực tiếp PDF: mở PDF, chép toàn bộ chữ và dán vào thẻ Dán nội dung.");
  throw new Error("Chỉ nhận .docx, .xlsx, .xls, .csv, .txt.")}
/* Word: giữ nguyên dòng; phương án được gạch chân, tô đỏ hoặc tô nền (cách đánh dấu của Azota) → thêm * trước chữ cái */
async function nhDocxText(f){const JSZip=await nhLib("jszip","JSZip");const zip=await JSZip.loadAsync(await f.arrayBuffer());const fx=zip.file("word/document.xml");if(!fx)throw new Error("File Word không đúng định dạng.");
  const doc=new DOMParser().parseFromString(await fx.async("string"),"application/xml");const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const kids=(el,n)=>[...el.childNodes].filter(x=>x.namespaceURI===W&&x.localName===n);const one=(el,n)=>el.getElementsByTagNameNS(W,n)[0];
  const red=v=>{v=String(v||"").toUpperCase();if(!/^[0-9A-F]{6}$/.test(v))return false;const r=parseInt(v.slice(0,2),16),g=parseInt(v.slice(2,4),16),b=parseInt(v.slice(4,6),16);return r>=150&&g<100&&b<100};
  const marked=r=>{const pr=kids(r,"rPr")[0];if(!pr)return false;const u=one(pr,"u");if(u&&(u.getAttributeNS(W,"val")||"single")!=="none")return true;
    const c=one(pr,"color");if(c&&red(c.getAttributeNS(W,"val")))return true;const h=one(pr,"highlight");if(h&&!/^(none)?$/.test(h.getAttributeNS(W,"val")||""))return true;
    const sh=one(pr,"shd");if(sh){const fl=sh.getAttributeNS(W,"fill")||"";if(fl&&!/^(auto|FFFFFF)$/i.test(fl))return true}return false};
  const para=p=>{let t="",mk=[];for(const r of p.getElementsByTagNameNS(W,"r")){let x="";for(const n of r.childNodes){if(n.namespaceURI!==W)continue;if(n.localName==="t")x+=n.textContent;else if(n.localName==="tab")x+="    ";else if(n.localName==="br"||n.localName==="cr")x+="\n"}
      const m=marked(r);t+=x;for(let i=0;i<x.length;i++)mk.push(m)}
    /* tách phương án trong cùng đoạn, đánh dấu phương án có chữ được đánh dấu */
    const lines=[];let start=0;const starts=[];const re=/(^|\s)\*?\s*([A-D])\s*[.)]\s/g;let m;
    if(/^\s*\*?\s*A\s*[.)]\s/.test(t)){while((m=re.exec(t))){const at=m.index+m[1].length;const L=m[2];if(ABCD.indexOf(L)===starts.length)starts.push(at)}}
    if(starts.length>=1&&starts[0]<=t.search(/\S/)+1){starts.push(t.length);for(let i=0;i<starts.length-1;i++){const a=starts[i],b=starts[i+1];const seg=t.slice(a,b).trim();
        let on=0,all=0;for(let j=a;j<b;j++){if(/\S/.test(t[j])){all++;if(mk[j])on++}}lines.push((on&&on>=Math.min(2,all)&&!seg.startsWith("*")?"*":"")+seg)}}
    else lines.push(t);return lines};
  const out=[];const walk=el=>{for(const n of el.childNodes){if(n.namespaceURI!==W)continue;
    if(n.localName==="p")out.push(...para(n));else if(n.localName==="tbl"){for(const tr of kids(n,"tr")){out.push(kids(tr,"tc").map(tc=>[...tc.getElementsByTagNameNS(W,"p")].map(p=>para(p).join(" ")).join(" ").trim()).join("  "))}}
    else if(n.localName==="sdt"){const c=one(n,"sdtContent");if(c)walk(c)}}};
  walk(one(doc,"body"));return out.join("\n")}
/* Excel/CSV: cột Chương, Mức độ, Câu hỏi, A, B, C, D, Đáp án, Căn cứ, Giải thích, Tình huống (đúng như file Xuất Excel); trang "Tình huống" nếu có */
async function nhReadSheet(f,def){const X=await lib("xlsx");const wb=X.read(await f.arrayBuffer(),{type:"array"});const out={items:[],cases:[],stray:[],key:0};
  const grid=ws=>X.utils.sheet_to_json(ws,{header:1,defval:"",raw:false});
  const colsOf=(rows,need)=>{for(let i=0;i<Math.min(rows.length,15);i++){const h=rows[i].map(x=>strip(x).trim());if(need(h))return {i,h}}return null};
  const find=(h,...ks)=>h.findIndex(x=>ks.some(k=>typeof k==="string"?x===k:k.test(x)));
  const thName=wb.SheetNames.find(n=>/tinh ?huong/.test(strip(n)));
  if(thName){const rows=grid(wb.Sheets[thName]);const c=colsOf(rows,h=>h.some(x=>/noi dung|tinh huong/.test(x)));
    if(c){const h=c.h,ci={ma:find(h,"ma"),ch:find(h,/^chuong/),ti:find(h,/tieu de|ten tinh huong/),tx:find(h,/^noi dung/),yc:find(h,/yeu cau/),gy:find(h,/goi y|y chinh|huong dan/)};
      rows.slice(c.i+1).forEach(r=>{const text=String(r[ci.tx]||"").trim();if(!text)return;const sp=v=>String(v||"").split(/\n+/).map(x=>x.replace(/^(?:[-–•+]|\d+[.)])\s+/,"").trim()).filter(Boolean);
        out.cases.push({title:String(r[ci.ti]||"").trim()||("Tình huống "+(out.cases.length+1)),text,ch:parseInt(r[ci.ch],10)||+def.ch||0,ask:sp(r[ci.yc]),guide:sp(r[ci.gy]),warn:[],ma:String(r[ci.ma]||"").trim()})})}}
  const qName=wb.SheetNames.find(n=>n!==thName)||wb.SheetNames[0];const rows=grid(wb.Sheets[qName]);
  const c=colsOf(rows,h=>h.some(x=>/^(cau hoi|noi dung cau hoi|noi dung)$/.test(x)));if(!c)throw new Error("Không thấy dòng tiêu đề có cột \"Câu hỏi\". Dùng đúng mẫu: Chương | Mức độ | Câu hỏi | A | B | C | D | Đáp án | Căn cứ | Giải thích.");
  const h=c.h,ci={ch:find(h,/^chuong/),lv:find(h,/muc do|cap do/),q:find(h,/^(cau hoi|noi dung cau hoi|noi dung)$/),a:find(h,"a","phuong an a","dap an a"),b:find(h,"b","phuong an b","dap an b"),c:find(h,"c","phuong an c","dap an c"),d:find(h,"d","phuong an d","dap an d"),
    da:find(h,/^(dap an|dap an dung)$/),cc:find(h,/can cu|co so phap ly/),gt:find(h,/giai thich|loi giai/),th:find(h,/tinh huong/)};
  if(ci.a<0||ci.d<0||ci.da<0)throw new Error("Thiếu cột A, B, C, D hoặc Đáp án.");
  rows.slice(c.i+1).forEach((r,k)=>{const q=String(r[ci.q]||"").trim();if(!q)return;let o=[ci.a,ci.b,ci.c,ci.d].map(j=>j<0?"":String(r[j]||"").trim());while(o.length&&!o[o.length-1])o.pop();
    const thv=ci.th>=0?String(r[ci.th]||"").trim():"";let thIdx=null,thTitle="";if(thv){const i=out.cases.findIndex(x=>x.ma===thv||x.title===thv);if(i>=0)thIdx=i;else thTitle=thv}
    out.items.push({num:k+1,q,o,a:nhAns(r[ci.da]),b:ci.cc>=0?String(r[ci.cc]||"").trim():"",e:ci.gt>=0?String(r[ci.gt]||"").trim():"",lv:nhLv(r[ci.lv])||(thv?"VD":def.lv||"NB"),
      ch:parseInt(r[ci.ch],10)||(thIdx!=null?out.cases[thIdx].ch:0)||+def.ch||0,thIdx,thTitle,warn:[]})});
  return out}

/* ---------- soát lỗi, trùng ---------- */
function nhCheck(hp,res){const bank=(NH.byHp[hp]||[]).filter(nhIsQ);const bk={};bank.forEach(x=>bk[nhKey(x.q)]=x);const web={};(NH.web[hp]||[]).forEach(x=>web[x.k]=x);
  const bankTh={},bankTx={};(NH.byHp[hp]||[]).filter(x=>x.kieu==="th").forEach(x=>{bankTh[x.title]=x;bankTx[nhKey(x.text)]=x});const seen={};
  res.cases.forEach(c=>{c.err=[];c.warn=c.warn||[];if(!c.text)c.err.push("Thiếu nội dung tình huống");if(!c.ch)c.warn.push("Chưa xếp chương");
    if(!c.ask.length&&!res.items.some(q=>q.thIdx===res.cases.indexOf(c)))c.warn.push("Chưa có yêu cầu hay câu hỏi kèm theo");
    c.dup=c.text&&bankTx[nhKey(c.text)]?"Trùng tình huống đã có trong ngân hàng":"";c._use=!c.err.length&&!c.dup});
  res.items.forEach(x=>{x.err=[];x.warn=(x.warn||[]).slice();const k=nhKey(x.q);
    if(!x.q)x.err.push("Thiếu nội dung câu hỏi");
    if(x.o.length===4&&x.o.some(o=>!String(o).trim()))x.err.push("Thiếu nội dung phương án "+ABCD[x.o.findIndex(o=>!String(o).trim())]);
    else if(x.o.length<4)x.err.push(x.o.length===2&&x.o.every(o=>/^(đúng|sai)\.?$/i.test(o))?"Câu Đúng/Sai: viết lại thành 4 phương án ABCD":"Mới có "+x.o.length+"/4 phương án");
    else if(new Set(x.o.map(nhKey)).size<4)x.err.push("Có phương án trùng nhau");
    if(x.a==null||x.a<0||x.a>3)x.err.push("Chưa có đáp án");
    if(!x.ch)x.warn.push("Chưa xếp chương");if(!x.b)x.warn.push("Thiếu căn cứ");if(!x.e)x.warn.push("Thiếu giải thích");
    if(x.thTitle){if(bankTh[x.thTitle])x.thId=bankTh[x.thTitle].id;else x.warn.push("Không thấy tình huống \""+x.thTitle.slice(0,30)+"\" — sẽ lưu thành câu lý thuyết")}
    if(k&&bk[k])x.dup="Trùng câu đã có trong ngân hàng";else if(k&&web[k])x.dup="Trùng câu "+web[k].id+" đã có trên web học phần";else if(k&&seen[k])x.dup="Trùng câu "+seen[k]+" trong chính nội dung này";
    if(k&&!seen[k])seen[k]=x.num;x._use=!x.err.length&&!x.dup});
  return res}

/* ---------- giao diện: trang tổng ---------- */
function nhRulesBox(){return `<div class="scard" style="border-color:var(--warn);background:var(--warn-soft)"><h2 class="sec" style="margin-top:0">Cần thêm quy tắc Firestore cho Ngân hàng câu hỏi (làm một lần)</h2>
  <ol style="margin:0 0 10px 18px;padding:0;line-height:1.7"><li>Mở <a href="https://console.firebase.google.com/project/phuc-nguyen-library/firestore/rules" target="_blank" rel="noopener"><b>Firebase Console › Firestore › Rules</b></a> (tài khoản Google sở hữu dự án).</li><li>Bấm vào ô mã, <b>Ctrl + F</b> tìm <code>Hết khối PNL</code>, đặt con trỏ ở đầu dòng đó, nhấn <b>Enter</b> để có một dòng trống phía trên.</li><li>Bấm <b>Sao chép 3 dòng</b> dưới đây, dán vào dòng trống, bấm <b>Publish</b>. Quay lại đây tải lại trang.</li></ol>
  <pre id="nh-rules" style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font-size:12px;overflow:auto;margin:0 0 10px">${esc(NH_RULES)}</pre><button type="button" class="btn sm pri" data-copyrules>Sao chép 3 dòng</button></div>`}
function nhBindRules(){const b=$("[data-copyrules]");if(b)b.onclick=async()=>{try{await navigator.clipboard.writeText(NH_RULES+"\n");toast("Đã chép. Dán vào Firebase Console rồi bấm Publish.")}catch(e){const r=document.createRange();r.selectNodeContents($("#nh-rules"));const s=getSelection();s.removeAllRanges();s.addRange(r);toast("Đã bôi đen — nhấn Ctrl + C để chép.")}}}
async function viewNganHang(hp){if(hp)return viewNganHangHp(hp);
  $("#app").innerHTML=shell("nganhang",`<div class="page"><div class="empty">Đang tải ngân hàng câu hỏi…</div></div>`);bindOut();
  let err="";try{await nhLoadAll()}catch(x){if(!nhDenied(x))err=errMsg(x)}
  const q=strip(S.q);const cs=S.courses.filter(c=>!q||strip(c.name).includes(q));
  const card=c=>{const st=nhStats(NH.byHp[c.id]);const ps=nhPubState(c.id);return `<a class="card" href="#nganhang/${encodeURIComponent(c.id)}"><b class="nm" title="${esc(c.name)}">${esc(c.name)}</b>
    <span class="meta"><span>Câu hỏi: <strong>${st.tong}</strong></span><span>Đã duyệt: <strong>${st.duyet}</strong></span><span>Tình huống: <strong>${st.th}</strong></span></span>
    <span class="meta" style="margin-top:8px">${st.kin?`<span class="pill gray">${st.kin} câu kín (ĐGĐK)</span>`:""}${st.nhap?`<span class="pill warn">${st.nhap} nháp</span>`:""}<span class="pill ${ps.cls}">${ps.p?(ps.cls==="warn"?"có thay đổi":"đã xuất bản"):"chưa xuất bản"}</span></span></a>`};
  const tot=Object.values(NH.byHp).reduce((a,l)=>a+l.filter(nhIsQ).length,0),tth=Object.values(NH.byHp).reduce((a,l)=>a+l.filter(x=>x.kieu==="th").length,0);
  const body=`<div class="page"><div class="bar"><div><h1 class="t">Ngân hàng câu hỏi</h1><span class="t-sub">${tot} câu hỏi · ${tth} tình huống · ${Object.keys(NH.pub).length} học phần đã xuất bản lên web ôn tập</span></div>
    <div class="tools"><button type="button" class="btn pri" data-imp>${I.up}Nhập câu hỏi</button><button type="button" class="btn" data-ai>${I.chat}Lệnh mẫu cho AI</button><label class="search" style="flex:0 1 260px"><span class="sr">Tìm học phần</span><input type="search" id="q" value="${esc(S.q)}" placeholder="Tìm học phần…"></label></div></div>
    ${NH.denied?nhRulesBox():err?`<div class="empty">Chưa tải được: ${esc(err)}</div>`:""}
    <div class="grid4">${cs.map(card).join("")||'<div class="empty">Không có học phần khớp.</div>'}</div>
    <p class="note">Mỗi học phần một ngân hàng. Câu mới nhập để <b>Nháp</b>; sếp duyệt rồi bấm <b>Xuất bản lên web ôn tập</b> thì sinh viên thấy trong Câu hỏi lý thuyết, Tình huống, Thi thử (ghép sau câu sẵn có, không sửa nội dung cũ). Câu đánh dấu <b>Kín</b> chỉ dành cho đánh giá định kỳ, không bao giờ xuất bản.</p></div>`;
  $("#app").innerHTML=shell("nganhang",body);bindOut();nhBindRules();
  $("#q").oninput=e=>{S.q=e.target.value;viewNganHang().then(()=>keepFocus("#q"))};
  $("[data-imp]").onclick=()=>dlgNhImport(null,"dan");$("[data-ai]").onclick=()=>dlgNhImport(null,"ai")}

/* ---------- giao diện: ngân hàng một học phần ---------- */
function nhFilter(hp){const f=NH.f,q=strip(f.q);const all=(NH.byHp[hp]||[]);const thT={};all.filter(x=>x.kieu==="th").forEach(x=>thT[x.id]=x);
  return all.filter(nhIsQ).filter(x=>(!f.ch||String(x.ch|0)===f.ch)&&(!f.lv||x.lv===f.lv)&&(!f.loai||(f.loai==="th"?!!x.th:!x.th))
    &&(!f.st||(f.st==="nhap"?x.st!=="duyet":f.st==="duyet"?x.st==="duyet"&&!x.kin:f.st==="kin"?!!x.kin:f.st==="loi"?(!nhValid(x)||!x.ch||!x.b||!x.e):f.st==="ai"?x.nguon==="ai":true))
    &&(!q||strip(x.q+" "+x.o.join(" ")+" "+(x.b||"")+" "+(thT[x.th]?.title||"")).includes(q))).sort(nhByOrd)}
function nhRow(hp,x,i,thT){const ok=nhValid(x);const iss=[!ok?"lỗi đáp án/phương án":"",!x.ch?"chưa xếp chương":"",!x.b?"thiếu căn cứ":"",!x.e?"thiếu giải thích":""].filter(Boolean);
  return `<tr data-row="${esc(x.id)}"><td><input type="checkbox" data-sel="${esc(x.id)}" ${NH.sel.has(x.id)?"checked":""} aria-label="Chọn câu"></td><td>${i+1}</td><td style="white-space:nowrap">${x.ch?"Ch. "+x.ch:"—"}</td><td><span class="pill gray">${esc(x.lv||"—")}</span></td>
    <td class="nhq">${x.th&&thT[x.th]?`<span class="pill" style="margin-bottom:4px">TH: ${esc(String(thT[x.th].title).slice(0,48))}</span><br>`:""}<b>${esc(x.q)}</b>
      <ol class="nho">${(x.o||[]).map((o,j)=>`<li class="${j===x.a?"ok":""}">${esc(o)}</li>`).join("")}</ol>${x.b?`<span class="nhb">Căn cứ: ${esc(x.b)}</span>`:""}</td>
    <td>${x.st==="duyet"?'<span class="pill">Đã duyệt</span>':'<span class="pill warn">Nháp</span>'}${x.kin?' <span class="pill gray">Kín</span>':""}${x.nguon==="ai"?' <span class="pill gray">AI</span>':""}${iss.map(t=>`<br><span class="pill bad" style="margin-top:3px">${t}</span>`).join("")}</td>
    <td class="acts" style="white-space:nowrap"><button type="button" class="ico" data-edit="${esc(x.id)}" aria-label="Sửa câu" title="Sửa">${I.edit}</button> <button type="button" class="ico del" data-del="${esc(x.id)}" aria-label="Xóa câu" title="Xóa">${I.del}</button></td></tr>`}
async function viewNganHangHp(hp){const c=courseOf(hp);if(!c){location.hash="#nganhang";return}
  const crumb=`<a class="back" href="#nganhang">${I.back}Ngân hàng câu hỏi</a><span class="sep">/</span><span class="sub">${esc(c.name)}</span>`;
  if(!NH.byHp[hp]||NH.cur!==hp)$("#app").innerHTML=shell("nganhang",`<div class="page"><div class="empty">Đang tải ngân hàng ${esc(c.name)}…</div></div>`,crumb),bindOut();
  if(NH.cur!==hp){NH.cur=hp;NH.sel.clear();NH.f={ch:"",lv:"",st:"",loai:"",q:""};NH.lim=60}
  let err="";await nhChapters(hp);try{await nhLoad(hp)}catch(x){if(!nhDenied(x))err=errMsg(x);NH.byHp[hp]=NH.byHp[hp]||[]}
  const all=NH.byHp[hp],st=nhStats(all),ps=nhPubState(hp),f=NH.f,chs=NH.chs[hp]||[];const thT={};all.filter(x=>x.kieu==="th").forEach(x=>thT[x.id]=x);
  const list=nhFilter(hp);const ths=all.filter(x=>x.kieu==="th").filter(x=>!f.ch||String(x.ch|0)===f.ch).sort(nhByOrd);
  const nq=id=>all.filter(x=>x.th===id).length;
  const opt=(v,t,cur)=>`<option value="${esc(v)}" ${String(cur)===String(v)?"selected":""}>${esc(t)}</option>`;
  const body=`<div class="page" style="max-width:1320px">
    <div class="bar"><div><h1 class="t">${esc(c.name)}</h1><span class="t-sub">Ngân hàng câu hỏi · <span class="pill ${ps.cls}">${esc(ps.txt)}</span></span></div>
      <div class="tools"><button type="button" class="btn pri" data-imp>${I.up}Nhập câu hỏi</button><button type="button" class="btn" data-addq>${I.plus}Thêm câu</button><button type="button" class="btn" data-addth>${I.plus}Thêm tình huống</button>
        <button type="button" class="btn" data-pub>${I.go}Xuất bản lên web ôn tập</button><button type="button" class="btn" data-more aria-label="Thao tác khác">···</button></div></div>
    ${NH.denied?nhRulesBox():err?`<div class="empty">Chưa tải được: ${esc(err)}</div>`:""}
    <div class="kpi" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><div><b>${st.tong}</b><span>câu hỏi</span></div><div><b>${st.duyet}</b><span>đã duyệt</span></div><div><b>${st.nhap}</b><span>nháp chờ duyệt</span></div><div><b>${st.kin}</b><span>câu kín cho ĐGĐK</span></div><div><b>${st.th}</b><span>tình huống</span></div></div>
    <div class="tools nhf"><select id="f-ch" aria-label="Lọc theo chương">${opt("","Tất cả chương",f.ch)}${chs.map(x=>opt(x.n,"Chương "+x.n+". "+x.t,f.ch)).join("")}${opt("0","Chưa xếp chương",f.ch)}</select>
      <select id="f-lv" aria-label="Lọc theo mức độ">${opt("","Mọi mức độ",f.lv)}${LVK.map(k=>opt(k,LVN[k],f.lv)).join("")}</select>
      <select id="f-st" aria-label="Lọc theo trạng thái">${opt("","Mọi trạng thái",f.st)}${opt("nhap","Nháp",f.st)}${opt("duyet","Đã duyệt (ôn tập)",f.st)}${opt("kin","Kín (ĐGĐK)",f.st)}${opt("loi","Có lỗi / thiếu căn cứ, giải thích",f.st)}${opt("ai","Do AI soạn",f.st)}</select>
      <select id="f-loai" aria-label="Lọc theo loại">${opt("","Lý thuyết và tình huống",f.loai)}${opt("lt","Câu lý thuyết",f.loai)}${opt("th","Câu thuộc tình huống",f.loai)}</select>
      <label class="search" style="flex:1 1 240px"><span class="sr">Tìm câu hỏi</span><input type="search" id="q" value="${esc(f.q)}" placeholder="Tìm trong câu hỏi, phương án, căn cứ…"></label></div>
    ${ths.length&&f.loai!=="lt"?`<section><button type="button" class="grp${NH.open.th?"":" closed"}" data-thgrp>${I.chev}Tình huống <span class="n">(${ths.length})</span></button><div class="nhths"${NH.open.th?"":" hidden"}>${ths.map(t=>`<div class="scard nhth"><div style="flex:1;min-width:0"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:4px"><b>${esc(t.title)}</b><span class="pill gray">${t.ch?"Ch. "+t.ch:"chưa xếp chương"}</span>${t.st==="duyet"?'<span class="pill">Đã duyệt</span>':'<span class="pill warn">Nháp</span>'}${t.kin?'<span class="pill gray">Kín</span>':""}<span class="pill gray">${nq(t.id)} câu ABCD · ${(t.ask||[]).length} yêu cầu</span></div><p class="nhtx">${esc(t.text)}</p></div>
      <div style="display:flex;gap:6px;flex:none"><button type="button" class="btn sm" data-thq="${esc(t.id)}">${I.plus}Câu hỏi</button><button type="button" class="ico" data-editth="${esc(t.id)}" aria-label="Sửa tình huống" title="Sửa">${I.edit}</button><button type="button" class="ico del" data-delth="${esc(t.id)}" aria-label="Xóa tình huống" title="Xóa">${I.del}</button></div></div>`).join("")}</div></section>`:""}
    <div class="nhbulk${NH.sel.size?"":" hidden"}" id="bulk"><b>Đã chọn ${NH.sel.size}</b><button type="button" class="btn sm pri" data-b="duyet">Duyệt</button><button type="button" class="btn sm" data-b="nhap">Chuyển nháp</button><button type="button" class="btn sm" data-b="kin">Đánh dấu kín</button><button type="button" class="btn sm" data-b="mo">Bỏ kín</button>
      <select id="b-ch" aria-label="Đổi chương cho câu đã chọn"><option value="">Đổi chương…</option>${chs.map(x=>`<option value="${x.n}">Chương ${x.n}</option>`).join("")}</select><select id="b-lv" aria-label="Đổi mức độ cho câu đã chọn"><option value="">Đổi mức độ…</option>${LVK.map(k=>`<option value="${k}">${LVN[k]}</option>`).join("")}</select>
      <button type="button" class="btn sm danger" data-b="xoa">${I.del}Xóa</button><button type="button" class="btn sm" data-b="bo">Bỏ chọn</button></div>
    ${!st.tong&&!st.th?`<div class="empty">Ngân hàng của học phần này chưa có câu nào. Bấm <b>Nhập câu hỏi</b> để dán theo mẫu, tải file Word/Excel, hoặc lấy lệnh mẫu soạn bằng AI.</div>`:
    `<div class="scard" style="padding:0"><div class="tbl"><table class="nht"><thead><tr><th><input type="checkbox" id="sel-all" aria-label="Chọn tất cả câu đang lọc"></th><th>#</th><th>Chương</th><th>Mức</th><th>Câu hỏi · phương án (đáp án tô xanh)</th><th>Trạng thái</th><th class="acts">Sửa</th></tr></thead><tbody>
      ${list.slice(0,NH.lim).map((x,i)=>nhRow(hp,x,i,thT)).join("")||`<tr><td colspan="7" class="empty" style="border:0">Không có câu nào khớp bộ lọc.</td></tr>`}</tbody></table></div>
      ${list.length>NH.lim?`<div style="padding:12px;text-align:center"><button type="button" class="btn sm" data-morel>Xem thêm (${list.length-NH.lim} câu)</button></div>`:""}</div>`}
    <p class="note">Đang hiện ${Math.min(list.length,NH.lim)}/${list.length} câu theo bộ lọc. <b>Xuất bản</b> chỉ đưa câu <b>Đã duyệt</b>, không kín, đủ 4 phương án và đáp án, đã xếp chương; tình huống phải được duyệt thì câu của nó mới lên web. Muốn sửa câu đã có sẵn trên web học phần (bản GitHub) vẫn sửa theo cách cũ.</p></div>`;
  $("#app").innerHTML=shell("nganhang",body,crumb);bindOut();nhBindRules();
  const re=()=>viewNganHangHp(hp);
  [["#f-ch","ch"],["#f-lv","lv"],["#f-st","st"],["#f-loai","loai"]].forEach(([s,k])=>{const el=$(s);if(el)el.onchange=e=>{NH.f[k]=e.target.value;NH.lim=60;re()}});
  $("#q").oninput=e=>{NH.f.q=e.target.value;clearTimeout(NH._t);NH._t=setTimeout(()=>re().then(()=>keepFocus("#q")),250)};
  $("[data-imp]").onclick=()=>dlgNhImport(hp,"dan");$("[data-addq]").onclick=()=>dlgNhQ(hp,null);$("[data-addth]").onclick=()=>dlgNhTh(hp,null);$("[data-pub]").onclick=()=>nhPublish(hp);
  $("[data-more]").onclick=e=>{e.stopPropagation();openMenu(e.currentTarget,[["Lệnh mẫu cho AI",()=>dlgNhImport(hp,"ai")],["Xuất Excel (sao lưu, in duyệt)",()=>nhExport(hp)],["Xem web ôn tập của học phần",()=>window.open(courseHref(c),"_blank")],
    ...(NH.pub[hp]?[["Gỡ bản đã xuất bản khỏi web…",()=>nhUnpublish(hp),"danger"]]:[])])};
  const tg=$("[data-thgrp]");if(tg)tg.onclick=()=>{NH.open.th=!NH.open.th;re()};
  const ml=$("[data-morel]");if(ml)ml.onclick=()=>{NH.lim+=200;re()};
  $$("[data-thq]").forEach(b=>b.onclick=()=>dlgNhQ(hp,null,b.dataset.thq));$$("[data-editth]").forEach(b=>b.onclick=()=>dlgNhTh(hp,all.find(x=>x.id===b.dataset.editth)));
  $$("[data-delth]").forEach(b=>b.onclick=async()=>{const t=all.find(x=>x.id===b.dataset.delth);const qs=all.filter(x=>x.th===t.id);
    if(!await confirmDlg("Xóa tình huống \""+String(t.title).slice(0,60)+"\"?",qs.length?"Xóa luôn "+qs.length+" câu ABCD của tình huống này. Không khôi phục được.":"Không khôi phục được.","Xóa"))return;await nhDelete(hp,[t.id,...qs.map(x=>x.id)])});
  $$("[data-edit]").forEach(b=>b.onclick=()=>dlgNhQ(hp,all.find(x=>x.id===b.dataset.edit)));
  $$("[data-del]").forEach(b=>b.onclick=async()=>{if(!await confirmDlg("Xóa câu hỏi này?","Không khôi phục được. Nếu câu đã xuất bản, nó còn trên web đến lần xuất bản sau.","Xóa"))return;await nhDelete(hp,[b.dataset.del])});
  const bulkShow=()=>{const el=$("#bulk");if(!el)return;el.classList.toggle("hidden",!NH.sel.size);$("b",el).textContent="Đã chọn "+NH.sel.size};
  $$("[data-sel]").forEach(cb=>cb.onchange=()=>{cb.checked?NH.sel.add(cb.dataset.sel):NH.sel.delete(cb.dataset.sel);bulkShow()});
  const sa=$("#sel-all");if(sa)sa.onchange=()=>{list.forEach(x=>sa.checked?NH.sel.add(x.id):NH.sel.delete(x.id));$$("[data-sel]").forEach(cb=>cb.checked=sa.checked);bulkShow()};
  $$("[data-b]").forEach(b=>b.onclick=async()=>{const ids=[...NH.sel];const k=b.dataset.b;if(k==="bo"){NH.sel.clear();return re()}
    if(k==="xoa"){if(!await confirmDlg("Xóa "+ids.length+" câu đã chọn?","Không khôi phục được.","Xóa"))return;return nhDelete(hp,ids)}
    if(k==="duyet"){const bad=ids.map(id=>all.find(x=>x.id===id)).filter(x=>x&&!nhValid(x));if(bad.length){toast(bad.length+" câu còn lỗi phương án/đáp án — sửa trước khi duyệt.");return}}
    await nhUpdate(hp,ids,k==="duyet"?{st:"duyet"}:k==="nhap"?{st:"nhap"}:k==="kin"?{kin:true}:{kin:false})});
  const bc=$("#b-ch");if(bc)bc.onchange=()=>bc.value&&nhUpdate(hp,[...NH.sel],{ch:+bc.value});const bl=$("#b-lv");if(bl)bl.onchange=()=>bl.value&&nhUpdate(hp,[...NH.sel],{lv:bl.value})}

/* ---------- ghi ---------- */
async function nhCommit(ops){const db=S.fs;for(let i=0;i<ops.length;i+=400){const b=db.batch();ops.slice(i,i+400).forEach(([k,ref,data])=>k==="del"?b.delete(ref):b.set(ref,data,{merge:k==="upd"}));await b.commit()}}
async function nhUpdate(hp,ids,part){if(!ids.length)return;try{const p=Object.assign({},part,{updated:FV().serverTimestamp()});await nhCommit(ids.map(id=>["upd",S.fs.doc("pnl_nh/"+id),p]));
  (NH.byHp[hp]||[]).forEach(x=>{if(ids.includes(x.id))Object.assign(x,part,{updated:new Date()})});toast("Đã cập nhật "+ids.length+" câu.");NH.sel.clear();render()}catch(x){nhDenied(x);toast("Chưa lưu được: "+errMsg(x))}}
async function nhDelete(hp,ids){try{await nhCommit(ids.map(id=>["del",S.fs.doc("pnl_nh/"+id)]));NH.byHp[hp]=(NH.byHp[hp]||[]).filter(x=>!ids.includes(x.id));ids.forEach(id=>NH.sel.delete(id));
  NH.byHp[hp].forEach(x=>{if(x.th&&ids.includes(x.th))x.th=""});toast("Đã xóa "+ids.length+" mục.");render()}catch(x){nhDenied(x);toast("Chưa xóa được: "+errMsg(x))}}

/* ---------- hộp thoại: một câu ---------- */
function nhChSel(hp,id,cur){return `<select id="${id}">${`<option value="0">— Chưa xếp chương —</option>`+(NH.chs[hp]||[]).map(x=>`<option value="${x.n}" ${+cur===x.n?"selected":""}>Chương ${x.n}. ${esc(x.t)}</option>`).join("")}</select>`}
function dlgNhQ(hp,x,thId){const dlg=$("#dlg");const all=NH.byHp[hp]||[];const ths=all.filter(t=>t.kieu==="th").sort(nhByOrd);const th0=x?x.th:(thId||"");const t0=ths.find(t=>t.id===th0);
  const v=x||{q:"",o:["","","",""],a:null,b:"",e:"",lv:t0?"VD":"NB",ch:t0?t0.ch:(+NH.f.ch||0),st:"nhap",kin:t0?!!t0.kin:false};
  dlg.className="wide";dlg.innerHTML=`<div class="dh"><h3>${x?"Sửa câu hỏi":"Thêm câu hỏi"} · ${esc(courseOf(hp)?.name||hp)}</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <form id="f-q"><div class="row2" style="grid-template-columns:2fr 1fr 1fr"><div class="fld"><label for="q-ch">Chương</label>${nhChSel(hp,"q-ch",v.ch)}</div><div class="fld"><label for="q-lv">Mức độ</label><select id="q-lv">${LVK.map(k=>`<option value="${k}" ${v.lv===k?"selected":""}>${LVN[k]}</option>`).join("")}</select></div>
      <div class="fld"><label for="q-st">Trạng thái</label><select id="q-st"><option value="nhap" ${v.st!=="duyet"?"selected":""}>Nháp</option><option value="duyet" ${v.st==="duyet"?"selected":""}>Đã duyệt</option></select></div></div>
    <div class="fld"><label for="q-th">Thuộc tình huống</label><select id="q-th"><option value="">— Câu lý thuyết (không thuộc tình huống) —</option>${ths.map(t=>`<option value="${esc(t.id)}" ${t.id===th0?"selected":""}>${t.ch?"Ch. "+t.ch+" · ":""}${esc(String(t.title).slice(0,80))}</option>`).join("")}</select></div>
    <div class="fld"><label for="q-q">Câu hỏi *</label><textarea id="q-q" rows="3" required>${esc(v.q)}</textarea></div>
    <div class="fld"><label>Phương án * <span class="hint" style="font-weight:400">(chọn nút tròn ở phương án đúng)</span></label>${[0,1,2,3].map(i=>`<div class="nhopt"><label class="nhr"><input type="radio" name="q-a" value="${i}" ${v.a===i?"checked":""} aria-label="Phương án ${ABCD[i]} đúng"><b>${ABCD[i]}</b></label><input id="q-o${i}" value="${esc((v.o||[])[i]||"")}" aria-label="Phương án ${ABCD[i]}" required></div>`).join("")}</div>
    <div class="fld"><label for="q-b">Căn cứ pháp lý</label><input id="q-b" value="${esc(v.b||"")}" placeholder="VD: khoản 2 Điều 5 BLDS 2015"></div>
    <div class="fld"><label for="q-e">Giải thích (vì sao đúng, vì sao sai)</label><textarea id="q-e" rows="3">${esc(v.e||"")}</textarea></div>
    <label style="font-weight:500"><input type="checkbox" id="q-kin" ${v.kin?"checked":""}> Câu <b>kín</b> — chỉ dùng cho đánh giá định kỳ, không xuất bản ôn tập</label>
    <p class="err" id="q-err"></p><div class="df"><button type="button" class="btn" data-x>Hủy</button><button type="submit" class="btn pri">${x?"Lưu thay đổi":"Thêm vào ngân hàng"}</button></div></form>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());
  $("#q-th").onchange=e=>{const t=ths.find(z=>z.id===e.target.value);if(t){$("#q-ch").value=String(t.ch|0);$("#q-lv").value="VD"}};
  $("#f-q").onsubmit=async e=>{e.preventDefault();const err=m=>$("#q-err").textContent=m;const a=$("input[name=q-a]:checked",dlg);
    const d={kieu:"cau",hp,ch:+$("#q-ch").value||0,lv:$("#q-lv").value,th:$("#q-th").value,q:$("#q-q").value.trim(),o:[0,1,2,3].map(i=>$("#q-o"+i).value.trim()),a:a?+a.value:null,b:$("#q-b").value.trim(),e:$("#q-e").value.trim(),st:$("#q-st").value,kin:$("#q-kin").checked};
    if(!d.q)return err("Nhập nội dung câu hỏi.");if(d.o.some(o=>!o))return err("Nhập đủ 4 phương án.");if(new Set(d.o.map(nhKey)).size<4)return err("Có hai phương án trùng nhau.");if(d.a==null)return err("Chọn phương án đúng.");
    const k=nhKey(d.q);const dup=all.find(y=>nhIsQ(y)&&y.id!==(x&&x.id)&&nhKey(y.q)===k);if(dup&&!e.submitter?.dataset.force){err("Trùng nội dung với một câu đã có trong ngân hàng (Ch. "+(dup.ch||"—")+"). Bấm lưu lần nữa nếu vẫn muốn lưu.");$("button[type=submit]",dlg).dataset.force="1";return}
    if(d.st==="duyet"&&(!d.b||!d.e)&&!$("button[type=submit]",dlg).dataset.warn){err("Câu chưa có căn cứ hoặc giải thích (chuẩn ôn tập yêu cầu đủ). Bấm lưu lần nữa nếu vẫn muốn duyệt.");$("button[type=submit]",dlg).dataset.warn="1";return}
    const btn=$("button[type=submit]",dlg);btn.disabled=true;
    try{const now=FV().serverTimestamp();if(x){await S.fs.doc("pnl_nh/"+x.id).set(Object.assign({},d,{updated:now}),{merge:true});Object.assign(x,d,{updated:new Date()})}
      else{const ref=S.fs.collection("pnl_nh").doc();const full=Object.assign({},d,{nguon:"tay",ord:Date.now(),created:now,updated:now});await ref.set(full);all.push(Object.assign({id:ref.id},full,{updated:new Date()}))}
      dlg.close();toast(x?"Đã lưu câu hỏi.":"Đã thêm câu hỏi.");render()}catch(ex){nhDenied(ex);err("Chưa lưu được: "+errMsg(ex));btn.disabled=false}}}

/* ---------- hộp thoại: tình huống ---------- */
function dlgNhTh(hp,t){const dlg=$("#dlg");const v=t||{title:"",text:"",ask:[],guide:[],ch:+NH.f.ch||0,st:"nhap",kin:false};
  dlg.className="wide";dlg.innerHTML=`<div class="dh"><h3>${t?"Sửa tình huống":"Thêm tình huống"} · ${esc(courseOf(hp)?.name||hp)}</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <form id="f-th"><div class="row2" style="grid-template-columns:2fr 1fr"><div class="fld"><label for="t-ch">Chương</label>${nhChSel(hp,"t-ch",v.ch)}</div><div class="fld"><label for="t-st">Trạng thái</label><select id="t-st"><option value="nhap" ${v.st!=="duyet"?"selected":""}>Nháp</option><option value="duyet" ${v.st==="duyet"?"selected":""}>Đã duyệt</option></select></div></div>
    <div class="fld"><label for="t-ti">Tiêu đề *</label><input id="t-ti" value="${esc(v.title)}" maxlength="160" required placeholder="VD: Tranh chấp đòi lại tài sản cho mượn"></div>
    <div class="fld"><label for="t-tx">Nội dung tình huống *</label><textarea id="t-tx" rows="7" required>${esc(v.text)}</textarea></div>
    <div class="fld"><label for="t-yc">Yêu cầu (mỗi dòng một yêu cầu)</label><textarea id="t-yc" rows="3">${esc((v.ask||[]).join("\n"))}</textarea></div>
    <div class="fld"><label for="t-gy">Gợi ý giải / ý chính (mỗi dòng một ý, có căn cứ)</label><textarea id="t-gy" rows="4">${esc((v.guide||[]).join("\n"))}</textarea></div>
    <label style="font-weight:500"><input type="checkbox" id="t-kin" ${v.kin?"checked":""}> Tình huống <b>kín</b> — chỉ dùng cho đánh giá định kỳ</label>
    <p class="note" style="margin:0">Câu ABCD của tình huống thêm bằng nút <b>+ Câu hỏi</b> trên thẻ tình huống, hoặc nhập cả khối theo mẫu (dòng <i>Tình huống 1: …</i> rồi các dòng <i>Câu…</i>).</p>
    <p class="err" id="t-err"></p><div class="df"><button type="button" class="btn" data-x>Hủy</button><button type="submit" class="btn pri">${t?"Lưu thay đổi":"Thêm tình huống"}</button></div></form>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());
  $("#f-th").onsubmit=async e=>{e.preventDefault();const lines=s=>s.split("\n").map(z=>z.replace(/^(?:[-–•+]|\d+[.)])\s+/,"").trim()).filter(Boolean);
    const d={kieu:"th",hp,ch:+$("#t-ch").value||0,title:$("#t-ti").value.trim(),text:$("#t-tx").value.trim(),ask:lines($("#t-yc").value),guide:lines($("#t-gy").value),st:$("#t-st").value,kin:$("#t-kin").checked};
    if(!d.title||!d.text){$("#t-err").textContent="Nhập tiêu đề và nội dung tình huống.";return}const btn=$("button[type=submit]",dlg);btn.disabled=true;
    try{const now=FV().serverTimestamp();const all=NH.byHp[hp];if(t){await S.fs.doc("pnl_nh/"+t.id).set(Object.assign({},d,{updated:now}),{merge:true});Object.assign(t,d,{updated:new Date()});
        /* câu của tình huống đi theo chương và chế độ kín của tình huống */
        const qs=all.filter(x=>x.th===t.id&&((x.ch|0)!==d.ch||!!x.kin!==d.kin));if(qs.length){await nhCommit(qs.map(x=>["upd",S.fs.doc("pnl_nh/"+x.id),{ch:d.ch,kin:d.kin,updated:now}]));qs.forEach(x=>Object.assign(x,{ch:d.ch,kin:d.kin}))}}
      else{const ref=S.fs.collection("pnl_nh").doc();const full=Object.assign({},d,{nguon:"tay",ord:Date.now(),created:now,updated:now});await ref.set(full);all.push(Object.assign({id:ref.id},full,{updated:new Date()}));NH.open.th=true}
      dlg.close();toast(t?"Đã lưu tình huống.":"Đã thêm tình huống. Bấm + Câu hỏi trên thẻ để thêm câu ABCD.");render()}catch(ex){nhDenied(ex);$("#t-err").textContent="Chưa lưu được: "+errMsg(ex);btn.disabled=false}}}

/* ---------- hộp thoại: nhập (dán / file / lệnh AI) ---------- */
const NH_MAU=`Chương 1
Mức độ: Nhận biết
Câu 1. Theo Bộ luật Dân sự 2015, năng lực pháp luật dân sự của cá nhân có từ thời điểm nào?
A. Khi cá nhân đủ 6 tuổi
*B. Khi cá nhân sinh ra
C. Khi cá nhân đủ 18 tuổi
D. Khi cá nhân được đăng ký khai sinh
Căn cứ: khoản 3 Điều 16 BLDS 2015
Giải thích: Năng lực pháp luật dân sự của cá nhân có từ khi người đó sinh ra và chấm dứt khi người đó chết; các mốc tuổi gắn với năng lực hành vi, không phải năng lực pháp luật.

Tình huống 1: Cho mượn xe máy không trả
Ngày 01/3/2026, A cho B mượn xe máy trong 10 ngày. Hết hạn, B không trả mà bán xe cho C với giá 20 triệu đồng; C không biết xe của A.
Yêu cầu: A có quyền đòi lại xe từ C không? Vì sao?
Gợi ý: Xác định C là người chiếm hữu ngay tình, tài sản là động sản phải đăng ký; áp dụng Điều 167, 168 BLDS 2015.
Câu 2. Quan hệ giữa A và B là quan hệ hợp đồng gì?
A. Hợp đồng thuê tài sản
B. Hợp đồng tặng cho tài sản
C. Hợp đồng mượn tài sản
D. Hợp đồng gửi giữ tài sản
Đáp án: C
Căn cứ: Điều 494 BLDS 2015
Giải thích: A giao xe cho B sử dụng không phải trả tiền trong thời hạn nhất định — đó là hợp đồng mượn tài sản.
HẾT TÌNH HUỐNG`;
function nhAiPrompt(o){const c=courseOf(o.hp);const chs=NH.chs[o.hp]||[];const chT=o.ch?chs.find(x=>x.n===+o.ch):null;
  return `Bạn là giảng viên luật đại học ở Việt Nam, soạn câu hỏi ôn tập cho sinh viên chuyên ngành Luật năm 2–4.
Học phần: ${c?c.name:o.hp}${chT?"\nChương "+chT.n+": "+chT.t:""}${o.note?"\nPhạm vi, trọng tâm: "+o.note:""}
Soạn ${o.n} câu trắc nghiệm ABCD, mức độ ${LVN[o.lv]}${o.th>0?`, và ${o.th} tình huống mức Vận dụng (mỗi tình huống 4 câu ABCD nối tiếp theo trình tự giải: xác định vấn đề → áp dụng quy định → kết luận → hướng xử lý)`:""}.

Yêu cầu nội dung:
- Chỉ dùng văn bản quy phạm pháp luật đang có hiệu lực; ghi rõ điều, khoản, tên văn bản và năm ban hành. Không bịa điều luật; câu nào không chắc căn cứ thì bỏ.
- Mỗi câu đúng 4 phương án A, B, C, D, chỉ một phương án đúng; phương án sai phải hợp lý (nhầm lẫn thường gặp), không dùng "Tất cả đều đúng/sai". Không dùng câu Đúng/Sai.
- Giải thích ngắn: vì sao phương án đúng là đúng và vì sao các phương án còn lại sai.
- Tình huống: người, sự việc, ngày tháng cụ thể; không gộp nhiều nội dung độc lập vào một tình huống.

TRÌNH BÀY ĐÚNG MẪU SAU, chỉ trả về văn bản thuần (không bảng, không markdown, không in đậm), đánh dấu * trước phương án đúng:
Chương ${chT?chT.n:"<số chương>"}
Mức độ: ${LVN[o.lv]}
Câu 1. <nội dung câu hỏi>
A. <phương án>
*B. <phương án đúng>
C. <phương án>
D. <phương án>
Căn cứ: <điều, khoản, văn bản>
Giải thích: <giải thích>
${o.th>0?`
Tình huống 1: <tiêu đề ngắn>
<nội dung tình huống>
Yêu cầu: <câu hỏi tự luận của tình huống>
Gợi ý: <ý chính để giải, có căn cứ>
Câu ${o.n+1}. <câu ABCD thứ nhất của tình huống>
A. …
*B. …
C. …
D. …
Căn cứ: …
Giải thích: …
(… đủ 4 câu của tình huống …)
HẾT TÌNH HUỐNG
`:""}
Đánh số câu liên tục từ 1 đến hết.`}
function dlgNhImport(hp0,tab){const dlg=$("#dlg");let hp=hp0||NH.cur||(S.courses[0]&&S.courses[0].id);let res=null,src="dan";
  const cOpts=S.courses.map(c=>`<option value="${esc(c.id)}" ${c.id===hp?"selected":""}>${esc(c.name)}</option>`).join("");
  dlg.className="wide nhx";dlg.innerHTML=`<div class="dh"><h3>Nhập câu hỏi vào ngân hàng</h3><button type="button" class="x" data-x aria-label="Đóng">×</button></div>
  <form id="f-imp"><div class="row2" style="grid-template-columns:2fr 1.4fr 1fr"><div class="fld"><label for="i-hp">Học phần</label><select id="i-hp" ${hp0?"disabled":""}>${cOpts}</select></div><div class="fld"><label for="i-ch">Chương (khi nội dung không có dòng "Chương N")</label><span id="i-chw"></span></div>
      <div class="fld"><label for="i-lv">Mức độ mặc định</label><select id="i-lv">${LVK.map(k=>`<option value="${k}">${LVN[k]}</option>`).join("")}</select></div></div>
    <div class="nhtabs" role="tablist"><button type="button" role="tab" data-tab="dan">Dán nội dung</button><button type="button" role="tab" data-tab="file">Tải file Word / Excel</button><button type="button" role="tab" data-tab="ai">Lệnh mẫu cho AI</button></div>
    <div data-pane="dan"><div class="fld"><label for="i-txt">Dán câu hỏi theo mẫu <button type="button" class="btn sm" data-mau style="margin-left:8px;padding:3px 10px">Xem mẫu</button></label><div id="i-mau" hidden><pre class="nhmau">${esc(NH_MAU)}</pre><button type="button" class="btn sm" data-usemau>Đưa mẫu này vào ô (thay nội dung đang có) để thử</button></div><textarea id="i-txt" rows="9" placeholder="Câu 1. …&#10;A. …&#10;*B. … (dấu * trước phương án đúng, hoặc dòng 'Đáp án: B', hoặc bảng ĐÁP ÁN ở cuối)&#10;C. …&#10;D. …&#10;Căn cứ: …&#10;Giải thích: …"></textarea>
      <span class="hint">Nhận: dòng <b>Chương N</b>, <b>Mức độ: …</b>, <b>Câu N.</b>, phương án <b>A. B. C. D.</b> (mỗi dòng một phương án hoặc cùng một dòng), đáp án bằng <b>*</b> / <b>Đáp án: B</b> / bảng <b>ĐÁP ÁN</b> (1A 2C…), <b>Căn cứ:</b>, <b>Giải thích:</b>; khối <b>Tình huống N: tiêu đề</b> + nội dung + <b>Yêu cầu:</b> + <b>Gợi ý:</b> + các câu, kết thúc bằng <b>HẾT TÌNH HUỐNG</b>.</span></div></div>
    <div data-pane="file" hidden><div class="drop" id="drop">Kéo thả file vào đây hoặc <label style="color:var(--navy);font-weight:600;cursor:pointer">chọn file<input type="file" id="i-file" accept=".docx,.xlsx,.xls,.csv,.txt" class="sr"></label><br><span class="hint"><b>Word (.docx)</b> soạn theo mẫu Azota: phương án đúng gạch chân, tô đỏ hoặc có dấu *. <b>Excel/CSV</b>: cột Chương | Mức độ | Câu hỏi | A | B | C | D | Đáp án | Căn cứ | Giải thích | Tình huống (giống file Xuất Excel).</span></div><p class="note" id="i-fname" style="margin:6px 0 0"></p></div>
    <div data-pane="ai" hidden><div class="row2" style="grid-template-columns:1fr 1fr 1fr"><div class="fld"><label for="a-n">Số câu ABCD</label><input id="a-n" type="number" min="1" max="60" value="10"></div><div class="fld"><label for="a-th">Số tình huống</label><input id="a-th" type="number" min="0" max="5" value="0"></div><div class="fld"><label for="a-lv">Mức độ</label><select id="a-lv">${LVK.map(k=>`<option value="${k}">${LVN[k]}</option>`).join("")}</select></div></div>
      <div class="fld"><label for="a-note">Phạm vi, trọng tâm (không bắt buộc)</label><input id="a-note" placeholder="VD: điều kiện có hiệu lực của giao dịch dân sự; giao dịch vô hiệu"></div>
      <div class="fld"><label for="a-out">Lệnh để dán vào ChatGPT / Gemini</label><textarea id="a-out" rows="9" readonly></textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn sm pri" data-copyai>Sao chép lệnh</button><button type="button" class="btn sm" data-toDan>Đã có kết quả → dán vào đây</button></div>
      <p class="note" style="margin:6px 0 0">Chép lệnh → dán vào ChatGPT hoặc Gemini → chép toàn bộ câu trả lời → thẻ <b>Dán nội dung</b>. Câu do AI soạn luôn vào ngân hàng ở trạng thái <b>Nháp</b>, gắn nhãn AI để sếp duyệt từng câu.</p></div>
    <div id="i-prev"></div>
    <div class="row2" style="grid-template-columns:1fr 1fr;align-items:end"><div style="display:flex;flex-direction:column;gap:6px"><label style="font-weight:500"><input type="checkbox" id="i-ai"> Nội dung do AI soạn (luôn để Nháp)</label><label style="font-weight:500"><input type="checkbox" id="i-kin"> Câu <b>kín</b> — chỉ cho đánh giá định kỳ</label></div>
      <div class="fld"><label for="i-st">Trạng thái khi lưu</label><select id="i-st"><option value="nhap">Nháp — duyệt sau</option><option value="duyet">Đã duyệt</option></select></div></div>
    <p class="err" id="i-err"></p><div class="df"><button type="button" class="btn" data-x>Đóng</button><button type="submit" class="btn pri" disabled>Lưu vào ngân hàng</button></div></form>`;
  dlg.showModal();$$("[data-x]",dlg).forEach(b=>b.onclick=()=>dlg.close());
  const def=()=>({ch:+(($("#i-ch")||{}).value||0),lv:$("#i-lv").value});
  const setErr=m=>$("#i-err").textContent=m||"";
  const showTab=k=>{$$("[data-tab]",dlg).forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===k));$$("[data-pane]",dlg).forEach(p=>p.hidden=p.dataset.pane!==k);if(k==="ai")upAi()};
  const upAi=()=>{$("#a-out").value=nhAiPrompt({hp,ch:def().ch,n:Math.max(1,Math.min(60,+$("#a-n").value||10)),th:Math.max(0,Math.min(5,+$("#a-th").value||0)),lv:$("#a-lv").value,note:$("#a-note").value.trim()})};
  const loadHp=async()=>{$("#i-chw").innerHTML=`<select id="i-ch" disabled><option>Đang tải chương…</option></select>`;await nhChapters(hp);try{await nhLoad(hp)}catch(x){if(nhDenied(x)){setErr("Chưa có quyền ghi ngân hàng: cần thêm quy tắc Firestore (xem hướng dẫn trên trang Ngân hàng câu hỏi).")}NH.byHp[hp]=NH.byHp[hp]||[]}
    $("#i-chw").innerHTML=nhChSel(hp,"i-ch",+NH.f.ch||0);$("#i-ch").onchange=()=>{reparse();upAi()};reparse();if(!$("[data-pane=ai]").hidden)upAi()};
  const render2=()=>{const box=$("#i-prev");const sub=$("button[type=submit]",dlg);if(!res||(!res.items.length&&!res.cases.length)){box.innerHTML=res&&res.stray.length?`<div class="empty" style="text-align:left">Chưa nhận ra câu nào. Kiểm tra mỗi câu bắt đầu bằng <b>Câu 1.</b>, <b>Câu 2.</b>…</div>`:"";sub.disabled=true;return}
    const nU=res.items.filter(x=>x._use).length,nC=res.cases.filter(c=>c._use).length,nE=res.items.filter(x=>x.err.length).length,nD=res.items.filter(x=>x.dup).length,nW=res.items.filter(x=>!x.err.length&&x.warn.length).length;
    const cRow=(c,i)=>`<tr class="nhcase"><td><input type="checkbox" data-uc="${i}" ${c._use?"checked":""} ${c.err.length?"disabled":""} aria-label="Chọn tình huống"></td><td colspan="3"><b>Tình huống: ${esc(c.title)}</b> · ${c.ch?"Ch. "+c.ch:"chưa xếp chương"}<div class="nhtx">${esc(c.text)}</div>${c.ask.length?`<span class="nhb">Yêu cầu: ${esc(c.ask.join(" | "))}</span>`:""}</td><td>${c.err.map(t=>`<span class="pill bad">${esc(t)}</span>`).join(" ")}${c.dup?`<span class="pill bad">${esc(c.dup)}</span>`:""}${c.warn.map(t=>` <span class="pill warn">${esc(t)}</span>`).join("")}</td></tr>`;
    const qRow=x=>`<tr${x.thIdx!=null?' class="nhin"':""}><td><input type="checkbox" data-uq="${res.items.indexOf(x)}" ${x._use?"checked":""} ${x.err.length?"disabled":""} aria-label="Chọn câu"></td><td>${x.num}</td><td style="white-space:nowrap">${x.ch?"Ch. "+x.ch:"—"} · ${esc(x.lv)}</td>
      <td class="nhq"><b>${esc(x.q)}</b><ol class="nho">${x.o.map((o,j)=>`<li class="${j===x.a?"ok":""}">${esc(o)}</li>`).join("")}</ol>${x.b?`<span class="nhb">Căn cứ: ${esc(x.b)}</span>`:""}</td>
      <td>${x.err.map(t=>`<span class="pill bad">${esc(t)}</span>`).join(" ")}${x.dup?` <span class="pill bad">${esc(x.dup)}</span>`:""}${x.warn.map(t=>` <span class="pill warn">${esc(t)}</span>`).join("")}${!x.err.length&&!x.dup&&!x.warn.length?'<span class="pill">đạt</span>':""}</td></tr>`;
    const rows=[];res.cases.forEach((c,i)=>{rows.push(cRow(c,i));res.items.filter(x=>x.thIdx===i).forEach(x=>rows.push(qRow(x)))});const lt=res.items.filter(x=>x.thIdx==null);
    box.innerHTML=`<div class="nhsum"><b>Nhận được ${res.items.length} câu${res.cases.length?", "+res.cases.length+" tình huống":""}</b>${res.key?` · bảng ĐÁP ÁN ${res.key} câu`:""} · <span style="color:var(--ok)">${nU} câu sẽ lưu</span>${nE?` · <span style="color:var(--bad)">${nE} câu lỗi (bỏ qua)</span>`:""}${nD?` · <span style="color:var(--bad)">${nD} câu trùng (bỏ chọn sẵn)</span>`:""}${nW?` · <span style="color:var(--warn)">${nW} câu thiếu căn cứ/giải thích/chương</span>`:""}${res.stray.length?` · ${res.stray.length} dòng không thuộc câu nào bị bỏ qua`:""}</div>
      <div class="prev" style="max-height:360px"><table class="nht"><thead><tr><th></th><th>Câu</th><th>Chương · mức</th><th>Nội dung (đáp án tô xanh)</th><th>Kiểm tra</th></tr></thead><tbody>${lt.map(qRow).join("")}${rows.join("")}</tbody></table></div>${src==="file"&&res.text!=null?`<button type="button" class="btn sm" data-totext style="margin-top:8px">Chuyển nội dung file sang ô Dán để sửa</button>`:""}`;
    sub.disabled=!(nU||nC);sub.textContent="Lưu "+nU+" câu"+(nC?" và "+nC+" tình huống":"")+" vào ngân hàng";
    $$("[data-uq]",box).forEach(cb=>cb.onchange=()=>{res.items[+cb.dataset.uq]._use=cb.checked;render2()});
    $$("[data-uc]",box).forEach(cb=>cb.onchange=()=>{const i=+cb.dataset.uc;res.cases[i]._use=cb.checked;res.items.filter(x=>x.thIdx===i).forEach(x=>x._use=cb.checked&&!x.err.length&&!x.dup);render2()});
    const tt=$("[data-totext]",box);if(tt)tt.onclick=()=>{$("#i-txt").value=res.text;src="dan";showTab("dan");reparse()}};
  let fileRes=null;
  const reparse=()=>{setErr("");if(src==="file"&&fileRes){res=nhCheck(hp,fileRes.res?JSON.parse(JSON.stringify(fileRes.res)):Object.assign(nhParseText(fileRes.text,def()),{text:fileRes.text}))}
    else{const t=$("#i-txt").value;res=t.trim()?nhCheck(hp,nhParseText(t,def())):null}render2()};
  $$("[data-tab]",dlg).forEach(b=>b.onclick=()=>{showTab(b.dataset.tab);if(b.dataset.tab!=="ai"){src=b.dataset.tab==="file"&&fileRes?"file":"dan";reparse()}});
  $("#i-hp").onchange=e=>{hp=e.target.value;loadHp()};$("#i-lv").onchange=reparse;
  let tm;$("#i-txt").oninput=()=>{src="dan";clearTimeout(tm);tm=setTimeout(reparse,350)};
  $("[data-mau]").onclick=()=>{const b=$("#i-mau");b.hidden=!b.hidden};$("[data-usemau]").onclick=()=>{$("#i-txt").value=NH_MAU;$("#i-mau").hidden=true;src="dan";reparse()};
  ["#a-n","#a-th","#a-lv","#a-note"].forEach(s=>$(s).oninput=upAi);
  $("[data-copyai]").onclick=async()=>{upAi();try{await navigator.clipboard.writeText($("#a-out").value);toast("Đã chép lệnh. Dán vào ChatGPT hoặc Gemini.")}catch(e){$("#a-out").select();toast("Đã bôi đen — nhấn Ctrl + C để chép.")}};
  $("[data-toDan]").onclick=()=>{$("#i-ai").checked=true;$("#i-st").value="nhap";showTab("dan");$("#i-txt").focus()};
  $("#i-ai").onchange=e=>{if(e.target.checked)$("#i-st").value="nhap"};$("#i-st").onchange=e=>{if(e.target.value==="duyet"&&$("#i-ai").checked){e.target.value="nhap";toast("Câu do AI soạn phải để Nháp và duyệt từng câu.")}};
  const onFile=async f=>{if(!f)return;setErr("");$("#i-fname").textContent="Đang đọc "+f.name+"…";try{fileRes=await nhReadFile(f,def());src="file";$("#i-fname").textContent="Đã đọc: "+f.name;reparse()}catch(x){fileRes=null;$("#i-fname").textContent="";setErr(x.message||String(x))}};
  $("#i-file").onchange=e=>onFile(e.target.files[0]);const dz=$("#drop");dz.ondragover=e=>{e.preventDefault();dz.classList.add("on")};dz.ondragleave=()=>dz.classList.remove("on");dz.ondrop=e=>{e.preventDefault();dz.classList.remove("on");onFile(e.dataTransfer.files[0])};
  $("#f-imp").onsubmit=async e=>{e.preventDefault();if(!res)return;const btn=$("button[type=submit]",dlg);btn.disabled=true;const t0=btn.textContent;btn.textContent="Đang lưu…";
    try{const n=await nhSaveImport(hp,res,{st:$("#i-ai").checked?"nhap":$("#i-st").value,kin:$("#i-kin").checked,nguon:$("#i-ai").checked?"ai":(src==="file"?"file":"dan")});
      dlg.close();toast("Đã lưu "+n.q+" câu"+(n.t?" và "+n.t+" tình huống":"")+" vào ngân hàng "+(courseOf(hp)?.name||hp)+".");if(location.hash!=="#nganhang/"+encodeURIComponent(hp))location.hash="#nganhang/"+encodeURIComponent(hp);else render()}
    catch(x){nhDenied(x);setErr("Chưa lưu được: "+errMsg(x));btn.disabled=false;btn.textContent=t0}};
  showTab(tab||"dan");loadHp()}
async function nhSaveImport(hp,res,o){const db=S.fs,now=FV().serverTimestamp();let ord=Date.now();const ops=[],add=[],caseId={};const all=NH.byHp[hp]=NH.byHp[hp]||[];
  res.cases.forEach((c,i)=>{if(!c._use)return;const ref=db.collection("pnl_nh").doc();caseId[i]=ref.id;const d={kieu:"th",hp,ch:c.ch|0,title:c.title,text:c.text,ask:c.ask,guide:c.guide,st:o.st,kin:o.kin,nguon:o.nguon,ord:ord++,created:now,updated:now};ops.push(["set",ref,d]);add.push(Object.assign({id:ref.id},d))});
  res.items.forEach(x=>{if(!x._use)return;if(x.thIdx!=null&&!res.cases[x.thIdx]._use)return;const ref=db.collection("pnl_nh").doc();
    const d={kieu:"cau",hp,ch:x.ch|0,lv:x.lv||"NB",q:x.q,o:x.o.slice(0,4),a:x.a,b:x.b||"",e:x.e||"",th:x.thIdx!=null?caseId[x.thIdx]:(x.thId||""),st:o.st,kin:o.kin,nguon:o.nguon,ord:ord++,created:now,updated:now};ops.push(["set",ref,d]);add.push(Object.assign({id:ref.id},d))});
  await nhCommit(ops);add.forEach(x=>{x.created=x.updated=new Date();all.push(x)});return {q:add.filter(nhIsQ).length,t:add.filter(x=>x.kieu==="th").length}}

/* ---------- xuất bản lên web ôn tập ---------- */
function nhCompile(hp){const all=NH.byHp[hp]||[];const ok=x=>x.st==="duyet"&&!x.kin;const skip={nhap:0,kin:0,loi:0,ch:0,th:0};
  all.filter(nhIsQ).forEach(x=>{if(x.kin)skip.kin++;else if(x.st!=="duyet")skip.nhap++;else if(!nhValid(x))skip.loi++;else if(!x.ch)skip.ch++});
  const cases=all.filter(x=>x.kieu==="th"&&ok(x)&&x.ch&&x.text).sort(nhByOrd);const usable=all.filter(x=>nhIsQ(x)&&ok(x)&&nhValid(x)&&x.ch);
  const q=[];usable.filter(x=>!x.th).sort(nhByOrd).forEach(x=>q.push({id:"NH-"+x.id,g:x.ch,lv:x.lv||"NB",q:x.q,o:x.o,a:x.a,b:x.b||"",e:x.e||""}));
  const groups={};cases.forEach(c=>{const cid="NHT-"+c.id;const cq=usable.filter(x=>x.th===c.id).sort(nhByOrd);
    const mcq=cq.map(x=>{const id="NH-"+x.id;q.push({id,g:c.ch,lv:x.lv||"VD",q:x.q,o:x.o,a:x.a,b:x.b||"",e:x.e||"",cid});return id});
    (groups[c.ch]=groups[c.ch]||[]).push({cid,title:c.title,text:c.text,ask:c.ask||[],guide:c.guide||[],mcq})});
  skip.th=usable.filter(x=>x.th&&!cases.some(c=>c.id===x.th)).length;
  return {data:{q,th:Object.keys(groups).map(n=>({n:+n,items:groups[n]})).sort((a,b)=>a.n-b.n)},soCau:q.length,soTH:cases.length,skip}}
async function nhPublish(hp){const r=nhCompile(hp);const c=courseOf(hp);const s=r.skip;
  const extra=[s.nhap&&s.nhap+" câu nháp",s.kin&&s.kin+" câu kín",s.loi&&s.loi+" câu lỗi phương án/đáp án",s.ch&&s.ch+" câu chưa xếp chương",s.th&&s.th+" câu thuộc tình huống chưa duyệt"].filter(Boolean);
  if(!r.soCau&&!r.soTH){toast("Chưa có câu nào đủ điều kiện xuất bản (phải Đã duyệt, không kín, đủ phương án, đáp án, chương)."+(extra.length?" Bỏ qua: "+extra.join(", ")+".":""),6000);return}
  if(!await confirmDlg("Xuất bản lên web ôn tập "+(c?c.name:hp)+"?","Sinh viên sẽ thấy "+r.soCau+" câu"+(r.soTH?" (gồm "+r.soTH+" tình huống)":"")+" trong Câu hỏi lý thuyết, Tình huống và Thi thử, sau các câu sẵn có của học phần. Bản này thay bản xuất bản trước."+(extra.length?" Không đưa lên: "+extra.join(", ")+".":""),"Xuất bản"))return;
  const json=JSON.stringify(r.data);if(json.length>900000){toast("Bản xuất bản quá lớn ("+Math.round(json.length/1024)+" KB). Tách bớt câu sang Kín hoặc báo Claude chia nhỏ.",6000);return}
  try{const d={data:json,soCau:r.soCau,soTH:r.soTH,hp,at:FV().serverTimestamp()};await S.fs.doc("pnl_nh_pub/"+hp).set(d);NH.pub[hp]=Object.assign({},d,{at:new Date()});
    toast("Đã xuất bản "+r.soCau+" câu lên web ôn tập. Sinh viên tải lại trang học phần là thấy.",5000);render()}catch(x){nhDenied(x);toast("Chưa xuất bản được: "+errMsg(x));render()}}
async function nhUnpublish(hp){if(!await confirmDlg("Gỡ bản đã xuất bản?","Câu của ngân hàng biến khỏi web ôn tập; ngân hàng giữ nguyên. Câu sẵn có của học phần không bị ảnh hưởng.","Gỡ khỏi web"))return;
  try{await S.fs.doc("pnl_nh_pub/"+hp).delete();delete NH.pub[hp];toast("Đã gỡ khỏi web ôn tập.");render()}catch(x){toast("Chưa gỡ được: "+errMsg(x))}}

/* ---------- xuất Excel (cùng cột với mẫu nhập để sửa hàng loạt rồi nhập lại) ---------- */
async function nhExport(hp){try{const X=await lib("xlsx");const all=(NH.byHp[hp]||[]).slice().sort(nhByOrd);const ths=all.filter(x=>x.kieu==="th");const tMa={};ths.forEach((t,i)=>tMa[t.id]="TH"+(i+1));
  const qs=[["Chương","Mức độ","Câu hỏi","A","B","C","D","Đáp án","Căn cứ","Giải thích","Tình huống","Trạng thái","Kín","Nguồn"]].concat(all.filter(nhIsQ).map(x=>[x.ch||"",LVN[x.lv]||x.lv||"",x.q,...[0,1,2,3].map(i=>(x.o||[])[i]||""),x.a!=null&&x.a>=0?ABCD[x.a]:"",x.b||"",x.e||"",tMa[x.th]||"",x.st==="duyet"?"Đã duyệt":"Nháp",x.kin?"x":"",x.nguon||""]));
  const ts=[["Mã","Chương","Tiêu đề","Nội dung","Yêu cầu","Gợi ý","Trạng thái","Kín"]].concat(ths.map(t=>[tMa[t.id],t.ch||"",t.title,t.text,(t.ask||[]).join("\n"),(t.guide||[]).join("\n"),t.st==="duyet"?"Đã duyệt":"Nháp",t.kin?"x":""]));
  const wb=X.utils.book_new();const w1=X.utils.aoa_to_sheet(qs);w1["!cols"]=[6,11,60,28,28,28,28,7,24,40,9,10,5,7].map(w=>({wch:w}));X.utils.book_append_sheet(wb,w1,"Cau hoi");
  if(ths.length){const w2=X.utils.aoa_to_sheet(ts);w2["!cols"]=[6,7,30,70,40,50,10,5].map(w=>({wch:w}));X.utils.book_append_sheet(wb,w2,"Tinh huong")}
  X.writeFile(wb,"ngan-hang-"+hp+"-"+todayISO()+".xlsx");toast("Đã xuất "+(qs.length-1)+" câu"+(ths.length?", "+ths.length+" tình huống":"")+".")}catch(x){toast("Chưa xuất được: "+(x.message||x))}}
