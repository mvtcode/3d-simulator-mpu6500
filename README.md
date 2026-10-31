# 🛰️ MPU6500 3D IMU Simulator & Telemetry Visualizer

Hệ thống thu thập dữ liệu thời gian thực từ cảm biến **MPU6500 (6-DoF IMU)** qua giao tiếp phần cứng **USB-I2C CH341T**, truyền phát dữ liệu qua **WebSocket (50Hz)** và hiển thị mô phỏng 3D trực quan trên nền web bằng **Three.js**.

---

## 📌 Mục Lục

1. [Yêu Cầu Phần Cứng & Kết Nối](#1-yêu-cầu-phần-cứng--kết-nối)
2. [Cài Đặt & Khởi Chạy](#2-cài-đặt--khởi-chạy)
3. [Các Chế Độ Mô Hình 3D](#3-các-chế-độ-mô-hình-3d)
4. [Các Tính Năng Nổi Bật](#4-các-tính-năng-nổi-bật)
5. [GIẢI THÍCH CHI TIẾT CÁC ĐOẠN DẤU ÂM & GIÁ TRỊ ÂM](#5-giải-thích-chi-tiết-các-đoạn-dấu-âm--giá-trị-âm)
6. [Cấu Trúc Thư Mục](#6-cấu-trúc-thư-mục)

---

## 1. Yêu Cầu Phần Cứng & Kết Nối

### A. Thiết Bị

- **Module Cảm Biến**: GY-6500 hoặc GY-9250 (Chip InvenSense MPU6500 6-DoF: 3 trục Accelerometer + 3 trục Gyroscope).
- **Module Chuyển Đổi USB-I2C**: CH341T (USB to I2C/UART/EPP).
- **Driver Windows**: WCH CH341PAR Driver (Interface `USB-EPP/I2C... CH341A`, VID: `1A86`, PID: `5512`).
  - Thư viện DLL 64-bit: `C:\Windows\System32\CH341DLLA64.DLL` (sử dụng qua thư viện `koffi`).

### B. Sơ Đồ Đấu Dây

| Chân Module CH341T          | Chân Cảm Biến MPU6500 | Chú Thích Kỹ Thuật                                           |
| :-------------------------- | :-------------------- | :----------------------------------------------------------- |
| **VCC** (Jumper cắm ở 3.3V) | **VCC / VDD**         | **Bắt buộc**: Jumper mạch CH341T phải để ở nấc 3.3V          |
| **GND**                     | **GND**               | Nối mass chung                                               |
| **SCL**                     | **SCL**               | Xung nhịp đồng hồ I2C (100kHz)                               |
| **SDA**                     | **SDA**               | Đường truyền dữ liệu I2C                                     |
| _(Để trống)_                | **AD0**               | Nối GND để giữ địa chỉ `0x68` (mặc định đã có trở kéo xuống) |

---

## 2. Cài Đặt & Khởi Chạy

### Cài Đặt Dependencies

```bash
npm install
```

### Chạy Ứng Dụng Web Visualizer

```bash
npm start
# hoặc: node server.js
```

👉 Mở trình duyệt tại: **http://localhost:3000**

### Chạy Chế Độ Đọc Dòng Lệnh (Console CLI)

```bash
npm run cli
# hoặc: node mpu6500_reader.js
```

---

## 3. Các Chế Độ Mô Hình 3D

1. **🔲 Khung Hình Khối (3D Bounding Box)**:
   - Hiển thị khung hộp và 3 vector trục tọa độ không gian:
     - **Trục X (Đỏ)**: Bên trái.
     - **Trục Y (Xanh lá)**: Hướng vào trong màn hình.
     - **Trục Z (Xanh dương)**: Hướng lên trên.
2. **✈️ Tiêm Kích F-15 (F-15C Eagle)**:
   - Mô hình máy bay chiến đấu chiêm ngưỡng từ phía sau.
   - Hệ thống luồng lửa phản lực **Afterburner Shader** tùy chỉnh độ sáng và độ dài.
   - Nút **Tăng Lực (Boost)** và chế độ **Buồng Lái Ảo (Cockpit HUD)** với thước đo góc Pitch gật gù, thước đo độ cao, tốc độ Mach.
3. **🤖 Người 3D (Soldier Animated)**:
   - Nhân vật 3D với hệ thống xương chuyển động (Skinning & Skeletal Animation): _Idle (Đứng)_, _Walk (Đi bộ)_, _Run (Chạy)_.
   - **Tự Động Theo IMU (Auto IMU)**: Nghiêng cảm biến về trước để chạy, ngửa ra sau để dừng lại.
   - Mặt sàn **Cyber Grid Treadmill** và hệ thống vệt tốc độ **Floor Speed Streaks** trôi lùi theo hướng người tiến.
   - Bảng thông số vận động: Tốc độ (km/h), Quãng đường (m), Số bước chân, Tần số bước (SPM).
4. **📟 Bo Mạch PCB MPU6500**:
   - Tái hiện mô hình 3D tỉ lệ chuẩn 100% của module GY-6500 thực tế: Bản mạch PCB xanh dương, IC MPU6500 QFN màu đen có chấm Pin 1, tụ Tantalum màu vàng cam, 2 lỗ ốc vít kim loại và 8 chân cắm Header Pins màu vàng.

---

## 4. Các Tính Năng Nổi Bật

- **Tần số truyền phát 50Hz tức thời (Zero Latency)**: WebSocket phát dữ liệu trực tiếp ngay sau mỗi chu kỳ đọc I2C của phần cứng.
- **Khử trôi tĩnh trục Z (Zero Velocity Update - ZUPT)**: Khóa góc Yaw đứng yên 100% khi cảm biến đặt trên bàn hoặc cầm giữ nguyên, loại bỏ hiện tượng trôi góc tự nhiên của Gyroscope 6-DoF.
- **Tự động cân chỉnh trôi nhiệt**: Cập nhật vi sai Bias tĩnh liên tục khi cảm biến ở trạng thái tĩnh.
- **Nút Tare (Zero) & Calib Gyro**: Cân bằng góc về 0° và hiệu chuẩn nhanh Gyroscope trong 2 giây chỉ với 1 click chuột.
- **Đồ thị thời gian thực (Strip Chart)**: Hiển thị sóng dao động Roll (Xanh lam), Pitch (Xanh lục), Yaw (Vàng cam).
- **Thanh công cụ hoán đổi trục (Axis Toolbar)**: Đảo chiều X, Y, Z hoặc hoán đổi Swap X/Y trực tiếp từ giao diện mà không cần chỉnh code.

---

## 5. GIẢI THÍCH CHI TIẾT CÁC ĐOẠN DẤU ÂM & GIÁ TRỊ ÂM

Trong dự án này, các **dấu âm (`-`)** và **giá trị âm (`-32768`)** đóng vai trò quyết định đến tính đúng đắn về mặt toán học, vật lý và trải nghiệm thị giác. Dưới đây là giải thích chi tiết từng trường hợp:

### 5.1. Dấu âm khi đọc thanh ghi cảm biến (`-rbuf.readInt16BE(...)`)

Trong file [server.js](file:///d:/projects/mpu6500/server.js):

```javascript
const axRaw = -rbuf.readInt16BE(0);
const ayRaw = -rbuf.readInt16BE(2);
const azRaw = -rbuf.readInt16BE(4);
const gxRaw = -rbuf.readInt16BE(8);
const gyRaw = -rbuf.readInt16BE(10);
const gzRaw = -rbuf.readInt16BE(12);
```

#### Tại sao lại có dấu âm `-` trước `readInt16BE`?

1. **Quy chuẩn hệ tọa độ 3D (Right-Handed Coordinate System)**:
   - Trong Three.js, hệ tọa độ chuẩn quy định:
     - Trục $+X$: Hướng sang phải.
     - Trục $+Y$: Hướng lên trên trời (Up).
     - Trục $+Z$: Hướng ra ngoài màn hình về phía mắt người quan sát.
2. **Quy ước phần cứng của chip MPU6500**:
   - Khi bo mạch cảm biến đặt nằm phẳng trên bàn, mặt chip hướng lên trên:
     - Vector gia tốc trọng trường Trái Đất $\vec{g}$ kéo xuống phía dưới (ngược chiều dương trục Z của cảm biến).
     - Khi ta nghiêng đầu bo mạch chúc xuống phía trước, thành phần gia tốc trục đo tạo ra giá trị âm trên thanh ghi phần cứng.
   - Thêm dấu âm `-` nhằm đảo chiều vector đo, đồng bộ với góc quay mong muốn trong không gian 3D:
     - Nghiêng đầu cảm biến chúc về phía trước $\rightarrow$ Góc **Pitch dương ($> 0$)**.
     - Nghiêng cạnh cảm biến sang bên phải $\rightarrow$ Góc **Roll dương ($> 0$)**.
     - Xoay cảm biến theo chiều kim đồng hồ nhìn từ trên xuống $\rightarrow$ Góc **Yaw dương ($> 0$)**.

---

### 5.2. Sự cố "Trôi góc trục Z" do lệch dấu giữa Calibrate và Sensor Loop

Đây là lỗi phổ biến nhất trên các hệ thống IMU:

#### Trong hàm hiệu chuẩn `calibrateGyro`:

```javascript
sumX += -rbuf.readInt16BE(0) / 131.0;
sumY += -rbuf.readInt16BE(2) / 131.0;
sumZ += -rbuf.readInt16BE(4) / 131.0; // BẮT BUỘC CÙNG CÓ DẤU ÂM VỚI gzRaw
```

#### Trong vòng lặp đọc dữ liệu `startSensorLoop`:

```javascript
const gzRaw = -rbuf.readInt16BE(12);
const gz = gzRaw / 131.0 - gyroBiasZ;
```

#### Tại sao `sumZ` và `gzRaw` BẮT BUỘC phải cùng có dấu âm `-`?

- Giả sử thanh ghi Gyro Z của chip khi nằm yên đọc ra giá trị raw là `+262` (tương đương $+2.0^\circ/\text{s}$).
- **Trường hợp SAI (Nếu `sumZ` không có dấu `-` còn `gzRaw` có dấu `-`)**:
  - `gyroBiasZ` tính ra là $+2.0^\circ/\text{s}$.
  - `gzRaw / 131.0` có dấu âm nên trở thành $-2.0^\circ/\text{s}$.
  - Khi trừ offset:
    $$\text{gz} = (-2.0) - (+2.0) = \mathbf{-4.0^\circ/\text{s}}$$
  - **Hậu quả**: Thay vì triệt tiêu độ trôi về $0.0^\circ/\text{s}$, phép trừ lại **nhân đôi độ lệch trôi**! Mỗi giây góc Yaw quay vù vù $4^\circ$, sau 10 giây trôi mất $40^\circ$ dù cảm biến nằm yên trên bàn.
- **Trường hợp ĐÚNG (Cả hai cùng có dấu `-`)**:
  - `gyroBiasZ` $= -2.0^\circ/\text{s}$.
  - `gzRaw / 131.0` $= -2.0^\circ/\text{s}$.
  - Khi trừ offset:
    $$\text{gz} = (-2.0) - (-2.0) = \mathbf{0.0^\circ/\text{s}}$$
  - Độ lệch tĩnh bị triệt tiêu hoàn toàn, góc Yaw đứng yên tuyệt đối.

---

### 5.3. Giá trị âm kịch trần `-32768` (`0x8000`) trên trục $A_z$

Trên một số lô mạch MPU6500 thực tế (đặc biệt là dòng module GY-6500/9250 phổ thông), thanh ghi gia tốc trục Z thường xuyên bị lỗi tràn bit hoặc bão hòa ở giá trị cực tiểu của số nguyên 16-bit có dấu:
$$\text{Raw Value} = \mathbf{-32768} \quad (\text{Hex: } 0x8000)$$

#### Phân tích lỗi gây mất 50% độ nhạy góc:

1. Khi code đọc:
   ```javascript
   const azRaw = -rbuf.readInt16BE(4); // -(-32768) = +32768
   ```
2. Nếu so sánh `azRaw === -32768` sẽ ra kết quả `false` (vì `+32768 !== -32768`).
3. Dẫn tới phép tính sai:
   $$a_z = \frac{32768}{16384.0} = \mathbf{2.0g}$$
4. Trong công thức tính góc nghiêng:
   $$\text{Roll} = \text{atan2}\left(a_y, \sqrt{a_x^2 + \mathbf{a_z^2}}\right)$$
   Vì $a_z = 2.0g$, mẫu số bị đội lên gấp đôi ($\sqrt{a_x^2 + 4.0} \approx 2.0$ thay vì $\approx 1.0$).
   - Nghiêng thực tế $30^\circ \rightarrow$ UI chỉ đo được $\approx 14^\circ$.
   - Nghiêng thực tế $45^\circ \rightarrow$ UI chỉ đo được $\approx 19^\circ$.
   - Khiến cảm giác trục X và Y bị "lì", mất hơn một nửa độ nhạy.

#### Giải pháp khôi phục bằng định luật bảo toàn gia tốc trọng trường:

Khi phát hiện giá trị âm cực trị $|\text{azRaw}| \ge 32767$ hoặc $|a_z| > 1.5g$, hệ thống tự động dựng lại trục $a_z$ từ tổng vector trọng trường Trái Đất ($a_x^2 + a_y^2 + a_z^2 = 1.0g^2$):

```javascript
let az = azRaw / 16384.0;
if (Math.abs(azRaw) >= 32767 || Math.abs(az) > 1.5 || isNaN(az)) {
  az = Math.sqrt(Math.max(0.01, 1.0 - ax * ax - ay * ay));
}
```

Nhờ đó $a_z$ luôn duy trì giá trị dương chuẩn xác ($0.7 - 1.0g$), đưa góc nghiêng Roll và Pitch về **độ nhạy thực tế 100%**.

---

### 5.4. Dấu âm trong chuyển động nền (Treadmill) & Vệt tốc độ của "Người 3D"

Trong file [public/js/models.js](file:///d:/projects/mpu6500/public/js/models.js) và [public/js/app.js](file:///d:/projects/mpu6500/public/js/app.js):

#### 1. Hướng nhìn nhân vật là chiều âm $-Z$:

- Nhân vật Soldier đứng tại gốc $(0, -2.5, 0)$ hướng mặt nhìn về phía trong màn hình (trục $-Z$).
- Camera đặt ở tọa độ $+Z$ $(0, 1.6, 5.5)$ nhìn từ sau lưng nhân vật về trước.
- Vector chỉ hướng tiến của nhân vật trong không gian 2D mặt sàn $(x, z)$:
  $$\vec{F}_{\text{tiến}} = (-\sin Y, -\cos Y)$$

#### 2. Dấu âm và chiều trôi của mặt sàn & vệt tốc độ:

- Khi người đi tiến về phía trước ($\vec{F}$ hướng về chiều âm), để tạo cảm giác chạy trên thảm chạy (Treadmill) mà camera vẫn bám theo người:
  - **Mặt đất và môi trường phải trôi ngược chiều tiến**, tức là trôi về phía sau lưng (hướng dương $+Z$, trôi về phía camera):
    $$\Delta_{\text{mặt đất}} = -\vec{F}_{\text{tiến}} \cdot v \cdot dt = +\left(\sin Y \cdot v \cdot dt, \cos Y \cdot v \cdot dt\right)$$
    ```javascript
    gridOffsetX = (((gridOffsetX + dx) % step) + step) % step;
    gridOffsetZ = (((gridOffsetZ + dz) % step) + step) % step;
    ```
    _(Nếu mang dấu trừ $-dz$, mặt đất sẽ chạy cùng chiều với người, tạo cảm giác người bị trượt lùi/moonwalk)._

#### 3. Dấu âm trong tọa độ vệt tốc độ (Speed Streaks):

- Các vệt tốc độ trôi lùi về sau chân:
  ```javascript
  s.x += sinY * speed * s.speedMult * dt;
  s.z += cosY * speed * s.speedMult * dt;
  ```
- **Đuôi vệt kéo dài ngược lại hướng trôi (chiều âm)**:
  Vì đầu vệt đang trôi về sau ($+\sin Y, +\cos Y$), nên đuôi vệt phải kéo dài ngược lại về phía trước theo chiều âm $(-\sin Y, -\cos Y)$ để tạo thành tia sáng tốc độ:
  ```javascript
  streakPositions[ptr++] = s.x - sinY * stretch;
  streakPositions[ptr++] = s.y;
  streakPositions[ptr++] = s.z - cosY * stretch;
  ```
- **Hồi sinh ở đằng xa phía trước mặt (chiều âm)**:
  Khi vệt trôi ra sau lưng ($\text{rearDist} = s_x \sin Y + s_z \cos Y > 8.0$), nó hồi sinh ở phía xa đằng trước mặt nhân vật theo vector âm:
  ```javascript
  s.x = -sinY * frontOffset + cosY * lateralOffset;
  s.z = -cosY * frontOffset - sinY * lateralOffset;
  ```

---

### 5.5. Dấu âm trong góc ngả người và ngưỡng kích hoạt Auto IMU

Trong [public/js/app.js](file:///d:/projects/mpu6500/public/js/app.js):

#### 1. Góc ngả người:

```javascript
const leanPitch = THREE.MathUtils.clamp(
  -soldierPitch * DEG2RAD * 0.75,
  -0.6,
  0.6,
);
humanGroup.rotation.x = leanPitch;
```

- **Tại sao có dấu âm `-soldierPitch`?**
  Trong Three.js, khi xoay một đối tượng quanh trục X với một góc âm ($< 0$), phần đầu/thân trên của đối tượng sẽ chúc về hướng $-Z$ (hướng nhìn đằng trước).
  Do đó, khi người dùng nghiêng mạch về trước (`soldierPitch > 0`), nhân vật 3D sẽ chúi người về phía trước để tăng tốc chạy tự nhiên theo quán tính.

#### 2. Ngưỡng chuyển động Auto IMU:

- **`soldierPitch > +7.0°` (Góc dương)**: Đầu cảm biến chúc xuống phía trước $\rightarrow$ Kích hoạt dáng chạy nhanh (**RUN**, tốc độ $13\text{ km/h}$, nhịp 168 SPM).
- **`soldierPitch < -5.0°` (Góc âm)**: Ngửa đầu cảm biến ra sau $\rightarrow$ Phanh gấp và đứng yên (**IDLE**, tốc độ $0\text{ km/h}$).
- **Trong khoảng $[-5.0^\circ, +7.0^\circ]$**: Giữ tư thế cân bằng $\rightarrow$ Đi bộ đều đặn (**WALK**, tốc độ $4.9\text{ km/h}$, nhịp 112 SPM).

---

## 6. Cấu Trúc Thư Mục

```text
mpu6500/
├── doc.md                  # Tài liệu kỹ thuật phần cứng & ghi chú kết nối
├── README.md               # Hướng dẫn chi tiết toàn bộ dự án & giải thích thuật toán
├── package.json            # Cấu hình dự án Node.js & dependencies (koffi, ws)
├── server.js               # Backend: Đọc I2C qua DLL CH341, thuật toán ZUPT, WebSocket 50Hz
├── mpu6500_reader.js       # Script dòng lệnh (CLI) đọc nhanh dữ liệu cảm biến
└── public/                 # Giao diện Web Client (HTML5 / Three.js)
    ├── index.html          # Giao diện điều khiển, HUD buồng lái, bảng thẻ Telemetry
    ├── css/
    │   ├── style.css       # Giao diện Cyber Dark hiện đại
    │   └── hud.css         # Đồ họa HUD chiến đấu F-15 (Pitch Ladder, Compass Tape, Roll Gimbal)
    ├── js/
    │   ├── config.js       # Quản lý cấu hình trục (Swap X/Y, Invert Roll/Pitch/Yaw) lưu LocalStorage
    │   ├── scene.js        # Khởi tạo Three.js Scene, Camera, Ánh sáng, Cyber Grid
    │   ├── models.js       # Tạo 4 mô hình 3D (Khung khối, F-15 + Flame, Soldier + Streaks, PCB)
    │   ├── telemetry.js    # Nhận WebSocket, tính góc nghiêng chuẩn, vẽ biểu đồ Strip Chart
    │   ├── hud.js          # Tính toán tọa độ và cập nhật HUD quân sự F-15
    │   └── app.js          # Vòng lặp Render 60 FPS, nội suy chuyển động (Lerp), Auto IMU
    └── models/
        ├── f-15.glb        # Mô hình 3D máy bay F-15 Eagle
        └── Soldier.glb     # Mô hình 3D người lính với hoạt cảnh Idle, Walk, Run
```

## 👨‍💻 Tác Giả & Bản Quyền

- **Tác giả:** **[Mạc Tân](https://www.facebook.com/mvt.hp.star/)**
- **Hotline / Zalo:** [0964 335 688](tel:0964335688)
- **Mã nguồn:** Mã nguồn mở phục vụ nghiên cứu, học tập và ứng dụng thực tế trên các dòng vi điều khiển ESP32 / ESP8266 / Arduino.

Dự án được phát triển phục vụ mục đích học tập, nghiên cứu hệ thống nhúng (Embedded IoT), mô phỏng vật lý 3D và giao tiếp phần cứng thời gian thực.

⭐ _Nếu thấy kho dự án hữu ích, hãy tặng 1 Star trên GitHub để ủng hộ tác giả nhé!_
