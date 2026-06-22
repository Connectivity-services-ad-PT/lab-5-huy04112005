# Phân tích yêu cầu — vai Consumer

- Cặp đàm phán: Cặp số 04 (Core Business ↔ Notification Async Queue)
- Product: Smart Campus Operations Platform
- Consumer service: Core Business (A6/B6)
- Provider service: Notification Service (A7/B7)
- Người viết: Trần Thị B
- Ngày: 2026-05-22

---

## 1. Resource Consumer cần nhận/gửi

| Resource | Consumer dùng để làm gì? | Field bắt buộc với Consumer | Field có thể tùy chọn |
|---|---|---|---|
| `AlertEvent` | Gửi thông tin sự kiện cảnh báo lên hệ thống Notification để điều phối các kênh gửi thông báo. | `eventId`, `eventType`, `source`, `alertId`, `severity`, `message`, `occurredAt`, `correlationId` | `relatedEventId`, `details` |
| `AlertEventPage` | Nhận kết quả truy vấn lịch sử cảnh báo phục vụ hiển thị trên giao diện quản trị Admin/Monitor. | `items`, `nextCursor`, `hasMore` | N/A |

---

## 2. API Consumer cần gọi

| Method | Path | Lúc nào gọi? | Kỳ vọng response |
|---|---|---|---|
| POST | `/events/alerts` | Khi hệ thống Core Business sinh ra một sự kiện cảnh báo mới (ví dụ: cảnh báo cháy, đột nhập, nhiệt độ cao). | HTTP 201 Created cùng với `eventId` và `acceptedAt`. |
| GET | `/events/history` | Khi quản trị viên mở trang dashboard giám sát lịch sử sự kiện và thông báo. | HTTP 200 OK trả về một trang sự kiện có chứa cursor để phân trang tiếp theo. |
| GET | `/events/{eventId}` | Khi người dùng click chi tiết vào một sự kiện cảnh báo cụ thể trên danh sách. | HTTP 200 OK trả về chi tiết đầy đủ thông tin của sự kiện cảnh báo đó. |

---

## 3. Error case Consumer cần xử lý

Tối thiểu 5 case.

| Status | Consumer hiểu là gì? | Consumer sẽ xử lý thế nào? |
|---:|---|---|
| 400 | Dữ liệu sự kiện gửi đi không khớp định dạng Schema được thỏa thuận. | Log lỗi chi tiết validation, thông báo cho lập trình viên sửa code của Core Business. |
| 401 | Phía Client (Core Business) chưa cung cấp thông tin xác thực hoặc token hết hạn. | Thực hiện cơ chế refresh token tự động và gọi lại API. |
| 403 | Core Business có token nhưng không đủ quyền ghi/đọc dữ liệu sự kiện. | Ghi nhận lỗi phân quyền hệ thống và thông báo cho quản trị viên hệ thống để kiểm tra lại vai trò. |
| 404 | Sự kiện hoặc API không tồn tại. | Hiển thị thông báo "Không tìm thấy sự kiện" trên giao diện Admin và dừng truy vấn. |
| 409 | Event ID bị trùng (do lỗi gửi lặp). | Bỏ qua lỗi này vì điều đó có nghĩa sự kiện đã được ghi nhận thành công từ trước. |
| 422 | Vi phạm nghiệp vụ (ví dụ: gửi sự kiện alert.resolved cho alert chưa được tạo). | Hiển thị chi tiết lỗi nghiệp vụ từ hệ thống và ghi log phục vụ debug. |

---

## 4. Giả định bổ sung

- **Giả định 1**: Notification Service đảm bảo tính sẵn sàng cao, sử dụng cơ chế đệm queue nên không làm mất tin nhắn của Core Business khi xảy ra spike tải đột biến.
- **Giả định 2**: Kênh nhận mặc định được thiết lập dựa trên cấu hình bảo mật. Core Business không cần trực tiếp cung cấp thông tin người nhận (số điện thoại/email) mà chỉ cung cấp `severity` và thông tin nghiệp vụ.
- **Giả định 3**: Việc truyền tải thông tin nhạy cảm của người dùng (như thông tin cá nhân) tuân thủ quy định mã hóa dữ liệu.

---

## 5. Câu hỏi cho Provider

1. Thời gian phản hồi trung bình (latency) của API POST `/events/alerts` là bao nhiêu để chúng tôi thiết lập timeout phù hợp cho client? (Đề xuất timeout là 1.5 giây).
2. Khi một sự kiện thông báo được gửi thành công đến người dùng, Notification Service có phát sự kiện callback hoặc cập nhật trạng thái thông báo để Core Business đồng bộ không?
3. Notification Service có hỗ trợ gom tin nhắn (message batching) để gửi nhiều cảnh báo một lúc nhằm tối ưu hiệu suất mạng không?

---

## 6. Rủi ro tích hợp

| Rủi ro | Tác động | Đề xuất xử lý |
|---|---|---|
| Phía Provider (Notification) thay đổi cấu trúc schema mà không thông báo | Hệ thống Core Business bị crash hoặc không parse được response | Cài đặt kiểm tra tự động (Spectral linting) ở bước CI/CD và thực hiện versioning API rõ ràng qua URL. |
| Notification Service sập hoàn toàn không thể phản hồi | Core Business bị treo do chờ đợi phản hồi hoặc mất mát cảnh báo khẩn cấp | Sử dụng circuit breaker và cơ chế hàng đợi lưu giữ tạm thời (Outbox pattern) tại phía Core Business để lưu lại sự kiện trước khi gửi đi. |
