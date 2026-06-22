# Event Contract sơ bộ — Cặp 04: Core Business → Notification

Tài liệu này ghi nhận hợp đồng sự kiện sơ bộ giữa **Core Business** và **Notification Service** cho luồng tích hợp bất đồng bộ qua Message Queue (Lab 02). Các đặc tả kỹ thuật chi tiết hơn bằng AsyncAPI sẽ được thực hiện tại Lab 03.

---

## 1. Thông tin dependency

- **Dependency số:** 04 (Core Business ↔ Notification Async Queue)
- **Producer:** Core Business (A6/B6)
- **Consumer:** Notification Service (A7/B7)
- **Cơ chế:** Queue async (Message Broker)
- **Người ghi:** Nguyễn Văn A (Provider) & Trần Thị B (Consumer)
- **Ngày:** 2026-05-22

---

## 2. Mục đích nghiệp vụ

Khi hệ thống Core Business phát hiện ra các sự cố vận hành, vi phạm an ninh hoặc các ngưỡng đo lường vượt giới hạn (ví dụ: phát hiện chuyển động phòng máy chủ, nhiệt độ phòng IoT quá cao), hệ thống sẽ phát sinh sự kiện cảnh báo tương ứng. 

Dịch vụ **Notification Service** chịu trách nhiệm đăng ký tiêu thụ các sự kiện này, định tuyến người nhận và kênh gửi phù hợp (Email, App Push, Telegram) để thông báo kịp thời cho đội ngũ vận hành.

---

## 3. Danh sách Event & Topic dự kiến

| Event Name | Topic Name | Producer | Consumer | Trigger Condition |
|---|---|---|---|---|
| `alert.created` | `campus.alerts.created` | Core Business | Notification | Khi một sự cố nghiệp vụ mới được phát hiện và ghi nhận. |
| `alert.escalated` | `campus.alerts.escalated` | Core Business | Notification | Khi sự cố kéo dài chưa được xử lý và cần nâng mức cảnh báo. |
| `alert.resolved` | `campus.alerts.resolved` | Core Business | Notification | Khi sự cố đã được khắc phục/xử lý xong hoàn toàn. |

---

## 4. Payload tối thiểu (JSON Schema tương đương)

### 4.1. Cấu trúc cơ bản chung (Base Event Schema)
```json
{
  "eventId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babc",
  "eventType": "alert.created",
  "source": "core-business",
  "occurredAt": "2026-05-22T07:30:00Z",
  "correlationId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babe",
  "alertId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babd"
}
```

### 4.2. Schema cụ thể cho từng Event

#### a. Event `alert.created`
* **Bắt buộc:** `eventId`, `eventType`, `source`, `occurredAt`, `correlationId`, `alertId`, `severity`, `message`
* **Ví dụ payload:**
```json
{
  "eventType": "alert.created",
  "eventId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babc",
  "source": "core-business",
  "alertId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babd",
  "severity": "HIGH",
  "message": "Phát hiện chuyển động bất thường tại khu vực Server Room",
  "occurredAt": "2026-05-22T07:30:00Z",
  "correlationId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babe",
  "details": {
    "deviceId": "CAM-SERVER-01",
    "location": "Tòa nhà A, Tầng 3"
  }
}
```

#### b. Event `alert.escalated`
* **Bắt buộc:** `eventId`, `eventType`, `source`, `occurredAt`, `correlationId`, `alertId`, `severity`, `escalatedReason`, `previousEventId`
* **Ví dụ payload:**
```json
{
  "eventType": "alert.escalated",
  "eventId": "0196fb3c-4ad7-7d1e-9f49-5d5148d2bbbf",
  "source": "core-business",
  "alertId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babd",
  "severity": "CRITICAL",
  "escalatedReason": "Cảnh báo không được xác nhận sau 15 phút",
  "previousEventId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babc",
  "occurredAt": "2026-05-22T07:45:00Z",
  "correlationId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babe"
}
```

#### c. Event `alert.resolved`
* **Bắt buộc:** `eventId`, `eventType`, `source`, `occurredAt`, `correlationId`, `alertId`, `resolutionReason`, `resolvedAt`
* **Ví dụ payload:**
```json
{
  "eventType": "alert.resolved",
  "eventId": "0196fb3b-4ad7-7d1e-9f49-5d5148d2cccf",
  "source": "core-business",
  "alertId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babd",
  "resolutionReason": "Nhân viên kỹ thuật đã xác nhận nhầm lẫn của nhân sự quét dọn vệ sinh",
  "occurredAt": "2026-05-22T07:55:00Z",
  "resolvedAt": "2026-05-22T07:54:30Z",
  "correlationId": "0196fb3d-4ad7-7d1e-9f49-5d5148d2babe"
}
```

---

## 5. Ràng buộc & Delivery Concern

| Vấn đề | Quyết định thống nhất | Giải pháp kỹ thuật |
|---|---|---|
| **Idempotency** | Consumer chấp nhận trùng event nhưng phải khử trùng. | Sử dụng `eventId` làm khóa duy nhất. Consumer lưu trữ lịch sử ID sự kiện trong Redis/Database trong vòng 24h để loại bỏ trùng lặp. |
| **Ordering (FIFO)** | Phải xử lý đúng tuần tự sự kiện cho cùng một `alertId`. | Message Broker sử dụng `alertId` làm partition key/routing key để gom tất cả sự kiện của cùng một sự cố về chung một queue partition duy nhất. |
| **Timestamp Format** | Đồng bộ toàn bộ hệ thống theo giờ chuẩn UTC. | Sử dụng định dạng chuỗi ISO 8601 (kết thúc bằng chữ cái `Z`). |
| **Max Payload Size** | Giới hạn dung lượng tin nhắn gửi qua Broker. | Payload giới hạn tối đa là 256 KB. Không nhúng file ảnh camera dạng Base64 trực tiếp; chỉ gửi URL liên kết. |
| **Retry Policy** | Xử lý lỗi downstream tạm thời (ví dụ: Telegram sập). | Xử lý lỗi gửi tin sẽ thực hiện retry tối đa 5 lần với exponential backoff. |
| **Dead-letter Queue** | Xử lý tin nhắn lỗi nghiêm trọng (invalid format). | Các tin nhắn bị lỗi cú pháp hoặc hết số lượt retry sẽ tự động chuyển vào hàng đợi chứa lỗi `notification.alerts.dlq` để cảnh báo vận hành. |
| **Message Retention** | Thời gian lưu trữ tin nhắn trên Broker. | TTL của tin nhắn chưa được tiêu thụ trên queue là 3 ngày. |

---

## 6. Hướng chuyển tiếp sang Lab 03

1. **Broker giả định:** Sử dụng **RabbitMQ** (hoặc Apache Kafka tùy quy mô hạ tầng) làm Message Broker.
2. **Exchange Type:** Định nghĩa `campus.alerts` là một **Topic Exchange** để cho phép Notification Service tự động lọc hoặc mở rộng thêm các Worker chuyên biệt tùy theo kênh gửi.
3. **AsyncAPI Đặc tả:** Thiết lập file `asyncapi.yaml` mô tả chi tiết channels, messages, bindings và schema chi tiết cho từng loại event của Pair 04.
