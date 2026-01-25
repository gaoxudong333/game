// preview.js - 改进的前端物理、轨迹记录与回放
// 鼠标左键拖拽投掷圈圈，记录完整轨迹并支持回放。

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const pointsEl = document.getElementById("points");
const logEl = document.getElementById("log");
const resetBtn = document.getElementById("reset-btn");
const replayBtn = document.getElementById("replay-btn");
const replaySpeedEl = document.getElementById("replay-speed");

let points = 0;

function log(s, cls = "") {
  const d = document.createElement("div");
  d.textContent = `${new Date().toLocaleTimeString()} — ${s}`;
  if (cls) d.className = cls;
  logEl.prepend(d);
}

// 场景：马与耳朵
const horse = { x: 540, y: 200, w: 260, h: 170 };
const earLeft = { x: horse.x + 50, y: horse.y + 30, r: 20 };
const earRight = { x: horse.x + 200, y: horse.y + 30, r: 20 };

// 圈圈对象
const ring = {
  x: 140, y: H - 100, r: 28,
  vx: 0, vy: 0,
  ax: 0, ay: 0,
  isDragging: false,
  dragHistory: [],
  trajectory: null // 保存上一投掷的轨迹（数组 of {x,y,t}）
};

// 物理参数（更精确）
const GRAVITY = 980; // px/s^2
const AIR_DRAG = 0.995; // 空气阻力近似
const RESTITUTION = 0.28; // 弹性
const FRICTION = 0.92;

