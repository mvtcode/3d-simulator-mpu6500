// ============================================================
// 1. THREE.JS SCENE SETUP
// ============================================================
const container = document.getElementById('viewport-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06080d, 0.035);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 3.5, 7.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.3);
dirLight1.position.set(6, 12, 8);
scene.add(dirLight1);

const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.9);
dirLight2.position.set(-6, 6, -6);
scene.add(dirLight2);

// Floor Cyber Grid (Đồng nhất màu lưới, xóa bỏ 2 vạch thước/trục sáng ở giữa sàn)
const grid = new THREE.GridHelper(30, 60, 0x1e293b, 0x1e293b);
grid.position.y = -2.5;
scene.add(grid);

// Master Pivot Group (All 3D objects are added here)
const masterGroup = new THREE.Group();
masterGroup.rotation.order = 'YXZ';
scene.add(masterGroup);

// Clock for animations & shaders
const clock = new THREE.Clock();

// Hàm tạo nhãn chữ Sprite 3D cho các trục tọa độ
function makeAxisLabel(text, color) {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = color;
  c.font = 'bold 44px "JetBrains Mono", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 32, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true }));
  sp.scale.set(0.42, 0.42, 1);
  return sp;
}

function resetCamera() {
  if (typeof activeModel !== 'undefined' && activeModel === 'human') {
    // Góc nhìn từ phía sau Người 3D
    camera.position.set(0, 1.6, 5.5);
    controls.target.set(0, -0.4, 0);
  } else if (typeof activeModel !== 'undefined' && activeModel === 'airplane') {
    // Góc nhìn từ phía sau Tiêm Kích F-15
    camera.position.set(0, 2.2, 6.5);
    controls.target.set(0, 0.3, 0);
  } else {
    // Hình khối & Bo mạch: Z lên trên, X bên trái, Y hướng vào trong
    camera.position.set(0, 3.5, 7.5);
    controls.target.set(0, 0, 0);
  }
  controls.update();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

