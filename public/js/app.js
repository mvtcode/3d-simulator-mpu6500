// ============================================================
// 3. CHUYỂN ĐỔI MÔ HÌNH, CHẾ ĐỘ BUỒNG LÁI & VÒNG LẶP RENDER (MAIN APP)
// ============================================================
let activeModel = 'cube';
let isCockpitMode = false;
let isAfterburnerOn = false;

function switchModel(type) {
  activeModel = type;

  // Cập nhật hiển thị đối tượng 3D
  cubeGroup.visible = (type === 'cube');
  airplaneGroup.visible = (type === 'airplane');
  humanGroup.visible = (type === 'human');
  streakLines.visible = (type === 'human');
  boardGroup.visible = (type === 'board');
  masterGroup.visible = (type !== 'human');

  // Cập nhật tab active
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeIdx = ['cube', 'airplane', 'human', 'board'].indexOf(type);
  if (activeIdx >= 0) document.querySelectorAll('.tab-btn')[activeIdx].classList.add('active');

  const cockpitBtn = document.getElementById('cockpitToggleBtn');
  const boostBtn = document.getElementById('afterburnerBtn');
  const soldierCtrl = document.getElementById('soldierControls');
  const soldierCard = document.getElementById('soldierMotionCard');
  const hintEl = document.getElementById('viewportHint');

  if (type === 'airplane') {
    if (cockpitBtn) cockpitBtn.style.display = 'flex';
    if (boostBtn) boostBtn.style.display = 'flex';
    if (soldierCtrl) soldierCtrl.style.display = 'none';
    if (soldierCard) soldierCard.style.display = 'none';
    if (hintEl) hintEl.innerText = '✈️ F-15 Tiêm Kích (Góc nhìn từ phía sau): Động cơ phản lực Afterburner | Kéo chuột để đổi góc nhìn';
    resetCamera();
  } else if (type === 'human') {
    if (cockpitBtn) cockpitBtn.style.display = 'none';
    if (boostBtn) boostBtn.style.display = 'none';
    if (soldierCtrl) soldierCtrl.style.display = 'flex';
    if (soldierCard) soldierCard.style.display = 'block';
    if (isCockpitMode) toggleCockpitView();
    if (hintEl) hintEl.innerText = '🤖 Người 3D (Góc nhìn từ phía sau): Nghiêng MPU6500 về trước để chạy, ngửa ra sau để dừng';

    // Tự động kích hoạt dáng đi bộ nếu đang đứng
    if (soldierActions['Walk'] && activeSoldierAnim === 'Idle') {
      setSoldierAnim('Walk');
    }

    resetCamera();
  } else if (type === 'cube') {
    if (cockpitBtn) cockpitBtn.style.display = 'none';
    if (boostBtn) boostBtn.style.display = 'none';
    if (soldierCtrl) soldierCtrl.style.display = 'none';
    if (soldierCard) soldierCard.style.display = 'none';
    if (isCockpitMode) toggleCockpitView();
    if (hintEl) hintEl.innerText = '🔲 Khung Hình Khối: Z lên trên, X bên trái, Y hướng vào trong';
    resetCamera();
  } else {
    if (cockpitBtn) cockpitBtn.style.display = 'none';
    if (boostBtn) boostBtn.style.display = 'none';
    if (soldierCtrl) soldierCtrl.style.display = 'none';
    if (soldierCard) soldierCard.style.display = 'none';
    if (isCockpitMode) toggleCockpitView();
    if (hintEl) hintEl.innerText = '📟 Bo Mạch PCB (Giống hình khối): Z lên trên, X bên trái, Y hướng vào trong';
    resetCamera();
  }
}

function toggleAfterburner() {
  isAfterburnerOn = !isAfterburnerOn;
  const boostBtn = document.getElementById('afterburnerBtn');
  if (boostBtn) {
    if (isAfterburnerOn) {
      boostBtn.classList.add('active-afterburner');
      boostBtn.innerText = '💥 Tăng Lực: MAX BOOST';
    } else {
      boostBtn.classList.remove('active-afterburner');
      boostBtn.innerText = '🔥 Tăng Lực (Boost)';
    }
  }
}

