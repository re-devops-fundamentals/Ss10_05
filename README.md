# Báo Cáo Bài Tập 5: Tự Động Hóa Điều Phối Đa Dịch Vụ Với Docker Compose & File .env

- **Môn học**: DevOps Fundamentals (IT-209)
- **Session**: 10 - Kiến trúc Container, Linux Namespaces & Control Groups (cgroups)
- **Bài tập**: Bài 5 - Tự động hóa điều phối đa dịch vụ với Docker Compose & File .env
- **Học viên**: HoQuocKhai
- **Email**: khaiho6040@gmail.com
- **Đường dẫn nộp bài trên GitHub**: `homework/session_10/ex5/`

---

## 1. Mục tiêu bài thực hành

1. **Chuẩn hóa hạ tầng theo mô hình Infrastructure as Code (IaC)**: 
   - Thay thế việc chạy các lệnh Docker CLI thủ công, rời rạc ở EX4 bằng tệp khai báo duy nhất `docker-compose.yml` tuân thủ Compose Specification v2.
   - Quản lý đồng thời vòng đời của 2 services: `backend` (Web API) và `database` (PostgreSQL 15).
2. **Bảo mật và quản trị biến môi trường**:
   - Tách biệt hoàn toàn các thông tin nhạy cảm (Credentials, Database Name, User, Password, Port) ra tệp `.env`.
   - Cung cấp tệp `.env.example` làm tài liệu hướng dẫn triển khai cho thành viên trong nhóm phát triển.
   - Cấu hình `.gitignore` nhằm ngăn chặn tuyệt đối việc đẩy tệp chứa mật khẩu `.env` lên kho mã nguồn công khai (Git repository).
3. **Sử dụng bộ công cụ Docker Compose CLI v2 (`docker compose`)**:
   - Thực thi điều phối toàn bộ cụm dịch vụ qua cú pháp hiện đại `docker compose up -d`, `docker compose ps`, `docker compose logs -f`, `docker compose down`.

---

## 2. Cấu trúc thư mục dự án

```text
session_10/ex5/
├── .dockerignore        # Bỏ qua node_modules, .env khi build Docker image
├── .env                 # Tệp chứa biến môi trường thực tế (ĐÃ BỊ CHẶN BỞI .gitignore)
├── .env.example         # Tệp mẫu cấu hình không chứa thông tin mật để nộp lên Git
├── .gitignore           # Khai báo loại trừ .env và các tệp rác
├── Dockerfile           # Multi-stage Dockerfile dùng để build service backend
├── docker-compose.yml   # Khai báo hạ tầng dịch vụ, volumes và networks
├── package.json         # Khai báo dependencies (express, pg)
├── README.md            # Báo cáo thực hành chi tiết và kết quả kiểm thử
└── server.js            # REST API kết nối kiểm tra dữ liệu tới service database
```

---

## 3. Chi tiết các tệp cấu hình

### 3.1. Tệp mẫu cấu hình môi trường `.env.example`
Tệp này được commit lên Git nhằm cung cấp khung cấu hình chuẩn:

```env
# ==============================================================================
# ENVIRONMENT TEMPLATE (.env.example)
# Sao chép tệp này thành .env và điền các thông tin bảo mật thực tế:
# cp .env.example .env
# ==============================================================================

# Cấu hình Cơ sở dữ liệu PostgreSQL
DB_NAME=taskdb
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
DB_PORT=5432

# Cấu hình Cổng dịch vụ Web Backend
PORT=8080
```

---

### 3.2. Tệp biến môi trường thực tế `.env` (Chạy local)
```env
DB_NAME=taskdb
DB_USER=postgres
DB_PASSWORD=postgrespassword
DB_PORT=5432
PORT=8080
```

---

### 3.3. Tệp `.gitignore`
Đảm bảo tệp chứa mật khẩu `.env` không bao giờ bị lộ:

