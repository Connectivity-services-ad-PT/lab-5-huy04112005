# Hướng dẫn Quản lý Phiên bản API (API Versioning)

Tài liệu này định nghĩa chiến lược quản lý phiên bản (versioning) cho các API của **Pair 04: Core Business ↔ Notification Service**.

---

## 1. Nguyên tắc Đánh phiên bản (Versioning Rules)

Hệ thống áp dụng chuẩn **Semantic Versioning (SemVer)** phiên bản `MAJOR.MINOR.PATCH` cho tài liệu OpenAPI Contract và dịch vụ triển khai:

- **MAJOR**: Tăng khi có các thay đổi không tương thích ngược (breaking changes) trong hợp đồng API.
- **MINOR**: Tăng khi bổ sung chức năng mới tương thích ngược (ví dụ: thêm endpoint mới, thêm trường tùy chọn trong response).
- **PATCH**: Tăng khi sửa lỗi hoặc tối ưu hóa mà không thay đổi cấu trúc hợp đồng.

Phiên bản hiện tại của Hợp đồng API: **v1.0.0**

---

## 2. Định dạng URL Versioning

Chúng tôi sử dụng cơ chế **URL Path Versioning** để phân tách rõ ràng các phiên bản Major:

- Địa chỉ API v1: `https://api.campus.local/v1/events/alerts`
- Prism Mock Server: `http://localhost:4010/events/alerts` (Trong giai đoạn Mock Lab 02, chúng tôi sử dụng path gốc để kiểm thử nhanh).

Khi có thay đổi Breaking Change buộc phải lên phiên bản Major mới (v2), URL sẽ đổi thành:
`https://api.campus.local/v2/events/alerts`

---

## 3. Quy định về Tương thích ngược (Backward Compatibility)

### Thay đổi tương thích ngược (Non-breaking Changes)
Những thay đổi sau được coi là an toàn và **không** yêu cầu tăng phiên bản Major (chỉ tăng Minor/Patch):
- Bổ sung một endpoint mới hoàn toàn (ví dụ: `GET /events/statistics`).
- Bổ sung một trường tùy chọn (`optional` hoặc có `default` value) vào request body schema.
- Bổ sung thêm trường mới trong response body.
- Thêm mã lỗi HTTP mới trong Response nhưng vẫn nằm trong nhóm Problem Details.

### Thay đổi phá vỡ tương thích (Breaking Changes)
Những thay đổi sau bắt buộc phải tăng lên phiên bản Major mới (**v2**):
- Xóa bỏ một endpoint hiện có (ví dụ: hủy bỏ `/events/{eventId}`).
- Thay đổi kiểu dữ liệu của một trường (ví dụ: đổi `eventId` từ `string (uuid)` sang `integer`).
- Đổi tên trường bắt buộc trong payload request hoặc response.
- Thêm trường bắt buộc (`required`) vào request body schema mà không có giá trị mặc định.
- Xóa bỏ một giá trị enum hiện có trong schema (ví dụ: xóa mức độ nghiêm trọng `CRITICAL` trong `AlertSeverity`).
- Thay đổi cơ chế xác thực bảo mật từ Bearer token sang API Key.

---

## 4. Quy trình Deprecation & Sunset

Khi phát hành phiên bản **v2.0.0**, phiên bản **v1.x.x** sẽ bước vào giai đoạn khấu hao (Deprecation):

1. **Thông báo qua Header**:
   - Mọi request gửi tới `v1` sẽ nhận được thêm HTTP Header `Sunset: 2026-12-31T23:59:59Z` thông báo ngày dừng hỗ trợ chính thức.
   - Thêm Header `Link: <https://api.campus.local/v2>; rel="successor-version"` dẫn tới tài liệu API mới.
2. **Khai báo trong OpenAPI**:
   - Đánh dấu trường `deprecated: true` cho các endpoint cũ trong file `openapi.yaml`.
3. **Thời gian chuyển đổi**:
   - Phiên bản v1 sẽ được duy trì song song với v2 tối thiểu **6 tháng** để Consumer (Core Business) kịp chuyển đổi tích hợp sang v2.