function draw() {
  ctx.clearRect(0,0,W,H);
  // 背景草地
  ctx.fillStyle = "#98fb98";
  ctx.fillRect(0, H-90, W, 90);

  // 马体
  ctx.fillStyle = "#8b5a2b";
  roundRect(ctx, horse.x, horse.y, horse.w, horse.h, 8);
  ctx.fill();

  // 耳朵
  ctx.fillStyle = "#c29b6c";
  circle(ctx, earLeft.x, earLeft.y, earLeft.r);
  circle(ctx, earRight.x, earRight.y, earRight.r);

  // 绘制上一投掷轨迹（点线）
  if (ring.trajectory && ring.trajectory.length) {
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ring.trajectory.forEach((p, i) => {
      if (i===0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  // 圈圈（环形）
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ff8c00";
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI*2);
  ctx.stroke();

  // 说明文字
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.font = "14px sans-serif";
  ctx.fillText("拖拽圈圈并松开以投掷（支持触摸）", 12, 24);
}

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

// 物理循环
let last = null;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;

  if (!ring.isDragging) {
    // 简单欧拉积分，加空气阻力
    ring.vy += GRAVITY * dt;
    ring.vx *= Math.pow(AIR_DRAG, dt*60);
    ring.vy *= Math.pow(AIR_DRAG, dt*60);

    ring.x += ring.vx * dt;
    ring.y += ring.vy * dt;

    // 地面碰撞
    if (ring.y + ring.r > H - 90) {
      ring.y = H - 90 - ring.r;
      ring.vy *= -RESTITUTION;
      ring.vx *= FRICTION;
      if (Math.abs(ring.vy) < 20) ring.vy = 0;
    }

    // 边界
    if (ring.x - ring.r < 0) { ring.x = ring.r; ring.vx *= -0.6; }
    if (ring.x + ring.r > W) { ring.x = W - ring.r; ring.vx *= -0.6; }

    // 在运动中记录轨迹（用于保存上一投掷）
    if (!ring.isDragging && Math.abs(ring.vx) + Math.abs(ring.vy) > 0.5) {
      if (!ring._currentTrajectory) ring._currentTrajectory = [];
      ring._currentTrajectory.push({ t: performance.now(), x: ring.x, y: ring.y });
    }

    // 如果物体停止并且当前轨迹存在，则保存为上一投掷轨迹（并清理）
    if (ring._currentTrajectory && Math.abs(ring.vx) < 1 && Math.abs(ring.vy) < 1) {
      ring.trajectory = ring._currentTrajectory.slice();
      ring._currentTrajectory = null;
    }
  }

  // 如果正在拖拽，记录拖拽点用于计算释放速度
  if (ring.isDragging) {
    const now = performance.now();
    ring.dragHistory.push({ t: now, x: ring.x, y: ring.y });
    while (ring.dragHistory.length > 12) ring.dragHistory.shift();
  }

  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 鼠标 / 触摸交互
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  const p = getPos(e);
  if (Math.hypot(p.x - ring.x, p.y - ring.y) <= ring.r + 10) {
    ring.isDragging = true;
    ring.dragHistory = [{ t: performance.now(), x: ring.x, y: ring.y }];
  }
});
canvas.addEventListener("mousemove", (e) => { if (!ring.isDragging) return; const p = getPos(e); ring.x = p.x; ring.y = p.y; });
canvas.addEventListener("mouseup", (e) => { if (!ring.isDragging) return; ring.isDragging = false; computeReleaseVelocity(); setTimeout(checkResult, 700); });

// touch
canvas.addEventListener("touchstart", (e)=>{ e.preventDefault(); const p = getPos(e); if (Math.hypot(p.x - ring.x, p.y - ring.y) <= ring.r+10) { ring.isDragging = true; ring.dragHistory = [{t:performance.now(), x:ring.x, y:ring.y}]; } }, {passive:false});
canvas.addEventListener("touchmove", (e)=>{ e.preventDefault(); if (!ring.isDragging) return; const p = getPos(e); ring.x = p.x; ring.y = p.y; }, {passive:false});
canvas.addEventListener("touchend", (e)=>{ e.preventDefault(); if (!ring.isDragging) return; ring.isDragging = false; computeReleaseVelocity(); setTimeout(checkResult, 700); }, {passive:false});

function computeReleaseVelocity() {
  const hist = ring.dragHistory;
  if (hist.length >= 2) {
    const a = hist[0];
    const b = hist[hist.length-1];
    const dt = (b.t - a.t) / 1000 || 0.016;
    const vx = (b.x - a.x) / dt;
    const vy = (b.y - a.y) / dt;
    // 缩放回合适范围，调试系数
    ring.vx = Math.max(-2000, Math.min(2000, vx * 0.9));
    ring.vy = Math.max(-2500, Math.min(2500, vy * 0.9));
  } else {
    ring.vx = (Math.random()*400 - 200);
    ring.vy = -600;
  }
  ring._currentTrajectory = [{ t: performance.now(), x: ring.x, y: ring.y }];
}

// 判定是否套中耳朵（更严格：耳朵中心必须在圈圈内部，且距离小于阈值）
function ringCoversEar(r, ear) {
  const d = Math.hypot(r.x - ear.x, r.y - ear.y);
  return d + ear.r < r.r - 4;
}

function checkResult() {
  const won = ringCoversEar(ring, earLeft) || ringCoversEar(ring, earRight);
  if (won) {
    points += 2;
    log("套中耳朵 — 胜利 +2 分", "info");
  } else {
    points -= 1;
    log("未套中 — 失败 -1 分", "warning");
  }
  if (points < 0) points = 0;
  pointsEl.textContent = points;
  // 若当前轨迹已保存为 _currentTrajectory，会在物理循环结束时转为 ring.trajectory
}

// Replay: 把 ring 跟随 ring.trajectory 的离散点播放
let _replaying = false;
async function replayTrajectory() {
  if (!ring.trajectory || !ring.trajectory.length) { log('没有可回放的轨迹'); return; }
  if (_replaying) return;
  _replaying = true;
  const traj = ring.trajectory;
  const speed = Number(replaySpeedEl.value) || 1;
  // Normalize times to start at 0
  const t0 = traj[0].t;
  for (let i = 0; i < traj.length; i++) {
    const p = traj[i];
    ring.x = p.x; ring.y = p.y;
    draw();
    // compute delay to next point
    const next = traj[i+1];
    if (!next) break;
    const dt = (next.t - p.t) / speed;
    await new Promise(r => setTimeout(r, Math.max(10, dt)));
  }
  _replaying = false;
}

replayBtn.addEventListener('click', () => { replayTrajectory(); });

// 支持重置积分
resetBtn.addEventListener("click", () => { points = 0; pointsEl.textContent = points; log("积分已重置"); });

// 初始绘制
log("改进版预览已加载：更精确的物理与回放功能（钱包/支付未接入）", "info");
draw();