```gitignore
# Bỏ qua tệp cấu hình bảo mật chứa mật khẩu
.env

# Bỏ qua dependencies của Node.js
node_modules/
npm-debug.log*

# Bỏ qua tệp hệ thống
.DS_Store
Thumbs.db
```

---

### 3.4. Tệp điều phối hạ tầng `docker-compose.yml`

```yaml
services:
  database:
    image: postgres:15-alpine
    container_name: compose-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend-net

  backend:
    build: .
    container_name: compose-backend
    restart: unless-stopped
    ports:
      - "${PORT}:8080"
    environment:
      PORT: 8080
      DB_HOST: database
      DB_PORT: ${DB_PORT:-5432}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
    depends_on:
      - database
    networks:
      - backend-net

volumes:
  pgdata:

networks:
  backend-net:
```

---

## 4. Các lệnh thực hiện và kết quả đầu ra (Terminal Output)

Thao tác toàn bộ bằng Docker Compose CLI v2 (`docker compose` không dùng gạch nối).

### 4.1. Lệnh 1: `docker compose up -d`
Khởi động toàn bộ hạ tầng gồm mạng, volume và 2 dịch vụ ở chế độ detached mode:

```bash
docker compose up -d
```

**Kết quả đầu ra:**
```text
[+] Running 4/4
 ✔ Network ex5_backend-net   Created                                                    0.1s 
 ✔ Volume "ex5_pgdata"       Created                                                    0.0s 
 ✔ Container compose-db      Started                                                    0.8s 
 ✔ Container compose-backend Started                                                    1.2s 
```

*Nhận xét*: Docker Compose tự động phân tích đồ thị phụ thuộc (dependency graph):
1. Tạo mạng `backend-net` và volume `pgdata`.
2. Khởi tạo container `compose-db` trước theo chỉ thị `depends_on`.
3. Khởi tạo container `compose-backend` sau và gắn vào cùng network.

---

### 4.2. Lệnh 2: `docker compose ps`
Kiểm tra danh sách và trạng thái hoạt động của các dịch vụ trong stack:

```bash
docker compose ps
```

**Kết quả đầu ra:**
```text
NAME              IMAGE                COMMAND                  SERVICE    CREATED          STATUS          PORTS
compose-backend   ex5-backend          "node server.js"         backend    12 seconds ago   Up 11 seconds   0.0.0.0:8080->8080/tcp
compose-db        postgres:15-alpine   "docker-entrypoint.s…"   database   12 seconds ago   Up 11 seconds   5432/tcp
```

*Nhận xét*: 
- Cả 2 service đều đạt trạng thái **`Up`** (Running ổn định).
- Cổng `8080` của service backend được ánh xạ ra cổng `8080` của máy Host thành công thông qua biến `${PORT}` từ file `.env`.
- Cổng `5432` của database chỉ mở nội bộ trong mạng `backend-net`, không lộ ra ngoài Internet.

---

### 4.3. Lệnh 3: `docker compose logs -f`
Xem nhật ký hợp nhất (aggregated logs) theo thời gian thực của toàn bộ cụm dịch vụ:

```bash
docker compose logs
```

**Kết quả đầu ra:**
```text
compose-db       | 2026-10-13 15:20:10.123 UTC [1] LOG:  starting PostgreSQL 15.8 on x86_64-pc-linux-musl...
compose-db       | 2026-10-13 15:20:10.150 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432
compose-db       | 2026-10-13 15:20:10.150 UTC [1] LOG:  listening on IPv6 address "::", port 5432
compose-db       | 2026-10-13 15:20:10.155 UTC [1] LOG:  listening on Unix socket "/var/run/postgresql/.s.PGSQL.5432"
compose-db       | 2026-10-13 15:20:10.190 UTC [1] LOG:  database system is ready to accept connections
compose-backend  | Compose Backend server running on port 8080
compose-backend  | Connecting to DB at database:5432
```

*Nhận xét*: Backend đã tìm thấy `database` thông qua Docker DNS nội bộ và kết nối cơ sở dữ liệu thành công.

---

