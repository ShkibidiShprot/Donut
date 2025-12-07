const board = document.getElementById('board');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayBody = document.getElementById('overlayBody');

// State
let scale = 1;
const MIN_SCALE = 0.2;
const MAX_SCALE = 4.0;
let currentX = 0;
let currentY = 0;

// Input State
const evCache = [];
let prevDiff = -1;
let isDragging = false;
let animationFrameId = null;
let clickStartX = 0;
let clickStartY = 0;

// Apply Transform
function applyTransform() {
  board.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${scale})`;
}

// Render Loop (Decoupled from Event Loop)
function renderLoop() {
  if (isDragging || evCache.length > 0) {
    applyTransform();
    animationFrameId = requestAnimationFrame(renderLoop);
  }
}

// Initialization
function initBoard() {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  // Board Size: 2600x1600
  const boardCenterX = 1300;
  const boardCenterY = 800;
  
  scale = viewportW < 768 ? 0.5 : 0.8;

  currentX = (viewportW / 2) - (boardCenterX * scale);
  currentY = (viewportH / 2) - (boardCenterY * scale);
  
  applyTransform();
}

// --- Interaction Logic ---

function removeEvent(ev) {
  const index = evCache.findIndex((cachedEv) => cachedEv.pointerId === ev.pointerId);
  if (index > -1) evCache.splice(index, 1);
}

board.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.item') && evCache.length === 0) {
    clickStartX = e.clientX;
    clickStartY = e.clientY;
    return;
  }

  evCache.push(e);
  board.setPointerCapture(e.pointerId);
  isDragging = true;
  board.classList.add('dragging');

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(renderLoop);
});

board.addEventListener('pointermove', (e) => {
  const index = evCache.findIndex((cachedEv) => cachedEv.pointerId === e.pointerId);
  if (index > -1) evCache[index] = e;

  if (evCache.length === 2) {
    // Pinch Zoom
    const curDiff = Math.hypot(
      evCache[0].clientX - evCache[1].clientX,
      evCache[0].clientY - evCache[1].clientY
    );

    if (prevDiff > 0) {
      const zoomSensitivity = 0.005;
      const diffChange = curDiff - prevDiff;
      const zoomFactor = 1 + diffChange * zoomSensitivity;
      
      const midX = (evCache[0].clientX + evCache[1].clientX) / 2;
      const midY = (evCache[0].clientY + evCache[1].clientY) / 2;

      const newScale = Math.min(Math.max(scale * zoomFactor, MIN_SCALE), MAX_SCALE);
      
      const ratio = newScale / scale;
      currentX = midX - (midX - currentX) * ratio;
      currentY = midY - (midY - currentY) * ratio;
      
      scale = newScale;
    }
    prevDiff = curDiff;
  } else if (evCache.length === 1 && isDragging) {
    // Pan
    currentX += e.movementX;
    currentY += e.movementY;
  }
});

function handlePointerUp(e) {
  removeEvent(e);
  if (evCache.length < 2) prevDiff = -1;
  
  if (evCache.length === 0) {
    isDragging = false;
    board.classList.remove('dragging');
    cancelAnimationFrame(animationFrameId);
    applyTransform();
  }
  board.releasePointerCapture(e.pointerId);
}

board.addEventListener('pointerup', handlePointerUp);
board.addEventListener('pointercancel', handlePointerUp);
board.addEventListener('pointerout', handlePointerUp);
board.addEventListener('pointerleave', handlePointerUp);

// Mouse Wheel Zoom
window.addEventListener('wheel', (e) => {
  if (overlay.classList.contains('show')) return;
  if (e.ctrlKey) e.preventDefault();
  
  const zoomIntensity = 0.001;
  const factor = 1 - e.deltaY * zoomIntensity;
  let newScale = Math.min(Math.max(scale * factor, MIN_SCALE), MAX_SCALE);

  const ratio = newScale / scale;
  currentX = e.clientX - (e.clientX - currentX) * ratio;
  currentY = e.clientY - (e.clientY - currentY) * ratio;
  
  scale = newScale;
  applyTransform();
}, { passive: false });

// Item Click
function closeOverlay() {
  overlay.classList.remove('show');
  document.querySelectorAll('.item.active').forEach(el => el.classList.remove('active'));
}

board.addEventListener('click', (e) => {
  const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
  if (dist > 5) return;

  const item = e.target.closest('.item');
  if (item) {
    e.stopPropagation();
    document.querySelectorAll('.item.active').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    overlayTitle.textContent = item.dataset.title || 'Note';
    overlayBody.textContent = item.dataset.body || 'More details here.';
    overlay.classList.add('show');
  } else {
    closeOverlay();
  }
});

overlay.addEventListener('click', closeOverlay);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlay(); });

// Boot
initBoard();
window.addEventListener('resize', initBoard);

