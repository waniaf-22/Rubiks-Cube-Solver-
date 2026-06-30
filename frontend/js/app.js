/**
 * app.js
 * ──────
 * Main application entry point.
 * Coordinates Flask API communication, CNN classifier metrics,
 * Three.js 3D Rubik's Cube state sync, and automated move playback.
 */

import { buildHeroCube }                          from './cube.js';
import { startCam, captureFace }                  from './camera.js';
import { buildSwatches, buildPaintGrid,
         buildFaceTabs, saveManual }              from './painter.js';
import { buildMethodPills, renderLearn }          from './learn.js';

import { initCube3D, animateMove, exportCubeState,
         importCubeState, resetCube3D }           from './cube3d.js';

/* ── Constants ─────────────────────────────────────────────────────────── */

export const FC = {
  W: '#EFEFEF',   // White
  R: '#C41E3A',   // Red
  B: '#1C4B8C',   // Blue
  O: '#FF5800',   // Orange
  G: '#009B48',   // Green
  Y: '#FFD500',   // Yellow
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
  cubeState:      Object.fromEntries(FACES.map(f => [f, Array(9).fill(FD[f])])),
  scrambledState: null, // Cache for restart
  scanned:        Object.fromEntries(FACES.map(f => [f, false])),
  curFace:        'U',
  selColor:       'W',
  paintColors:    Array(9).fill('W'),
  solution:       [],
  curStep:        0,
  solverMethod:   'kociemba',
  playbackActive: false
};

/* ── State helpers ───────────────────────────────────────────────────────── */

export function updateFaceState(face, colors) {
  state.cubeState[face]  = colors;
  state.scanned[face]    = true;
  state.paintColors      = [...colors];
  
  // Sync to 3D cube model
  importCubeState(state.cubeState);
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
  
  // Update 3D canvas
  importCubeState(state.cubeState);
  
  buildFaceTabs(); buildPaintGrid();
  showAlert('aAll');
  document.getElementById('camHint').textContent = 'Demo loaded — hit Generate Solution!';
}

/* ── Full reset ──────────────────────────────────────────────────────────── */

export function resetAll() {
  state.cubeState   = Object.fromEntries(FACES.map(f => [f, Array(9).fill(FD[f])]));
  state.scrambledState = null;
  state.scanned     = Object.fromEntries(FACES.map(f => [f, false]));
  state.curFace     = 'U';
  state.selColor    = 'W';
  state.solution    = [];
  state.curStep     = 0;
  state.paintColors = Array(9).fill('W');
  pauseSolution();

  // Reset 3D mesh colors
  resetCube3D();

  buildFaceTabs(); buildSwatches(); buildPaintGrid();
  document.getElementById('solCard').style.display = 'none';
  document.getElementById('metricsCard').style.display = 'none';
  document.getElementById('compCard').style.display = 'none';
  document.getElementById('kociembaInfoCard').style.display = 'none';
  document.getElementById('currentMoveNotation').textContent = '—';
  document.querySelectorAll('.alert-strip').forEach(a => a.classList.remove('show'));
}

/* ── Solution: API call ──────────────────────────────────────────────────── */

