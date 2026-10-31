const koffi = require('koffi');
const path = require('path');

// Nạp DLL CH341 64-bit từ System32
const dllPath = 'C:\\Windows\\System32\\CH341DLLA64.DLL';
const lib = koffi.load(dllPath);

// Định nghĩa các hàm CH341 DLL API
const CH341OpenDevice = lib.func('int __stdcall CH341OpenDevice(uint32_t iIndex)');
const CH341CloseDevice = lib.func('void __stdcall CH341CloseDevice(uint32_t iIndex)');
const CH341SetStream = lib.func('bool __stdcall CH341SetStream(uint32_t iIndex, uint32_t iMode)');
const CH341ReadI2C = lib.func('bool __stdcall CH341ReadI2C(uint32_t iIndex, uint8_t iDevice, uint8_t iAddr, _Out_ uint8_t *oByte)');
const CH341WriteI2C = lib.func('bool __stdcall CH341WriteI2C(uint32_t iIndex, uint8_t iDevice, uint8_t iAddr, uint8_t iByte)');
const CH341StreamI2C = lib.func('bool __stdcall CH341StreamI2C(uint32_t iIndex, uint32_t iWriteLength, const uint8_t *iWriteBuffer, uint32_t iReadLength, _Out_ uint8_t *oReadBuffer)');

const DEVICE_INDEX = 0;
const MPU6500_ADDR = 0x68; // Địa chỉ mặc định (AD0 nối GND)

// Các thanh ghi quan trọng của MPU6500
// const REG_SMPLRT_DIV = 0x19;
// const REG_CONFIG = 0x1A;
// const REG_GYRO_CONFIG = 0x1B;
// const REG_ACCEL_CONFIG = 0x1C;
const REG_ACCEL_XOUT_H = 0x3B;
// const REG_TEMP_OUT_H = 0x41;
// const REG_GYRO_XOUT_H = 0x43;
const REG_PWR_MGMT_1 = 0x6B;
const REG_WHO_AM_I = 0x75;

function initMPU6500() {
  console.log('--- KHOI TAO MPU6500 QUA CH341 (I2C) ---');
  
  const handle = CH341OpenDevice(DEVICE_INDEX);
  if (handle === -1 || handle === 0) {
    console.error('[ERROR] Khong the mo module CH341! Hay kiem tra cap USB va jumper I2C.');
    process.exit(1);
  }
  console.log('[OK] Da ket noi module CH341T (Handle:', handle, ')');

  // Cấu hình tốc độ I2C: 1 = 100kHz, 2 = 400kHz
  CH341SetStream(DEVICE_INDEX, 1);

  // Đọc thanh ghi WHO_AM_I
  const who = [0];
  const ok = CH341ReadI2C(DEVICE_INDEX, MPU6500_ADDR, REG_WHO_AM_I, who);
  if (!ok) {
    console.error('[ERROR] Loi giao tiep I2C voi MPU6500 tai dia chi 0x' + MPU6500_ADDR.toString(16));
    CH341CloseDevice(DEVICE_INDEX);
    process.exit(1);
  }

  console.log(`[INFO] WHO_AM_I = 0x${who[0].toString(16).toUpperCase()} ${who[0] === 0x70 ? '(Chinh xac MPU6500)' : ''}`);

  // Đánh thức MPU6500 (mặc định khởi động ở trạng thái Sleep)
  CH341WriteI2C(DEVICE_INDEX, MPU6500_ADDR, REG_PWR_MGMT_1, 0x00);
  console.log('[OK] Da danh thuc MPU6500 (PWR_MGMT_1 = 0x00)');

  // Bắt đầu vòng lặp đọc dữ liệu
  console.log('\n[RUNNING] Dang doc du lieu cam bien (Nhan Ctrl + C de dung)...\n');
  
  const timer = setInterval(() => {
    // Đọc burst 14 bytes liên tục bắt đầu từ 0x3B (Accel X, Y, Z + Temp + Gyro X, Y, Z)
    const wbuf = Buffer.from([(MPU6500_ADDR << 1), REG_ACCEL_XOUT_H]);
    const rbuf = Buffer.alloc(14);

    if (CH341StreamI2C(DEVICE_INDEX, 2, wbuf, 14, rbuf)) {
      // Gia tốc kế (±2g -> 16384 LSB/g)
      const ax = (-rbuf.readInt16BE(0) / 16384).toFixed(2);
      const ay = (-rbuf.readInt16BE(2) / 16384).toFixed(2);
      const az = (rbuf.readInt16BE(4) / 16384).toFixed(2);

      // Nhiệt độ
      const rawTemp = rbuf.readInt16BE(6);
      const temp = ((rawTemp / 333.87) + 21.0).toFixed(1);

      // Con quay hồi chuyển (±250°/s -> 131 LSB/(°/s))
      const gx = (-rbuf.readInt16BE(8) / 131).toFixed(2);
      const gy = (-rbuf.readInt16BE(10) / 131).toFixed(2);
      const gz = (rbuf.readInt16BE(12) / 131).toFixed(2);

      process.stdout.write(
        `\r[ACCEL] X:${ax.padStart(6)}g Y:${ay.padStart(6)}g Z:${az.padStart(6)}g | ` +
        `[GYRO] X:${gx.padStart(7)}°/s Y:${gy.padStart(7)}°/s Z:${gz.padStart(7)}°/s | ` +
        `[TEMP] ${temp}°C `
      );
    }
  }, 100);

  // Đóng thiết bị an toàn khi thoát
  process.on('SIGINT', () => {
    clearInterval(timer);
    CH341CloseDevice(DEVICE_INDEX);
    console.log('\n\n🛑 Đã đóng kết nối thiết bị CH341.');
    process.exit(0);
  });
}

initMPU6500();
