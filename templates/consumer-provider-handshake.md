# Consumer-Provider Handshake Agreement - Lab 03

- **Cặp đàm phán**: Cặp số 04 (Core Business ↔ Notification Async Queue)
- **Product**: Smart Campus Operations Platform
- **Provider (Notification Service)**: Nguyễn Văn A (Nhóm A7/B7)
- **Consumer (Core Business)**: Trần Thị B (Nhóm A6/B6)
- **Phiên bản**: v1.1 (Lab 03)
- **Ngày ký kết**: 2026-05-28

---

## 1. Mục tiêu thống nhất

Biên bản này xác nhận rằng nhóm Consumer và Provider đã thống nhất về giao diện API đồng bộ và cơ chế hàng đợi bất đồng bộ. Hợp đồng API (`notification.openapi.yaml`) đã được chốt và tự động hóa qua bộ kiểm thử Postman/Newman.

## 2. Các điểm kỹ thuật đã chốt

### 2.1. Hợp đồng REST API
1. **Các Endpoint phục vụ tích hợp**:
   - `POST /events/alerts`: Consumer gửi thông báo cảnh báo mới vào hệ thống.
   - `GET /events/history`: Consumer truy vấn lịch sử cảnh báo (hỗ trợ phân trang bằng cursor).
   - `GET /events/{eventId}`: Consumer xem chi tiết một cảnh báo cùng với trạng thái gửi các tin nhắn (Telegram, Email, Push).
   - `GET /health`: Kiểm tra sức khỏe của dịch vụ Notification.
2. **Xác thực và Bảo mật**:
   - Sử dụng Header `Authorization: Bearer <JWT_TOKEN>`.
   - Token phải chứa claim xác định service (`sub: "core-business"`).
3. **Định dạng lỗi**:
   - Tất cả các mã lỗi `4xx/5xx` phải tuân theo cấu trúc RFC 9457 `Problem Details` với Content-Type `application/problem+json`.

### 2.2. Hợp đồng Queue bất đồng bộ (AMQP)
1. **Tên Queue chính**: `notification_events`
2. **Kênh trao đổi (Exchange)**: `campus.alerts` (Topic Exchange)
3. **Mẫu định tuyến (Routing Keys)**:
   - `campus.alerts.created` cho sự kiện tạo mới.
   - `campus.alerts.escalated` cho sự kiện leo thang.
   - `campus.alerts.resolved` cho sự kiện giải quyết xong.
4. **Idempotency**:
   - Sử dụng `eventId` làm khóa khử trùng. Consumer lưu trữ lịch sử ID sự kiện trong vòng 24 giờ.
5. **Thứ tự xử lý**:
   - Route tất cả sự kiện có cùng `alertId` vào chung một partition/worker để đảm bảo thứ tự thời gian.

---

## 3. SLA & Chỉ số hiệu năng (Local Server Only)

- **Thời gian phản hồi trung bình**: Dưới 200ms đối với tất cả các API happy path.
- **Kích thước payload tối đa**: 256 KB. Không được gửi tệp nhị phân base64, chỉ gửi URL liên kết.
- **Retry Policy**: Tối đa 5 lần với exponential backoff trước khi chuyển sang DLQ `notification.alerts.dlq`.

---

## 4. Ký duyệt kết quả

| Chức vụ | Tên đại diện | Trạng thái | Ngày ký |
|:---|:---|:---:|:---:|
| **Provider (Notification)** | Nguyễn Văn A | **SIGNED** | 2026-05-28 |
| **Consumer (Core Business)** | Trần Thị B | **SIGNED** | 2026-05-28 |
| **Witness (GV/TA)** | Hệ thống CI tự động | **VERIFIED** | 2026-05-28 |
