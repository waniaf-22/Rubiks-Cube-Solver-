"""
app.py
──────
Flask REST API server for CubeSolve.

Endpoints
─────────
GET  /                      → Serves frontend/index.html
GET  /css/<path>            → Serves frontend/css/
GET  /js/<path>             → Serves frontend/js/
GET  /api/health            → { status: "ok" }
POST /api/solve             → { faces: {...} } → { solution: [...] }
POST /api/detect            → { image: "<base64>" } → { colors: [...] }
"""

import base64
import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, abort
from flask_cors import CORS

from solver import solve, validate_cube
from color_detect import detect_face_from_image, classify_colour

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
          }
        }

    Response:
        {
          "solution": [
            { "type": "phase", "name": "White Cross", "color": "#6BA3FF" },
            { "type": "move",  "move": "R",  "desc": "Right face clockwise" },
            ...
          ],
          "total_moves": 42
        }
    """
    data = request.get_json(silent=True)
    if not data or "faces" not in data:
        return jsonify({"error": "Request body must contain a 'faces' object"}), 400

    faces = data["faces"]

    valid, err = validate_cube(faces)
    if not valid:
        return jsonify({"error": err}), 422

    try:
        solution = solve(faces)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 422
    except Exception as exc:
        app.logger.exception("Unexpected solver error")
        return jsonify({"error": "Internal solver error"}), 500

    total = sum(1 for s in solution if s["type"] == "move")
    return jsonify({"solution": solution, "total_moves": total})

# ── API: Detect colours from image ────────────────────────────────────────────

@app.post("/api/detect")
def api_detect():
    """
    Request body:
        {
          "image": "<base64-encoded image data (JPEG or PNG)>"
        }

    Response:
        {
          "colors": ["W","R","G","B","O","Y","W","W","R"]   // 9 values, row-major
        }
    """
    data = request.get_json(silent=True)
    if not data or "image" not in data:
        return jsonify({"error": "Request body must contain an 'image' field"}), 400

    # Strip data-URL prefix if present  (data:image/jpeg;base64,...)
    raw = data["image"]
    if "," in raw:
        raw = raw.split(",", 1)[1]

    try:
        image_bytes = base64.b64decode(raw)
    except Exception:
        return jsonify({"error": "Invalid base64 image data"}), 400

    try:
        colours = detect_face_from_image(image_bytes)
    except Exception as exc:
        app.logger.exception("Colour detection error")
        return jsonify({"error": f"Colour detection failed: {exc}"}), 500

    return jsonify({"colors": colours})

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    print(f"\n  [*] CubeSolve API  ->  http://localhost:{port}")
    print(f"  [*] Frontend       ->  http://localhost:{port}/\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
