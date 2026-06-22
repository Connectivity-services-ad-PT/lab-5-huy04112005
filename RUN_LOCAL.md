# Hướng dẫn Chạy Dịch vụ dưới Local (RUN_LOCAL.md)

> **Registry Image Tag**: `ghcr.io/connectivity-services-ad-pt/team-notify:v0.1.0-team-notify`

Tài liệu này hướng dẫn 5 bước cơ bản để cài đặt, đóng gói Docker và chạy kiểm thử dịch vụ **Notification Service (Team Notify - Pair 04)**.

---

## Bước 1: Chuẩn bị Môi trường
Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã được cài đặt các công cụ sau:
- **Node.js**: Phiên bản 20.x LTS.
- **Docker Desktop**: Đang chạy bình thường.
- **Git** và **npm**.

Cài đặt các thư viện cần thiết phục vụ cho việc kiểm thử tự động:
```bash
npm install --legacy-peer-deps
```

---

## Bước 2: Tạo các File Cấu hình cần thiết
Hãy tạo file `.env.example` ở thư mục gốc của dự án nếu chưa có:
```ini
PORT=8000
NODE_ENV=production
```

---

## Bước 3: Đóng gói và Khởi chạy với Docker Compose (Lab 05)
Trong Lab 05, chúng ta sử dụng Docker Compose để chạy cả Database và API Service, đồng thời cấu hình mạng và secrets an toàn.

1. Khởi tạo mạng chung `class-net` (nếu chưa có):
   ```bash
   docker network create class-net
   ```

2. Chạy toàn bộ stack hệ thống:
   ```bash
   docker compose up -d --build
   ```

3. Kiểm tra log để xác nhận API chờ DB khởi động xong (khắc phục Race Condition):
   ```bash
   docker compose logs -f
   ```

4. Kiểm tra lại xem container đã phản hồi bình thường chưa tại endpoint `/health`:
   ```bash
   curl http://localhost:8000/health
   ```

5. Dừng hệ thống an toàn (Graceful Shutdown):
   ```bash
   docker compose down
   ```

---

## Bước 4: Chạy Kiểm thử Tự động (Newman)
Khi hệ thống compose đang chạy ổn định, chạy các ca kiểm thử tự động từ Postman Collection:

1. Khởi động Mock Server của dịch vụ Core Business (dependencies ở port `4011`):
   ```bash
   npx prism mock contracts/core-business.openapi.yaml --port 4011
   ```
2. Chạy bộ kiểm thử Newman trong terminal thứ hai:
   ```bash
   npm run test:local
   ```
   *(Hoặc sử dụng lệnh tích hợp trong Makefile: `make test-docker`)*
3. Kết quả các báo cáo dạng HTML và XML sẽ tự động được sinh ra trong thư mục `reports/`.

---

## Lệnh nhanh bằng Makefile
Nếu môi trường của bạn hỗ trợ `make`, bạn có thể chạy các lệnh rút gọn sau:
- `make install`: Cài đặt dependencies (`npm install`).
- `make lint`: Kiểm tra chất lượng và định dạng hợp đồng OpenAPI.
- `make mock`: Khởi chạy server mock cục bộ của Notification Service ở cổng 4010.
- `make test-mock`: Chạy Newman kiểm thử hợp đồng mock của Notification Service.
- `make build`: Xây dựng Docker Image cho Notification Service.
- `make run`: Chạy Docker Container của Notification Service.
- `make test-docker`: Chạy Newman kiểm thử trực tiếp trên Container đang chạy.
- `make stop`: Dừng Docker Container đang chạy.

