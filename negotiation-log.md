# Biên bản đàm phán hợp đồng API

- Cặp đàm phán: Cặp số 04 (Core Business ↔ Notification Async Queue)
- Product: Smart Campus Operations Platform
- Provider: Notification Service (A7/B7)
- Consumer: Core Business (A6/B6)
- Phiên: v1.0
- Ngày: 2026-05-22

---

## Issue #1

- Raised by: Consumer (Core Business)
- Endpoint: `/events/alerts` (Event Broker alert routing)
- Concern: Khi phát sinh cảnh báo, hệ thống nên gửi Email hay gửi thông báo đẩy (Push) mặc định cho người dùng để tối ưu chi phí và trải nghiệm?
- Proposal: Gửi Push mặc định đối với các cảnh báo thông thường, chỉ gửi Email đối với cảnh báo có mức độ nghiêm trọng khẩn cấp (Critical) hoặc khi người dùng cấu hình riêng.
- Resolution: Accepted.
- Rationale: Tiết kiệm chi phí vận hành (gửi Email/SMS tốn chi phí cao hơn Push) và giảm thiểu spam hòm thư người dùng đối với các cảnh báo không khẩn cấp.
- Impact: Schema của `AlertEvent` cần bổ sung trường `severity` (enum: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) để Notification Service làm căn cứ định tuyến kênh gửi.

---

## Issue #2

- Raised by: Consumer (Core Business)
- Endpoint: Toàn bộ Async Queue
- Concern: Khi Notification Service xử lý gửi thông báo thất bại (do lỗi mạng hoặc downstream service của bên thứ ba như Telegram, SendGrid bị sập), queue sẽ retry tối đa bao nhiêu lần trước khi đưa vào Dead Letter Queue (DLQ)?
- Proposal: Retry tối đa 5 lần, sử dụng cơ chế giãn cách thời gian (exponential backoff) để tự động phục hồi.
- Resolution: Accepted.
- Rationale: Số lượng 5 lần retry là hợp lý để vượt qua các sự cố gián đoạn kết nối mạng ngắn hạn mà không gây nghẽn hàng đợi (head-of-line blocking).
- Impact: Cấu hình RabbitMQ/Kafka queue với `max-delivery-attempts: 5`, nếu vượt quá sẽ tự động định tuyến sang DLQ (`notification.alerts.dlq`).

---

## Issue #3

- Raised by: Provider (Notification Service)
- Endpoint: Message Broker Queue Storage
- Concern: Thời gian lưu trữ tối đa (event retention period) của các event trên queue là bao nhiêu ngày trước khi tự động xóa nếu Consumer chưa kịp tiêu thụ?
- Proposal: Lưu trữ tối đa 7 ngày để dự phòng trường hợp Notification Service gặp sự cố sập hệ thống nghiêm trọng kéo dài.
- Resolution: Modified (Chốt 3 ngày).
- Rationale: 3 ngày (72 giờ) là khoảng thời gian đủ dài để đội ngũ vận hành khắc phục sự cố hệ thống, đồng thời đảm bảo không làm quá tải dung lượng đĩa cứng của Message Broker khi có lượng lớn event được publish liên tục.
- Impact: Cấu hình tham số `message-ttl` / `retention.ms` của queue là 259,200,000 miligiây (3 ngày).

---

## Issue #4

- Raised by: Consumer (Core Business)
- Endpoint: Trường `occurredAt` / `timestamp` trong payload
- Concern: Thời gian xảy ra sự kiện nên sử dụng múi giờ UTC (ISO 8601) hay giờ địa phương (GMT+7) để đảm bảo đồng bộ hệ thống?
- Proposal: Bắt buộc sử dụng chuẩn quốc tế ISO 8601 múi giờ UTC (ví dụ: `YYYY-MM-DDTHH:mm:ssZ`).
- Resolution: Accepted.
- Rationale: Hệ thống chạy trên môi trường phân tán Cloud. Sử dụng UTC giúp đồng bộ hóa dữ liệu thời gian chính xác giữa tất cả dịch vụ và dễ dàng truy vết log khi phân tích lỗi hệ thống.
- Impact: Định nghĩa schema các trường thời gian trong `openapi.yaml` dùng loại `string` với format `date-time` và pattern UTC (kết thúc bằng ký tự `Z`).

---

## Issue #5

- Raised by: Provider (Notification Service)
- Endpoint: Async Queue Consumer
- Concern: Queue có cần đảm bảo tính tuần tự tuyệt đối (strict ordering / FIFO) khi xử lý các sự kiện thông báo hay có thể xử lý song song không đồng bộ?
- Proposal: Xử lý song song không đồng bộ để tối ưu hiệu năng và throughput gửi tin.
- Resolution: Modified.
- Rationale: Các thông báo của các thiết bị khác nhau có thể xử lý song song. Tuy nhiên, các sự kiện cập nhật của cùng một Alert ID (ví dụ: `created` -> `escalated` -> `resolved`) bắt buộc phải xử lý đúng thứ tự thời gian để tránh hiển thị sai trạng thái.
- Impact: Sử dụng partition key/routing key dựa trên `alertId` để đưa các event của cùng một Alert về cùng một partition/worker, đảm bảo xử lý đúng thứ tự.

---

## Issue #6

- Raised by: Provider (Notification Service)
- Endpoint: `POST /events/alerts` (Request Body size)
- Concern: Giới hạn kích thước tối đa của payload (max payload size) là bao nhiêu để ngăn ngừa việc gửi kèm các file đa phương tiện dung lượng lớn làm treo queue?
- Proposal: Giới hạn kích thước tối đa ở mức 256 KB. Không cho phép nhúng trực tiếp file ảnh hay dữ liệu nhị phân (binary base64) vào payload.
- Resolution: Accepted.
- Rationale: Dữ liệu sự kiện chỉ chứa thông tin dạng văn bản và siêu dữ liệu (metadata). Nếu có ảnh đính kèm (ví dụ: ảnh camera), Provider (Core Business) phải tải ảnh lên Storage Server và chỉ gửi đường link URL trong payload của event.
- Impact: Đặt cấu hình giới hạn dung lượng request body trên API Gateway/Message Broker là 256 KB. Thêm validate schema trong `openapi.yaml` ràng buộc độ dài tối đa của các trường văn bản.

---

# Chốt hợp đồng v1.0

Provider sign-off: Notification Service (A7/B7) - Nguyễn Văn A  
Consumer sign-off: Core Business (A6/B6) - Trần Thị B  
Witness (GV/TA): Lớp FIT4110  
Date: 2026-05-22  

---

## Ghi chú warning nếu Spectral còn cảnh báo

| Warning | Lý do chấp nhận tạm thời | Kế hoạch sửa |
|---|---|---|
| Không có cảnh báo nghiêm trọng | Đã sửa đổi openapi.yaml hoàn toàn hợp lệ | Không cần |
