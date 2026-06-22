# Phân tích yêu cầu — vai Provider

- Cặp đàm phán: Cặp số 04 (Core Business ↔ Notification Async Queue)
- Product: Smart Campus Operations Platform
- Provider service: Notification Service (A7/B7)
- Consumer service: Core Business (A6/B6)
- Người viết: Nguyễn Văn A
- Ngày: 2026-05-22

---

## 1. Resource chính

| Resource | Mô tả | Thuộc tính bắt buộc | Thuộc tính tùy chọn |
|---|---|---|---|
| `AlertEvent` | Sự kiện cảnh báo phát sinh từ hệ thống Core. | `eventId`, `eventType`, `source`, `alertId`, `severity`, `message`, `occurredAt`, `correlationId` | `relatedEventId`, `details` |
| `NotificationDelivery` | Trạng thái gửi thông báo đa kênh. | `deliveryId`, `alertId`, `channel`, `status`, `sentAt` | `recipient`, `errorDetail` |

---

## 2. Action/API dự kiến

| Method | Path | Mục đích | Consumer gọi khi nào? |
|---|---|---|---|
| POST | `/events/alerts` | Nhận sự kiện cảnh báo từ Core Business để xử lý và định tuyến thông báo gửi tới người dùng. | Khi Core Business phát hiện ra sự cố, vi phạm an ninh, hoặc sự kiện cần cảnh báo. |
| GET | `/events/history` | Lấy danh sách lịch sử các sự kiện cảnh báo đã được gửi thông báo (phân trang dạng cursor). | Khi Core Business muốn hiển thị lịch sử cảnh báo trên dashboard quản trị. |
| GET | `/events/{eventId}` | Lấy thông tin chi tiết của một sự kiện cảnh báo cụ thể. | Khi Core Business muốn xem chi tiết thông tin và trạng thái xử lý gửi tin của một cảnh báo cụ thể. |

---

## 3. Error case

Tối thiểu 5 case.

| Status | Tình huống | Response body dự kiến |
|---:|---|---|
| 400 | Payload sự kiện sai định dạng JSON Schema (ví dụ: `eventId` không phải UUID, thiếu trường bắt buộc). | `Problem` với lỗi validation chi tiết từng field. |
| 401 | Yêu cầu không chứa Bearer token hoặc token không hợp lệ. | `Problem` lỗi Unauthorized. |
| 403 | Token hợp lệ nhưng Client không có quyền truy cập API sự kiện. | `Problem` lỗi Forbidden. |
| 404 | Không tìm thấy sự kiện cảnh báo (`eventId` không tồn tại trong hệ thống). | `Problem` lỗi NotFound. |
| 409 | Trùng lặp sự kiện dựa trên `eventId` (idempotency check thất bại). | `Problem` lỗi Conflict. |
| 422 | Dữ liệu đúng định dạng JSON Schema nhưng vi phạm quy tắc nghiệp vụ (ví dụ: `occurredAt` ở tương lai). | `Problem` lỗi Unprocessable Entity. |

---

## 4. Giả định bổ sung

Ghi rõ những điểm user story chưa nói nhưng Provider cần giả định.

- **Giả định 1**: Các kênh thông báo (Email, Telegram, App Push) của người dùng đã được đăng ký và cấu hình từ trước thông qua User Profile Service. Dịch vụ Notification tự động tra cứu thông tin người nhận (email, chatId) dựa trên `userId` hoặc `source`.
- **Giả định 2**: Quyền truy cập API được bảo vệ bằng JWT Token cấp bởi Identity Service. Hệ thống sử dụng cơ chế RBAC để cấp quyền truy cập các endpoint lịch sử cảnh báo.
- **Giả định 3**: Khi Notification Service bị quá tải, tin nhắn sẽ được lưu trữ tạm thời trong Message Queue Broker và xử lý bất đồng bộ theo cơ chế backpressure.

---

## 5. Câu hỏi cho Consumer

1. Các sự kiện cảnh báo có cần đính kèm các thông tin tùy biến (metadata) động tùy theo loại cảnh báo không? (Đề xuất dùng trường `details` kiểu object với `additionalProperties: true`).
2. Tốc độ sinh sự kiện tối đa từ phía Core Business là bao nhiêu để Notification Service thiết lập tài nguyên hạ tầng và cấu hình Rate Limiting phù hợp?
3. Core Business có yêu cầu nhận callback webhook để nhận kết quả trạng thái gửi thông báo thành công/thất bại từ Notification Service không?

---

## 6. Rủi ro tích hợp

| Rủi ro | Tác động | Đề xuất xử lý |
|---|---|---|
| Consumer gửi trùng lặp sự kiện do lỗi mạng hoặc cơ chế retry của Client | Gửi thông báo lặp lại nhiều lần cho người dùng gây phiền hà | Áp dụng cơ chế kiểm tra trùng lặp (Idempotent) dựa trên trường `eventId` duy nhất của mỗi sự kiện. |
| Dữ liệu sự kiện quá lớn do đính kèm tệp đa phương tiện (ví dụ: ảnh camera) | Gây chậm hệ thống xếp hàng tin nhắn và quá tải RAM | Giới hạn dung lượng tối đa payload là 256 KB. Chỉ cho phép gửi link ảnh, không gửi file binary base64 trực tiếp. |
