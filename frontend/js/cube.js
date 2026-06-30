/**
 * cube.js
 * ───────
 * Renders the animated 3D CSS cube on the hero section and wires up
 * mouse + touch drag-to-rotate interaction.
 */

const FC = { W:'#F0F0F0', R:'#EF4444', B:'#3B82F6', O:'#F97316', G:'#22C55E', Y:'#EAB308' };
const FD = { U:'W', D:'Y', F:'R', B:'O', L:'G', R:'B' };

/**
 * Build the 3D hero cube: fills each face with 9 solid-coloured stickers
 * and attaches mouse / touch drag-to-rotate listeners.
 */
export function buildHeroCube() {
  const faceMap = { front:'F', back:'B', left:'L', right:'R', top:'U', bottom:'D' };

  ['front','back','left','right','top','bottom'].forEach(f => {
    const el = document.getElementById('hcf-' + f);
    if (!el) return;
    const colour = FD[faceMap[f]];
    el.innerHTML = Array(9).fill(
      `<div class="csticker" style="background:${FC[colour]}"></div>`
    ).join('');
  });

  // Drag-to-rotate
  const scene = document.getElementById('heroCubeScene');
  const cube  = document.getElementById('heroCube');
  if (!scene || !cube) return;

  let drag = false, lx = 0, ly = 0, rx = -22, ry = 35;

  scene.addEventListener('mousedown', e => {
    drag = true; lx = e.clientX; ly = e.clientY;
    cube.style.animation = 'none';
    cube.style.transition = 'none';
  });
  window.addEventListener('mouseup', () => { drag = false; });
  window.addEventListener('mousemove', e => {
    if (!drag) return;
    ry += (e.clientX - lx) * 0.45;
    rx -= (e.clientY - ly) * 0.45;
    lx = e.clientX; ly = e.clientY;
    cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  });

  scene.addEventListener('touchstart', e => {
    drag = true;
    lx = e.touches[0].clientX; ly = e.touches[0].clientY;
    cube.style.animation = 'none';
  }, { passive: true });
  window.addEventListener('touchend', () => { drag = false; });
  window.addEventListener('touchmove', e => {
    if (!drag) return;
    ry += (e.touches[0].clientX - lx) * 0.45;
    rx -= (e.touches[0].clientY - ly) * 0.45;
    lx = e.touches[0].clientX; ly = e.touches[0].clientY;
    cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  }, { passive: true });
}
