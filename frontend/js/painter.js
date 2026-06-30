/**
 * painter.js
 * ──────────
 * Manual colour-paint grid, colour swatches, cube net visualiser,
 * and face-tab row. All UI that shows / edits the local cube state.
 */

import { state, FACES, FN, FC, updateFaceState, checkAllScanned } from './app.js';
import { showAlert } from './app.js';

/* ── Colour swatches ─────────────────────────────────────────────────────── */

export function buildSwatches() {
  const el = document.getElementById('swatches');
  el.innerHTML = Object.entries(FC).map(([k, v]) =>
    `<div class="swatch${k === state.selColor ? ' sel' : ''}"
          style="background:${v}"
          onclick="window.__pickColor('${k}', this)"></div>`
  ).join('');
}

window.__pickColor = function(c, el) {
  state.selColor = c;
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('sel'));
  el.classList.add('sel');
};

/* ── Paint grid ──────────────────────────────────────────────────────────── */

export function buildPaintGrid() {
  const el = document.getElementById('paintGrid');
  el.innerHTML = '';
  state.paintColors.forEach((c, i) => {
    const cell = document.createElement('div');
    cell.className = 'paint-cell';
    cell.style.background = FC[c];
    cell.onclick = () => {
      state.paintColors[i] = state.selColor;
      cell.style.background = FC[state.selColor];
    };
    el.appendChild(cell);
  });
}

export function saveManual() {
  updateFaceState(state.curFace, [...state.paintColors]);
  buildFaceTabs();
  buildNet();
  showAlert('aOk');
  checkAllScanned();
}

/* ── Face tabs ───────────────────────────────────────────────────────────── */

export function buildFaceTabs() {
  const el = document.getElementById('faceTabs');
  el.innerHTML = FACES.map(f =>
    `<button class="ftab${f === state.curFace ? ' active' : ''}${state.scanned[f] ? ' done' : ''}"
             id="ft-${f}"
             onclick="window.__selectFace('${f}')">
       ${state.scanned[f] ? '✓ ' : ''}${FN[f]}
     </button>`
  ).join('');
}

window.__selectFace = function(f) {
  state.curFace    = f;
  state.paintColors = [...state.cubeState[f]];
  buildFaceTabs();
  buildPaintGrid();
  document.getElementById('camHint').textContent = `Scanning: ${FN[f]}`;
};

/* ── Cube net ────────────────────────────────────────────────────────────── */

export function buildNet() {
  const layout = [
    [null, 'U', null, null],
    ['L',  'F', 'R',  'B' ],
    [null, 'D', null, null],
  ];
  const el = document.getElementById('netGrid');
  el.innerHTML = '';

  layout.forEach(row => row.forEach(f => {
    const cell = document.createElement('div');
    cell.className = 'net-slot' + (f ? '' : ' empty');

    if (f) {
      const lbl = document.createElement('div');
      lbl.className = 'net-face-label';
      lbl.style.color = state.scanned[f] ? 'var(--green)' : 'var(--white-25)';
      lbl.textContent = f + (state.scanned[f] ? ' ✓' : '');

      const grid = document.createElement('div');
      grid.className = 'net-stickers';

      state.cubeState[f].forEach((c, i) => {
        const s = document.createElement('div');
        s.className   = 'net-s';
        s.style.cssText = `background:${FC[c] || '#1e1e2a'};${i === 4 ? 'outline:2px solid rgba(255,255,255,0.4)' : ''}`;
        grid.appendChild(s);
      });

      cell.appendChild(lbl);
      cell.appendChild(grid);
    }
    el.appendChild(cell);
  }));
}
