# CubeSolve — Academic Rubik's Cube Solver & CV Scanner

> Full-stack web application: **Python (Flask) backend** + **HTML/CSS/JavaScript frontend**

![Python](https://img.shields.io/badge/Backend-Python%20%2F%20Flask-3776AB?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/Frontend-HTML%20%2F%20CSS%20%2F%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## Project Structure

```
Rubiks-Cube-Solver-/
│
├── backend/                     ← Python / Flask
│   ├── app.py                   # REST API server (Flask)
│   ├── solver.py                # Dual Solver (LBL + Kociemba Two-Phase)
│   ├── color_detect.py          # OpenCV CV scanning pipeline
│   ├── pykociemba/              # Pure Python Two-Phase search engine & lookup tables
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Environment variables template
│
├── frontend/                    ← Pure HTML / CSS / JavaScript
│   ├── index.html               # App shell (semantic HTML only)
│   ├── css/
│   │   └── style.css            # All styles
│   └── js/
│       ├── app.js               # Entry point — API calls, metrics rendering
│       ├── cube.js              # 3D CSS hero cube + drag-rotate
│       ├── camera.js            # Webcam stream + live overlays + auto-capture
│       ├── painter.js           # Manual paint grid, swatches, cube net
│       └── learn.js             # Learning Center (LBL / CFOP / Notation)
│
├── .gitignore
└── README.md
```

---

## Features

| Feature | Description |
|---|---|
| OpenCV Scanner | Contours, polygon approximation, and perspective transformation to warp and isolate the cube face |
| Auto-Capture | Automatic capture once the cube is aligned and remains stable for 1.0 second with >95% confidence |
| HSV Classification | Robust color detection in HSV space, with gray-world white balance and blur rejection |
| Dual Solving Engine | Support for both Beginner (LBL) and Kociemba Two-Phase (near-optimal) algorithms |
| Performance Stats | Live metrics tracking: solution length, solve time (ms), rotations, search depth, difficulty |
| Solver Comparison | Dashboard illustrating move count, solve time, and percentage reduction between solvers |
| Phase Explanation | Educational breakdown describing Kociemba's Phase 1 (orientation) and Phase 2 (permutation) |
| Flask REST API | `/api/solve`, `/api/detect`, and `/api/health` endpoints |
| Zero Frontend Deps | Vanilla HTML/CSS/JS ES Modules — no npm, no bundlers |

---

## Getting Started

### Prerequisites
- Python 3.10+
- pip

### 1. Clone the repo

```bash
git clone https://github.com/waniaf-22/Rubiks-Cube-Solver-.git
cd Rubiks-Cube-Solver-
```

### 2. Set up the backend

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the server

```bash
python app.py
```

The app is now live at **http://localhost:5000**

Flask serves both the API and the frontend — no separate server needed.

---

## API Reference

### `GET /api/health`
```json
{ "status": "ok", "version": "1.0.0" }
```

---

### `POST /api/solve`

**Request body:**
```json
{
  "faces": {
    "U": ["W","W","W","W","W","W","W","W","W"],
    "D": ["Y","Y","Y","Y","Y","Y","Y","Y","Y"],
    "F": ["B","B","B","R","R","R","R","R","R"],
    "R": ["O","O","O","B","B","B","B","B","B"],
    "B": ["G","G","G","O","O","O","O","O","O"],
    "L": ["R","R","R","G","G","G","G","G","G"]
  },
  "method": "kociemba"
}
```

**Response:**
```json
{
  "solution": [
    { "type": "phase", "name": "Phase 1: Subgroup H Orientation", "color": "#00B8FF" },
    { "type": "move",  "move": "U'", "desc": "Top face counter-clockwise" }
  ],
  "total_moves": 1,
  "solve_time_ms": 0.544,
  "rotations": 0,
  "difficulty": "Advanced (Optimal)",
  "search_depth": 1,
  "comparison": {
    "beginner": { "moves": 47, "time_ms": 0.239 },
    "kociemba": { "moves": 1, "time_ms": 0.544 },
    "reduction_pct": 97.9
  }
}
```

---

### `POST /api/detect`

**Request body:**
```json
{ "image": "<base64-encoded JPEG or PNG>" }
```

**Response:**
```json
{
  "detected": true,
  "colors": ["W","R","G","B","O","Y","W","W","R"],
  "boundaries": [[120, 80], [320, 80], [320, 280], [120, 280]],
  "confidence": 98,
  "status": "Good Lighting",
  "sharpness": 85.0,
  "preview": "data:image/jpeg;base64,..."
}
```

---

## How to Use

### Method A — Camera Scanner
1. Open **http://localhost:5000**
2. Click **Start Camera** and grant camera permissions.
3. Align the Rubik's Cube face in the center guide box.
4. When aligned properly, the live tracker will draw boundaries and display colors.
5. Hold the cube stable for **1 second**; the scanner will play a camera flash and auto-capture the face.
6. Rotate the cube to the next unscanned face and repeat for all 6 faces.
7. Click **Generate Solution** to calculate the metrics.

### Method B — Manual Paint
1. Select a color from the swatches.
2. Click stickers on the Face Grid to paint.
3. Click **Save Face**, repeat for all 6 faces, then click **Generate Solution**.

### Method C — Demo
Click **Demo** to load a pre-scrambled cube instantly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask, Flask-CORS, OpenCV (`opencv-python`), Numpy |
| Solving Engine | Herbert Kociemba's Two-Phase Algorithm (`pykociemba` with pre-compiled lookup tables) |
| Frontend | HTML5, CSS3 (3D transforms, custom styling overlays), Vanilla JS (ES Modules) |
| Camera | Web `getUserMedia` API + `<canvas>` boundary rendering |
| Fonts | Google Fonts — Inter + Space Grotesk |

---

## License

MIT — free to use, modify, and distribute.