# Phúc Nguyên Library – Tài liệu luật học

Trang ôn tập luật học theo học phần. © Bản quyền thuộc Phúc Nguyên. Dữ liệu dùng cho mục đích học thuật, không có yếu tố thương mại.

- `index.html`: trang chính (thư viện, học phần, góp ý, quản lý mã lớp)
- `hp/`: web ôn tập của từng học phần
- `assets/`: logo và ảnh minh họa
- `data/ma-lop.json`: danh sách mã lớp. **Không sửa tay** — file do trang *Quản lý mã lớp* tự sinh.

## Mã lớp (Firebase, từ 04/11/2026)

Mã lớp, số người dùng mã và góp ý lưu trên **Firebase Firestore** (dự án `phuc-nguyen-library`, collection `pnl_ma`, `pnl_ma/{mã}/luot`, `pnl_gopy`). Mỗi lớp một mã, cả lớp dùng chung.

- Giảng viên: trang chủ → **Quản lý mã lớp** → **Đăng nhập Google** bằng tài khoản quản trị duy nhất `luuhuong.nnpl@gmail.com` (từ 09/11/2026 toàn hệ sinh thái Phúc Nguyên chỉ dùng một cách đăng nhập này; đã bỏ ô email/mật khẩu và hệ mật khẩu quản trị cũ + token GitHub). Máy nhớ đăng nhập. Cấp, sửa, xóa mã có hiệu lực ngay, không qua GitHub.
- Lần đầu (nếu mã lớp cũ chưa được chuyển): trang hỏi **mật khẩu quản trị cũ** một lần duy nhất để chuyển toàn bộ mã cũ (kèm số người đã dùng) từ `data/ma-lop.json` sang Firebase. Nếu máy đã ghi nhớ mật khẩu cũ, việc chuyển tự chạy.
- Sinh viên: đăng nhập ẩn danh tự động (không phải tạo tài khoản); mỗi trình duyệt được tính một lượt cho mỗi mã; người vượt quá số người cho phép bị chặn.
- Quy tắc bảo mật: chỉ tra được mã khi biết đúng mã, không xem được danh sách mã; chỉ admin cấp/sửa/xóa.
- `data/ma-lop.json` (bản cũ, chỉ chứa dấu băm): giữ làm dự phòng cho tới khi chuyển xong, sau đó không dùng nữa. Bản trước khi chuyển: nhánh `backup-truoc-firebase-20261104`.
- Bản mở trên Claude vẫn dùng kho dữ liệu của artifact như trước.

## Khuôn web học phần (thống nhất từ 29/10/2026)

- `assets/pnlib-course.js` + `assets/pnlib-course.css`: khuôn dùng chung cho mọi học phần (mẫu: Luật Dân sự).
  Mỗi trang `hp/<id>.html` chỉ chứa khối dữ liệu `<script id="pn-data" type="application/json">`.
- Chức năng: thi thử tùy chọn số câu, thời gian, mức độ (Nhận biết, Thông hiểu, Vận dụng), chương; xem lại toàn bộ bài có giải thích và căn cứ;
  lịch sử làm bài trên thiết bị; luyện tập từng câu; tình huống vận dụng (mỗi chương 3 tình huống, mỗi tình huống 4 câu ABCD nối tiếp, có đề thi gồm cả lý thuyết và tình huống); văn bản, án lệ có link; tóm tắt lý thuyết có mục lục và nút mục trước/sau;
  nút báo lỗi ở từng câu, gửi về email giảng viên qua FormSubmit (lần đầu cần bấm xác nhận trong thư FormSubmit gửi tới).
- Đã chuyển: Luật Dân sự, Luật Thương mại; khung học phần Luật Tố tụng hình sự đang được bổ sung theo đề cương 2026. Các học phần khác chuyển dần theo cùng khuôn.

## Chuẩn mind map (thống nhất từ 02/11/2026, theo mẫu Chương 2 Luật Dân sự)

- Mind map sinh từ **Tóm tắt lý thuyết** (`ly` trong `hp/<id>.html`): đủ mọi mục, tiểu mục, đúng thứ tự; tên chương trùng nhau ở trang Mind-map, sơ đồ và Tóm tắt.
- Đi sâu tới nội dung như mẫu Canva: dưới mỗi tiểu mục là các ý cụ thể (điều kiện, các loại, quyền, nghĩa vụ, thời hạn…) rút từ chính Tóm tắt; ý chi tiết nằm thành danh sách đánh số trong ô; các mục cùng cấp dàn ngang.
- Không ghi số điều luật trên sơ đồ (trừ khi số điều chính là nội dung, ví dụ danh sách tội bỏ tử hình); cơ sở pháp lý xem ở Tóm tắt lý thuyết.
- Chia tờ theo bề rộng đo thực tế để chữ không nhỏ hơn khoảng 60% khi vừa khung; tên thẻ ghi mục có trong tờ.
- Sửa nội dung: sửa Tóm tắt lý thuyết trước, rồi sinh lại mind map — không sửa tay riêng sơ đồ.

## Học phần khung chờ (thêm 02/11/2026)

Đã có mục trong danh sách học phần ("Sắp có") và trang Mind-map với khung chương theo đề cương chi tiết ("Đang biên soạn"):
Pháp luật lao động và an sinh xã hội (7 chương), Lý luận Nhà nước và Pháp luật (8 chương), Pháp luật về doanh nghiệp và thương mại, thương mại điện tử (3 chương), Xây dựng lập luận pháp lý và viết trong nghề luật (3 chương).
Luật Hiến pháp (9 chương, thêm khung chương cùng ngày). Khi biên soạn: thêm `hp/<id>.html` (gắn `src` vào COURSES) và Tóm tắt lý thuyết, rồi sinh mind map theo chuẩn ở trên.

## Cập nhật 02/11/2026 (tối)

- Bỏ mục Mind-map "Đàm phán, soạn thảo hợp đồng" (không có học phần này).
- Kỹ năng tư vấn pháp luật dân sự: có mind map 6 chương, sinh từ khung Tóm tắt lý thuyết của học phần (hiện mới có đề mục; khi Tóm tắt có nội dung thì sinh lại để đi sâu theo mẫu).
- Luật Hiến pháp: thêm khung 9 chương theo đề cương chi tiết.

## Soạn nội dung qua thư mục `noi-dung/` (từ 03/11/2026)

- Tóm tắt lý thuyết và mind map của mọi học phần sinh từ một nguồn: `noi-dung/<mã-học-phần>/chuong-NN.md` (định dạng ở `noi-dung/README.md`).
- Mỗi lần đẩy lên `main`, GitHub Actions (`.github/workflows/deploy.yml`) chạy: `tools/xay_dung.py` (dựng Tóm tắt + mind map, chỉ chương thay đổi) → `tools/kiem_tra.py` (mở thử mọi trang trên trình duyệt ảo) → chỉ khi đạt mới đăng GitHub Pages. Không đạt: web giữ bản cũ. Kết quả ghi `noi-dung/KET-QUA.md`.
- Mind map chia tờ theo bề rộng đo thực tế (tách mục rộng quá 1.500 px, gộp các mục nhỏ liền nhau tới 1.720 px).
- ChatGPT và người soạn nội dung chỉ sửa trong `noi-dung/`. `tools/xuat_noi_dung.py` xuất lại Tóm tắt đang có ra file nguồn khi cần.
- Nguồn đăng GitHub Pages: GitHub Actions (đổi 03/11/2026) — chỉ bản đã chạy thử đạt mới được đăng.
