// ============================================================
// 2. TẠO CÁC MÔ HÌNH 3D ĐA DẠNG
// ============================================================

// --- MÔ HÌNH 1: KHUNG HÌNH KHỐI 3D (CẠNH NGOÀI VÀ TRỤC TỌA ĐỘ 3D) ---
const cubeGroup = new THREE.Group();

// 1. Khung hộp chính bên ngoài (Outer Edges)
const outerGeo = new THREE.BoxGeometry(2.4, 2.4, 2.4);
const outerEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(outerGeo),
  new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
);
cubeGroup.add(outerEdges);

// 2. Trục tọa độ 3D trung tâm (Chuẩn: Z lên trên, X bên trái, Y hướng vào trong)
const axisLen = 1.4;
const arrowHeadLen = 0.28;
const arrowHeadWidth = 0.16;
cubeGroup.add(new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 0), axisLen, 0xef4444, arrowHeadLen, arrowHeadWidth)); // X - Đỏ (Bên trái)
cubeGroup.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 0), axisLen, 0x10b981, arrowHeadLen, arrowHeadWidth)); // Y - Xanh lá (Hướng vào trong)
cubeGroup.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), axisLen, 0x38bdf8, arrowHeadLen, arrowHeadWidth)); // Z - Xanh dương (Lên trên)

const lblX = makeAxisLabel('X', '#ef4444'); lblX.position.set(-1.55, 0, 0); cubeGroup.add(lblX);
const lblY = makeAxisLabel('Y', '#10b981'); lblY.position.set(0, 0, -1.55); cubeGroup.add(lblY);
const lblZ = makeAxisLabel('Z', '#38bdf8'); lblZ.position.set(0, 1.55, 0); cubeGroup.add(lblZ);

// Điểm tâm phát sáng trắng
const centerNode = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
cubeGroup.add(centerNode);


// --- MÔ HÌNH 2: MÁY BAY CHIẾN ĐẤU F-15 (TỪ WEB-FLIGHT-SIMULATOR) ---
// Port từ: https://github.com/dimartarmizi/web-flight-simulator
class JetFlame {
  constructor() {
    this.group = new THREE.Group();

    const vertexShader = `
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float time;
      uniform float throttle;
      uniform float isBoosting;
      varying vec2 vUv;
      varying vec3 vPosition;

      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        float v = 1.0 - vUv.y;
        float effThrottle = max(throttle, isBoosting);

        float nonBoostLen = 0.35 + throttle * 0.75;
        float boostLen = 1.45;
        float activeLen = mix(nonBoostLen, boostLen, isBoosting);

        float nonBoostIntensity = 0.7 + throttle * 0.9;
        float boostIntensity = 1.5;
        float intensity = mix(nonBoostIntensity, boostIntensity, isBoosting);

        if (v > activeLen + 0.1) discard;

        vec3 coreColor = vec3(1.0, 1.0, 0.95); 
        vec3 normalMid = vec3(1.0, 0.45, 0.1);
        vec3 normalOuter = vec3(0.15, 0.4, 1.0);
        vec3 boostMid = vec3(1.0, 0.55, 0.2);
        vec3 boostOuter = vec3(0.35, 0.35, 1.0);

        vec3 midColor = mix(normalMid, boostMid, isBoosting);
        vec3 outerColor = mix(normalOuter, boostOuter, isBoosting);

        float radial = length(vPosition.xy);
        float glow = exp(-radial * 10.0);
        float core = exp(-radial * 28.0);
        
        float shockFreq = 20.0;
        float shock = pow(max(0.0, sin(v * shockFreq - time * 50.0)), 4.0);
        shock *= (0.2 + effThrottle * 0.8 + isBoosting * 0.2);
        
        float diamondPos = sin(v * 26.0 - time * 40.0);
        float diamondMesh = pow(max(0.0, diamondPos), 7.0) * (1.0 - v / activeLen);
        float flicker = 1.0 + 0.18 * noise(vec2(time * 20.0, v * 10.0));

        vec3 finalColor = mix(outerColor * 0.7, midColor, glow);
        float coreMix = core + diamondMesh * 0.7;
        vec3 detailColor = mix(coreColor, midColor, isBoosting * 0.3);
        finalColor = mix(finalColor, detailColor, coreMix);
        finalColor += detailColor * shock * glow;

        float fade = pow(max(0.0, 1.0 - v / activeLen), 2.2);
        float edgeFade = smoothstep(activeLen, activeLen * 0.5, v);
        float alpha = fade * intensity * (glow * 2.2 + core) * edgeFade;
        alpha = clamp(alpha * flicker, 0.0, 1.0);

        gl_FragColor = vec4(finalColor * intensity, alpha);
      }
    `;

    this.uniforms = {
      time: { value: 0 },
      throttle: { value: 0.8 },
      isBoosting: { value: 0.0 }
    };

    this.boostFactor = 0;

    const geometry = new THREE.CylinderGeometry(0.15, 0.03, 2, 16, 32, true);
    geometry.translate(0, -1, 0);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.flame = new THREE.Mesh(geometry, this.material);
    this.group.add(this.flame);

    this.light = new THREE.PointLight(0xff7722, 1.5, 6);
    this.group.add(this.light);
    this.cNormal = new THREE.Color(0xff7722);
    this.cBoost = new THREE.Color(0x7799ff);
  }

