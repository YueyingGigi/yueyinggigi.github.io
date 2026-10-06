/* ─────────────────────────────────────────────────────────────
   hand.js — las dos manos de la mesa (DESIGN § 4 y § 15.1).

   · Al entrar ya están ahí, abajo, asomando: la derecha a la derecha
     y la izquierda a la izquierda, «respirando» con una animación CSS
     (sin requestAnimationFrame: quietas no gastan batería).
   · Al poner el ratón en la mesa, la derecha lo sigue: la punta del
     índice cae justo donde se va a pinchar (assets/hands/puntas.json),
     con un poco de retraso y se inclina según la velocidad.
   · Encima de una caja, la derecha se alarga y entra la IZQUIERDA, que
     sujeta esa caja por su lado izquierdo (sin tapar la etiqueta) y la
     acompaña mientras se inclina. Al pulsar, la derecha pellizca.
   · Al abrir una caja, las manos LA ABREN (Gigi, 2026-10-06: «no
     parece que estén abriendo un blind box»): la izquierda la sujeta
     por el lado, la derecha pellizca el extremo del precinto y lo
     arranca en diagonal, luego coge la tapa por delante y la levanta;
     y las dos salen por abajo antes del destello.
   · Solo con ratón de verdad y sin «menos movimiento». En el móvil no:
     taparían lo que se quiere tocar.
   ───────────────────────────────────────────────────────────── */

const POSTURAS = {
  reposo:   'assets/hands/mano-abierta.webp',
  alcanzar: 'assets/hands/mano-alcanzando.webp',
  pellizco: 'assets/hands/mano-pellizco.webp',
  izquierda:'assets/hands/mano-izquierda.webp'
};

const SEGUIMIENTO = 0.22;   // cuánto se acerca a su objetivo en cada fotograma
const INCLINACION = 8;      // grados como mucho

function crearMano(clase){
  const mano = document.createElement('div');
  mano.className = 'mano ' + clase;
  mano.setAttribute('aria-hidden', 'true');
  mano.innerHTML = '<img alt="">';
  document.body.appendChild(mano);
  return { el: mano, img: mano.querySelector('img'), x: 0, y: 0, ox: 0, oy: 0, giro: 0, objGiro: 0, postura: '' };
}

