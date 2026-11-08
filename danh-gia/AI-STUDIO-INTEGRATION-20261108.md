# Tích hợp PNL khảo thí AI — bản chuẩn bị 08/11/2026

## Nguồn tiếp nhận
Bản ZIP xuất từ Google AI Studio: ứng dụng React + Vite + Express, gồm `server.ts`, `src/components/StudentExamRoom.tsx`, `LecturerDashboard.tsx`, `StudentLoginView.tsx`, `ExamResultModal.tsx`, `TrialSimulatorModal.tsx`, `src/data/legalCases.ts`.

## Kết quả đã đưa vào nhánh này
- Thêm giao diện `danh-gia/quan-tri-khao-thi.html` và JavaScript đi kèm: giảng viên đăng nhập, đọc/lưu cấu hình.
- API `settings_get`/`settings_save` chỉ dành cho quản trị trên Firebase Functions; lưu ở `pnl_vd_config/default`.
- Điều chỉnh thời gian thi 20/30/40/60 phút; số câu nhánh mục tiêu 2–8; chế độ AI chấm sơ bộ + GV duyệt hoặc GV tự chấm. Cấu hình mới được chốt khi khởi tạo phiên.
- Ẩn điểm sơ bộ phía sinh viên, không trả `suggestion` trong API nộp bài; loại bỏ quy tắc tự động ưu tiên điểm 50%→70% trong prompt chấm.
- Hướng dẫn Gemini hỏi nhánh tiếp sau câu trả lời, theo mục tiêu cấu hình. Đây là **hướng dẫn AI**, chưa phải bộ đếm bảo đảm đủ số nhánh.

## Vì sao chưa triển khai thẳng bản xuất AI Studio
- Bản Express trong ZIP dùng `Map` trong bộ nhớ cho đề bốc thăm/phiên thi: dữ liệu có thể mất khi máy chủ khởi động lại, không bảo đảm một sinh viên chỉ bốc một lần giữa nhiều máy chủ.
- Các API `/api/sessions`, `/api/sessions/:id/approve`, `/api/exam/evaluate` chưa có xác minh danh tính/quyền quản trị trên máy chủ. Không được dùng cho điểm thi thật.
- Giao diện có nút chuyển vai trò giảng viên/sinh viên ở phía client; không thay thế xác thực.
- Bản xuất có thông tin demo và mô tả nâng điểm 50%→70% ở dữ liệu mẫu; không được đưa vào rubric chính thức.
- Máy chủ Express/WebSocket từ AI Studio không chạy trực tiếp trên GitHub Pages.
- Chưa xác minh được kết nối Gemini Live, triển khai Cloud Functions, Firestore Rules hay kiểm thử end-to-end bằng tài khoản sinh viên thực tế.

## Việc còn cần hoàn thành trước khi dùng chính thức
1. Tách phần giao diện/logic có ích từ bản React sang frontend PNL hoặc triển khai React như ứng dụng độc lập sau xác thực; không đưa nguyên Express demo lên public.
2. Dùng Firebase Auth + Firestore cho bốc thăm không thể làm lại, phiên thi, lịch sử, phân quyền và nhật ký phê duyệt.
3. Kết nối hội thoại audio theo từng lượt: sinh viên chủ động bấm “Đã trả lời xong”, AI chỉ hỏi tiếp sau khi đóng lượt; kiểm soát bộ đếm nhánh và điều kiện kết thúc ở server.
4. Kiểm soát đúng rubric/phân quyền, xác minh Security Rules đang chạy, không để lộ điểm hoặc nội dung đánh giá trong API sinh viên.
5. Chạy kiểm thử với micro trên trình duyệt, kiểm thử rớt mạng, thử tải lại, thi 40 phút và phê duyệt điểm.
6. Triển khai Functions/secret/rules theo tài khoản quản trị được phép, sau đó mới phê duyệt đưa lên nhánh `main`.

**Lưu ý:** Bản thay đổi trong PR này chưa được chạy Gemini Live thật, chưa cập nhật Firebase production, chưa công bố website. Không ghi đè các bộ đề hay điểm cũ.

## Bổ sung sau khi phê duyệt phương án (08/11/2026)
- API `draw` bốc thăm trên Firebase theo mã lớp/mã SV và UID; kết quả ghi một lần vào `pnl_vd_phien` bằng transaction. API `prepare` chỉ cấp phiên sau khi bốc đề.
- Ngân hàng đề `pnl_vd_de`: giảng viên quản trị nhập đề nháp qua trang cấu hình, duyệt mới được bốc; tuyệt đối không đưa đáp án/rubric vào mã HTML công khai.
- Trên phòng thi thêm nút bốc đề và nút `Tôi đã trả lời xong`. Gemini Live sử dụng manual VAD `activityStart`/`activityEnd` theo tài liệu Live API để không ngắt khi sinh viên tạm dừng nói.
- Hướng dẫn hội đồng AI lấy tình huống đã bốc thay vì cố định một tình huống cho mọi sinh viên; chấm sơ bộ nhận tình huống được lưu cùng phiên.
- Tệp JavaScript của backend, phòng thi và quản trị đã qua **kiểm tra cú pháp JS bằng trình phân tích**, nhưng chưa chạy bài thi/giả lập Firestore/Gemini Live. Đây không phải kiểm thử end-to-end.

## Các điểm còn phải xác minh/giải quyết
- Chưa nhập, duyệt hoặc xuất bản đề vào Firestore thật. Nếu chưa có đề ở `pnl_vd_de`, nút bốc thăm báo chưa có đề; đây là điều kiện an toàn có chủ đích.
- Cơ chế Live Audio/token thực tế, hỗ trợ manual VAD ở model được sử dụng và độ trễ; kiểm thử lần lượt micro máy tính, Android, iOS.
- Cơ chế duyệt và phiên bản rubric theo học phần; hiện `rubricVersion` chỉ có tính ghi nhận, chưa điều chỉnh trọng số từ giao diện.
- Kiểm tra Google Cloud billing, Secret Manager, Firebase Function và Security Rules đang vận hành; kiểm tra giới hạn truy cập, tải lại và mất mạng.
- Bộ đếm nhánh hiện chỉ là hướng dẫn cho AI (không phải cơ chế xác nhận chắc chắn số nhánh). Cần máy trạng thái server-side trước khi công bố chính thức.
- Chưa giải quyết việc khôi phục đầy đủ ngữ cảnh Live sau khi rớt mạng.
- Chưa hợp nhất sang `main`; chưa triển khai website, Firebase hay dữ liệu production.
