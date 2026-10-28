# Phúc Nguyên Library – Tài liệu luật học

Trang ôn tập luật học theo học phần. © Bản quyền thuộc Phúc Nguyên. Dữ liệu dùng cho mục đích học thuật, không có yếu tố thương mại.

- `index.html`: trang chính (thư viện, học phần, góp ý, quản lý mã lớp)
- `hp/`: web ôn tập của từng học phần
- `assets/`: logo và ảnh minh họa
- `data/ma-lop.json`: danh sách mã lớp. **Không sửa tay** — file do trang *Quản lý mã lớp* tự sinh.

## Mã lớp

Không dùng Google Sheets / Apps Script. Giảng viên vào trang chủ → **Quản lý mã lớp** → đăng nhập bằng mật khẩu quản trị → cấp hoặc xóa mã.
Mã được lưu lên GitHub bằng token cá nhân (Fine-grained, chỉ kho này, quyền *Contents: Read and write*) nhập một lần trên mỗi máy;
nếu chưa có token, bấm *Tải file ma-lop.json* rồi tải file lên thư mục `data/` của kho.

File chỉ chứa dấu băm của mã (sinh viên không đọc được mã); danh sách mã gốc được mã hóa bằng mật khẩu quản trị.
Trang web tĩnh nên không giới hạn được số người dùng một mã; mã được kiểm soát bằng hạn dùng và phạm vi học phần.
