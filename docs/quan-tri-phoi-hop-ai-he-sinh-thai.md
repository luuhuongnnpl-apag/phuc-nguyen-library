# ĐỀ XUẤT: QUẢN TRỊ THAY ĐỔI VÀ PHỐI HỢP NHIỀU AI TRONG HỆ SINH THÁI PHÚC NGUYÊN

> Trạng thái: DỰ THẢO để đối chiếu và phê duyệt. Ngày rà soát: 20/11/2026.  
> Phạm vi: PNL (Phúc Nguyên Library), PND (Phúc Nguyên Digital), PNW (Phúc Nguyên Work), KDTHS (kiểm định CTĐT thạc sĩ).  
> Không thay đổi mã chạy, Firestore, Drive, tài khoản hay quyền trong tài liệu này. Các nhận định kỹ thuật dựa trên **mã nguồn**, không phải kiểm chứng môi trường production.

## 1. Phát hiện có căn cứ trong mã nguồn

| Hạng mục | Quan sát từ kho GitHub | Nguy cơ cần kiểm thử |
| --- | --- | --- |
| Firebase dùng chung | Các ứng dụng hiện dùng project `phuc-nguyen-library`; các collection phân theo tiền tố / đường dẫn | Một lần triển khai Rules chung có thể làm ứng dụng khác mất quyền truy cập |
| Nhiều điểm cập nhật Rules | PNL `lop/rules-sync.js` và KDTHS `app.js` đều đọc ruleset hiện hành, ghép khối và phát hành phiên bản mới | Hai lượt cập nhật đồng thời có thể ghi đè phần mới của nhau (race/lost update) |
| Nguồn Rules PND | `PN-degital/firestore.rules` là **bản độc lập**, có ghi chú không ghi đè ruleset chung | Dùng nhầm bản mẫu làm bản production sẽ mất quy tắc các app khác |
| Workflow PNL | `.github/workflows/deploy.yml` dựng, kiểm thử và bot tự push `hp/`, `index.html` và kết quả lên `main`; bước cảnh báo sửa ngoài `noi-dung/` không chặn | Bản sinh cũ có nguy cơ ghi lên thay đổi hợp lệ mới khi nhiều tác nhân làm song song |
| Drive và Firestore | PND, KDTHS sử dụng Drive lưu tệp, Firestore lưu phân quyền/danh mục | Quyền xem trên web chưa đủ để khẳng định quyền xem tệp; cần kiểm tra cả hai lớp |

**Chưa kết luận** các nguy cơ trên đã gây sự cố cụ thể; cần tái hiện trong môi trường kiểm thử. Không sửa production dựa trên giả thiết.

## 2. Nguyên tắc kiến trúc

1. **Một nguồn sự thật cho mỗi loại dữ liệu.** Mã nguồn: từng repo; Firestore Rules đang triển khai: một bộ hợp nhất có kiểm soát; tệp gốc: Drive theo thư mục và chủ sở hữu; danh mục nghiệp vụ: collection tương ứng; báo cáo AI: bản nháp có phiên bản riêng.
2. **Các AI phối hợp bằng công việc, không chia sẻ quyền quản trị tùy tiện.** Mọi công việc có người giao, phạm vi, kết quả, phiên bản dữ liệu đầu vào và người phê duyệt.
3. **Không giao thoa quyền ghi.** PNL sở hữu nội dung/lớp/khảo thí; PND sở hữu thư viện số; PNW sở hữu lịch; KDTHS sở hữu danh mục kiểm định; thay đổi chạm hai app phải có kiểm thử liên ứng dụng.
4. **Mọi sửa mã nguồn qua nhánh và Pull Request**, có mô tả phạm vi, tác động và kết quả kiểm thử. Không tự hợp nhất PR hoặc triển khai production khi chưa có quyền/duyệt rõ ràng.
5. **Dữ liệu chính thức không bị AI tự thay đổi.** AI có thể đọc theo quyền, phân tích, soạn nháp, phát hiện thiếu minh chứng và tạo đề xuất; ghi dữ liệu gốc, xóa, đổi quyền chia sẻ, cập nhật Rules hoặc triển khai đòi quyền riêng.
6. **Không bổ sung bước duyệt hồ sơ kiểm định**: tài liệu KDTHS tải lên Drive đã được xác nhận trước khi tải. AI vẫn kiểm tra giá trị chứng minh của từng tài liệu và nêu rõ khoảng trống chứng cứ.

