"""
app.py
──────
Flask REST API server for CubeSolve.
Serves static frontend assets and exposes solving & detection APIs.
"""

import base64
import os
import time
from pathlib import Path
import numpy as np
import cv2

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from solver import get_solve_metrics, validate_cube
from color_detect import detect_cube_face

# ── App setup ────────────────────────────────────────────────────────────────

BASE_DIR     = Path(__file__).resolve().parent          # …/backend/
FRONTEND_DIR = BASE_DIR.parent / "frontend"             # …/frontend/

app = Flask(__name__, static_folder=None)
CORS(app)   # Allow cross-origin requests from browser

# ── Frontend static serving ───────────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the main frontend page."""
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/css/<path:filename>")
def serve_css(filename: str):
    return send_from_directory(FRONTEND_DIR / "css", filename)

@app.route("/js/<path:filename>")
def serve_js(filename: str):
    return send_from_directory(FRONTEND_DIR / "js", filename)

# ── API: Health check ─────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "version": "1.0.0"})

# ── API: Solve ────────────────────────────────────────────────────────────────

@app.post("/api/solve")
def api_solve():
    """
    Request body:
        {
          "faces": {
            "U": ["W","W","W","W","W","W","W","W","W"],
            "D": [...],
            "F": [...],
            "B": [...],
            "L": [...],
            "R": [...]
          },
          "method": "beginner" or "kociemba" (default: "kociemba")
        }

    Response:
        {
          "solution": [...],
          "total_moves": 19,
          "solve_time_ms": 12.34,
          "rotations": 0,
          "difficulty": "Advanced (Optimal)",
          "search_depth": 19,
          "comparison": {
            "beginner": { "moves": 58, "time_ms": 235.1 },
            "kociemba": { "moves": 19, "time_ms": 8.4 },
            "reduction_pct": 67.2
          }
        }
    """
    data = request.get_json(silent=True)
    if not data or "faces" not in data:
        return jsonify({"error": "Request body must contain a 'faces' object"}), 400

    faces = data["faces"]
    method = data.get("method", "kociemba")
    if method not in ["beginner", "kociemba"]:
        method = "kociemba"

    valid, err = validate_cube(faces)
    if not valid:
        return jsonify({"error": err}), 422

    # Benchmark both solvers for comparative dashboard
    beg_res = get_solve_metrics(faces, "beginner")
    koc_res = get_solve_metrics(faces, "kociemba")

    if "error" in beg_res:
        return jsonify({"error": f"Beginner solver error: {beg_res['error']}"}), 422
    if "error" in koc_res:
        return jsonify({"error": f"Kociemba solver error: {koc_res['error']}"}), 422

    # Compute move reduction percentage
    beg_moves = beg_res["total_moves"]
    koc_moves = koc_res["total_moves"]
    reduction = 0.0
    if beg_moves > 0:
        reduction = round(((beg_moves - koc_moves) / beg_moves) * 100, 1)

    comparison = {
        "beginner": {
            "moves": beg_moves,
            "time_ms": beg_res["solve_time_ms"]
        },
        "kociemba": {
            "moves": koc_moves,
            "time_ms": koc_res["solve_time_ms"]
        },
        "reduction_pct": max(0.0, reduction)
    }

    # Selected solver payload
    selected = beg_res if method == "beginner" else koc_res

    return jsonify({
        "solution": selected["solution"],
        "total_moves": selected["total_moves"],
        "solve_time_ms": selected["solve_time_ms"],
        "rotations": selected["rotations"],
        "difficulty": selected["difficulty"],
        "search_depth": selected["search_depth"],
        "comparison": comparison
    })

# ── API: Detect colours from image ────────────────────────────────────────────

@app.post("/api/detect")
def api_detect():
    """
    Continuous color & contour detection API.
    Processes frame using OpenCV pipeline and returns live tracking data.
    """
    data = request.get_json(silent=True)
    if not data or "image" not in data:
        return jsonify({"error": "Request body must contain an 'image' field"}), 400

    raw = data["image"]
    if "," in raw:
        raw = raw.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(raw)
    except Exception:
        return jsonify({"error": "Invalid base64 image data"}), 400

    try:
        # Decode BGR image for OpenCV processing
        arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({"error": "Could not decode image"}), 400

        # Run professional pipeline
        res = detect_cube_face(img)
        
    except Exception as exc:
        app.logger.exception("Colour detection error")
        return jsonify({"error": f"Colour detection failed: {exc}"}), 500

    return jsonify(res)

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    print(f"\n  [*] CubeSolve API  ->  http://localhost:{port}")
    print(f"  [*] Frontend       ->  http://localhost:{port}/\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
