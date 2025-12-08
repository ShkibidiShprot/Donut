const CONFIG = {
  zoomSensitivity: 0.01,
  pinchZoomSpeed: 0.005,
  dragSpeed: 1.0,
  minScale: 0.25,
  maxScale: 5.0
};

const board = document.getElementById('board');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayBody = document.getElementById('overlayBody');
const boardStyle = board.style;

let scale = 1;
let currentX = 0;
let currentY = 0;

const evCache = [];
let prevDiff = -1;
let isDragging = false;
let clickStartX = 0;
let clickStartY = 0;
let currentActiveItem = null;

let needsUpdate = false;
let animationFrameId = null;

function initBoard() {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const boardCenterX = 1300;
  const boardCenterY = 800;
  
  scale = viewportW < 768 ? 0.45 : 0.8;
  currentX = (viewportW / 2) - (boardCenterX * scale);
  currentY = (viewportH / 2) - (boardCenterY * scale);
  
  requestUpdate();
}

function requestUpdate() {
  needsUpdate = true;
  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(renderLoop);
  }
}

function renderLoop() {
  if (needsUpdate) {
    const x = Math.round(currentX * 100) / 100;
    const y = Math.round(currentY * 100) / 100;
    const s = Math.round(scale * 1000) / 1000;
    boardStyle.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
    needsUpdate = false;
  }
  
  if (isDragging || evCache.length > 0) {
    animationFrameId = requestAnimationFrame(renderLoop);
  } else {
    animationFrameId = null;
  }
}

function removeEvent(ev) {
  for (let i = 0; i < evCache.length; i++) {
    if (evCache[i].pointerId === ev.pointerId) {
      evCache.splice(i, 1);
      break;
    }
  }
}

board.addEventListener('pointerdown', (e) => {
  if (evCache.length === 0 && e.target.closest('.item')) {
    clickStartX = e.clientX;
    clickStartY = e.clientY;
    return;
  }

  evCache.push(e);
  board.setPointerCapture(e.pointerId);
  isDragging = true;
  board.classList.add('dragging');
  requestUpdate();
});

board.addEventListener('pointermove', (e) => {
  const index = evCache.findIndex((cachedEv) => cachedEv.pointerId === e.pointerId);
  if (index > -1) evCache[index] = e;

  if (evCache.length === 2) {
    const xDiff = evCache[0].clientX - evCache[1].clientX;
    const yDiff = evCache[0].clientY - evCache[1].clientY;
    const curDiff = Math.hypot(xDiff, yDiff);

    if (prevDiff > 0) {
      const zoomFactor = 1 + (curDiff - prevDiff) * CONFIG.pinchZoomSpeed;
      const newScale = Math.max(CONFIG.minScale, Math.min(scale * zoomFactor, CONFIG.maxScale));
      
      const midX = (evCache[0].clientX + evCache[1].clientX) / 2;
      const midY = (evCache[0].clientY + evCache[1].clientY) / 2;

      const ratio = newScale / scale;
      currentX = midX - (midX - currentX) * ratio;
      currentY = midY - (midY - currentY) * ratio;
      
      scale = newScale;
      requestUpdate();
    }
    prevDiff = curDiff;

  } else if (evCache.length === 1 && isDragging) {
    currentX += e.movementX * CONFIG.dragSpeed;
    currentY += e.movementY * CONFIG.dragSpeed;
    requestUpdate();
  }
});

function handlePointerUp(e) {
  removeEvent(e);
  if (evCache.length < 2) prevDiff = -1;
  if (evCache.length === 0) {
    isDragging = false;
    board.classList.remove('dragging');
    if (needsUpdate) renderLoop(); 
  }
  if (board.hasPointerCapture(e.pointerId)) {
    board.releasePointerCapture(e.pointerId);
  }
}

board.addEventListener('pointerup', handlePointerUp);
board.addEventListener('pointercancel', handlePointerUp);
board.addEventListener('pointerout', handlePointerUp);
board.addEventListener('pointerleave', handlePointerUp);

window.addEventListener('wheel', (e) => {
  if (overlay.classList.contains('show')) return;
  if (e.ctrlKey) e.preventDefault();
  
  const zoomFactor = 1 - e.deltaY * CONFIG.zoomSensitivity;
  const newScale = Math.max(CONFIG.minScale, Math.min(scale * zoomFactor, CONFIG.maxScale));

  const ratio = newScale / scale;
  currentX = e.clientX - (e.clientX - currentX) * ratio;
  currentY = e.clientY - (e.clientY - currentY) * ratio;
  
  scale = newScale;
  requestUpdate();
}, { passive: false });

function closeOverlay() {
  overlay.classList.remove('show');
  if (currentActiveItem) {
    currentActiveItem.classList.remove('active');
    currentActiveItem = null;
  }
}

board.addEventListener('click', (e) => {
  const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
  if (dist > 5) return;

  const item = e.target.closest('.item');
  if (item) {
    e.stopPropagation();
    if (currentActiveItem && currentActiveItem !== item) {
      currentActiveItem.classList.remove('active');
    }
    item.classList.add('active');
    currentActiveItem = item;
    overlayTitle.textContent = item.dataset.title || 'Note';
    overlayBody.textContent = item.dataset.body || 'Details';
    overlay.classList.add('show');
  } else {
    closeOverlay();
  }
});

overlay.addEventListener('click', closeOverlay);

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(initBoard, 100);
}, { passive: true });

document.addEventListener('keydown', (e) => { 
  if (e.key === 'Escape') closeOverlay(); 
});

initBoard();
