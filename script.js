var C = { zoom: .01, pinch: .005, min: .25, max: 5 };
var board = document.getElementById('board');
var overlay = document.getElementById('overlay');
var oTitle = document.getElementById('overlayTitle');
var oBody = document.getElementById('overlayBody');

var scale = 1, cx = 0, cy = 0;
var dx = 0, dy = 0, ix = 0, iy = 0;
var ev = [], pDiff = -1, drag = false;
var clkX = 0, clkY = 0, active = null;
var raf = null, needUp = false;

var items = [];
var vw = 0, vh = 0;
var visRaf = null;

function init() {
  vw = window.innerWidth;
  vh = window.innerHeight;
  scale = vw < 768 ? .35 : .7;
  cx = (vw / 2) - (1300 * scale);
  cy = (vh / 2) - (800 * scale);
  items = board.querySelectorAll('.item');
  upd();
  checkVis();
}

function upd() {
  needUp = true;
  if (!raf) raf = requestAnimationFrame(loop);
}

function loop() {
  if (needUp) {
    board.style.transform = 'translate3d(' + (cx | 0) + 'px,' + (cy | 0) + 'px,0) scale(' + scale.toFixed(3) + ')';
    needUp = false;
  }
  raf = (drag || ev.length) ? requestAnimationFrame(loop) : null;
}

function checkVis() {
  if (visRaf) return;
  visRaf = requestAnimationFrame(function() {
    visRaf = null;
    var pad = 100;
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      var x = parseFloat(el.style.left) || 0;
      var y = parseFloat(el.style.top) || 0;
      var w = el.offsetWidth || 200;
      var h = el.offsetHeight || 200;

      var sx = cx + x * scale;
      var sy = cy + y * scale;
      var sw = w * scale;
      var sh = h * scale;

      var vis = !(sx + sw < -pad || sx > vw + pad || sy + sh < -pad || sy > vh + pad);

      if (vis) {
        if (el.classList.contains('offscreen')) el.classList.remove('offscreen');
      } else {
        if (!el.classList.contains('offscreen')) el.classList.add('offscreen');
      }
    }
  });
}

function rmEv(e) {
  for (var i = 0; i < ev.length; i++) {
    if (ev[i].pointerId === e.pointerId) { ev.splice(i, 1); break; }
  }
}

board.addEventListener('pointerdown', function(e) {
  if (!ev.length && e.target.closest('.item')) { clkX = e.clientX; clkY = e.clientY; return; }
  ev.push(e);
  board.setPointerCapture(e.pointerId);
  drag = true;
  board.className = 'board dragging';
  dx = e.clientX; dy = e.clientY;
  ix = cx; iy = cy;
  upd();
});

board.addEventListener('pointermove', function(e) {
  var i = -1;
  for (var j = 0; j < ev.length; j++) if (ev[j].pointerId === e.pointerId) { i = j; break; }
  if (i > -1) ev[i] = e;

  if (ev.length === 2) {
    var d = Math.hypot(ev[0].clientX - ev[1].clientX, ev[0].clientY - ev[1].clientY);
    if (pDiff > 0) {
      var z = 1 + (d - pDiff) * C.pinch;
      var ns = Math.max(C.min, Math.min(scale * z, C.max));
      var mx = (ev[0].clientX + ev[1].clientX) / 2;
      var my = (ev[0].clientY + ev[1].clientY) / 2;
      var r = ns / scale;
      cx = mx - (mx - cx) * r;
      cy = my - (my - cy) * r;
      ix = cx; iy = cy; dx = mx; dy = my;
      scale = ns;
      upd();
      checkVis();
    }
    pDiff = d;
  } else if (ev.length === 1 && drag) {
    cx = ix + (e.clientX - dx);
    cy = iy + (e.clientY - dy);
    upd();
    checkVis();
  }
});

function pUp(e) {
  rmEv(e);
  if (ev.length < 2) pDiff = -1;
  if (!ev.length) { drag = false; board.className = 'board'; checkVis(); }
  if (board.hasPointerCapture(e.pointerId)) board.releasePointerCapture(e.pointerId);
}

board.addEventListener('pointerup', pUp);
board.addEventListener('pointercancel', pUp);

window.addEventListener('wheel', function(e) {
  if (overlay.className.indexOf('show') > -1) return;
  if (e.ctrlKey) e.preventDefault();
  var z = 1 - e.deltaY * C.zoom;
  var ns = Math.max(C.min, Math.min(scale * z, C.max));
  var r = ns / scale;
  cx = e.clientX - (e.clientX - cx) * r;
  cy = e.clientY - (e.clientY - cy) * r;
  scale = ns;
  ix = cx; iy = cy; dx = e.clientX; dy = e.clientY;
  upd();
  checkVis();
}, { passive: false });

function close() {
  overlay.className = 'overlay';
  if (active) { active.classList.remove('active'); active = null; }
}

board.addEventListener('click', function(e) {
  if (Math.hypot(e.clientX - clkX, e.clientY - clkY) > 5) return;
  var it = e.target.closest('.item');
  if (it) {
    e.stopPropagation();
    if (active && active !== it) active.classList.remove('active');
    it.classList.add('active');
    active = it;
    oTitle.textContent = it.dataset.title || 'Note';
    oBody.innerHTML = (it.dataset.body || '').replace(/\n/g, '<br>');
    overlay.className = 'overlay show';
  } else close();
});

overlay.addEventListener('click', close);
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') close(); });

var rt;
window.addEventListener('resize', function() {
  clearTimeout(rt);
  rt = setTimeout(function() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    init();
  }, 100);
}, { passive: true });

init();