function toggleCockpitView() {
  isCockpitMode = !isCockpitMode;
  const cockpitBtn = document.getElementById('cockpitToggleBtn');
  const hudEl = document.getElementById('cockpit-hud');
  const hintEl = document.getElementById('viewportHint');

  if (isCockpitMode) {
    if (cockpitBtn) {
      cockpitBtn.classList.add('active-cockpit');
      cockpitBtn.innerText = '🛩️ Thoát Buồng Lái';
    }
    if (hudEl) hudEl.style.display = 'block';
    if (hintEl) hintEl.innerText = '🎮 Buồng lái F-15 HUD: Cảm biến MPU6500 đang trực tiếp điều khiển hướng bay và đường chân trời';
    controls.enabled = false;
  } else {
    if (cockpitBtn) {
      cockpitBtn.classList.remove('active-cockpit');
      cockpitBtn.innerText = '🎯 Buồng Lái Ảo (Cockpit)';
    }
    if (hudEl) hudEl.style.display = 'none';
    if (hintEl) hintEl.innerText = '🖱️ Kéo chuột trái để xoay 3D | Cuộn chuột để phóng to/thu nhỏ';
    controls.enabled = true;
    resetCamera();
  }
}

// ============================================================
// 6. ANIMATION & RENDER LOOP (60 FPS)
// ============================================================
const DEG2RAD = Math.PI / 180.0;

