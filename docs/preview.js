// preview.js - 静态预览（无钱包/后端）
// 鼠标左键拖拽投掷圈圈，判定是否套中耳朵（本地计分）。

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

const pointsEl = document.getElementById("points");
const logEl = document.getElementById("log");
const resetBtn = document.getElementById("reset-btn");

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

// 圈圈
const ring = {
  x: 140, y: H - 100, r: 28,
  vx: 0, vy: 0,
  isDragging: false,
  dragHistory: [] // 用来计算释放速度
};

// 物理参数
const GRAVITY = 900; // px/s^2
const DAMPING = 0.82;
const FRICTION = 0.92;

function draw() {
  ctx.clearRect(0,0,W,H);
  // 草地
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

  // 圈圈（环形）
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ff8c00";
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI*2);
  ctx.stroke();

  // 简单说明文字
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.font = "14px sans-serif";
  ctx.fillText("拖拽圈圈并松开以投掷", 12, 24);
}

function circle(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

// 物理循环
let last = null;
function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;

  if (!ring.isDragging) {
    ring.vy += GRAVITY * dt;
    ring.x += ring.vx * dt;
    ring.y += ring.vy * dt;

    // 地面碰撞
    if (ring.y + ring.r > H - 90) {
      ring.y = H - 90 - ring.r;
      ring.vy *= -0.28;
      ring.vx *= FRICTION;
      if (Math.abs(ring.vy) < 20) ring.vy = 0;
    }

    // 边界
    if (ring.x - ring.r < 0) { ring.x = ring.r; ring.vx *= -0.6; }
    if (ring.x + ring.r > W) { ring.x = W - ring.r; ring.vx *= -0.6; }
  }

  // 每帧保留很短的历史，用于拖拽释放速度估算（防止太大或太小）
  if (ring.isDragging) {
    const now = performance.now();
    ring.dragHistory.push({ t: now, x: ring.x, y: ring.y });
    // 限制长度
    while (ring.dragHistory.length > 8) ring.dragHistory.shift();
  }

  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 鼠标交互（支持 touch）
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

canvas.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  const p = getPos(e);
  if (Math.hypot(p.x - ring.x, p.y - ring.y) <= ring.r + 8) {
    ring.isDragging = true;
    ring.dragHistory = [{ t: performance.now(), x: ring.x, y: ring.y }];
  }
});
canvas.addEventListener("mousemove", (e) => {
  if (!ring.isDragging) return;
  const p = getPos(e);
  ring.x = p.x;
  ring.y = p.y;
});
canvas.addEventListener("mouseup", (e) => {
  if (!ring.isDragging) return;
  ring.isDragging = false;
  // 根据 dragHistory 计算速度（取最后两点）
  const hist = ring.dragHistory;
  if (hist.length >= 2) {
    const a = hist[hist.length-2], b = hist[hist.length-1];
    const dt = (b.t - a.t) / 1000 || 0.016;
    const vx = (b.x - a.x) / dt;
    const vy = (b.y - a.y) / dt;
    // 限幅
    ring.vx = Math.max(-1500, Math.min(1500, vx * 1.0));
    ring.vy = Math.max(-2000, Math.min(2000, vy * 1.0));
  } else {
    ring.vx = (Math.random()*400 - 200);
    ring.vy = -600;
  }

  // 在短延时后检测结果（给 ring 一段时间飞行）
  setTimeout(checkResult, 800);
});

// Touch 支持
canvas.addEventListener("touchstart", (e)=>{ e.preventDefault(); const p = getPos(e); if (Math.hypot(p.x - ring.x, p.y - ring.y) <= ring.r+8) { ring.isDragging = true; ring.dragHistory = [{t:performance.now(), x:ring.x, y:ring.y}]; } }, {passive:false});
canvas.addEventListener("touchmove", (e)=>{ e.preventDefault(); if (!ring.isDragging) return; const p = getPos(e); ring.x = p.x; ring.y = p.y; }, {passive:false});
canvas.addEventListener("touchend", (e)=>{ e.preventDefault(); if (!ring.isDragging) return; ring.isDragging = false; const hist = ring.dragHistory; if (hist.length >= 2) { const a = hist[hist.length-2], b = hist[hist.length-1]; const dt = (b.t - a.t)/1000 || 0.016; ring.vx = Math.max(-1500, Math.min(1500,(b.x-a.x)/dt)); ring.vy = Math.max(-2000, Math.min(2000,(b.y-a.y)/dt)); } else { ring.vx = (Math.random()*400 - 200); ring.vy = -600; } setTimeout(checkResult, 800); }, {passive:false});

// 检查是否套中耳朵（简单判定）
function ringCoversEar(r, ear) {
  // 当耳朵圆完全在圈圈内部（粗略判定）
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
  // 复位圈圈
  ring.x = 140; ring.y = H - 100; ring.vx = 0; ring.vy = 0;
  ring.dragHistory = [];
}

// 支持重置积分
resetBtn.addEventListener("click", () => { points = 0; pointsEl.textContent = points; log("积分已重置"); });

// 初始绘制
draw();
log("预览已加载（钱包/支付功能未接入）", "info");
