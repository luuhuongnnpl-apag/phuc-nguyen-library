# Phúc Nguyên Library – Tài liệu luật học

Trang ôn tập luật học theo học phần. © Bản quyền thuộc Phúc Nguyên. Dữ liệu dùng cho mục đích học thuật, không có yếu tố thương mại.

- `index.html`: trang chính (thư viện, học phần, góp ý, quản lý mã lớp)
- `hp/`: web ôn tập của từng học phần
- `assets/`: logo và ảnh minh họa
- `data/ma-lop.json`: danh sách mã lớp. **Không sửa tay** — file do trang *Quản lý mã lớp* tự sinh.

## Mã lớp

Không dùng Google Sheets / Apps Script. Mỗi lớp một mã, cả lớp dùng chung.

Giảng viên vào trang chủ → **Quản lý mã lớp** → đăng nhập bằng mật khẩu quản trị → cấp hoặc xóa mã. Mỗi lần cấp/xóa, trang tự lưu ngược lên GitHub.
Lần đầu đăng nhập cần kết nối GitHub một lần (token Fine-grained, chỉ kho này, quyền *Contents: Read and write*); token được mã hóa bằng mật khẩu quản trị và lưu cùng dữ liệu, nên đăng nhập ở máy nào cũng tự lưu.

File chỉ chứa dấu băm của mã (sinh viên không đọc được mã). Trang web tĩnh nên không giới hạn được số người dùng một mã; mã được kiểm soát bằng hạn dùng và học phần được mở.

## Khuôn web học phần (thống nhất từ 29/10/2026)

- `assets/pnlib-course.js` + `assets/pnlib-course.css`: khuôn dùng chung cho mọi học phần (mẫu: Luật Dân sự).
  Mỗi trang `hp/<id>.html` chỉ chứa khối dữ liệu `<script id="pn-data" type="application/json">`.
- Chức năng: thi thử tùy chọn số câu, thời gian, mức độ (Nhận biết, Thông hiểu, Vận dụng), chương; xem lại toàn bộ bài có giải thích và căn cứ;
  lịch sử làm bài trên thiết bị; luyện tập từng câu; tình huống; văn bản, án lệ có link; tóm tắt lý thuyết có mục lục và nút mục trước/sau;
  nút báo lỗi ở từng câu, gửi về email giảng viên qua FormSubmit (lần đầu cần bấm xác nhận trong thư FormSubmit gửi tới).
- Đã chuyển: Luật Dân sự, Luật Thương mại. Các học phần khác chuyển dần theo cùng khuôn.
