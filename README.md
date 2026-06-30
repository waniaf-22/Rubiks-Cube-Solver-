# 🧊 CubeSolve — AI-Powered Rubik's Cube Solver

> Full-stack web application: **Python (Flask) backend** + **HTML/CSS/JavaScript frontend**

![Python](https://img.shields.io/badge/Backend-Python%20%2F%20Flask-3776AB?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/Frontend-HTML%20%2F%20CSS%20%2F%20JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## 🏗️ Project Structure

```
Rubiks-Cube-Solver-/
│
├── backend/                     ← Python / Flask
│   ├── app.py                   # REST API server (Flask)
│   ├── solver.py                # 7-phase LBL solving algorithm
│   ├── color_detect.py          # RGB colour classification (Pillow)
│   ├── requirements.txt         # Python dependencies
│   └── .env.example             # Environment variables template
│
├── frontend/                    ← Pure HTML / CSS / JavaScript
│   ├── index.html               # App shell (semantic HTML only)
│   ├── css/
│   │   └── style.css            # All styles
│   └── js/
│       ├── app.js               # Entry point — API calls, solution rendering
│       ├── cube.js              # 3D CSS hero cube + drag-rotate
│       ├── camera.js            # Webcam stream + face capture
│       ├── painter.js           # Manual paint grid, swatches, cube net
│       └── learn.js             # Learning Center (LBL / CFOP / Notation)
│
├── rubiks-cube-solver.html      # Legacy single-file version (kept for reference)
├── .gitignore
└── README.md
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 📷 **Camera Scanning** | Captures each face via webcam; backend classifies colours via Pillow |
| 🎨 **Manual Color Input** | Click-to-paint grid when no camera is available |
| ⚡ **Flask REST API** | `/api/solve`, `/api/detect`, `/api/health` endpoints |
| 🧠 **Python Solver** | 7-phase LBL algorithm in `solver.py` with full validation |
| 🎨 **Colour Detection** | Euclidean RGB distance classifier in `color_detect.py` |
| 📖 **Learning Center** | Beginner LBL + CFOP + Notation guides (built into frontend) |
| 💡 **Pro Tips** | Speed techniques, hardware tuning, muscle memory guides |
| 🌐 **Zero Frontend Deps** | Vanilla HTML/CSS/JS ES Modules — no npm, no bundler |

---

## 🚀 Getting Started

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

The app is now live at **http://localhost:5000** 🎉

Flask serves both the API **and** the frontend — no separate server needed.

---

## 🔌 API Reference

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
    "F": ["R","R","R","R","R","R","R","R","R"],
    "B": ["O","O","O","O","O","O","O","O","O"],
    "L": ["G","G","G","G","G","G","G","G","G"],
    "R": ["B","B","B","B","B","B","B","B","B"]
  }
}
```

**Response:**
```json
{
  "solution": [
    { "type": "phase", "name": "White Cross",  "color": "#6BA3FF" },
    { "type": "move",  "move": "R",   "desc": "Right face clockwise" },
    { "type": "move",  "move": "U'",  "desc": "Top face counter-clockwise" },
    ...
  ],
  "total_moves": 42
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
{ "colors": ["W","R","G","B","O","Y","W","W","R"] }
```
Returns 9 colour codes in row-major order (top-left → bottom-right).

---

## 🧠 Algorithm Overview

```
Phase 1 → White Cross       (4–6  moves)
Phase 2 → White Corners     (3–8  moves)
Phase 3 → Second Layer      (6–10 moves)
Phase 4 → Yellow Cross      (4–7  moves)
Phase 5 → Orient Corners    (4–8  moves)
Phase 6 → Permute Corners   (4–8  moves)
Phase 7 → Permute Edges     (4–8  moves) → SOLVED ✅
```

Cube colour detection uses **Euclidean distance in RGB space** — each pixel cluster is matched to the nearest of the 6 standard cube colours via `color_detect.py`.

---

## 🕹️ How to Use

### Method A — Camera
1. Open **http://localhost:5000**
2. Click **Start Camera** and allow access
3. Hold each face within the guide box → **Capture Face**
4. Repeat for all 6 faces → **⚡ Generate Solution**
5. Step through moves with **Next →**

### Method B — Manual Paint
1. Select a colour from the swatches
2. Click stickers on the **Face Grid** to paint
3. **Save Face** → repeat for all 6 → **Generate Solution**

### Method C — Demo
Click **Demo** to load a pre-scrambled cube instantly.

---

## 📐 Colour Keys

| Key | Colour | Face |
|---|---|---|
| `W` | White | Top (U) |
| `Y` | Yellow | Bottom (D) |
| `R` | Red | Front (F) |
| `O` | Orange | Back (B) |
| `G` | Green | Left (L) |
| `B` | Blue | Right (R) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3, Flask, Flask-CORS, Pillow |
| **Frontend** | HTML5, CSS3 (Grid, 3D transforms, animations), Vanilla JS (ES Modules) |
| **Camera** | Web `getUserMedia` API + `<canvas>` pixel sampling |
| **Fonts** | Google Fonts — Inter + Space Grotesk |
| **Build** | None — zero bundler, zero npm |

---

## 🤝 Contributing

Ideas for improvement:
- [ ] Implement Kociemba's algorithm (true optimal solver)
- [ ] Animated 3D cube that plays back each move
- [ ] HSV / Lab colour space for better camera detection
- [ ] Timer + solve history tracking
- [ ] PWA / offline support

```bash
git checkout -b feature/your-feature
git commit -m "Add your feature"
git push origin feature/your-feature
# Open a Pull Request
```

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">
  <strong>43,252,003,274,489,856,000 possibilities. Let's solve yours. 🧊</strong>
</div>