export async function generateSolution() {
  // Sync state from 3D model to ensure consistency
  state.cubeState = exportCubeState();
  
  // Automatically mark all faces as scanned when generating from 3D paint
  FACES.forEach(f => { state.scanned[f] = true; });
  
  state.solution = []; state.curStep = 0;
  pauseSolution();

  // Cache scrambled state for playback restart capability
  state.scrambledState = JSON.parse(JSON.stringify(state.cubeState));

  try {
    const res  = await fetch(`${API_BASE}/api/solve`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ faces: state.cubeState, method: state.solverMethod }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Solver error');

    // Populate solution
    state.solution = data.solution;
    document.getElementById('solCard').style.display = 'flex';
    renderSolution();
    updateProgress();

    // Render Academic metrics card
    document.getElementById('metricsCard').style.display = 'block';
    document.getElementById('metLength').textContent = data.total_moves;
    document.getElementById('metTime').textContent = `${data.solve_time_ms}ms`;
    document.getElementById('metRot').textContent = data.rotations;
    document.getElementById('metDepth').textContent = data.search_depth;
    document.getElementById('metDiff').textContent = data.difficulty;

    // Render comparison card
    document.getElementById('compCard').style.display = 'block';
    document.getElementById('compBegMoves').textContent = data.comparison.beginner.moves;
    document.getElementById('compBegTime').textContent = `${data.comparison.beginner.time_ms}ms`;
    document.getElementById('compKocMoves').textContent = data.comparison.kociemba.moves;
    document.getElementById('compKocTime').textContent = `${data.comparison.kociemba.time_ms}ms`;
    document.getElementById('compReductionPct').textContent = `${data.comparison.reduction_pct}%`;

    // Render educational explanation card for Kociemba solver
    const infoCard = document.getElementById('kociembaInfoCard');
    if (state.solverMethod === 'kociemba') {
      infoCard.style.display = 'block';
    } else {
      infoCard.style.display = 'none';
    }

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
      row.onclick   = async () => { 
        pauseSolution();
        state.curStep = i; 
        renderSolution(); 
        updateProgress();
      };
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

/** Execute a single move animation. */
export async function executeStep(stepIdx, speedMs) {
  if (stepIdx >= state.solution.length) return;
  const s = state.solution[stepIdx];
  if (s.type === 'move') {
    // Show move overlay flash
    flashMove(s.move, s.desc);
    
    // Display notation label
    document.getElementById('currentMoveNotation').textContent = s.move;

    // Animate 3D layers
    await animateMove(s.move, speedMs);
  }
}

export async function nextStep() {
  const moves = movesOnly();
  const ci    = moves.findIndex(m => m.i >= state.curStep);
  if (ci === -1) return;

  const currentMove = moves[ci];
  state.curStep = currentMove.i + 1;
  
  const speed = parseInt(document.getElementById('speedSlider').value);
  await executeStep(currentMove.i, speed);
  
  renderSolution(); 
  updateProgress();

  // Check solved status for confetti
  if (state.curStep >= state.solution.length) {
    pauseSolution();
    triggerSolvedCelebration();
  }
}

export async function prevStep() {
  const moves = movesOnly();
  const ci    = moves.findIndex(m => m.i >= state.curStep);
  
  let targetIdx = 0;
  if (ci > 0) {
    targetIdx = moves[ci - 1].i;
  } else if (ci === -1 && moves.length) {
    targetIdx = moves[moves.length - 1].i;
  } else {
    return;
  }
  
  state.curStep = targetIdx;
  
  // Revert orientation by re-applying base scramble state and stepping up
  importCubeState(state.scrambledState);
  for (let idx = 0; idx < targetIdx; idx++) {
    const s = state.solution[idx];
    if (s.type === 'move') {
      await animateMove(s.move, 0); // instant snap
    }
  }

  document.getElementById('currentMoveNotation').textContent = state.solution[targetIdx]?.move || '—';
  renderSolution(); 
  updateProgress();
}

function updateProgress() {
  const moves = movesOnly();
  const done  = moves.filter(m => m.i < state.curStep).length;
  const pct   = moves.length ? Math.round((done / moves.length) * 100) : 0;
  document.getElementById('pPct').textContent  = pct + '%';
  document.getElementById('pBar').style.width  = pct + '%';
}

function flashMove(move, desc) {
  document.getElementById('flashMove').textContent = move;
  document.getElementById('flashDesc').textContent = desc;
  const f = document.getElementById('moveFlash');
  f.classList.add('show');
  setTimeout(() => f.classList.remove('show'), 1200);
}

export function changeSolver() {
  state.solverMethod = document.getElementById('selSolver').value;
}

/* ── Automated Playback Controls ────────────────────────────────────────── */

export async function playSolution() {
  if (state.playbackActive) return;
  state.playbackActive = true;

  document.getElementById('btnPlay').style.display = 'none';
  document.getElementById('btnPause').style.display = 'inline-block';

  while (state.playbackActive && state.curStep < state.solution.length) {
    await nextStep();
  }

  pauseSolution();
}

export function pauseSolution() {
  state.playbackActive = false;
  const btnPlay = document.getElementById('btnPlay');
  const btnPause = document.getElementById('btnPause');
  if (btnPlay) btnPlay.style.display = 'inline-block';
  if (btnPause) btnPause.style.display = 'none';
}

export function restartSolution() {
  pauseSolution();
  state.curStep = 0;
  if (state.scrambledState) {
    importCubeState(state.scrambledState);
  } else {
    resetCube3D();
  }
  document.getElementById('currentMoveNotation').textContent = '—';
  renderSolution();
  updateProgress();
}

function triggerSolvedCelebration() {
  // CONFETTI!
  if (window.confetti) {
    window.confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  }
}

export async function loadMLReport() {
  try {
    const res = await fetch('/css/accuracy_report.txt');
    if (res.ok) {
      const text = await res.text();
      const el = document.getElementById('mlReport');
      if (el) el.textContent = text;
    }
    const img = document.getElementById('mlCM');
    if (img) img.src = `/css/confusion_matrix.png?t=${Date.now()}`;
  } catch(err) {
    console.error("Error loading ML report:", err);
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
window.__changeSolver      = changeSolver;
window.__loadMLReport      = loadMLReport;
window.__playSolution      = playSolution;
window.__pauseSolution     = pauseSolution;
window.__restartSolution   = restartSolution;

// Getter helper for 3D raycast painter
window.__getActiveSwatchColor = () => state.selColor;

/* ── Bootstrap ───────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  buildHeroCube();
  buildFaceTabs();
  buildPaintGrid();
  buildSwatches();
  buildMethodPills();
  renderLearn();
  loadMLReport();
  
  // Initialize the Three.js 3D Rubik's Cube Simulator inside solver tab
  initCube3D('cube3dContainer', (newState) => {
    // When user paints/modifies the 3D model, sync local structures
    state.cubeState = newState;
    buildFaceTabs();
  });
});
