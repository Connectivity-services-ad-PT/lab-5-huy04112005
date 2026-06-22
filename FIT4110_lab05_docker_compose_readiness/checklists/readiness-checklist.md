# 7. Readiness checklist

- [ ] DB đã khởi động và sẵn sàng (`pg_isready`).
- [ ] AI service đã tải mô hình (nếu có) và có health check trả 200.
- [ ] API có thể kết nối DB và AI (ví dụ tạo một reading thành công).
- [ ] Các biến môi trường (.env) được đặt đúng, không dùng secret thật.
- [ ] `team-internal` network hoạt động; service có thể gọi nội bộ qua tên container.
- [ ] Version/tag của từng image được cập nhật đúng quy ước (vd: `v0.1.0-team-iot`).
