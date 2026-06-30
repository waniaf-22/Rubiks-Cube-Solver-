# 🧊 CubeSolve — AI-Powered Rubik's Cube Solver

> Point your camera at each face. Get the fastest path to solved — move by move, in real time.

![CubeSolve Banner](https://img.shields.io/badge/CubeSolve-AI%20Powered-4F8EF7?style=for-the-badge&logo=cube&logoColor=white)
![HTML](https://img.shields.io/badge/Built%20With-HTML%20%2F%20CSS%20%2F%20JS-orange?style=for-the-badge)
![No Dependencies](https://img.shields.io/badge/Dependencies-None-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## ✨ Features

| Feature | Description |
|---|---|
| 📷 **Camera Scanning** | Use your device camera to scan all 6 faces — AI reads each color automatically |
| 🎨 **Manual Color Input** | Click-to-paint grid for entering cube state without a camera |
| ⚡ **Step-by-Step Solution** | Generates a complete move sequence using a layered solving algorithm |
| 📖 **Learning Center** | Built-in tutorials for Beginner Layer-By-Layer and CFOP methods |
| 💡 **Pro Tips** | Finger tricks, look-ahead techniques, hardware tuning guides |
| 🎲 **Demo Mode** | Load a pre-scrambled cube instantly to try the solver |
| 🌐 **Zero Dependencies** | Pure HTML + CSS + JavaScript — no libraries, no install, no login |

---

## 🚀 Getting Started

### Option 1 — Open Directly
Just open `rubiks-cube-solver.html` in any modern browser. No server needed.

```bash
# Clone the repo
git clone https://github.com/waniaf-22/Rubiks-Cube-Solver-.git
cd Rubiks-Cube-Solver-

# Open in browser (Windows)
start rubiks-cube-solver.html

# Open in browser (macOS/Linux)
open rubiks-cube-solver.html
```

### Option 2 — Live Server (optional)
If you prefer a local server (e.g. for camera access over localhost):

```bash
# Using VS Code Live Server extension, or:
npx serve .
```

> **Note:** Camera scanning requires HTTPS or `localhost`. If you open the file directly (`file://`), use Manual Color Input instead.

---

## 🕹️ How to Use

### Method A — Camera Scan
1. Click **Start Camera** and allow browser camera access
2. Hold each face of your Rubik's Cube in front of the camera
3. Align it within the scan guide box, then click **Capture Face**
4. Repeat for all **6 faces** (Top, Bottom, Front, Back, Left, Right)
5. Click **⚡ Generate Solution**
6. Follow the move-by-move steps shown in the sidebar

### Method B — Manual Input
1. Select a color from the swatch palette
2. Click the stickers on the **Face Grid** to paint each cell
3. Click **Save Face** when done
4. Repeat for all 6 faces, then click **⚡ Generate Solution**

### Method C — Demo Mode
Click the **Demo** button to load a pre-scrambled cube and try the solver instantly.

---

## 🧠 Algorithm Overview

The solver uses a **layered (beginner) solving strategy** broken into phases:

```
Phase 1 → White Cross (top layer edges)
Phase 2 → White Corners (complete top layer)
Phase 3 → Middle Layer Edges
Phase 4 → Yellow Cross (bottom layer)
Phase 5 → Orient Yellow Corners
Phase 6 → Permute Yellow Corners
Phase 7 → Permute Yellow Edges → SOLVED ✅
```

Color detection from the camera is done via **Euclidean distance in RGB space** — each sampled pixel cluster is matched to the nearest of the 6 standard cube colors (White, Red, Blue, Orange, Green, Yellow).

---

## 📖 Learning Center

CubeSolve includes an interactive **Learning Center** with two solving methods:

- **Beginner (Layer-by-Layer)** — 7 intuitive steps, ideal for first-timers
- **CFOP (Fridrich Method)** — Cross, F2L, OLL, PLL — the method used by speedcubers

Each step includes:
- Plain-English explanation
- Algorithm notation blocks (e.g. `R U R' U'`)
- Practical tips and common mistakes

---

## 📐 Notation Reference

| Move | Meaning |
|---|---|
| `R` | Right face clockwise |
| `R'` | Right face counter-clockwise |
| `R2` | Right face 180° |
| `U` | Top face clockwise |
| `U'` | Top face counter-clockwise |
| `F` | Front face clockwise |
| `F'` | Front face counter-clockwise |
| `L` | Left face clockwise |
| `D` | Bottom face clockwise |
| `B` | Back face clockwise |

---

## 🎯 Cube Facts

| Stat | Value |
|---|---|
| Possible cube states | 43,252,003,274,489,856,000 (~43 quintillion) |
| God's Number (max optimal moves) | **20** |
| WCA World Record | **3.47s** — Max Park |
| Average beginner solve | ~50 moves |

---

## 🛠️ Tech Stack

- **HTML5** — Semantic structure, `<video>` for camera, `<canvas>` for pixel sampling
- **CSS3** — CSS Grid, 3D transforms (`preserve-3d`), CSS animations, scroll-snap
- **Vanilla JavaScript** — Camera API (`getUserMedia`), canvas color detection, solving logic
- **Google Fonts** — Inter + Space Grotesk
- **No frameworks. No build tools. No dependencies.**

---

## 📁 Project Structure

```
Rubiks-Cube-Solver-/
│
└── rubiks-cube-solver.html   # Complete app — all HTML, CSS & JS in one file
```

---

## 🤝 Contributing

Contributions are welcome! Here are some ideas:

- [ ] Implement a true optimal solver (Kociemba's algorithm)
- [ ] Add 3D animated cube that visualizes each move
- [ ] Improve camera color detection accuracy (HSV / Lab color space)
- [ ] Add timer / solve history tracking
- [ ] Mobile PWA support

To contribute:
```bash
git fork https://github.com/waniaf-22/Rubiks-Cube-Solver-.git
git checkout -b feature/your-feature
git commit -m "Add your feature"
git push origin feature/your-feature
# Open a Pull Request
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).

---

<div align="center">
  <strong>43,252,003,274,489,856,000 possibilities. Let's solve yours. 🧊</strong>
</div>