## 3. Trật tự ưu tiên triển khai

### P0 — Khoá xung đột Firestore Rules chung

- Xây dựng **một tệp rules hợp nhất chuẩn**, có kiểm soát phiên bản và trách nhiệm phát hành duy nhất. Các app chỉ gửi bản thay đổi của khối riêng, tuyệt đối không phát hành tệp standalone.
- Không sử dụng độc lập các nút tự phát hành Rules của nhiều app ở production trong lúc chưa hoàn thiện bộ điều phối. Không gỡ nút ngay trên production nếu chưa kiểm thử.
- Trước phát hành: tải ruleset hiện hành → lưu bản sao/ID → so sánh diff → xác nhận chỉ khối được phép thay đổi → kiểm tra cú pháp và test trên Emulator/staging.
- Tại thời điểm phát hành: dùng **khóa một lượt phát hành**; đọc lại phiên bản đang chạy và đối chiếu dự kiến; nếu khác thì dừng và giải quyết xung đột, không áp bản cũ.
- Sau phát hành: xác thực quyền với từng ứng dụng, ghi log người thực hiện/commit/ruleset/time/test; có quy trình rollback ngay.

Các ca kiểm tra tối thiểu:
- PNL: sinh viên/giảng viên đọc, làm bài, xem học phần; quản trị chỉnh nội dung; khách không thấy dữ liệu quản trị.
- PND: đọc/ghi theo vai trò và 4 mức truy cập; không cấp quyền tải Drive ngoài chính sách chia sẻ thực tế.
- PNW: mọi người đọc lịch công khai; chỉ người có quyền được sửa.
- KDTHS: xem, thêm tệp, chỉnh danh mục và quản trị thành viên theo các vai trò quy định; kiểm tra các collection `kd_*`.

### P1 — Kiểm soát mã nguồn và quy trình đăng web

- Mỗi thay đổi phải có Issue hoặc mô tả công việc, phạm vi đường dẫn và một nhánh riêng; khi cùng tệp, **một người/AI là chủ thay đổi tại mỗi thời điểm**.
- PR phải nêu: repo, file sửa, yêu cầu nghiệp vụ, ảnh hưởng liên ứng dụng, dữ liệu ảnh hưởng, thử nghiệm và cách rollback.
- Thêm CI trên PR trước khi hợp nhất; phân biệt build/test với deploy. Tránh để bot và AI cùng push trực tiếp lên `main`; workflow phải kiểm tra phiên bản HEAD sau mỗi bước dựng.
- Kiểm tra branch protection/rulesets trên GitHub bằng tài khoản quản trị trước khi áp dụng; không giả định hiện đã bật.
- Thay đổi cần Firebase/Drive thuộc nhóm nhạy cảm, yêu cầu thử trên staging hoặc Firebase Emulator và phê duyệt của quản trị.

### P2 — Điều phối công việc ChatGPT / Cloudy / Gemini

Trước mắt dùng **GitHub Issues + PR** làm bảng giao việc, chưa tạo web app điều phối mới.

| Hoạt động | Vai trò đề xuất | Đầu ra | Ai được xác nhận |
| --- | --- | --- | --- |
| Phân tích nghiệp vụ, căn cứ pháp lý, đối chiếu minh chứng | ChatGPT hoặc AI được giao | Đánh giá và đề xuất có dẫn nguồn | Người phụ trách |
| Thiết kế giao diện, chức năng, tích hợp hệ thống | Cloudy hoặc AI kỹ thuật được giao | Nhánh mã + PR + kết quả thử | Người phụ trách kỹ thuật/chủ dự án |
| Phân tích tài liệu, phương án thay thế, kiểm tra chéo | Gemini hoặc AI được giao | Nhận xét độc lập, bản nháp | Người phụ trách |
| Thay Firestore Rules, chia sẻ/xóa Drive, merge/deploy production | **Một người/đầu mối được chủ dự án chỉ định** | Nhật ký thay đổi và phục hồi | Chủ dự án |

**Một nhiệm vụ chỉ có một người/AI chịu trách nhiệm ghi bản cuối**, các AI khác là reviewer. Không giả định ChatGPT, Cloudy và Gemini đã trao đổi trực tiếp với nhau chỉ vì cùng dùng dữ liệu. Muốn tự động hóa cần backend điều phối được xác thực, phân quyền từng hành động.

Dạng bản ghi nhiệm vụ dự kiến (chưa triển khai):

