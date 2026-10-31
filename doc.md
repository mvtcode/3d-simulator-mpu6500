# Giao Tiếp MPU6500 Bằng Máy Tính (Qua Module USB-I2C CH341T)

## 1. Trạng Thái Cài Đặt Driver

- **Driver**: WCH CH341PAR (Parallel / I2C Driver).
- **Vị trí trong Device Manager**: Nằm trong mục **Interface** với tên `USB-EPP/I2C... CH341A` (VID: `1A86`, PID: `5512`).
- _(Lưu ý: Thiết bị `I2C HID Device` trong Device Manager là touchpad/sensor của laptop, không phải CH341)._
- **Thư viện hệ thống**: Đã có sẵn `C:\Windows\System32\CH341DLLA64.DLL` (64-bit).

---

## 2. Sơ Đồ Đấu Dây Giữa CH341T và MPU6500

| Chân Module CH341T         | Chân Cảm Biến MPU6500 | Ghi Chú                                                                               |
| :------------------------- | :-------------------- | :------------------------------------------------------------------------------------ |
| **VCC** (Jumper chọn 3.3V) | **VCC / VDD**         | **Cực kỳ quan trọng**: Đảm bảo jumper xanh ở nấc 3.3V                                 |
| **GND**                    | **GND**               | Nối đất chung                                                                         |
| **SCL**                    | **SCL**               | Xung nhịp I2C (I2C Clock)                                                             |
| **SDA**                    | **SDA**               | Dữ liệu I2C (I2C Data)                                                                |
| _(Không dùng)_             | **AD0**               | Nối xuống GND để giữ địa chỉ `0x68` (hoặc để trống nếu mạch có sẵn trở kéo xuống GND) |

---

## 3. Ứng Dụng Mô Phỏng 3D Trực Quan (Web 3D Visualizer)

Ứng dụng web hiển thị mô hình bo mạch 3D chuyển động theo thời gian thực (Three.js + WebSocket 50Hz):

```bash
cd d:\projects\esp32-project\mpu6500
npm start
# hoặc: node server.js
```

👉 Mở trình duyệt tại: **http://localhost:3000**

**Các tính năng nổi bật:**

- Mô hình 3D PCB MPU6500 xoay mượt mà theo góc Roll, Pitch, Yaw từ cảm biến thực tế.
- Bộ lọc bù (Complementary Filter) kết hợp gia tốc kế (Accelerometer) và con quay hồi chuyển (Gyroscope).
- Đồ thị sóng dao động góc (Real-time Strip Waveform).
- Nút **Zero / Tare**: Cân bằng góc về 0° theo hướng cầm tay hiện tại.
- Nút **Calibrate Gyro**: Tự động đo và khử trôi tĩnh của Gyro.

---

## 4. Chế Độ Đọc Dòng Lệnh (Console CLI)

### Chạy bằng Node.js:

```bash
npm run cli
# hoặc: node mpu6500_reader.js
```
