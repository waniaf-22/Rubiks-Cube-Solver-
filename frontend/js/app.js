/**
 * app.js
 * ──────
 * Main application entry point.
 *
 * Responsibilities:
 *  • Shared state (cubeState, scanned, curFace, …)
 *  • API call to POST /api/solve
 *  • Solution rendering, step navigation, progress bar, move flash
 *  • Demo loader, full reset
 *  • Alert helpers
 *  • Bootstrap: initialise all modules on DOMContentLoaded
 */

import { buildHeroCube }                          from './cube.js';
import { startCam, captureFace }                  from './camera.js';
import { buildSwatches, buildPaintGrid,
         buildFaceTabs, buildNet, saveManual }    from './painter.js';
import { buildMethodPills, renderLearn }          from './learn.js';

/* ── Constants ─────────────────────────────────────────────────────────── */

export const FC = {
  W: '#F0F0F0', R: '#EF4444', B: '#3B82F6',
  O: '#F97316', G: '#22C55E', Y: '#EAB308'
};

export const FD = { U:'W', D:'Y', F:'R', B:'O', L:'G', R:'B' };

export const FN = {
  U:'Top (U)', D:'Bottom (D)', F:'Front (F)',
  B:'Back (B)', L:'Left (L)', R:'Right (R)'
};

export const FACES = ['U','D','F','B','L','R'];

const API_BASE = '';   // Same-origin

/* ── Shared state ────────────────────────────────────────────────────────── */

export const state = {
  cubeState:   Object.fromEntries(FACES.map(f => [f, Array(9).fill(FD[f])])),
  scanned:     Object.fromEntries(FACES.map(f => [f, false])),
  curFace:     'U',
  selColor:    'W',
  paintColors: Array(9).fill('W'),
  solution:    [],
  curStep:     0,
};

/* ── State helpers ───────────────────────────────────────────────────────── */

export function updateFaceState(face, colors) {
  state.cubeState[face]  = colors;
  state.scanned[face]    = true;
  state.paintColors      = [...colors];
}

export function checkAllScanned() {
  if (FACES.every(f => state.scanned[f])) showAlert('aAll');
}

/* ── Alert helper ────────────────────────────────────────────────────────── */

export function showAlert(id) {
  document.querySelectorAll('.alert-strip').forEach(a => a.classList.remove('show'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 4000);
  }
}

/* ── Demo loader ─────────────────────────────────────────────────────────── */

export function loadDemo() {
  state.cubeState = {
    U: ['W','R','W','B','W','G','W','W','Y'],
    D: ['Y','Y','W','Y','Y','B','G','Y','Y'],
    F: ['R','G','R','R','R','O','R','B','R'],
    B: ['O','O','O','Y','O','O','O','O','R'],
    L: ['G','W','G','G','G','G','G','O','G'],
    R: ['B','B','Y','B','B','B','B','B','W'],
  };
  FACES.forEach(f => { state.scanned[f] = true; });
  state.paintColors = [...state.cubeState[state.curFace]];
  buildFaceTabs(); buildNet(); buildPaintGrid();
  showAlert('aAll');
  document.getElementById('camHint').textContent = 'Demo loaded — hit Generate Solution!';
}

/* ── Full reset ──────────────────────────────────────────────────────────── */

export function resetAll() {
  state.cubeState   = Object.fromEntries(FACES.map(f => [f, Array(9).fill(FD[f])]));
  state.scanned     = Object.fromEntries(FACES.map(f => [f, false]));
  state.curFace     = 'U';
  state.selColor    = 'W';
  state.solution    = [];
  state.curStep     = 0;
  state.paintColors = Array(9).fill('W');

  buildFaceTabs(); buildNet(); buildSwatches(); buildPaintGrid();
  document.getElementById('solCard').style.display = 'none';
  document.querySelectorAll('.alert-strip').forEach(a => a.classList.remove('show'));
}

