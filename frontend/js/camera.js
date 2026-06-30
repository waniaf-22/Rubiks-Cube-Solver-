/**
 * camera.js
 * ─────────
 * Manages the webcam stream, continuous frame capture, live boundary overlays,
 * blurry frame rejection, color confidence scoring, temporal smoothing,
 * and 1-second auto-capture when the cube remains stable.
 */

import { state, FACES, FN, updateFaceState, checkAllScanned } from './app.js';
import { buildFaceTabs, buildNet } from './painter.js';
import { showAlert } from './app.js';

const API_BASE = '';

let mediaStream = null;
let activeLoop = false;
let trackingColors = null;
let stableStartTime = null;
const STABLE_DURATION_MS = 1000;  // 1.0s stability check

/** Start camera stream and begin continuous processing loop. */
export async function startCam() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    
    const v = document.getElementById('vidEl');
    v.srcObject = mediaStream;

    document.getElementById('camEmpty').style.display    = 'none';
    document.getElementById('scanOverlay').style.display = 'none'; // Replacing with custom canvas overlay
    document.getElementById('cvOverlay').style.display  = 'flex';
    document.getElementById('previewCard').style.display = 'block';
    document.getElementById('camPill').className         = 'status-pill on';
    document.getElementById('camPillText').textContent   = 'Live';
    document.getElementById('btnCap').disabled           = false;
    document.getElementById('camHint').textContent       = 'Align face in the tracker box';

    // Start live tracking loop
    activeLoop = True;
    requestAnimationFrame(trackingLoop);

  } catch (err) {
    document.getElementById('camHint').textContent = 'Camera denied — use manual input';
  }
}