```json
{
  "taskId": "PN-YYYYMMDD-NNN",
  "application": "pnl|pnd|pnw|kdths",
  "scope": ["repo/path or data collection"],
  "assignee": "assistant-or-person",
  "reviewer": "assistant-or-person",
  "state": "queued|in_progress|review|approved|done|blocked",
  "sourceRevision": "immutable source reference",
  "draftRevision": 1,
  "requiresHumanApproval": true,
  "evidenceLinks": []
}
```

Lúc ghi nháp, phải kiểm tra `draftRevision` để phát hiện ghi đè; nếu đã thay đổi thì tạo phiên bản mới/xem diff, không đè lên.

## 4. Quy định riêng cho Skill kiểm định

- AI nhận **danh mục tiêu chí + mã minh chứng + Drive file ID và quyền đọc** từ nguồn có xác thực.
- Đọc toàn văn, có khả năng OCR tệp scan trong giai đoạn nâng cấp, lập chỉ mục kèm số trang/đoạn, liên kết đúng mã minh chứng.
- Bản báo cáo dự thảo phải phân biệt thông tin đã xác nhận trong tệp, nhận định phân tích của AI, và **đề nghị bổ sung**.
- Khi thiếu căn cứ: nêu (i) tiêu chí/luận điểm, (ii) hồ sơ đã hỗ trợ đến đâu, (iii) loại tài liệu/số liệu còn cần, (iv) lý do/mức độ ưu tiên, (v) đơn vị có thể cung cấp nếu biết.
- Phân biệt “chưa tìm thấy trong kho” với “không tồn tại”; không tạo dữ liệu, chứng cứ hay mã giả.
- Viết thử tiêu chí 1.1 trước khi nhân rộng 52 tiêu chí.
- **Không cần thêm một bước duyệt nội bộ trước khi AI đọc**, vì kho Drive chứa tài liệu đã được xác nhận bên ngoài quy trình tải lên.

## 5. Quy trình làm việc đề xuất (đầu tiên không sửa mã)

1. Tạo Issue nêu rõ hệ thống, hiện tượng, tệp liên quan và tiêu chí nghiệm thu.
2. Một AI/nhân sự nhận xử lý; các AI còn lại chỉ đọc/phản biện.
3. Tạo branch từ head mới nhất; sửa đúng phạm vi được giao.
4. Chạy test ứng dụng và test tích hợp khi chạm Firebase hoặc dữ liệu dùng chung.
5. Mở PR; reviewer kiểm tra thay đổi, những phần có thể ảnh hưởng app khác và dữ liệu gốc.
6. Người có thẩm quyền chấp thuận; tiến hành merge/deploy theo trình tự kiểm soát.
7. Kiểm tra sản phẩm chạy thật, ghi phiên bản và khả năng phục hồi; chỉ đóng Issue khi xác nhận đủ.

## 6. Danh sách việc đã mở

- [PNL #66 — Một đầu mối phát hành Firestore Rules](https://github.com/luuhuongnnpl-apag/phuc-nguyen-library/issues/66) — ưu tiên P0.
- [PNL #67 — Ngăn workflow ghi đè lên main](https://github.com/luuhuongnnpl-apag/phuc-nguyen-library/issues/67) — P1.
- [PND #7 — Quyền dữ liệu Firebase/Drive và phạm vi chia sẻ](https://github.com/luuhuongnnpl-apag/PN-degital/issues/7) — P1.
- [KDTHS #2 — Kho dữ liệu và điều phối AI](https://github.com/luuhuongnnpl-apag/kiem-dinh-ths-lhplhc/issues/2) — P1.
- [KDTHS #1 — Gợi ý bổ sung minh chứng khi viết báo cáo](https://github.com/luuhuongnnpl-apag/kiem-dinh-ths-lhplhc/issues/1) — đặc tả nghiệp vụ.

## 7. Giới hạn rà soát và quyết định chờ xác nhận

- Chưa truy cập Firebase Console production, cấu hình IAM, nhánh bảo vệ thực tế hoặc permission của từng tệp Drive; chưa có log chứng minh nguyên nhân lỗi từng ứng dụng.
- Chưa sửa tệp rules, trigger CI, dữ liệu Firestore, chia sẻ Drive hay phát hành Pages.
- **Không phê duyệt thay mặt chủ dự án** các thay đổi có ảnh hưởng production. Tài liệu này chỉ làm chuẩn thảo luận và là cơ sở để triển khai kỹ thuật an toàn sau khi đã thử nghiệm.
