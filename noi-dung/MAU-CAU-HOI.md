# Mẫu PNL — soạn câu hỏi cho Ngân hàng câu hỏi (dùng chung cho mọi AI và soạn tay)

**Lệnh soạn chuẩn:** lấy ở trang quản trị › Ngân hàng câu hỏi › Nhập câu hỏi › *Lệnh mẫu cho AI*. Lệnh đã kèm dàn ý chương, danh mục văn bản còn hiệu lực, câu mẫu đã duyệt và phần chương còn thiếu. Không tự viết lệnh khác.

## Hai đường đưa câu vào ngân hàng (đều vào trạng thái Nháp)
1. **Dán trên web:** Ngân hàng câu hỏi › Nhập câu hỏi › Dán nội dung (hoặc tải file Word/Excel), chọn *Nguồn soạn*.
2. **Đẩy lên GitHub (Claude, ChatGPT):** chỉ ghi file vào `noi-dung/<mã-học-phần>/cau-hoi/`, tên file `chuong-NN-<nguồn>.md`
   (VD `noi-dung/luat-dan-su/cau-hoi/chuong-03-chatgpt.md`). Dòng đầu file: `Nguồn: ChatGPT`. Lần sau trang quản trị mở ra sẽ tự nhận.
   **Không sửa** `hp/*.html`, `index.html` hay file nào khác.

## Mẫu
```
Nguồn: ChatGPT
Chương 3
Mức độ: Thông hiểu
Câu 1. <nội dung câu hỏi>
A. <phương án>
*B. <phương án đúng>
C. <phương án>
D. <phương án>
Căn cứ: khoản 2 Điều 117 BLDS 2015
Giải thích: <vì sao đúng, vì sao từng phương án còn lại sai>

Tình huống 1: <tiêu đề ngắn>
<nội dung tình huống: người, sự việc, ngày tháng cụ thể>
Yêu cầu: <câu hỏi tự luận>
Gợi ý: <ý chính để giải, có căn cứ>
Câu 2. <câu ABCD thứ nhất của tình huống>
A. …
*B. …
C. …
D. …
Căn cứ: …
Giải thích: …
HẾT TÌNH HUỐNG
```

## Chuẩn mỗi chương
10 câu Nhận biết · 10 Thông hiểu · 10 Vận dụng · 3 tình huống × 4 câu ABCD. Đúng 4 phương án, một đáp án; không câu Đúng/Sai;
căn cứ cụ thể điều, khoản, văn bản còn hiệu lực (viết tắt như danh mục, VD `BLDS 2015`); giải thích đủ vì sao đúng/sai.
Bảng *Độ phủ* trên trang quản trị cho biết chương còn thiếu gì.
