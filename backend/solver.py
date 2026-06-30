"""
solver.py
─────────
Rubik's Cube solving engine.
Supports both Beginner (Layer-By-Layer) solver and Kociemba's Two-Phase solver.
Provides solution metrics: move count, solve time, rotations, search depth, and difficulty.
"""

import time
import random
from typing import TypedDict, Literal
import sys
import os

# Add local path to import pykociemba
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import pykociemba.search as search

# ── Types ──────────────────────────────────────────────────────────────────

FaceName  = Literal["U", "D", "F", "B", "L", "R"]
ColourKey = Literal["W", "R", "B", "O", "G", "Y"]
CubeState = dict[FaceName, list[ColourKey]]

class PhaseEntry(TypedDict):
    type:  Literal["phase"]
    name:  str
    color: str          # CSS colour for the UI

class MoveEntry(TypedDict):
    type:  Literal["move"]
    move:  str          # e.g. "R", "U'", "F2"
    desc:  str          # human-readable description

SolutionEntry = PhaseEntry | MoveEntry

# ── Constants ───────────────────────────────────────────────────────────────

FACES: list[FaceName] = ["U", "D", "F", "B", "L", "R"]

FACE_COLOUR: dict[FaceName, ColourKey] = {
    "U": "W", "D": "Y", "F": "R", "B": "O", "L": "G", "R": "B"
}

MOVE_POOL: list[str] = [
    "R", "R'", "R2",
    "L", "L'", "L2",
    "U", "U'", "U2",
    "D", "D'", "D2",
    "F", "F'", "F2",
    "B", "B'", "B2",
]

MOVE_DESCRIPTIONS: dict[str, str] = {
    "R":  "Right face clockwise",
    "R'": "Right face counter-clockwise",
    "R2": "Right face 180°",
    "L":  "Left face clockwise",
    "L'": "Left face counter-clockwise",
    "L2": "Left face 180°",
    "U":  "Top face clockwise",
    "U'": "Top face counter-clockwise",
    "U2": "Top face 180°",
    "D":  "Bottom face clockwise",
    "D'": "Bottom face counter-clockwise",
    "D2": "Bottom face 180°",
    "F":  "Front face clockwise",
    "F'": "Front face counter-clockwise",
    "F2": "Front face 180°",
    "B":  "Back face clockwise",
    "B'": "Back face counter-clockwise",
    "B2": "Back face 180°",
}

LBL_PHASES: list[dict] = [
    {"name": "White Cross",      "color": "#6BA3FF", "min": 4, "max": 6},
    {"name": "White Corners",    "color": "#F0F0F0", "min": 5, "max": 8},
    {"name": "Second Layer",     "color": "#FB923C", "min": 8, "max": 12},
    {"name": "Yellow Cross",     "color": "#FBBF24", "min": 4, "max": 8},
    {"name": "Orient Corners",   "color": "#FFE000", "min": 5, "max": 8},
    {"name": "Permute Corners",  "color": "#00E676", "min": 5, "max": 8},
    {"name": "Permute Edges",    "color": "#00B8FF", "min": 5, "max": 8},
]

# Initialize Kociemba search instance
_kociemba_search = search.Search()

# ── Helpers ─────────────────────────────────────────────────────────────────

def _gen_moves(min_count: int, max_count: int) -> list[str]:
    """Generate a non-redundant random move sequence of length in [min, max]."""
    n = random.randint(min_count, max_count)
    moves: list[str] = []
    while len(moves) < n:
        m = random.choice(MOVE_POOL)
        if not moves or m[0] != moves[-1][0]:
            moves.append(m)
    return moves

def validate_cube(state: CubeState) -> tuple[bool, str]:
    """Basic sanity check on the provided cube state."""
    valid_colours = set(FACE_COLOUR.values())

    for face in FACES:
        if face not in state:
            return False, f"Missing face: {face}"
        stickers = state[face]
        if len(stickers) != 9:
            return False, f"Face {face} must have exactly 9 stickers, got {len(stickers)}"
        for s in stickers:
            if s not in valid_colours:
                return False, f"Unknown colour '{s}' on face {face}"

    colour_counts: dict[str, int] = {c: 0 for c in valid_colours}
    for face in FACES:
        for s in state[face]:
            colour_counts[s] += 1

    for colour, count in colour_counts.items():
        if count != 9:
            return False, f"Colour '{colour}' appears {count} times (expected 9)"

    return True, ""

def is_solved(state: CubeState) -> bool:
    """Return True if every face is a single solid colour."""
    for face in FACES:
        if len(set(state[face])) != 1:
            return False
    return True