/** Stop camera stream and stop loop. */
export function stopCam() {
  activeLoop = false;
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  document.getElementById('cvOverlay').style.display = 'none';
  document.getElementById('previewCard').style.display = 'none';
  
  // Clear tracking canvas
  const canvas = document.getElementById('trackerCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/** Continuous frame extraction and classification loop. */
async function trackingLoop() {
  if (!activeLoop || !mediaStream) return;

  const v  = document.getElementById('vidEl');
  const cv = document.getElementById('cvEl');
  
  // Wait until video has metadata and dimensions
  if (v.videoWidth > 0 && v.videoHeight > 0) {
    cv.width = 360; // Scale down for faster API transmission
    cv.height = Math.round(360 * (v.videoHeight / v.videoWidth));

    const ctx = cv.getContext('2d');
    ctx.drawImage(v, 0, 0, cv.width, cv.height);

    // Encode to base64
    const base64 = cv.toDataURL('image/jpeg', 0.80);

    try {
      const res = await fetch(`${API_BASE}/api/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();

      if (res.ok && activeLoop) {
        handleTrackingResult(data, cv.width, cv.height);
      }
    } catch (err) {
      console.error("Frame processing error:", err);
    }
  }

  // Poll again with a small throttle
  if (activeLoop) {
    setTimeout(() => {
      requestAnimationFrame(trackingLoop);
    }, 120);
  }
}

/** Render boundaries and handle stability auto-capture. */
function handleTrackingResult(data, frameW, frameH) {
  const canvas = document.getElementById('trackerCanvas');
  const v = document.getElementById('vidEl');
  
  // Resize overlay canvas to match display size of video element
  canvas.width = v.clientWidth;
  canvas.height = v.clientHeight;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update live status badges
  document.getElementById('cvStatus').textContent = data.status;
  document.getElementById('cvConf').textContent = `${data.confidence}%`;
  
  // Update live perspective warped preview image
  if (data.preview) {
    document.getElementById('liveWarped').src = data.preview;
  }

  const scaleX = canvas.width / frameW;
  const scaleY = canvas.height / frameH;

  // Draw detected outer boundary polygon
  if (data.detected && data.boundaries.length === 4) {
    ctx.beginPath();
    ctx.moveTo(data.boundaries[0][0] * scaleX, data.boundaries[0][1] * scaleY);
    for (let i = 1; i < 4; i++) {
      ctx.lineTo(data.boundaries[i][0] * scaleX, data.boundaries[i][1] * scaleY);
    }
    ctx.closePath();
    
    // Pulse green when confident, orange when scanning/blurry
    const confidenceColor = data.confidence >= 90 ? 'rgba(52,211,153,0.85)' : 'rgba(251,191,36,0.85)';
    ctx.strokeStyle = confidenceColor;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Draw outer boundary glow
    ctx.strokeStyle = data.confidence >= 90 ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Check stability for auto-capture
    if (data.confidence >= 95) {
      const colorsStr = JSON.stringify(data.colors);
      if (trackingColors === colorsStr) {
        if (!stableStartTime) {
          stableStartTime = Date.now();
        }
        
        const elapsed = Date.now() - stableStartTime;
        const progressPct = Math.min(100, (elapsed / STABLE_DURATION_MS) * 100);
        
        // Show stable progress bar
        document.getElementById('cvProgress').style.width = `${progressPct}%`;
        
        if (elapsed >= STABLE_DURATION_MS) {
          // Stable for 1 second -> Trigger Auto-Capture!
          triggerAutoCapture(data.colors);
        }
      } else {
        // State changed, reset timer
        trackingColors = colorsStr;
        stableStartTime = Date.now();
        document.getElementById('cvProgress').style.width = '0%';
      }
    } else {
      resetStabilityTimer();
    }
  } else {
    // Fallback: draw guide reticle in center
    resetStabilityTimer();
    drawGuideReticle(ctx, canvas.width, canvas.height);
  }
}

function resetStabilityTimer() {
  stableStartTime = null;
  trackingColors = null;
  document.getElementById('cvProgress').style.width = '0%';
}

/** Draw default scanning box when no cube is locked. */
function drawGuideReticle(ctx, w, h) {
  const size = Math.min(w, h) * 0.55;
  const x = (w - size) / 2;
  const y = (h - size) / 2;

  ctx.strokeStyle = 'rgba(79,142,247,0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(x, y, size, size);
  ctx.setLineDash([]);

  // Corner brackets
  ctx.strokeStyle = 'var(--blue)';
  ctx.lineWidth = 4;
  const len = 20;

  // Top Left
  ctx.beginPath(); ctx.moveTo(x + len, y); ctx.lineTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();
  // Top Right
  ctx.beginPath(); ctx.moveTo(x + size - len, y); ctx.lineTo(x + size, y); ctx.lineTo(x + size, y + len); ctx.stroke();
  // Bottom Left
  ctx.beginPath(); ctx.moveTo(x, y + size - len); ctx.lineTo(x, y + size); ctx.lineTo(x + len, y + size); ctx.stroke();
  // Bottom Right
  ctx.beginPath(); ctx.moveTo(x + size - len, y + size); ctx.lineTo(x + size, y + size); ctx.lineTo(x + size, y + size - len); ctx.stroke();
}

/** Execute auto-capture, play visual flash and advance. */
function triggerAutoCapture(colors) {
  resetStabilityTimer();
  
  // UI Flash effect
  const overlay = document.getElementById('trackerCanvas');
  overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
  setTimeout(() => {
    overlay.style.backgroundColor = 'transparent';
  }, 150);

  updateFaceState(state.curFace, colors);
  buildFaceTabs();
  buildNet();
  showAlert('aOk');
  checkAllScanned();

  // Advance to next unscanned face
  const next = FACES.find(f => !state.scanned[f]);
  if (next) {
    state.curFace = next;
    buildFaceTabs();
    document.getElementById('camHint').textContent = `Scanning: ${FN[next]}`;
  }
}

/** Manual capture override. */
export async function captureFace() {
  if (!mediaStream) { showAlert('aWarn'); return; }

  const v  = document.getElementById('vidEl');
  const cv = document.getElementById('cvEl');
  cv.width = v.videoWidth; cv.height = v.videoHeight;

  const ctx = cv.getContext('2d');
  ctx.drawImage(v, 0, 0);

  const base64 = cv.toDataURL('image/jpeg', 0.85);

  try {
    const res  = await fetch(`${API_BASE}/api/detect`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ image: base64 }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Detection failed');

    triggerAutoCapture(data.colors);
  } catch (err) {
    document.getElementById('camHint').textContent = `Error: ${err.message}`;
    showAlert('aError');
  }
}