/* ── Solution: API call ──────────────────────────────────────────────────── */

export async function generateSolution() {
  if (!FACES.every(f => state.scanned[f])) { showAlert('aWarn'); return; }

  state.solution = []; state.curStep = 0;

  try {
    const res  = await fetch(`${API_BASE}/api/solve`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ faces: state.cubeState }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Solver error');

    state.solution = data.solution;
    document.getElementById('solCard').style.display = 'flex';
    renderSolution();
    updateProgress();
  } catch (err) {
    document.getElementById('camHint').textContent = `Error: ${err.message}`;
    showAlert('aWarn');
  }
}

/* ── Solution: rendering ─────────────────────────────────────────────────── */

function renderSolution() {
  const el = document.getElementById('solSteps');
  el.innerHTML = '';
  let mi = 0;

  state.solution.forEach((s, i) => {
    if (s.type === 'phase') {
      const d = document.createElement('div');
      d.className   = 'phase-divider';
      d.style.color = s.color;
      d.textContent = s.name;
      el.appendChild(d);
    } else {
      mi++;
      const isDone = i < state.curStep;
      const isCur  = i === state.curStep;
      const row    = document.createElement('button');
      row.className = 'sol-step' + (isCur ? ' current' : isDone ? ' done' : '');
      row.onclick   = () => { state.curStep = i; renderSolution(); updateProgress(); };
      row.innerHTML = `
        <div class="sol-step-num ${isCur ? 'num-current' : isDone ? 'num-done' : 'num-pending'}">${isDone ? '✓' : mi}</div>
        <div class="sol-move">${s.move}</div>
        <div class="sol-desc">${s.desc}</div>
        <div class="sol-check">✓</div>`;
      el.appendChild(row);
    }
  });

  const cur = el.querySelector('.current');
  if (cur) cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function movesOnly() {
  return state.solution.map((s, i) => ({ ...s, i })).filter(s => s.type === 'move');
}

export function nextStep() {
  const moves = movesOnly();
  const ci    = moves.findIndex(m => m.i >= state.curStep);
  if (ci === -1)               state.curStep = moves[0]?.i || 0;
  else if (ci < moves.length - 1) state.curStep = moves[ci + 1].i;
  flashMove(); renderSolution(); updateProgress();
}

export function prevStep() {
  const moves = movesOnly();
  const ci    = moves.findIndex(m => m.i >= state.curStep);
  if (ci > 0)                      state.curStep = moves[ci - 1].i;
  else if (ci === 0 && moves.length) state.curStep = moves[moves.length - 1].i;
  renderSolution(); updateProgress();
}

function updateProgress() {
  const moves = movesOnly();
  const done  = moves.filter(m => m.i < state.curStep).length;
  const pct   = moves.length ? Math.round((done / moves.length) * 100) : 0;
  document.getElementById('pPct').textContent  = pct + '%';
  document.getElementById('pBar').style.width  = pct + '%';
}

function flashMove() {
  if (state.curStep < state.solution.length && state.solution[state.curStep]?.type === 'move') {
    const s = state.solution[state.curStep];
    document.getElementById('flashMove').textContent = s.move;
    document.getElementById('flashDesc').textContent = s.desc;
    const f = document.getElementById('moveFlash');
    f.classList.add('show');
    setTimeout(() => f.classList.remove('show'), 1600);
  }
}

/* ── Expose globals for HTML onclick handlers ────────────────────────────── */

window.__startCam          = startCam;
window.__captureFace       = captureFace;
window.__loadDemo          = loadDemo;
window.__resetAll          = resetAll;
window.__generateSolution  = generateSolution;
window.__saveManual        = saveManual;
window.__nextStep          = nextStep;
window.__prevStep          = prevStep;

/* ── Bootstrap ───────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  buildHeroCube();
  buildFaceTabs();
  buildNet();
  buildSwatches();
  buildPaintGrid();
  buildMethodPills();
  renderLearn();
});
