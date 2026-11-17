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

## Giao diện PND và quản trị gộp chung (14/11/2026)

Trang chủ dựng lại theo bố cục Phúc Nguyên Digital (PND): thanh trên, băng giới thiệu, cột trái **Danh mục học phần**, cột giữa (Đánh giá định kỳ → Tài liệu, giáo trình ★ → Liên kết thông dụng), cột phải **Hướng dẫn sử dụng**. Mã khung: `assets/pnl-shell.js`, `assets/pnl-shell.css`.

- **Một trang, hai vai**: đăng nhập Google bằng tài khoản quản trị → hiện nút thêm/sửa ngay trên trang và mục Quản trị ở cột trái (Mã lớp, Đánh giá định kỳ, Góp ý, Sao lưu). Người vào bằng mã lớp chỉ đọc. Thư mục `quan-tri/` chỉ còn chuyển hướng về trang chủ.
- **Trang học phần**: 6 mục mặc định cho mọi học phần (Thi thử, Lý thuyết, Tình huống, Văn bản & án lệ, Tóm tắt lý thuyết, Mind map) + Tài liệu, giáo trình (thư mục, tài liệu). Học phần chưa có trang riêng dùng `hp/hoc-phan.html?id=…` (đọc Firestore).
- **Thêm học phần**: tên, màu, ảnh bìa, trạng thái, vị trí; danh sách chương gõ tay hoặc đọc từ đề cương chi tiết (PDF, .docx, .txt).
- **Tài liệu**: tải tệp lên Google Drive của quản trị (thư mục "PNL - Phúc Nguyên Library", quyền `drive.file`, mở chế độ ai có link được xem) hoặc dán liên kết; đánh dấu ★ để hiện ở trang chủ.
- **Tóm tắt & mind map**: soạn dàn ý từng chương trong trình soạn toàn màn hình; mind map dựng theo quy tắc `tools/xay_dung.py`.

Firestore: `pnl_hp`, `pnl_hp_ch` (đọc khi `pub == true`), `pnl_docs`, `pnl_folders`, `pnl_links` (đọc công khai), `pnl_meta/drive` (thư mục Drive); ghi: chỉ quản trị. Quy tắc: `firebase/firestore-pnl.rules`.

## Không gian quản trị thống nhất — `lop/` (16–17/11/2026, khung Azota)

Một nơi cho mọi việc quản trị: `lop/index.html` + `lop/app.js`. Vào từ nút **Quản trị** trên thanh đầu trang chủ (khi đã đăng nhập Google) hoặc mục Quản trị ở cột trái.
- Thanh trái: Trang chủ quản trị · Lớp · Học phần · Mã lớp ôn tập · Đề thi, đánh giá định kỳ · Sinh viên & tài khoản · Góp ý. Trang quản trị Đánh giá định kỳ (`danh-gia/#quan-tri`) dùng cùng màu, menu trái có nhóm "Không gian quản trị" dẫn về các mục trên; chi tiết lớp mở thẳng `danh-gia/#quan-tri/<mã>`.
- **Đăng nhập chung** ở `lop/`: sinh viên ID = mã SV + mật khẩu; giảng viên/quản trị Google.
- **Lớp**: thẻ lớp theo năm học; tạo lớp đặt **mật khẩu chung của lớp** (lưu `pnl_dg_ds/{mã}.matKhau`, chỉ quản trị đọc); nhập danh sách từ Excel APAG → tự tạo tài khoản `pnl_tk/{mssv}` với băm SHA-256 của (mssv | mật khẩu chung). Sinh viên tự đổi mật khẩu riêng; **Đặt lại** đưa về mật khẩu chung; đổi mật khẩu chung thì tài khoản còn dùng mật khẩu chung được cập nhật theo.
- **Phiên sinh viên**: trình duyệt đăng nhập ẩn danh, ghi `pnl_phien/{uid}` = {mssv, h}; quy tắc Firestore chỉ cho ghi khi `h` khớp `pnl_tk/{mssv}.pw` (băm không bao giờ đọc được từ trình duyệt khác). Sinh viên đã đăng nhập được phiên mã lớp của trang chủ để mở học phần của lớp mình.
- **Học phần**: thẻ học phần → trang quản trị theo học phần (lớp, ĐGĐK từng lớp, mã ôn tập mở học phần, nội dung); Thêm lớp / Cấp mã từ đây.
- **Mã lớp ôn tập (khách)** `pnl_ma` chuyển từ trang chủ sang đây (cùng dữ liệu). **Góp ý** đọc `pnl_gopy`.
- Danh sách học phần tĩnh: `assets/pnl-courses.json` (sinh từ `COURSES` trong `index.html`; cập nhật lại khi đổi COURSES) + học phần thêm trên Firestore `pnl_hp`.
- Quy tắc Firestore: `firebase/firestore-pnl.rules` (khối pnl_tk, pnl_phien 17/11/2026 — phải xuất bản lại trong Firebase Console).
- `lop/lop-hoc.js` (17/11): **Điểm danh QR** (`pnl_dd` buổi với mã 6 số + hạn mở, `pnl_dd_sv` lượt có mặt — sinh viên quét QR `#dd/<buổi>/<mã>` hoặc nhập mã; GV đánh dấu tay), **Điểm chuyên cần** = 10 × có mặt / tổng buổi, sửa tay ở `pnl_cc`, xuất CSV; **Bảng tin** `pnl_tin`; **Bài tập** `pnl_bt` + bài nộp `pnl_bt_nop` (link hoặc nội dung). Quản trị ĐGĐK nhúng trong tab Kiểm tra, thi / Bảng điểm / Thống kê (iframe `danh-gia/index.html?embed=1`).
- Đợt sau: tài khoản giảng viên khác (ID = tên viết liền, chỉ thấy lớp được chia sẻ), ngân hàng câu hỏi, Kết quả học tập cho sinh viên (gộp chuyên cần + ĐGĐK).
