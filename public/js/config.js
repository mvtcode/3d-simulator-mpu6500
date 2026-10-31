// ============================================================
// CẤU HÌNH ĐẢO / HOÁN ĐỔI TRỤC IMU (LƯU TRỰC TIẾP LOCALSTORAGE)
// ============================================================
const imuConfig = {
  swapXY: localStorage.getItem('imu_swapXY') === 'true',
  invertRoll: localStorage.getItem('imu_invertRoll') !== null ? localStorage.getItem('imu_invertRoll') === 'true' : false,
  invertPitch: localStorage.getItem('imu_invertPitch') !== null ? localStorage.getItem('imu_invertPitch') === 'true' : false,
  invertYaw: localStorage.getItem('imu_invertYaw') === 'true'
};

function updateAxisBtnUI() {
  const bSwap = document.getElementById('btnSwapXY');
  const bRoll = document.getElementById('btnInvRoll');
  const bPitch = document.getElementById('btnInvPitch');
  const bYaw = document.getElementById('btnInvYaw');

  if (bSwap) bSwap.classList.toggle('active', imuConfig.swapXY);
  if (bRoll) bRoll.classList.toggle('active', imuConfig.invertRoll);
  if (bPitch) bPitch.classList.toggle('active', imuConfig.invertPitch);
  if (bYaw) bYaw.classList.toggle('active', imuConfig.invertYaw);
}

function toggleSwapXY() {
  imuConfig.swapXY = !imuConfig.swapXY;
  localStorage.setItem('imu_swapXY', imuConfig.swapXY);
  updateAxisBtnUI();
}

function toggleInvRoll() {
  imuConfig.invertRoll = !imuConfig.invertRoll;
  localStorage.setItem('imu_invertRoll', imuConfig.invertRoll);
  updateAxisBtnUI();
}

function toggleInvPitch() {
  imuConfig.invertPitch = !imuConfig.invertPitch;
  localStorage.setItem('imu_invertPitch', imuConfig.invertPitch);
  updateAxisBtnUI();
}

function toggleInvYaw() {
  imuConfig.invertYaw = !imuConfig.invertYaw;
  localStorage.setItem('imu_invertYaw', imuConfig.invertYaw);
  updateAxisBtnUI();
}

