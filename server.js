const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const koffi = require('koffi');

// === 1. KẾT NỐI CH341T I2C DLL ===
const DLL_PATH = 'C:\\Windows\\System32\\CH341DLLA64.DLL';
let lib, CH341OpenDevice, CH341CloseDevice, CH341SetStream, CH341ReadI2C, CH341WriteI2C, CH341StreamI2C;

try {
  lib = koffi.load(DLL_PATH);
  CH341OpenDevice = lib.func('int __stdcall CH341OpenDevice(uint32_t iIndex)');
  CH341CloseDevice = lib.func('void __stdcall CH341CloseDevice(uint32_t iIndex)');
  CH341SetStream = lib.func('bool __stdcall CH341SetStream(uint32_t iIndex, uint32_t iMode)');
  CH341ReadI2C = lib.func('bool __stdcall CH341ReadI2C(uint32_t iIndex, uint8_t iDevice, uint8_t iAddr, _Out_ uint8_t *oByte)');
  CH341WriteI2C = lib.func('bool __stdcall CH341WriteI2C(uint32_t iIndex, uint8_t iDevice, uint8_t iAddr, uint8_t iByte)');
  CH341StreamI2C = lib.func('bool __stdcall CH341StreamI2C(uint32_t iIndex, uint32_t iWriteLength, const uint8_t *iWriteBuffer, uint32_t iReadLength, _Out_ uint8_t *oReadBuffer)');
} catch (err) {
  console.error('[ERROR] Khong the nap DLL CH341:', err.message);
  process.exit(1);
}

const DEVICE_INDEX = 0;
const MPU6500_ADDR = 0x68;
let ch341Open = false;

// === 2. BIẾN TRẠNG THÁI & BỘ LỌC CẢM BIẾN (SENSOR FUSION) ===
let roll = 0, pitch = 0, yaw = 0;
let tareRoll = 0, tarePitch = 0, tareYaw = 0;
let gyroBiasX = 0, gyroBiasY = 0, gyroBiasZ = 0;
let isCalibrating = false;
let lastTime = Date.now();

// Dữ liệu đo tức thời
let currentTelemetry = {
  roll: 0, pitch: 0, yaw: 0,
  ax: 0, ay: 0, az: 0,
  gx: 0, gy: 0, gz: 0,
  temp: 0,
  connected: false,
  timestamp: Date.now()
};

function openMPU() {
  const handle = CH341OpenDevice(DEVICE_INDEX);
  if (handle === -1 || handle === 0) {
    console.error('[WARN] Chua tim thay module CH341. Dang thu ket noi lai...');
    ch341Open = false;
    currentTelemetry.connected = false;
    return false;
  }

  CH341SetStream(DEVICE_INDEX, 1); // 100kHz
  CH341WriteI2C(DEVICE_INDEX, MPU6500_ADDR, 0x6B, 0x01); // Auto PLL clock
  CH341WriteI2C(DEVICE_INDEX, MPU6500_ADDR, 0x6C, 0x00); // Enable all axes
  CH341WriteI2C(DEVICE_INDEX, MPU6500_ADDR, 0x1A, 0x03); // DLPF 44Hz low pass filter
  CH341WriteI2C(DEVICE_INDEX, MPU6500_ADDR, 0x1C, 0x00); // ±2g (16384 LSB/g)
  CH341WriteI2C(DEVICE_INDEX, MPU6500_ADDR, 0x1B, 0x00); // ±250 dps (131 LSB/dps)

  ch341Open = true;
  currentTelemetry.connected = true;
  console.log('[OK] CH341T + MPU6500 da san sang!');
  return true;
}

// Hiệu chuẩn trôi tĩnh Gyro (Bias Calibration)
function calibrateGyro(samples = 80) {
  if (!ch341Open) return;
  isCalibrating = true;
  console.log(`[INFO] Dang hieu chuan Gyro (${samples} mau, vui long giu yen cam bien)...`);

  let sumX = 0, sumY = 0, sumZ = 0, count = 0;
  const wbuf = Buffer.from([(MPU6500_ADDR << 1), 0x43]);
  const rbuf = Buffer.alloc(6);

  const calInterval = setInterval(() => {
    if (CH341StreamI2C(DEVICE_INDEX, 2, wbuf, 6, rbuf)) {
      sumX += -rbuf.readInt16BE(0) / 131.0;
      sumY += -rbuf.readInt16BE(2) / 131.0;
      sumZ += -rbuf.readInt16BE(4) / 131.0;
      count++;
    }

    if (count >= samples) {
      clearInterval(calInterval);
      gyroBiasX = sumX / count;
      gyroBiasY = sumY / count;
      gyroBiasZ = sumZ / count;
      isCalibrating = false;
      tare();
      console.log(`[OK] Hieu chuan xong! Offset: X=${gyroBiasX.toFixed(2)}, Y=${gyroBiasY.toFixed(2)}, Z=${gyroBiasZ.toFixed(2)} dps`);
    }
  }, 20);
}

function tare() {
  tareRoll = roll;
  tarePitch = pitch;
  tareYaw = yaw;
  console.log('[OK] Da tare (dat goc 0 hien tai)');
}

