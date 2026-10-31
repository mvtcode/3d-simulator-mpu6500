// ============================================================
// 4. WEBSOCKET & CẬP NHẬT DỮ LIỆU CẢM BIẾN (TELEMETRY & CHART)
// ============================================================
let targetEuler = { roll: 0, pitch: 0, yaw: 0 };
let currentEuler = { roll: 0, pitch: 0, yaw: 0 };
let msgCount = 0;
let lastHzCalc = Date.now();

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.host}`;
let socket;

function connectWS() {
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    const sText = document.getElementById('statusText');
    const sPill = document.getElementById('statusPill');
    const sDot = document.getElementById('statusDot');
    if (sText) sText.innerText = 'CONNECTED (ONLINE)';
    if (sPill) {
      sPill.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      sPill.style.color = '#10b981';
    }
    if (sDot) sDot.style.background = '#10b981';
  };

  socket.onmessage = (event) => {
    msgCount++;
    const data = JSON.parse(event.data);
    if (data.roll !== undefined) updateTelemetry(data);
  };

  socket.onclose = () => {
    const sText = document.getElementById('statusText');
    const sPill = document.getElementById('statusPill');
    const sDot = document.getElementById('statusDot');
    if (sText) sText.innerText = 'DISCONNECTED';
    if (sPill) {
      sPill.style.borderColor = 'rgba(244, 63, 94, 0.3)';
      sPill.style.color = '#f43f5e';
    }
    if (sDot) sDot.style.background = '#f43f5e';
    setTimeout(connectWS, 1500);
  };
}

function tare() {
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify({ action: 'tare' }));
    const sText = document.getElementById('statusText');
    if (sText) {
      sText.innerText = 'TARED (ZERO)';
      setTimeout(() => { if (sText) sText.innerText = 'CONNECTED (ONLINE)'; }, 1000);
    }
  }
}

function calibrate() {
  if (socket && socket.readyState === 1) {
    const sText = document.getElementById('statusText');
    if (sText) sText.innerText = 'CALIBRATING GYRO (2s)...';
    socket.send(JSON.stringify({ action: 'calibrate' }));
    setTimeout(() => {
      if (sText) sText.innerText = 'CALIBRATED OK';
      setTimeout(() => { if (sText) sText.innerText = 'CONNECTED (ONLINE)'; }, 1500);
    }, 2000);
  }
}

// Telemetry DOM elements
const rollEl = document.getElementById('valRoll');
const pitchEl = document.getElementById('valPitch');
const yawEl = document.getElementById('valYaw');
const tempEl = document.getElementById('tempBadge');
const hzEl = document.getElementById('hzCounter');

const txtAx = document.getElementById('txtAx');
const txtAy = document.getElementById('txtAy');
const txtAz = document.getElementById('txtAz');
const barAx = document.getElementById('barAx');
const barAy = document.getElementById('barAy');
const barAz = document.getElementById('barAz');

const txtGx = document.getElementById('txtGx');
const txtGy = document.getElementById('txtGy');
const txtGz = document.getElementById('txtGz');
const barGx = document.getElementById('barGx');
const barGy = document.getElementById('barGy');
const barGz = document.getElementById('barGz');

function updateBar(bar, val, maxVal) {
  if (!bar) return;
  bar.style.width = `${Math.abs(val / maxVal) * 50}%`;
  bar.style.left = val >= 0 ? '50%' : `${50 - (Math.abs(val / maxVal) * 50)}%`;
}

function updateTelemetry(t) {
  const ax = t.ax;
  const ay = t.ay;
  // Tự động khôi phục trục Az nếu cảm biến trả về giá trị bão hòa (2.0g) do lỗi phần cứng
  let az = t.az;
  if (Math.abs(az) >= 1.5 || isNaN(az)) {
    az = Math.sqrt(Math.max(0.01, 1.0 - ax * ax - ay * ay));
  }

  // Tính góc thuần chuẩn xác từ gia tốc kế (độ nhạy 100% không còn bị chia đôi do Az = 2.0)
  const accelRoll  = Math.atan2(ay, Math.sqrt(ax * ax + az * az)) * (180.0 / Math.PI);
  const accelPitch = Math.atan2(ax, Math.sqrt(ay * ay + az * az)) * (180.0 / Math.PI);
  // Góc trục Z (thay cho Gz): đo góc nghiêng trục Z trực tiếp từ gia tốc kế
  const accelYaw   = (90.0 - Math.atan2(az, Math.sqrt(ax * ax + ay * ay)) * (180.0 / Math.PI));

  // 1. Áp dụng cấu hình Hoán đổi (Swap X/Y) và Đảo chiều (Invert)
  const r = imuConfig.swapXY ? accelPitch : accelRoll;
  const p = imuConfig.swapXY ? accelRoll : accelPitch;
  const y = t.yaw;

  const roll = imuConfig.invertRoll ? -r : r;
  const pitch = imuConfig.invertPitch ? -p : p;
  const yaw = imuConfig.invertYaw ? -y : y;

  targetEuler.roll = roll;
  targetEuler.pitch = pitch;
  targetEuler.yaw = yaw;

  if (rollEl) rollEl.innerText = `${roll.toFixed(1)}°`;
  if (pitchEl) pitchEl.innerText = `${pitch.toFixed(1)}°`;
  if (yawEl) yawEl.innerText = `${yaw.toFixed(1)}°`;
  if (tempEl) tempEl.innerText = `${t.temp.toFixed(1)}°C`;

  if (txtAx) txtAx.innerText = `${t.ax.toFixed(2)}g`;
  if (txtAy) txtAy.innerText = `${t.ay.toFixed(2)}g`;
  if (txtAz) txtAz.innerText = `${t.az.toFixed(2)}g`;
  updateBar(barAx, t.ax, 2.0);
  updateBar(barAy, t.ay, 2.0);
  updateBar(barAz, t.az, 2.0);

  if (txtGx) txtGx.innerText = `${t.gx.toFixed(0)}°/s`;
  if (txtGy) txtGy.innerText = `${t.gy.toFixed(0)}°/s`;
  if (txtGz) txtGz.innerText = `${t.gz.toFixed(0)}°/s`;
  updateBar(barGx, t.gx, 250);
  updateBar(barGy, t.gy, 250);
  updateBar(barGz, t.gz, 250);

  // Cập nhật hệ thống HUD Buồng lái tiêm kích F-15
  if (typeof isCockpitMode !== 'undefined' && isCockpitMode) {
    updateCockpitHUD(t, roll, pitch, typeof isAfterburnerOn !== 'undefined' ? isAfterburnerOn : false);
  }

  addChartPoint(roll, pitch, yaw);
}

// Đo tần số Hz
setInterval(() => {
  const now = Date.now();
  const hz = Math.round((msgCount * 1000) / (now - lastHzCalc));
  if (hzEl) hzEl.innerText = `${hz} Hz`;
  msgCount = 0;
  lastHzCalc = now;
}, 1000);

// Đồ thị Strip Chart
const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');
const maxPoints = 80;
const historyRoll = new Array(maxPoints).fill(0);
const historyPitch = new Array(maxPoints).fill(0);
const historyYaw = new Array(maxPoints).fill(0);

function addChartPoint(r, p, y) {
  historyRoll.push(r); historyRoll.shift();
  historyPitch.push(p); historyPitch.shift();
  historyYaw.push(y); historyYaw.shift();
}

function drawChart() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  function plot(arr, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < maxPoints; i++) {
      const x = (i / (maxPoints - 1)) * canvas.width;
      const y = (canvas.height / 2) - ((arr[i] / 180) * (canvas.height / 2) * 0.85);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  plot(historyRoll, '#38bdf8');
  plot(historyPitch, '#10b981');
  plot(historyYaw, '#f59e0b');
}

