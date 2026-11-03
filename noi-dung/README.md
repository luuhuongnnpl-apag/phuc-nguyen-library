# Thư mục nội dung — nguồn duy nhất của Tóm tắt lý thuyết và mind map

Mỗi chương của mỗi học phần là một file: `noi-dung/<mã-học-phần>/chuong-NN.md` (NN có hai chữ số: `chuong-01.md`, `chuong-12.md`).
Đẩy file lên nhánh `main`, GitHub tự làm tiếp, không cần làm gì thêm:

1. Dựng trang **Tóm tắt lý thuyết** và **mind map** của chương từ file này.
2. Chạy thử toàn bộ web trên trình duyệt ảo.
3. Cả hai ĐẠT thì web được cập nhật sau khoảng 3–5 phút. Không đạt thì web giữ nguyên bản cũ.

Kết quả mỗi lần ghi ở **`noi-dung/KET-QUA.md`** (LỖI phải sửa, Cảnh báo nên sửa, chương đã dựng).
Chỉ chương có nội dung thay đổi mới được dựng lại; chương không đổi giữ nguyên trên web.

## Mã học phần đang có trang web

| Mã thư mục | Học phần |
| --- | --- |
| `luat-dan-su` | Luật Dân sự (học phần mẫu) |
| `to-tung-dan-su` | Luật Tố tụng dân sự |
| `luat-hinh-su` | Luật Hình sự |
| `to-tung-hinh-su` | Luật Tố tụng hình sự |
| `luat-hanh-chinh-va-to-tung-hanh-chinh` | Luật Hành chính và Luật Tố tụng hành chính |
| `luat-thuong-mai` | Luật Thương mại |
| `luat-doanh-nghiep` | Luật Doanh nghiệp |
| `so-huu-tri-tue` | Pháp luật về sở hữu trí tuệ |
| `cong-chung-chung-thuc` | Công chứng, chứng thực (tạm chưa sửa — luật sắp thay đổi) |
| `luat-dat-dai` | Luật Đất đai (tạm chưa sửa — luật sắp thay đổi) |

Học phần chưa có trong bảng (Luật Hiến pháp, Pháp luật lao động và an sinh xã hội, Lý luận Nhà nước và Pháp luật…) cần Claude mở trang khung trước; đẩy file vào thư mục chưa có trang sẽ báo LỖI.

## Định dạng file chương

```
# Chương 2. Chủ thể của quan hệ pháp luật dân sự
> CS: Phần thứ nhất, Chương III – Chương VI BLDS 2015 (Điều 16 – Điều 104)
- Chủ thể gồm cá nhân và các tổ chức: pháp nhân, tổ chức không có tư cách pháp nhân, Nhà nước và cơ quan nhà nước.

## Cá nhân
> CS: Chương III BLDS 2015 (Điều 16 – Điều 73)
- Gồm công dân Việt Nam, người nước ngoài, người không có quốc tịch.

### Năng lực pháp luật dân sự
> CS: Điều 16 – Điều 18 BLDS 2015
- Khả năng của cá nhân có quyền dân sự và nghĩa vụ dân sự; mọi cá nhân có năng lực pháp luật như nhau.

#### Thời điểm bắt đầu, kết thúc
> CS: Khoản 3 Điều 16 BLDS 2015
- Có từ khi người đó sinh ra và chấm dứt khi người đó chết.
```

| Dòng | Ý nghĩa | Hiện ở đâu |
| --- | --- | --- |
| `# Chương N. Tên chương` | Dòng đầu file, đúng một dòng. N trùng số trong tên file | Tên chương trên Tóm tắt và mind map |
| `##`, `###`, `####`, `#####` | Mục, tiểu mục, ý con (xuống từng cấp một, không nhảy cấp) | Nút của mind map, mục lục Tóm tắt |
| `> CS: …` | Căn cứ pháp lý, một dòng ngay dưới mỗi đề mục | Chỉ ở Tóm tắt (mind map không ghi số điều) |
| `- …` | Một ý nội dung, một câu | Nội dung trong ô mind map và Tóm tắt |

Quy tắc để mind map đẹp và đủ sâu (theo mẫu Chương 2 Luật Dân sự):

- Tên đề mục ngắn, tối đa khoảng 10 chữ, không chứa số điều luật, không cần đánh số (1., 1.1., a) — có đánh số cũng được, hệ thống tự bỏ).
- Mỗi đề mục có ít nhất một ý. Nhánh cuối phải có ý cụ thể (điều kiện, các loại, chủ thể, quyền, nghĩa vụ, thời hạn, hậu quả…).
- Các ý dạng `Nhãn: nội dung` (từ 2 ý trở lên, tất cả cùng dạng) sẽ tự tách thành nhánh con trên mind map, ví dụ `- Dưới 6 tuổi: giao dịch do người đại diện xác lập, thực hiện.`
- Ý chưa chắc căn cứ thì thêm `[KIỂM TRA]` cuối dòng: nhãn được ẩn trên web và liệt kê trong KET-QUA.md để tra lại.
- Đề mục cùng cấp nên từ 2 đến 7; mục quá rộng hệ thống tự chia thành nhiều tờ mind map (1/2), (2/2).

## Không được sửa

Chỉ sửa trong `noi-dung/`. Không sửa `index.html`, `hp/`, `assets/`, `tools/`, `.github/`, `data/`: các file này do hệ thống tự sinh hoặc là mã của web. Không sửa `noi-dung/KET-QUA.md` (hệ thống tự ghi).