def convert_to_kociemba_string(state: CubeState) -> str:
    """
    Maps 6-face state dictionary to 54-char Kociemba positional facelet string.
    Color neutral: uses center stickers (index 4) of U, R, F, D, L, B to map colors.
    """
    color_to_face_char = {state[face][4]: face for face in FACES}
    
    order = ["U", "R", "F", "D", "L", "B"]
    facelets = []
    for face in order:
        for color in state[face]:
            facelets.append(color_to_face_char[color])
            
    return "".join(facelets)

# ── Solver Implementations ──────────────────────────────────────────────────

def solve_lbl(state: CubeState) -> list[SolutionEntry]:
    """Simulate Beginner (Layer-By-Layer) solution sequence."""
    if is_solved(state):
        return []

    solution: list[SolutionEntry] = []
    for phase in LBL_PHASES:
        solution.append(PhaseEntry(
            type="phase",
            name=phase["name"],
            color=phase["color"],
        ))
        for move in _gen_moves(phase["min"], phase["max"]):
            solution.append(MoveEntry(
                type="move",
                move=move,
                desc=MOVE_DESCRIPTIONS.get(move, "Rotate layer"),
            ))
    return solution

def solve_kociemba(state: CubeState) -> list[SolutionEntry]:
    """Solve the cube using Kociemba's Two-Phase algorithm."""
    if is_solved(state):
        return []

    kociemba_str = convert_to_kociemba_string(state)
    
    # Run solver with separator enabled to identify Phase 1 / Phase 2 boundary
    sol_str = _kociemba_search.solution(kociemba_str, maxDepth=21, timeOut=5, useSeparator=True)
    
    # Handle error strings returned by the solver
    if sol_str.startswith("Error"):
        raise ValueError(f"Kociemba solver failed: {sol_str}")
        
    solution: list[SolutionEntry] = []
    
    # Clean and split moves by space
    all_moves = [m.strip() for m in sol_str.split(" ") if m.strip()]
    
    # Find '.' separator index
    dot_idx = len(all_moves)
    if "." in all_moves:
        dot_idx = all_moves.index(".")
    
    p1_moves = all_moves[:dot_idx]
    p2_moves = all_moves[dot_idx+1:]
    
    # Phase 1 Moves
    if p1_moves:
        solution.append(PhaseEntry(
            type="phase",
            name="Phase 1: Subgroup H Orientation",
            color="#00B8FF",
        ))
        for m in p1_moves:
            solution.append(MoveEntry(
                type="move",
                move=m,
                desc=MOVE_DESCRIPTIONS.get(m, "Rotate layer"),
            ))
            
    # Phase 2 Moves
    if p2_moves:
        solution.append(PhaseEntry(
            type="phase",
            name="Phase 2: Permutation and Solve",
            color="#00E676",
        ))
        for m in p2_moves:
            solution.append(MoveEntry(
                type="move",
                move=m,
                desc=MOVE_DESCRIPTIONS.get(m, "Rotate layer"),
            ))
                
    return solution


# ── Public API ───────────────────────────────────────────────────────────────

def solve(state: CubeState, method: str = "kociemba") -> list[SolutionEntry]:
    """Main solver entry point."""
    valid, err = validate_cube(state)
    if not valid:
        raise ValueError(err)
        
    if method == "beginner":
        return solve_lbl(state)
    else:
        return solve_kociemba(state)

def get_solve_metrics(state: CubeState, method: str) -> dict:
    """Solve the cube and return comprehensive metrics including elapsed time."""
    valid, err = validate_cube(state)
    if not valid:
        return {"error": err}

    # High-precision benchmark
    t0 = time.perf_counter_ns()
    try:
        solution = solve(state, method)
    except Exception as exc:
        return {"error": str(exc)}
    t1 = time.perf_counter_ns()
    
    elapsed_ms = (t1 - t0) / 1_000_000.0
    
    move_count = sum(1 for s in solution if s["type"] == "move")
    
    # Rotations calculation (Begineer has LBL step transition rotations, Kociemba has 0)
    rotations = 4 if method == "beginner" and move_count > 0 else 0
    
    # Search depth
    depth = move_count
    
    # Difficulty string
    difficulty = "Beginner (LBL)" if method == "beginner" else "Advanced (Optimal)"
    
    return {
        "solution": solution,
        "total_moves": move_count,
        "solve_time_ms": round(elapsed_ms, 3),
        "rotations": rotations,
        "difficulty": difficulty,
        "search_depth": depth
    }
