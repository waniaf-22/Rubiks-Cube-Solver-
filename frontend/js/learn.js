/**
 * learn.js
 * ────────
 * Learning Center data (Beginner LBL, CFOP, Notation) and rendering logic.
 */

/* ── Learning content data ─────────────────────────────────────────────── */

const METHODS = {
  beginner: {
    label: 'Beginner (LBL)',
    steps: [
      {
        n: '01', title: 'White Cross', sub: '4 white edges first',
        content: `<div class="lc-phase">Step 1 of 7</div><h2 class="lc-h2">White Cross</h2>
          <p class="lc-p">Start by solving a white cross on the top face. Find the 4 white edge pieces and bring them home, making sure each edge's side color matches the center below it.</p>
          <p class="lc-p">Centers never move — they define each face color. Use this to guide your edge placement.</p>
          <div class="alg-block"><div class="alg-block-label">Edge stuck in bottom</div><div class="alg-block-code">F2</div></div>
          <div class="alg-block"><div class="alg-block-label">Edge in middle layer</div><div class="alg-block-code">U R F R'</div></div>
          <div class="tip-strip"><div class="tip-strip-icon">💡</div><div class="tip-strip-text">This step is mostly intuitive. No fixed algorithm needed — just think about each edge individually without disturbing others already placed.</div></div>`
      },
      {
        n: '02', title: 'White Corners', sub: 'Complete the white face',
        content: `<div class="lc-phase">Step 2 of 7</div><h2 class="lc-h2">White Corners</h2>
          <p class="lc-p">Place all 4 white corner pieces to complete the white face. Each corner belongs where its 3 colors match the surrounding centers.</p>
          <div class="alg-block"><div class="alg-block-label">Sexy Move — insert corner</div><div class="alg-block-code">R' D' R D</div></div>
          <p class="lc-p">Repeat this 1–5 times until the corner clicks into place. If the corner is stuck on top in the wrong spot, run it once to send it to the bottom first.</p>
          <div class="tip-strip"><div class="tip-strip-icon">⚠️</div><div class="tip-strip-text">Never push a white corner in from the top — always bring it to the bottom layer first, then insert from below.</div></div>`
      },
      {
        n: '03', title: 'Second Layer', sub: 'Middle 4 edges',
        content: `<div class="lc-phase">Step 3 of 7</div><h2 class="lc-h2">Second Layer Edges</h2>
          <p class="lc-p">Flip the cube so white is on the bottom. Find the 4 edge pieces in the top layer that have no yellow — those belong in the middle layer.</p>
          <div class="alg-block"><div class="alg-block-label">Insert edge → right</div><div class="alg-block-code">U R U' R' U' F' U F</div></div>
          <div class="alg-block"><div class="alg-block-label">Insert edge → left</div><div class="alg-block-code">U' L' U L U F U' F'</div></div>
          <div class="tip-strip"><div class="tip-strip-icon">💡</div><div class="tip-strip-text">Match the front color of the edge with the front center first, then choose left or right based on where it needs to go.</div></div>`
      },
      {
        n: '04', title: 'Yellow Cross', sub: 'OLL step 1',
        content: `<div class="lc-phase">Step 4 of 7</div><h2 class="lc-h2">Yellow Cross</h2>
          <p class="lc-p">Get a yellow cross on the top face. You'll see one of three patterns: a dot, an L-shape, or a line. Apply the algorithm from the correct orientation.</p>
          <div class="alg-block"><div class="alg-block-label">Cross algorithm</div><div class="alg-block-code">F R U R' U' F'</div></div>
          <p class="lc-p">Dot → run twice. L-shape → point the L to upper-left, run once. Line → hold horizontally, run once.</p>
          <div class="tip-strip"><div class="tip-strip-icon">💡</div><div class="tip-strip-text">Edge orientation on the cross doesn't need to match side centers yet — that comes later.</div></div>`
      },
      {
        n: '05', title: 'Orient Yellow', sub: 'Full yellow face',
        content: `<div class="lc-phase">Step 5 of 7</div><h2 class="lc-h2">Orient Yellow Corners</h2>
          <p class="lc-p">Get all yellow stickers facing up. Hold a mis-oriented corner at front-right, apply Sune until it's fixed, then U-turn to find the next one.</p>
          <div class="alg-block"><div class="alg-block-label">Sune</div><div class="alg-block-code">R U R' U R U2 R'</div></div>
          <div class="tip-strip"><div class="tip-strip-icon">⚠️</div><div class="tip-strip-text">The sides will look scrambled mid-algorithm — that's completely normal. Don't turn the cube body, only the U layer.</div></div>`
      },
      {
        n: '06', title: 'Permute Corners', sub: 'Corners in right slots',
        content: `<div class="lc-phase">Step 6 of 7</div><h2 class="lc-h2">Permute Corners</h2>
          <p class="lc-p">Place all 4 top corners in their correct positions. Find two adjacent corners sharing a side color.</p>
          <div class="alg-block"><div class="alg-block-label">3-corner cycle</div><div class="alg-block-code">U R U' L' U R' U' L</div></div>
          <div class="tip-strip"><div class="tip-strip-icon">💡</div><div class="tip-strip-text">If no corner is solved, run the algorithm once to get at least one correct, then use it as the anchor.</div></div>`
      },
      {
        n: '07', title: 'Permute Edges', sub: 'Cube solved! 🎉',
        content: `<div class="lc-phase">Step 7 of 7 — Final!</div><h2 class="lc-h2">Permute Edges</h2>
          <p class="lc-p">The final step. Cycle the 4 top edges into their correct positions.</p>
          <div class="alg-block"><div class="alg-block-label">Counter-clockwise cycle</div><div class="alg-block-code">F2 U L R' F2 L' R U F2</div></div>
          <div class="alg-block"><div class="alg-block-label">Clockwise cycle</div><div class="alg-block-code">F2 U' L R' F2 L' R U' F2</div></div>
          <div class="tip-strip"><div class="tip-strip-icon">🎉</div><div class="tip-strip-text">Your cube is solved! Practice until you're sub-5 minutes, then start learning CFOP to break 1 minute.</div></div>`
      },
    ]
  },

  cfop: {
    label: 'CFOP / Fridrich',
    steps: [
      {
        n: 'C', title: 'Cross', sub: 'Bottom layer in inspection',
        content: `<div class="lc-phase">CFOP · Step 1</div><h2 class="lc-h2">Cross</h2>
          <p class="lc-p">Unlike LBL, the CFOP cross is solved on the bottom. During the 15-second WCA inspection time, plan all 4 edges entirely in your head.</p>
          <div class="alg-block"><div class="alg-block-label">Target</div><div class="alg-block-code">≤8 moves, planned in inspection</div></div>
          <div class="tip-strip"><div class="tip-strip-icon">💡</div><div class="tip-strip-text">Practice cross-only solves daily. Color neutrality gives you flexibility to pick the easiest cross each solve.</div></div>`
      },
      {
        n: 'F', title: 'F2L', sub: '41 cases, intuitive',
        content: `<div class="lc-phase">CFOP · Step 2</div><h2 class="lc-h2">First Two Layers</h2>
          <p class="lc-p">F2L pairs a corner with its matching edge, then inserts both together into the correct slot simultaneously. There are 41 distinct cases.</p>
          <div class="alg-block"><div class="alg-block-label">Basic right slot</div><div class="alg-block-code">U R U' R'</div></div>
          <div class="alg-block"><div class="alg-block-label">Basic left slot</div><div class="alg-block-code">U' L' U L</div></div>
          <div class="tip-strip"><div class="tip-strip-icon">💡</div><div class="tip-strip-text">Learn F2L intuitively first — understand why each case works rather than memorizing 41 algorithms blind.</div></div>`
      },
      {
        n: 'O', title: 'OLL', sub: '57 algorithms',
        content: `<div class="lc-phase">CFOP · Step 3</div><h2 class="lc-h2">Orient Last Layer</h2>
          <p class="lc-p">Make all top-face stickers face up in one algorithm. 57 cases + skip. Beginners use 2-Look OLL (9 algorithms) as a stepping stone.</p>
          <div class="alg-block"><div class="alg-block-label">Sune</div><div class="alg-block-code">R U R' U R U2 R'</div></div>
          <div class="alg-block"><div class="alg-block-label">Anti-Sune</div><div class="alg-block-code">R' U' R U' R' U2 R</div></div>
          <div class="tip-strip"><div class="tip-strip-icon">💡</div><div class="tip-strip-text">Group OLL cases by how many yellow stickers you see on the sides (0, 2, or 4) to make recognition faster.</div></div>`
      },
      {
        n: 'P', title: 'PLL', sub: '21 algorithms',
        content: `<div class="lc-phase">CFOP · Step 4</div><h2 class="lc-h2">Permute Last Layer</h2>
          <p class="lc-p">Permute all last-layer pieces into their final positions. 21 cases + skip. A PLL skip happens ~1 in 72 solves.</p>
          <div class="alg-block"><div class="alg-block-label">T-Perm</div><div class="alg-block-code">R U R' U' R' F R2 U' R' U' R U R' F'</div></div>
          <div class="alg-block"><div class="alg-block-label">U-Perm (clockwise)</div><div class="alg-block-code">R2 U R U R' U' R' U' R' U R'</div></div>
          <div class="tip-strip"><div class="tip-strip-icon">💡</div><div class="tip-strip-text">2-Look PLL (6 algorithms) is a great start. Once you're sub-30s, invest time in full PLL recognition.</div></div>`
      },
    ]
  },

  notation: {
    label: 'Notation Guide',
    steps: [
      {
        n: '↻', title: 'Face Moves', sub: '6 faces × 3 variants',
        content: `<div class="lc-phase">Notation</div><h2 class="lc-h2">Face Move Notation</h2>
          <p class="lc-p">Each letter represents a face. No suffix = clockwise 90°. Apostrophe (') = counter-clockwise 90°. "2" = 180° turn.</p>
          <div class="notation-grid">${
            ["R","R'","R2","L","L'","L2","U","U'","U2","D","D'","D2","F","F'","F2","B","B'","B2"].map(m =>
              `<div class="notation-card"><div class="nm">${m}</div><div class="nn">${{R:'Right',L:'Left',U:'Top',D:'Bottom',F:'Front',B:'Back'}[m[0]]}</div><div class="nd">${m.includes("'")?'CCW':m.includes('2')?'180°':'CW'}</div></div>`
            ).join('')
          }</div>`
      },
      {
        n: '↕', title: 'Slice & Wide', sub: 'Middle layers',
        content: `<div class="lc-phase">Notation</div><h2 class="lc-h2">Slice & Wide Moves</h2>
          <p class="lc-p">Slice moves rotate the middle layers. Wide moves (lowercase) rotate a face plus the adjacent middle layer together.</p>
          <div class="notation-grid">
            <div class="notation-card"><div class="nm">M</div><div class="nn">Middle</div><div class="nd">Like L</div></div>
            <div class="notation-card"><div class="nm">E</div><div class="nn">Equator</div><div class="nd">Like D</div></div>
            <div class="notation-card"><div class="nm">S</div><div class="nn">Standing</div><div class="nd">Like F</div></div>
            <div class="notation-card"><div class="nm">r</div><div class="nn">Wide R</div><div class="nd">R + M'</div></div>
            <div class="notation-card"><div class="nm">u</div><div class="nn">Wide U</div><div class="nd">U + E'</div></div>
            <div class="notation-card"><div class="nm">f</div><div class="nn">Wide F</div><div class="nd">F + S</div></div>
          </div>`
      },
      {
        n: '⤳', title: 'Rotations', sub: 'Whole cube',
        content: `<div class="lc-phase">Notation</div><h2 class="lc-h2">Cube Rotations</h2>
          <p class="lc-p">Rotations move the entire cube without affecting its state. They change your viewing angle for easier finger execution.</p>
          <div class="notation-grid">
            <div class="notation-card"><div class="nm">x</div><div class="nn">x-axis</div><div class="nd">Like R</div></div>
            <div class="notation-card"><div class="nm">y</div><div class="nn">y-axis</div><div class="nd">Like U</div></div>
            <div class="notation-card"><div class="nm">z</div><div class="nn">z-axis</div><div class="nd">Like F</div></div>
            <div class="notation-card"><div class="nm">x'</div><div class="nn">x-axis</div><div class="nd">Like L</div></div>
            <div class="notation-card"><div class="nm">y'</div><div class="nn">y-axis</div><div class="nd">Like D</div></div>
            <div class="notation-card"><div class="nm">z'</div><div class="nn">z-axis</div><div class="nd">Like B</div></div>
          </div>
          <div class="tip-strip"><div class="tip-strip-icon">💡</div><div class="tip-strip-text">In algorithm sheets, rotations show you to reposition the cube for easier finger execution — not because the state requires it.</div></div>`
      },
    ]
  }
};

