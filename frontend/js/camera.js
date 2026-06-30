/**
 * camera.js
 * ─────────
 * Manages the webcam stream, face capture, and canvas-based pixel sampling.
 * On capture, the image is base64-encoded and sent to the backend
 * POST /api/detect endpoint; the returned 9 colour codes are used to update
 * the shared cube state.
 */

import { state, FACES, FN, updateFaceState, checkAllScanned } from './app.js';
import { buildFaceTabs, buildNet } from './painter.js';
import { showAlert } from './app.js';

const API_BASE = '';   // Same origin — Flask serves both API and frontend

let mediaStream = null;

/**
 * Start the device camera and show the live feed + scan overlay.
 */
export async function startCam() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 } }
    });
    const v = document.getElementById('vidEl');
    v.srcObject = mediaStream;

    document.getElementById('camEmpty').style.display    = 'none';
    document.getElementById('scanOverlay').style.display = 'block';
    document.getElementById('camPill').className         = 'status-pill on';
    document.getElementById('camPillText').textContent   = 'Live';
    document.getElementById('btnCap').disabled           = false;
    document.getElementById('camHint').textContent       = 'Align face in the guide box';
  } catch (err) {
    document.getElementById('camHint').textContent = 'Camera denied — use manual input';
  }
}

/**
 * Capture the current video frame, send it to the backend for colour detection,
 * and update the cube state with the returned 9 colour codes.
 */
export async function captureFace() {
  if (!mediaStream) { showAlert('aWarn'); return; }

  const v  = document.getElementById('vidEl');
  const cv = document.getElementById('cvEl');
  cv.width = v.videoWidth; cv.height = v.videoHeight;

  const ctx = cv.getContext('2d');
  ctx.drawImage(v, 0, 0);

  // Encode canvas to base64 JPEG
  const base64 = cv.toDataURL('image/jpeg', 0.85);

  try {
    const res  = await fetch(`${API_BASE}/api/detect`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ image: base64 }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Detection failed');

    updateFaceState(state.curFace, data.colors);
    buildFaceTabs();
    buildNet();
    showAlert('aOk');
    checkAllScanned();

    // Auto-advance to next unscanned face
    const next = FACES.find(f => !state.scanned[f]);
    if (next) {
      state.curFace = next;
      buildFaceTabs();
      document.getElementById('camHint').textContent = `Scanning: ${FN[next]}`;
    }
  } catch (err) {
    document.getElementById('camHint').textContent = `Error: ${err.message}`;
    showAlert('aError');
  }
}

/** Stop camera stream and clean up. */
export function stopCam() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
}