  update(throttle, isBoosting, time, dt) {
    const targetBoost = isBoosting ? 1.0 : 0.0;
    this.boostFactor += (targetBoost - this.boostFactor) * Math.min(dt * 5.0, 1.0);

    this.uniforms.throttle.value = throttle;
    this.uniforms.isBoosting.value = this.boostFactor;
    this.uniforms.time.value = time;

    const s = (1.0 - this.boostFactor) * (0.6 + throttle * 1.2) + this.boostFactor * 2.4;
    const effectiveThrottle = Math.max(throttle, this.boostFactor);
    const widthScale = 1.1 + effectiveThrottle * 0.45;
    this.flame.scale.set(widthScale, widthScale, s);

    this.light.intensity = (1.0 - this.boostFactor) * (1.0 + throttle * 2.5) + this.boostFactor * 8.0;
    this.light.color.copy(this.cNormal).lerp(this.cBoost, this.boostFactor);
  }
}

const airplaneGroup = new THREE.Group();
const jetFlames = [];
let f15Model = null;

function initF15Model() {
  const loader = new THREE.GLTFLoader();
  const localUrl = 'models/f-15.glb';
  const cdnUrl = 'https://raw.githubusercontent.com/dimartarmizi/web-flight-simulator/main/public/assets/models/f-15.glb';

  function applyF15(gltf) {
    const mesh = gltf.scene;
    f15Model = new THREE.Group();
    f15Model.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    mesh.position.sub(center);

    // Quy chuẩn kích thước phù hợp viewport
    f15Model.scale.set(0.32, 0.32, 0.32);

    // 2 Khối động cơ phản lực Afterburner (JetFlame) từ web-flight-simulator
    const flameL = new JetFlame();
    const flameR = new JetFlame();
    flameL.group.position.set(-0.4, -0.065, 5.0);
    flameR.group.position.set(0.4, -0.065, 5.0);

    f15Model.add(flameL.group);
    f15Model.add(flameR.group);
    jetFlames.push(flameL, flameR);

    // Bóng đổ & vật liệu kim loại
    mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    airplaneGroup.add(f15Model);
  }

  loader.load(localUrl, applyF15, undefined, () => {
    console.warn('Local f-15.glb load failed, trying CDN fallback...');
    loader.load(cdnUrl, applyF15, undefined, (err) => {
      console.error('Failed to load F-15 model from CDN:', err);
      createFallbackF15();
    });
  });
}