/* ── State ─────────────────────────────────────────────────────────────── */
let activeMethod = 'beginner';
let activeStep   = 0;

/* ── Render ──────────────────────────────────────────────────────────────── */

export function buildMethodPills() {
  const el = document.getElementById('methodPills');
  el.innerHTML = Object.entries(METHODS).map(([k, v]) =>
    `<button class="mpill${k === activeMethod ? ' active' : ''}"
             onclick="window.__switchMethod('${k}', this)">${v.label}</button>`
  ).join('');
}

window.__switchMethod = function(k, el) {
  activeMethod = k; activeStep = 0;
  document.querySelectorAll('.mpill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  renderLearn();
};

export function renderLearn() {
  const data = METHODS[activeMethod];
  const nav  = document.getElementById('stepsNav');

  nav.innerHTML = data.steps.map((s, i) =>
    `<button class="lstep${i === activeStep ? ' active' : ''}"
             onclick="window.__setLearnStep(${i})">
       <div class="lstep-num">${s.n}</div>
       <div>
         <div class="lstep-title">${s.title}</div>
         <div class="lstep-sub">${s.sub}</div>
       </div>
     </button>`
  ).join('');

  const s = data.steps[activeStep];
  document.getElementById('learnContent').innerHTML = s.content + `
    <div class="lc-nav">
      ${activeStep > 0
        ? `<button class="ibtn ibtn-ghost" onclick="window.__setLearnStep(${activeStep - 1})">← Previous</button>`
        : ''}
      ${activeStep < data.steps.length - 1
        ? `<button class="ibtn ibtn-blue" onclick="window.__setLearnStep(${activeStep + 1})">Next →</button>`
        : `<span style="font-size:0.85rem;color:var(--green);font-weight:600">✓ Section complete!</span>`}
    </div>`;
}

window.__setLearnStep = function(i) {
  activeStep = i;
  renderLearn();
};