function animate() {
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  const time = clock.getElapsedTime();

  // Cập nhật AnimationMixer cho Người 3D (Soldier)
  if (soldierMixer) {
    soldierMixer.update(dt);
  }

  // Cập nhật động cơ phản lực F-15 Afterburners
  if (jetFlames.length > 0 && activeModel === 'airplane') {
    const throttleVal = isAfterburnerOn ? 1.0 : 0.75;
    jetFlames.forEach(flame => {
      flame.update(throttleVal, isAfterburnerOn ? 1.0 : 0.0, time, dt);
    });
  }

  // Làm mượt góc quay (Lerp interpolation nhạy bén, tốc độ phản hồi cao)
  currentEuler.roll += (targetEuler.roll - currentEuler.roll) * 0.65;
  currentEuler.pitch += (targetEuler.pitch - currentEuler.pitch) * 0.65;
  let diffYaw = (targetEuler.yaw - currentEuler.yaw) % 360;
  if (diffYaw > 180) diffYaw -= 360;
  if (diffYaw < -180) diffYaw += 360;
  currentEuler.yaw += diffYaw * 0.65;

  // Xử lý chuyển động Người 3D (Soldier) đi bộ / chạy trực quan
  if (activeModel === 'human') {
    // Đổi trục: Lên/xuống theo Y (tăng Y để chạy), Nghiêng trái/phải theo X
    const soldierPitch = currentEuler.roll;
    const soldierRoll = currentEuler.pitch;

    // 1. Tự động chuyển đổi dáng đi theo góc nghiêng Pitch (trục Y) của cảm biến MPU6500
    // Tăng Y (> 7°): Chạy (Run) | Giảm Y (< -5°): Đứng (Idle) | Mức thường: Đi bộ (Walk)
    if (isAutoIMU) {
      if (soldierPitch > 7.0) {
        if (activeSoldierAnim !== 'Run') setSoldierAnim('Run');
      } else if (soldierPitch < -5.0) {
        if (activeSoldierAnim !== 'Idle') setSoldierAnim('Idle');
      } else {
        if (activeSoldierAnim !== 'Walk') setSoldierAnim('Walk');
      }
    }

    // 2. Tính toán tốc độ di chuyển và nhịp bước chân
    let targetSpeed = 0;
    let cadence = 0;
    if (activeSoldierAnim === 'Walk') {
      targetSpeed = 1.35; // ~4.9 km/h
      cadence = 112;      // bước / phút
    } else if (activeSoldierAnim === 'Run') {
      targetSpeed = 3.60; // ~13.0 km/h
      cadence = 168;      // bước / phút
    } else {
      targetSpeed = 0.0;
      cadence = 0;
    }

    // Làm mượt gia tốc bước đi phản ứng nhanh
    currentWalkSpeed += (targetSpeed - currentWalkSpeed) * Math.min(1.0, dt * 8.0);

    // 3. Tư thế chuyển động nhân vật:
    // Hướng nhìn (Heading) quay 360 độ theo Yaw của MPU6500
    humanGroup.rotation.y = currentEuler.yaw * DEG2RAD;

    // Dáng ngả người tự nhiên và nhạy bén theo góc nghiêng thực tế
    const leanPitch = THREE.MathUtils.clamp(-soldierPitch * DEG2RAD * 0.75, -0.6, 0.6);
    const leanRoll = THREE.MathUtils.clamp(soldierRoll * DEG2RAD * 0.65, -0.5, 0.5);
    humanGroup.rotation.x = leanPitch;
    humanGroup.rotation.z = leanRoll;

    // 4. Di chuyển mặt sàn (Cyber Grid Treadmill) & vệt tốc độ bên dưới chân (trôi lùi về sau theo hướng người tiến)
    if (currentWalkSpeed > 0.02) {
      const heading = humanGroup.rotation.y;
      const step = 0.5;
      const dx = Math.sin(heading) * currentWalkSpeed * dt;
      const dz = Math.cos(heading) * currentWalkSpeed * dt;

      gridOffsetX = ((gridOffsetX + dx) % step + step) % step;
      gridOffsetZ = ((gridOffsetZ + dz) % step + step) % step;
      grid.position.x = gridOffsetX;
      grid.position.z = gridOffsetZ;

      updateStreakGeometry(heading, currentWalkSpeed, dt);

      walkDistance += currentWalkSpeed * dt;
      walkSteps += (cadence / 60.0) * dt;
    } else {
      updateStreakGeometry(humanGroup.rotation.y, 0, dt);
    }

    // 5. Cập nhật thẻ thông số Pedometer
    const spdEl = document.getElementById('valWalkSpeed');
    const distEl = document.getElementById('valWalkDist');
    const stepsEl = document.getElementById('valWalkSteps');
    const badgeEl = document.getElementById('gaitBadge');
    const cadEl = document.getElementById('valWalkCadence');

    if (spdEl) spdEl.innerHTML = `${(currentWalkSpeed * 3.6).toFixed(1)} <span style="font-size:10px;">km/h</span>`;
    if (distEl) distEl.innerHTML = `${walkDistance.toFixed(1)} <span style="font-size:10px;">m</span>`;
    if (stepsEl) stepsEl.innerText = Math.floor(walkSteps);
    if (badgeEl) {
      badgeEl.innerText = activeSoldierAnim.toUpperCase();
      badgeEl.style.color = (activeSoldierAnim === 'Run' ? '#ef4444' : (activeSoldierAnim === 'Walk' ? '#10b981' : '#94a3b8'));
    }
    if (cadEl) cadEl.innerText = `${cadence} SPM`;
  } else if (activeModel === 'airplane') {
    // Tiêm kích F-15: Đổi trục theo yêu cầu & đảo chiều nghiêng cánh trái/phải
    masterGroup.rotation.x = -currentEuler.roll * DEG2RAD;
    masterGroup.rotation.z = -currentEuler.pitch * DEG2RAD;
    masterGroup.rotation.y = currentEuler.yaw * DEG2RAD;

    gridOffsetX = 0;
    gridOffsetZ = 0;
    grid.position.x = 0;
    grid.position.z = 0;
  } else {
    // Xoay vật thể theo cảm biến (Chế độ Khung Khối, Bo Mạch PCB): Đổi trục X và Y
    masterGroup.rotation.x = -currentEuler.roll * DEG2RAD;
    masterGroup.rotation.z = currentEuler.pitch * DEG2RAD;
    masterGroup.rotation.y = currentEuler.yaw * DEG2RAD;

    gridOffsetX = 0;
    gridOffsetZ = 0;
    grid.position.x = 0;
    grid.position.z = 0;
  }

  // Xử lý góc nhìn camera Buồng lái ảo (Cockpit Camera) F-15
  // if (isCockpitMode && activeModel === 'airplane') {
  //   // Đặt camera bên trong canopy F-15 nhìn thẳng về phía trước mũi (mũi hướng về -Z)
  //   const cockpitPos = new THREE.Vector3(0, 0.45, -0.6).applyMatrix4(masterGroup.matrixWorld);
  //   const forwardPos = new THREE.Vector3(0, 0.45, -6.0).applyMatrix4(masterGroup.matrixWorld);

  //   camera.position.copy(cockpitPos);
  //   camera.lookAt(forwardPos);
  //   camera.up.set(0, 1, 0).applyQuaternion(masterGroup.quaternion);
  // } else {
  //   camera.up.set(0, 1, 0);
  //   controls.update();
  // }

  drawChart();
  renderer.render(scene, camera);
}

// ============================================================
// KHỞI ĐỘNG ỨNG DỤNG
// ============================================================
initCompassTape();
updateAxisBtnUI();
switchModel('cube');
connectWS();
animate();