// Dự phòng khi offline không tải được file 3D
function createFallbackF15() {
  const fbGroup = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 });
  
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4.2, 8), bodyMat);
  body.rotation.x = -Math.PI / 2;
  fbGroup.add(body);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.8);
  wingShape.lineTo(2.5, -0.9);
  wingShape.lineTo(-2.5, -0.9);
  wingShape.closePath();
  const wings = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), wingMat);
  wings.rotation.x = Math.PI / 2;
  fbGroup.add(wings);

  const flameL = new JetFlame();
  const flameR = new JetFlame();
  flameL.group.position.set(-0.35, 0, 2.1);
  flameR.group.position.set(0.35, 0, 2.1);
  fbGroup.add(flameL.group);
  fbGroup.add(flameR.group);
  jetFlames.push(flameL, flameR);

  airplaneGroup.add(fbGroup);
}

initF15Model();


// --- MÔ HÌNH 3: NGƯỜI 3D (SOLDIER TỪ THREE.JS SKINNING & BLENDING) ---
// Ví dụ: https://threejs.org/examples/#webgl_animation_skinning_blending
const humanGroup = new THREE.Group();
humanGroup.position.set(0, -2.5, 0); // Đặt tâm xoay tại bàn chân người trên mặt phẳng lưới (-2.5)
scene.add(humanGroup); // Gắn trực tiếp vào scene để tiếp đất ổn định và ngả người tự nhiên

let soldierMixer = null;
let soldierActions = {};
let activeSoldierAnim = 'Walk';

// Biến trạng thái di chuyển đi bộ / chạy
let isAutoIMU = true;
let walkDistance = 0.0;
let walkSteps = 0.0;
let currentWalkSpeed = 1.35; // m/s (~4.9 km/h cho Walk)
let gridOffsetZ = 0.0;
let gridOffsetX = 0.0;

// Hệ thống vệt tốc độ sàn (Floor Speed Streaks) tạo hiệu ứng di chuyển trực quan
const streakCount = 90;
const streakPositions = new Float32Array(streakCount * 2 * 3);
const streakData = [];
const streakGeo = new THREE.BufferGeometry();
streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));

for (let i = 0; i < streakCount; i++) {
  streakData.push({
    x: (Math.random() - 0.5) * 14,
    y: -2.48, // Sát ngay phía trên mặt lưới Cyber Grid (-2.5)
    z: (Math.random() - 0.5) * 18,
    len: 0.3 + Math.random() * 0.7,
    speedMult: 0.8 + Math.random() * 0.5
  });
}

const streakMat = new THREE.LineBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.75,
  blending: THREE.AdditiveBlending
});
const streakLines = new THREE.LineSegments(streakGeo, streakMat);
streakLines.visible = false;
scene.add(streakLines);

function updateStreakGeometry(headingY, speed, dt) {
  // Vệt tốc độ di chuyển ngược chiều hướng tiến (trôi về phía sau người khi nhân vật tiến về trước)
  const sinY = Math.sin(headingY);
  const cosY = Math.cos(headingY);
  let ptr = 0;

  for (let i = 0; i < streakCount; i++) {
    const s = streakData[i];

    if (speed > 0.05) {
      // Trôi lùi về sau lưng nhân vật theo trục (+sinY, +cosY)
      s.x += sinY * speed * s.speedMult * dt;
      s.z += cosY * speed * s.speedMult * dt;

      // Khoảng cách phía sau lưng nhân vật (+sinY, +cosY)
      const rearDist = s.x * sinY + s.z * cosY;
      if (rearDist > 8.0) {
        // Hồi sinh ở phía xa đằng trước mặt nhân vật (-sinY, -cosY)
        const frontOffset = 9.0 + Math.random() * 8.0;
        const lateralOffset = (Math.random() - 0.5) * 12.0;
        s.x = -sinY * frontOffset + cosY * lateralOffset;
        s.z = -cosY * frontOffset - sinY * lateralOffset;
      }
    }

    // Tọa độ điểm đầu của vệt
    streakPositions[ptr++] = s.x;
    streakPositions[ptr++] = s.y;
    streakPositions[ptr++] = s.z;

    // Tọa độ điểm đuôi của vệt (kéo dài ngược lại hướng trôi)
    const stretch = Math.max(0.12, speed * 0.22 * s.speedMult);
    streakPositions[ptr++] = s.x - sinY * stretch;
    streakPositions[ptr++] = s.y;
    streakPositions[ptr++] = s.z - cosY * stretch;
  }

  streakGeo.attributes.position.needsUpdate = true;
}

