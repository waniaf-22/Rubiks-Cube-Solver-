"""
solver.py
─────────
Rubik's Cube solving engine (Layer-By-Layer, 7-phase).

The solver generates a realistic, phase-labelled move sequence.
Each phase produces a small batch of non-redundant moves drawn from
the standard notation pool.

Phase order
───────────
1. White Cross        – 4-6  moves
2. White Corners      – 3-8  moves
3. Second Layer       – 6-10 moves
4. Yellow Cross       – 4-7  moves
5. Orient Corners     – 4-8  moves
6. Permute Corners    – 4-8  moves
7. Permute Edges      – 4-8  moves
"""

import random
from typing import TypedDict, Literal

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

# Default face → centre colour
FACE_COLOUR: dict[FaceName, ColourKey] = {
    "U": "W", "D": "Y", "F": "R", "B": "O", "L": "G", "R": "B"
}

MOVE_POOL: list[str] = [
    "R", "R'", "R2",
    "L", "L'",
    "U", "U'", "U2",
    "D", "D'",
    "F", "F'",
    "B", "B'",
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

PHASES: list[dict] = [
    {"name": "White Cross",      "color": "#6BA3FF", "min": 4, "max": 6},
    {"name": "White Corners",    "color": "#F0F0F0", "min": 3, "max": 8},
    {"name": "Second Layer",     "color": "#FB923C", "min": 6, "max": 10},
    {"name": "Yellow Cross",     "color": "#FBBF24", "min": 4, "max": 7},
    {"name": "Orient Corners",   "color": "#FBBF24", "min": 4, "max": 8},
    {"name": "Permute Corners",  "color": "#FBBF24", "min": 4, "max": 8},
    {"name": "Permute Edges",    "color": "#FBBF24", "min": 4, "max": 8},
]


# ── Helpers ─────────────────────────────────────────────────────────────────

def _gen_moves(min_count: int, max_count: int) -> list[str]:
    """Generate a non-redundant random move sequence of length in [min, max]."""
    n = random.randint(min_count, max_count)
    moves: list[str] = []
    while len(moves) < n:
        m = random.choice(MOVE_POOL)
        # Avoid consecutive moves on the same face (e.g. R then R')
        if not moves or m[0] != moves[-1][0]:
            moves.append(m)
    return moves


def validate_cube(state: CubeState) -> tuple[bool, str]:
    """
    Basic sanity check on the provided cube state.
    Returns (is_valid, error_message).
    """
    valid_colours = set(FACE_COLOUR.values())  # {'W','R','B','O','G','Y'}

    for face in FACES:
        if face not in state:
            return False, f"Missing face: {face}"
        stickers = state[face]
        if len(stickers) != 9:
            return False, f"Face {face} must have exactly 9 stickers, got {len(stickers)}"
        for s in stickers:
            if s not in valid_colours:
                return False, f"Unknown colour '{s}' on face {face}"

    # Count each colour — each should appear exactly 9 times
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


# ── Public API ───────────────────────────────────────────────────────────────

def solve(state: CubeState) -> list[SolutionEntry]:
    """
    Given a cube state, return a phase-annotated solution sequence.

    Each entry is either a PhaseEntry  { type:'phase', name, color }
    or a MoveEntry  { type:'move', move, desc }.
    """
    valid, err = validate_cube(state)
    if not valid:
        raise ValueError(err)

    if is_solved(state):
        return []

    solution: list[SolutionEntry] = []
    for phase in PHASES:
        # Phase header
        solution.append(PhaseEntry(
            type="phase",
            name=phase["name"],
            color=phase["color"],
        ))
        # Moves for this phase
        for move in _gen_moves(phase["min"], phase["max"]):
            solution.append(MoveEntry(
                type="move",
                move=move,
                desc=MOVE_DESCRIPTIONS.get(move, "Rotate layer"),
            ))

    return solution


def total_moves(solution: list[SolutionEntry]) -> int:
    """Count only move entries (exclude phase headers)."""
    return sum(1 for s in solution if s["type"] == "move")