### 4.4. Kiểm tra phản hồi API: `curl -i http://localhost:8080/`
```bash
curl -i http://localhost:8080/
```

**Kết quả đầu ra:**
```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 184
Date: Tue, 13 Oct 2026 15:20:25 GMT
Connection: keep-alive

{
  "status": "success",
  "service": "Backend Orchestrated by Docker Compose",
  "database_connected": true,
  "database_info": {
    "current_time": "2026-10-13T15:20:25.819Z",
    "db_name": "taskdb"
  },
  "message": "Hello from Multi-service Compose Architecture!"
}
```

*Nhận xét*: API phản hồi HTTP `200 OK`, kết nối cơ sở dữ liệu PostgreSQL thành công, trả về đúng tên database `taskdb` được nạp từ biến `${DB_NAME}` trong tệp `.env`.

---

### 4.5. Lệnh 4: `docker compose down`
Dừng và dọn dẹp các container, mạng nội bộ một cách an toàn:

```bash
docker compose down
```

**Kết quả đầu ra:**
```text
[+] Running 3/3
 ✔ Container compose-backend Removed                                                    0.4s 
 ✔ Container compose-db      Removed                                                    0.6s 
 ✔ Network ex5_backend-net   Removed                                                    0.1s 
```

*Nhận xét*: Lệnh `docker compose down` tự động gửi tín hiệu dừng, hủy các container và xóa bridge network tạm thời, nhưng **vẫn giữ nguyên Named Volume `ex5_pgdata`** để bảo vệ dữ liệu nghiệp vụ không bị mất mát.

---

## 5. Phân tích kỹ thuật chuyên sâu

### 5.1. Docker Compose CLI v1 (`docker-compose`) vs v2 (`docker compose`)
- **Docker Compose v1** (Legacy): Là một công cụ viết bằng Python độc lập (`docker-compose`), yêu cầu cài đặt riêng, tốc độ chậm hơn và hiện tại đã bị Docker chính thức khai tử (End of Life).
- **Docker Compose v2** (Modern): Được viết lại hoàn toàn bằng ngôn ngữ Go và tích hợp trực tiếp thành một CLI plugin của Docker Engine (`docker compose`). Tối ưu hiệu năng, hỗ trợ Compose Specification mới nhất (không bắt buộc khai báo `version:` ở đầu tệp) và tương thích hoàn toàn với Docker Buildx.

### 5.2. Vai trò của `depends_on`
- Thuộc tính `depends_on: - database` thông báo cho Docker Compose thứ tự khởi chạy (start order): khởi chạy `database` trước `backend`.
- **Lưu ý thực tế**: `depends_on` mặc định chỉ đợi container `database` chuyển sang trạng thái "Running" chứ không đảm bảo PostgreSQL bên trong đã sẵn sàng chấp nhận kết nối mạng (Ready to accept connections). Do đó, trong ứng dụng Backend, việc thiết lập Connection Pool có cơ chế retry hoặc cấu hình `condition: service_healthy` kết hợp `healthcheck` là best practice cho môi trường Production.

### 5.3. Nguyên tắc bảo mật với tệp `.env`
- Tuyệt đối **không commit** tệp `.env` chứa mật khẩu thực tế lên Git repo.
- Luôn tạo và duy trì tệp **`.env.example`** chứa danh sách các key mẫu và giá trị placeholder/mặc định để đồng đội có thể sao chép (`cp .env.example .env`) và tự cấu hình cho môi trường cục bộ của mình.

---

## 6. Tổng kết

- Hoàn thành đóng gói toàn bộ hệ thống đa dịch vụ thành tệp khai báo `docker-compose.yml` chuẩn IaC.
- Tách biệt và bảo mật thành công toàn bộ thông tin cấu hình nhạy cảm qua `.env`, `.env.example` và `.gitignore`.
- Thực thi thành công toàn bộ chu trình sống của cụm ứng dụng bằng Docker Compose v2 (`up`, `ps`, `logs`, `down`).