function toggleAutoIMU() {
  isAutoIMU = !isAutoIMU;
  const btn = document.getElementById('btnAnimAutoIMU');
  if (btn) {
    if (isAutoIMU) {
      btn.classList.add('active');
      btn.innerText = '⚡ Auto IMU: BẬT';
    } else {
      btn.classList.remove('active');
      btn.innerText = '⚡ Auto IMU: TẮT';
    }
  }
}

function resetWalkOdometer() {
  walkDistance = 0.0;
  walkSteps = 0.0;
}

function initSoldierModel() {
  const loader = new THREE.GLTFLoader();
  const localUrl = 'models/Soldier.glb';
  const cdnUrl = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/models/gltf/Soldier.glb';

  function applySoldier(gltf) {
    const model = gltf.scene;
    model.scale.set(1.7, 1.7, 1.7);
    model.position.set(0, 0, 0); // Đặt chân tiếp xúc ngay tại sàn
    model.rotation.y = 0; // Soldier.glb mặc định hướng về -Z, camera tại +Z nhìn từ phía sau lưng người 3D

    model.traverse(object => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    // Thiết lập AnimationMixer và các clip Idle, Walk, Run
    soldierMixer = new THREE.AnimationMixer(model);
    const animations = gltf.animations;

    // Soldier.glb: 0=Idle, 1=Run, 2=TPose, 3=Walk
    animations.forEach(clip => {
      soldierActions[clip.name] = soldierMixer.clipAction(clip);
    });

    // Khởi động trực quan với animation Walk (Đi bộ)
    if (soldierActions['Walk']) {
      soldierActions['Walk'].play();
      activeSoldierAnim = 'Walk';
    }

    humanGroup.add(model);
  }

  loader.load(localUrl, applySoldier, undefined, () => {
    console.warn('Local Soldier.glb load failed, trying CDN fallback...');
    loader.load(cdnUrl, applySoldier, undefined, (err) => {
      console.error('Failed to load Soldier model from CDN:', err);
    });
  });
}

initSoldierModel();

// Chuyển đổi mượt hoạt cảnh nhân vật 3D (Animation Crossfading)
function setSoldierAnim(name, isManual = false) {
  if (isManual && isAutoIMU) {
    // Người dùng bấm trực tiếp nút -> Tắt Auto IMU để cố định dáng đi
    isAutoIMU = false;
    const autoBtn = document.getElementById('btnAnimAutoIMU');
    if (autoBtn) {
      autoBtn.classList.remove('active');
      autoBtn.innerText = '⚡ Auto IMU: TẮT';
    }
  }

  if (!soldierActions[name] || activeSoldierAnim === name) return;
  const prevAction = soldierActions[activeSoldierAnim];
  const newAction = soldierActions[name];

  newAction.reset();
  newAction.setEffectiveTimeScale(1);
  newAction.setEffectiveWeight(1);
  if (prevAction) {
    newAction.crossFadeFrom(prevAction, 0.35, true);
  }
  newAction.play();
  activeSoldierAnim = name;

  // Cập nhật giao diện nút bấm
  ['btnAnimIdle', 'btnAnimWalk', 'btnAnimRun'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });
  const currentBtn = document.getElementById(`btnAnim${name}`);
  if (currentBtn) currentBtn.classList.add('active');
}


