# PNL Vấn đáp AI — Thiết lập Gemini Live (pilot)

> **09/11/2026 — TẠM NGƯNG theo quyết định của giảng viên**: tài khoản hiện có chưa đủ điều kiện (Firebase gói Spark, chưa có Gemini API trả phí). Đã bỏ nút "Thi vấn đáp AI" khỏi menu; `van-dap-ai.html` chỉ còn trang thông báo. Bản thử đầy đủ ở commit `cd48fb3`. Muốn làm lại: khôi phục `van-dap-ai.html` từ commit đó, làm các bước dưới đây.

Trạng thái: **mã nguồn được tạo, chưa có xác nhận triển khai Firebase Functions, chưa chạy kiểm thử kết nối Gemini thật**.

## Kiến trúc

- Trang học viên/giảng viên: `danh-gia/van-dap-ai.html` + `danh-gia/van-dap-live.js`, chạy trên GitHub Pages.
- Backend bảo mật: `functions/index.js`, hàm HTTP `vanDapApi` trên Firebase Functions gen 2, vùng `asia-southeast1`.
- Firebase Authentication: đăng nhập ẩn danh cho SV, đăng nhập Google (luuhuong.nnpl@gmail.com) cho GV.
- Firestore: `pnl_dg_lop`, `pnl_dg_sv` hiện có; `pnl_vd_phien` mới (trạng thái, biên bản chữ, điểm AI đề xuất, điểm GV duyệt).
- Gemini Live WebSocket: chỉ nhận **ephemeral token** cấp từ backend sau xác thực; khóa API vĩnh viễn không xuất hiện trong GitHub Pages.

## Bắt buộc trước khi mở thử

1. **Thu hồi API key đã đăng trong hội thoại**, rồi tạo khóa mới tại https://aistudio.google.com/api-keys. Không gửi khóa mới qua chat.
2. Bảo đảm dự án Firebase `phuc-nguyen-library` có quyền dùng Cloud Functions, Cloud Build, Secret Manager, Firestore, Gemini API và có cấu hình thanh toán phù hợp. Gói Google AI Pro của tài khoản cá nhân không bao gồm mặc định mọi chi phí Gemini API.
3. Dùng máy có Firebase CLI hoặc Cloud Shell của Google Cloud (với quyền quản trị dự án), ở thư mục repo:

   ```sh
   git clone https://github.com/luuhuongnnpl-apag/phuc-nguyen-library.git
   cd phuc-nguyen-library
   npm install --prefix functions
   npm install -g firebase-tools
   firebase login
   firebase use phuc-nguyen-library
   firebase functions:secrets:set PNL_GEMINI_API_KEY
   firebase deploy --only functions
   ```

   Khi lệnh `functions:secrets:set` yêu cầu, nhập **khóa MỚI** trong terminal được bảo mật. Không đặt khóa vào tệp repo.
4. Kiểm tra `https://asia-southeast1-phuc-nguyen-library.cloudfunctions.net/vanDapApi`: GET phải trả về JSON `{"ok":true,...}`. Nếu báo 404 / chưa kết nối, Cloud Function chưa triển khai xong.
5. Đăng nhập tài khoản quản trị tại `danh-gia/van-dap-ai.html`. **Thử bằng chế độ Giảng viên** trước, xác nhận giọng nghe/nói, lỗi, chuyển nhánh; tuyệt đối không dùng ngay cho thi chính thức.
6. Khi ổn, nhập mã lớp và chọn **Bật vấn đáp** ở bảng quản trị. Chỉ lớp có `vanDapEnabled:true` mới được cấp phiên cho SV.
7. Kiểm tra và áp dụng **Firestore Security Rules của dự án đang vận hành** để không cho sinh viên trực tiếp sửa/xem `pnl_vd_phien`; giao diện SV chỉ gọi API xác thực, GV dùng API phê duyệt. Không ghi đè toàn bộ Rules mà chưa đọc bản hiện tại.
8. Bật cảnh báo ngân sách, giới hạn quota, xác định thời hạn lưu/xóa dữ liệu vấn đáp và có thông báo đồng ý trước thi.

## Quy tắc đang có

- Giới hạn 40 phút từ thời điểm server bắt đầu, kể cả khi học viên tải lại trang.
- Lớp phải đang mở trong Firestore và giảng viên chủ động bật `vanDapEnabled`.
- Một mã SV được gắn với một UID Firebase; không cấp phiên sau khi bài kết thúc.
- Gemini hỏi tự nhiên bằng tiếng Việt, một câu một lượt, thay đổi giả thiết sau từng câu trả lời.
- Biên bản ghi **văn bản nhận diện từ giọng nói**, không lưu âm thanh gốc. Trường `transcriptSource: client-unverified` cho biết không nên coi nội dung này là chứng cứ chống gian lận.
- Nếu kết nối ngắt, trang xin phiên mới và đưa một phần nội dung trước đó vào lời nhắc; có thể mất liên tục ngữ cảnh. Không được quảng cáo như tính năng khôi phục hoàn hảo.
- Chấm sơ bộ bằng Gemini Flash (5 tiêu chí, thang 10); GV phải duyệt mới thành điểm cuối.
- Mẫu pháp lý hiện được cấu hình **cho Luật Dân sự, Điều 24 BLDS 2015**, chưa phải bộ đề đầy đủ mọi học phần.

## Giới hạn kỹ thuật và kiểm thử bắt buộc

- Gemini Live audio-only có giới hạn vòng đời phiên/kết nối; frontend đang thử cấp token mới khi rớt kết nối. Cần kiểm tra một bài đủ 40 phút trên iPhone/Safari và ít nhất một thiết bị Android.
- Safari phải được cấp quyền micro và phát âm thanh; nên dùng tai nghe để tránh vọng âm.
- Khi Firebase chưa triển khai, trang phải hiện thông báo rõ chứ không treo.
- Cần kiểm tra transcript, cách chấm ý tương đương và độ chính xác pháp luật bằng bài giả lập trước khi triển khai lớp thật.
- Chưa thực hiện kiểm thử live end-to-end với Gemini API: không có quyền truy cập Secret Manager/deploy Functions trong phiên làm việc này.
- Không dùng bản pilot để tự động khóa điểm chính thức hoặc ra quyết định kỷ luật sinh viên.

## Thư mục và triển khai

```
firebase.json
.firebaserc
functions/package.json
functions/index.js
danh-gia/van-dap-ai.html
danh-gia/van-dap-live.js
```

**Không đẩy** `.env`, khóa API hoặc service-account JSON lên GitHub. Nếu lộ khóa, thu hồi ngay và triển khai lại bằng secret mới.