// Vòng lặp lấy mẫu cảm biến 50Hz (mỗi 20ms)
function startSensorLoop() {
  openMPU();
  calibrateGyro(80);

  const wbuf = Buffer.from([(MPU6500_ADDR << 1), 0x3B]);
  const rbuf = Buffer.alloc(14);

  setInterval(() => {
    if (!ch341Open) {
      openMPU();
      return;
    }
    if (isCalibrating) return;

    const now = Date.now();
    const dt = Math.max(0.005, Math.min(0.1, (now - lastTime) / 1000.0));
    lastTime = now;

    if (CH341StreamI2C(DEVICE_INDEX, 2, wbuf, 14, rbuf)) {
      const axRaw = -rbuf.readInt16BE(0);
      const ayRaw = -rbuf.readInt16BE(2);
      const azRaw = -rbuf.readInt16BE(4);
      const tempRaw = rbuf.readInt16BE(6);
      const gxRaw = -rbuf.readInt16BE(8);
      const gyRaw = -rbuf.readInt16BE(10);
      const gzRaw = -rbuf.readInt16BE(12);

      // Đơn vị vật lý
      const ax = axRaw / 16384.0;
      const ay = ayRaw / 16384.0;
            let az = azRaw / 16384.0;
      if (Math.abs(azRaw) >= 32767 || Math.abs(az) > 1.5 || isNaN(az)) {
        az = Math.sqrt(Math.max(0.01, 1.0 - ax * ax - ay * ay));
      }
      const temp = (tempRaw / 333.87) + 21.0;

      // Trừ offset tĩnh
      const gx = (gxRaw / 131.0) - gyroBiasX;
      const gy = (gyRaw / 131.0) - gyroBiasY;
      const gz = (gzRaw / 131.0) - gyroBiasZ;

      // Góc tính từ gia tốc kế (Đảo dấu để nghiêng theo chiều dương mũi tên thì giá trị ra dương)
      const accelRoll  = Math.atan2(ay, Math.sqrt(ax * ax + az * az)) * (180.0 / Math.PI);
      const accelPitch = Math.atan2(ax, Math.sqrt(ay * ay + az * az)) * (180.0 / Math.PI);

      // Bộ lọc bù (Complementary Filter) kết hợp Gyro + Accel
      const alpha = 0.95;
      roll  = alpha * (roll - gx * dt) + (1.0 - alpha) * accelRoll;
      pitch = alpha * (pitch + gy * dt) + (1.0 - alpha) * accelPitch;
            // --- KHỬ TRÔI TĨNH TRỤC Z (YAW DRIFT ELIMINATION) ---
      const gyroNorm = Math.sqrt(gx * gx + gy * gy + gz * gz);
      const accelNorm = Math.sqrt(ax * ax + ay * ay + az * az);
      const isStationary = gyroNorm < 0.40 && Math.abs(accelNorm - 1.0) < 0.15;

      let gzActive = gz;
      if (isStationary) {
        // Đang giữ nguyên cảm biến -> Khóa góc Yaw hoàn toàn, không cho trôi
        gzActive = 0.0;
        // Tự động hấp thụ và triệt tiêu trôi nhiệt Gyro Z theo thời gian
        gyroBiasZ += (gzRaw / 131.0 - gyroBiasZ) * 0.005;
      } else if (Math.abs(gz) < 0.25) {
        // Vùng chết (Deadband) loại bỏ nhiễu trắng nhỏ
        gzActive = 0.0;
      }

      yaw   = yaw + gzActive * dt; // Tích phân Gyro Z đã khử trôi hoàn toàn

      currentTelemetry = {
        roll: Number((roll - tareRoll).toFixed(2)),
        pitch: Number((pitch - tarePitch).toFixed(2)),
        yaw: Number((yaw - tareYaw).toFixed(2)),
        ax: Number(ax.toFixed(4)),
        ay: Number(ay.toFixed(4)),
        az: Number(az.toFixed(4)),
        gx: Number(gx.toFixed(1)),
        gy: Number(gy.toFixed(1)),
        gz: Number(gz.toFixed(1)),
        temp: Number(temp.toFixed(1)),
        connected: true,
        timestamp: now
      };
      broadcastTelemetry();
    } else {
      currentTelemetry.connected = false;
    }
  }, 20); // 50 Hz
}

// === 3. HTTP SERVER & WEBSOCKET SERVER ===
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  let reqPath = req.url === '/' ? '/index.html' : req.url;
  let filePath = path.join(PUBLIC_DIR, reqPath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      let ext = path.extname(filePath).toLowerCase();
      let contentType = 'text/html';
      if (ext === '.js') contentType = 'text/javascript';
      else if (ext === '.css') contentType = 'text/css';
      else if (ext === '.json') contentType = 'application/json';
      else if (ext === '.glb') contentType = 'model/gltf-binary';
      else if (ext === '.gltf') contentType = 'model/gltf+json';
      else if (ext === '.bin') contentType = 'application/octet-stream';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      else if (ext === '.mp3') contentType = 'audio/mpeg';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[CLIENT] Trinh duyet da ket noi vao WebSocket!');

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.action === 'tare') tare();
      if (data.action === 'calibrate') calibrateGyro(60);
    } catch (e) {}
  });

  ws.send(JSON.stringify({ type: 'init', status: 'connected' }));
});

function broadcastTelemetry() {
  if (wss && wss.clients.size > 0) {
    const payload = JSON.stringify(currentTelemetry);
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(payload);
      }
    }
  }
}

server.listen(PORT, () => {
  console.log(`\n==========================================================`);
  console.log(`🚀 MPU6500 3D VISUALIZER SERVER DANG CHAY:`);
  console.log(`🌐 Truy cap tren trinh duyet: http://localhost:${PORT}`);
  console.log(`==========================================================\n`);
  startSensorLoop();
});

// Thu hồi tài nguyên khi dừng server
process.on('SIGINT', () => {
  console.log('\n[INFO] Dang dong ket noi...');
  if (ch341Open) CH341CloseDevice(DEVICE_INDEX);
  process.exit(0);
});