// --- MÔ HÌNH 4: BO MẠCH PCB MPU6500 (CHUẨN 100% THEO MODULE GY-6500/9250 THỰC TẾ) ---
const boardGroup = new THREE.Group();
// 1. Bản mạch PCB màu xanh biển đặc trưng
const pcbGeo = new THREE.BoxGeometry(3.2, 0.12, 4.0);
const pcbMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.25 });
const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
boardGroup.add(pcbMesh);

const boardEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(pcbGeo),
  new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 2 })
);
boardGroup.add(boardEdges);

// 2. Chip cảm biến MPU6500 QFN màu đen ở trung tâm
const icMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1.0, 0.16, 1.0),
  new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.85 })
);
icMesh.position.set(0.1, 0.12, 0);
boardGroup.add(icMesh);

// Chấm định vị Pin 1 của chip
const pin1Dot = new THREE.Mesh(
  new THREE.CylinderGeometry(0.04, 0.04, 0.02, 10),
  new THREE.MeshBasicMaterial({ color: 0xd1d5db })
);
pin1Dot.position.set(-0.3, 0.21, -0.3);
boardGroup.add(pin1Dot);

// 3. Tụ Tantan màu vàng cam (Tantalum Capacitor) ở góc trên bên phải
const capMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.65, 0.28, 0.38),
  new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5, metalness: 0.3 })
);
capMesh.position.set(0.85, 0.18, -1.2);
boardGroup.add(capMesh);

// 4. Hai lỗ ốc bắt vít tròn mạ kim loại ở cạnh bên phải (chuẩn module GY-6500)
const holeGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16);
const holeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });
const hole1 = new THREE.Mesh(holeGeo, holeMat); hole1.position.set(1.25, 0.01, -1.5); boardGroup.add(hole1);
const hole2 = new THREE.Mesh(holeGeo, holeMat); hole2.position.set(1.25, 0.01, 1.5); boardGroup.add(hole2);

// 5. Dãy 8 chân cắm Header Pins màu vàng ở CẠNH BÊN TRÁI bo mạch (chuẩn thực tế)
const headerBar = new THREE.Mesh(
  new THREE.BoxGeometry(0.32, 0.22, 3.0),
  new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
);
headerBar.position.set(-1.42, 0.16, 0);
boardGroup.add(headerBar);

const pinGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.65, 10);
const pinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.95, roughness: 0.1 });
for (let i = 0; i < 8; i++) {
  const pin = new THREE.Mesh(pinGeo, pinMat);
  pin.position.set(-1.42, 0.28, -1.26 + i * 0.36);
  boardGroup.add(pin);
}

// 6. Hệ trục tọa độ in trên bo mạch GY-6500 (Giống hình khối: Z lên trên, X bên trái, Y hướng vào trong)
const arrowX = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0.1, 0.22, 0), 1.3, 0xef4444, 0.28, 0.16); // X (Đỏ) - Bên trái
const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0.1, 0.22, 0), 1.2, 0x10b981, 0.28, 0.16); // Y (Xanh lá) - Hướng vào trong
const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.1, 0.22, 0), 1.1, 0x38bdf8, 0.28, 0.16); // Z (Xanh dương) - Lên trên
boardGroup.add(arrowX);
boardGroup.add(arrowY);
boardGroup.add(arrowZ);

const bLblX = makeAxisLabel('X', '#ef4444'); bLblX.position.set(-1.45, 0.35, 0); boardGroup.add(bLblX);
const bLblY = makeAxisLabel('Y', '#10b981'); bLblY.position.set(0.1, 0.35, -1.55); boardGroup.add(bLblY);
const bLblZ = makeAxisLabel('Z', '#38bdf8'); bLblZ.position.set(0.1, 1.45, 0); boardGroup.add(bLblZ);

// Thêm các mô hình vào Master Group (humanGroup được giữ riêng độc lập trên mặt sàn)
masterGroup.add(cubeGroup);
masterGroup.add(airplaneGroup);
masterGroup.add(boardGroup);