export async function iniciarMano(zona){
  if (!zona) return;
  if (!matchMedia('(pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let puntas = {};
  try {
    const r = await fetch('assets/hands/puntas.json');
    if (r.ok) puntas = await r.json();
  } catch (e) { /* se usará el centro de arriba */ }
  Object.values(POSTURAS).forEach(src => { new Image().src = src; });

  const der = crearMano('mano--der');
  const izq = crearMano('mano--izq');

  function ponerPostura(m, nombre){
    if (m.postura === nombre) return;
    m.postura = nombre;
    const archivo = POSTURAS[nombre];
    m.img.src = archivo;
    const p = puntas[archivo.split('/').pop().replace('.webp', '')]?.punta || [0.5, 0];
    // el punto de la mano que se coloca es la punta del dedo
    m.img.style.marginLeft = `${-p[0] * 100}%`;
    m.img.style.marginTop  = `${-p[1] * 100}%`;
  }
  ponerPostura(der, 'reposo');
  ponerPostura(izq, 'izquierda');

  /* Dónde descansa cada una: abajo, asomando un poco */
  const reposo = {
    der: () => ({ x: innerWidth * 0.80, y: innerHeight - 140 }),
    izq: () => ({ x: innerWidth * 0.17, y: innerHeight - 120 }),
    fuera: () => ({ y: innerHeight + 60 })
  };

  let siguiendo = false, ratonX = 0, ratonY = 0, anteriorX = 0;
  let cajaEncima = null, saliendo = false, animando = false;
  let coreo = null;          // durante la apertura: { der:{x,y}, izq:{x,y,giro} }
  let rapidez = SEGUIMIENTO;

  function colocarAlInstante(m, p){
    m.x = m.ox = p.x; m.y = m.oy = p.y;
    m.el.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`;
  }

  /* Un solo bucle para las dos, y solo mientras algo se mueve */
  function despertar(){ if (!animando){ animando = true; requestAnimationFrame(mover); } }
  function mover(){
    // objetivos
    if (saliendo){
      der.oy = reposo.fuera().y; izq.oy = reposo.fuera().y;
    } else if (coreo){
      der.ox = coreo.der.x; der.oy = coreo.der.y; der.objGiro = coreo.der.giro || 0;
      izq.ox = coreo.izq.x; izq.oy = coreo.izq.y; izq.objGiro = coreo.izq.giro || 0;
    } else {
      if (siguiendo){ der.ox = ratonX; der.oy = ratonY; }
      else { const r = reposo.der(); der.ox = r.x; der.oy = r.y; der.objGiro = 0; }
      if (cajaEncima){
        const b = cajaEncima.getBoundingClientRect();
        // por el lado izquierdo de la caja, a media altura, girada hacia ella
        izq.ox = b.left + b.width * 0.06; izq.oy = b.top + b.height * 0.42; izq.objGiro = 16;
      } else { const r = reposo.izq(); izq.ox = r.x; izq.oy = r.y; izq.objGiro = 0; }
    }
    let quieto = true;
    [der, izq].forEach(m => {
      const dx = m.ox - m.x, dy = m.oy - m.y;
      m.x += dx * rapidez; m.y += dy * rapidez;
      if (m === der && siguiendo){
        m.objGiro = Math.max(-INCLINACION, Math.min(INCLINACION, (m.x - anteriorX) * 1.6));
        anteriorX = m.x;
      }
      m.giro += (m.objGiro - m.giro) * 0.2;
      m.el.style.transform = `translate3d(${m.x}px, ${m.y}px, 0) rotate(${m.giro.toFixed(2)}deg)`;
      if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4 || Math.abs(m.objGiro - m.giro) > 0.1) quieto = false;
    });
    // en reposo, la animación CSS de «respirar» toma el relevo
    der.el.dataset.reposo = String(!siguiendo && !saliendo && quieto);
    izq.el.dataset.reposo = String(!cajaEncima && !saliendo && quieto);
    if (quieto && !siguiendo && !cajaEncima && !coreo){ animando = false; return; }
    requestAnimationFrame(mover);
  }

  /* Aparecen cuando termina el plano de entrada: suben desde abajo */
  function entrar(){
    colocarAlInstante(der, { x: reposo.der().x, y: reposo.fuera().y });
    colocarAlInstante(izq, { x: reposo.izq().x, y: reposo.fuera().y });
    der.el.dataset.visible = 'true'; izq.el.dataset.visible = 'true';
    despertar();
  }
  if (document.documentElement.classList.contains('con-3d') && !document.querySelector('.escena')?.dataset.lista){
    document.addEventListener('escena:lista', entrar, { once: true });
  } else {
    entrar();
  }

  zona.addEventListener('pointerenter', e => {
    siguiendo = true;
    ratonX = e.clientX; ratonY = e.clientY;
    document.body.dataset.manoPuesta = 'true';
    despertar();
  });
  zona.addEventListener('pointerleave', () => {
    siguiendo = false;
    delete document.body.dataset.manoPuesta;
    ponerPostura(der, 'reposo');
    despertar();
  });
  zona.addEventListener('pointermove', e => { ratonX = e.clientX; ratonY = e.clientY; despertar(); });

  zona.querySelectorAll('.caja').forEach(caja => {
    caja.addEventListener('pointerenter', () => { ponerPostura(der, 'alcanzar'); cajaEncima = caja; despertar(); });
    caja.addEventListener('pointerleave', () => { ponerPostura(der, 'reposo'); cajaEncima = null; despertar(); });
  });
  zona.addEventListener('pointerdown', () => ponerPostura(der, 'pellizco'));
  zona.addEventListener('pointerup',   () => ponerPostura(der, der.postura === 'pellizco' ? (cajaEncima ? 'alcanzar' : 'reposo') : der.postura));

  /* ── Abrir la caja con las manos (lo dispara js/unbox.js) ──
     Los tiempos vienen de unbox.js: el precinto se rompe en
     `precinto`, la tapa se levanta en `tapa`, el destello en `destello`. */
  document.addEventListener('caja:abriendo', e => {
    const caja = e.detail?.caja;
    siguiendo = false; cajaEncima = null;
    delete document.body.dataset.manoPuesta;
    if (!caja || der.el.dataset.visible !== 'true'){ saliendo = true; despertar(); return; }
    const T = e.detail.tiempos || { precinto: 140, tapa: 380, destello: 700 };
    const b = caja.getBoundingClientRect();
    const p = caja.querySelector('.caja__precinto')?.getBoundingClientRect()
           || { left: b.left, top: b.top + b.height * .45, width: b.width, height: b.height * .08 };
    const izqSujeta = { x: b.left + b.width * 0.04, y: b.top + b.height * 0.5, giro: 18 };
    rapidez = 0.42;
    ponerPostura(der, 'pellizco');
    // 1 · la derecha va al extremo izquierdo del precinto; la izquierda sujeta
    coreo = { der: { x: p.left + p.width * 0.1, y: p.top + p.height * 0.5, giro: -6 }, izq: izqSujeta };
    despertar();
    // 2 · tira del precinto en diagonal, hacia arriba a la derecha
    setTimeout(() => { coreo.der = { x: p.left + p.width * 0.7, y: p.top - b.height * 0.35, giro: 10 }; despertar(); }, T.precinto);
    // 3 · coge la tapa por el borde de delante…
    setTimeout(() => { coreo.der = { x: b.left + b.width * 0.55, y: b.top + b.height * 0.9, giro: 0 }; despertar(); }, T.tapa - 150);
    // 4 · …y la levanta (desde arriba, la tapa se abre hacia el borde de atrás)
    setTimeout(() => { coreo.der = { x: b.left + b.width * 0.55, y: b.top - b.height * 0.25, giro: -4 }; despertar(); }, T.tapa);
    // 5 · fuera las dos, antes del destello
    setTimeout(() => { coreo = null; saliendo = true; rapidez = 0.3; despertar(); }, T.destello - 120);
  });
  window.addEventListener('resize', despertar, { passive: true });
}
