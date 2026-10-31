// ============================================================
// HỆ THỐNG BUỒNG LÁI CHIẾN ĐẤU & HUD OVERLAY (AVIONICS)
// ============================================================

// Khởi tạo vạch chia la bàn 360 độ cho HUD
function initCompassTape() {
  const tape = document.getElementById('hudCompassTape');
  if (!tape) return;
  let html = '';
  for (let deg = 0; deg <= 720; deg += 5) {
    const actualDeg = deg % 360;
    let label = '';
    let isMajor = (deg % 30 === 0);
    let isCardinal = (actualDeg === 0 ? 'N' : actualDeg === 90 ? 'E' : actualDeg === 180 ? 'S' : actualDeg === 270 ? 'W' : '');
    if (isCardinal) label = isCardinal;
    else if (isMajor) label = (actualDeg / 10).toString().padStart(2, '0');

    html += `<div style="position:absolute; left:${deg * 6}px; bottom:0; width:2px; height:${isMajor ? '16px' : '8px'}; background:#10b981;">
      ${label ? `<span style="position:absolute; bottom:18px; left:50%; transform:translateX(-50%); font-size:10px; font-weight:700;">${label}</span>` : ''}
    </div>`;
  }
  tape.innerHTML = html;
}

function getCardinal(deg) {
  if (deg >= 337.5 || deg < 22.5) return 'N';
  if (deg >= 22.5 && deg < 67.5) return 'NE';
  if (deg >= 67.5 && deg < 112.5) return 'E';
  if (deg >= 112.5 && deg < 157.5) return 'SE';
  if (deg >= 157.5 && deg < 202.5) return 'S';
  if (deg >= 202.5 && deg < 247.5) return 'SW';
  if (deg >= 247.5 && deg < 292.5) return 'W';
  return 'NW';
}

function updateCockpitHUD(t, roll, pitch, isAfterburner) {
  // 1. Đường chân trời & thang góc nghiêng (Pitch Ladder & Horizon)
  const hudPitch = document.getElementById('hudPitchContainer');
  if (hudPitch) {
    // F-15: Lên/xuống theo trục Y (roll), Nghiêng trái/phải theo trục X (pitch)
    hudPitch.style.transform = `translate(-50%, calc(-50% + ${roll * 3.2}px)) rotate(${-pitch}deg)`;
  }

  // 2. Thước la bàn định hướng (Compass Tape)
  const compassHeading = (Math.round(t.yaw) % 360 + 360) % 360;
  const hudTape = document.getElementById('hudCompassTape');
  const hudCVal = document.getElementById('hudCompassVal');
  if (hudTape) {
    hudTape.style.transform = `translateX(${-compassHeading * 6}px)`;
  }
  if (hudCVal) {
    hudCVal.innerText = `${compassHeading.toString().padStart(3, '0')}° [${getCardinal(compassHeading)}]`;
  }

  // 3. Tốc độ, Cao độ & Gia tốc G-force
  const totalG = Math.sqrt(t.ax * t.ax + t.ay * t.ay + t.az * t.az);
  const speedKnots = isAfterburner ? 620 + Math.abs(t.ax) * 90 : 340 + Math.abs(t.ax) * 50;
  const machVal = (speedKnots / 661.47).toFixed(2);
  const altFeet = Math.max(500, Math.round(5200 + pitch * 45));

  const spdEl = document.getElementById('hudSpeedVal');
  const machEl = document.getElementById('hudMachVal');
  const altEl = document.getElementById('hudAltVal');
  const gEl = document.getElementById('hudGForce');

  if (spdEl) spdEl.innerText = Math.round(speedKnots);
  if (machEl) machEl.innerText = 'M ' + machVal;
  if (altEl) altEl.innerText = altFeet;
  if (gEl) gEl.innerText = `G: ${totalG.toFixed(1)}`;
}

