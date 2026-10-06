/* ─────────────────────────────────────────────────────────────
   unbox.js — abrir la caja y entrar en su página.

   En la mesa, con manos (Gigi, 2026-10-06: «las manos van demasiado
   rápido y la caja se abre como una puerta»), dura unos 2 s:
     0    – 0,5 s   la cámara se pone encima de la caja y se acerca
                    (js/escena.js · enfocar); las manos van hacia ella
     0,65 – 1,1 s   la derecha despega el precinto de punta a punta
     1,4  – 2,1 s   coge la tapa por delante y la vuelca hacia atrás,
                    hasta dejarla como en la foto de la caja abierta
     2,1 s          DESTELLO. La mesa se apaga y la muñeca sale a lo
                    grande en medio de la pantalla, con UNA FRASE de lo
                    que hay dentro (no el nombre del apartado: ese ya
                    está en la etiqueta de la caja)
     + 1,3 s        se entra en la página (antes 1,9 s: «se hace largo»)

   Sin manos (móvil) lo mismo en 1,4 s; en el cajón de los apartados,
   que no tiene cámara, en 0,75 s.

   La tapa NO se quita ni se tira: sigue unida por detrás, como en la
   foto de la caja abierta (css/caja.css · tapa-abre).

   Desde el primer momento, un clic o una tecla se lo salta: antes del
   destello, va al destello; después, entra ya.

   Se abre entera SIEMPRE, también al recargar: Gigi quiere poder ver
   el efecto cada vez. Quien tenga prisa tiene la barra de arriba, que
   lleva a cualquier apartado sin animación ninguna.
   ───────────────────────────────────────────────────────────── */

import { despertarSonido, sonarPrecinto, sonarTapa, sonarSorpresa } from './sound.js';

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const revelado = () => document.querySelector('.revelado');

/* La muñeca está centrada por CSS. Solo hace falta saber cuánto hay
   que apartarla de ese centro para que parezca que está en la caja.
   Así no interviene lo ancha que sea la imagen, que era justo lo que
   descolocaba el revelado. */
function desvioDesdeElCentro(caja){
  const b = caja.getBoundingClientRect();
  return {
    x: Math.round(b.left + b.width / 2 - window.innerWidth / 2),
    y: Math.round(b.top + b.height * 0.55 - window.innerHeight * 0.41)
  };
}

/* El precinto se despega de izquierda a derecha en `ms`: lo pegado se
   acorta y una tira levantada va por delante, por donde tira la mano
   (js/hand.js lleva el mismo recorrido: PELADO). */
export const PELADO = { largo: 0.36, hasta: 0.8, giro: [8, 30, 38] };
function despegar(precinto, ms){
  if (!precinto || precinto.dataset.roto === 'true') return;
  const tira = document.createElement('span');
  tira.className = 'caja__tira';
  precinto.after(tira);
  const recorrido = (1 / PELADO.largo) * 100;          // % de su propio ancho
  const [g0, g1, g2] = PELADO.giro;
  precinto.animate(
    [{ clipPath: 'inset(-20% 0 -20% 0)' }, { clipPath: 'inset(-20% 0 -20% 100%)' }],
    { duration: ms * PELADO.hasta, easing: 'linear', fill: 'forwards' });
  tira.animate([
    { transform: `translateX(0%) rotate(-${g0}deg) scaleX(.15)`, opacity: 1, offset: 0 },
    { transform: `translateX(${recorrido * 0.4}%) rotate(-${g1}deg) scaleX(1)`, opacity: 1, offset: PELADO.hasta * 0.4 },
    { transform: `translateX(${recorrido}%) rotate(-${g2}deg) scaleX(1)`, opacity: 1, offset: PELADO.hasta },
    { transform: `translateX(${recorrido + 40}%) translateY(-320%) rotate(-58deg) scaleX(1)`, opacity: 0, offset: 1 }
  ], { duration: ms, easing: 'linear', fill: 'forwards' })
    .finished.catch(() => {}).then(() => { tira.remove(); precinto.dataset.roto = 'true'; });
}

/* ¿Hace el navegador transiciones entre páginas? (Chrome, Edge,
   Safari 18.2+). Si sí, NO se funde la página antes de irse: la
   transición necesita una foto de la página con la muñeca para
   llevarla a su sitio en la página nueva. Si no, fundido como antes. */
const conTransicion = 'PageRevealEvent' in window;

let yendo = false;
function irA(destino){
  if (yendo) return;
  yendo = true;
  if (conTransicion){ location.href = destino; return; }
  document.body.dataset.saliendo = 'true';
  setTimeout(() => { location.href = destino; }, 260);
}

/* Al volver con «atrás», el navegador puede devolver la página tal como
   se dejó: con la cámara encima de una caja y el velo puesto. Se
   recarga para que la mesa esté como al llegar. */
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });

export function abrirCaja(caja, seccion, figura, textos, destino, { enfocar } = {}){
  // Sin animación: quien ha pedido menos movimiento entra directo
  if (sinMovimiento()){ location.href = destino; return; }

  despertarSonido();
  caja.dataset.abriendo = 'true';

  /* Tres ritmos (ms desde el clic):
     · mesa con manos: las manos ABREN la caja (js/hand.js), despacio
       para que se vea cada gesto;
     · mesa sin manos (móvil): la cámara se acerca igual, lo demás
       más corto;
     · cajón de los apartados: sin cámara, lo justo. */
  const foco = enfocar?.(caja) || null;
  const conManos = !!document.querySelector('.mano[data-visible="true"]');
  const T = foco
    ? (conManos ? { precinto: 650, pelar: 450, tapa: 1400, quitar: 700, destello: 2100 }
                : { precinto: 450, pelar: 300, tapa: 800,  quitar: 600, destello: 1400 })
    :             { precinto: 0,   pelar: 220, tapa: 250,  quitar: 500, destello: 750 };
  caja.style.setProperty('--t-tapa', T.quitar + 'ms');
  document.dispatchEvent(new CustomEvent('caja:abriendo', { detail: { caja, tiempos: T, rect: foco?.rect || null } }));

  const pendientes = [];
  const luego = (f, ms) => pendientes.push(setTimeout(f, ms));
  const precinto = caja.querySelector('.caja__precinto');

  luego(() => { sonarPrecinto(T.pelar); despegar(precinto, T.pelar); }, T.precinto);
  luego(() => { sonarTapa(); caja.dataset.tapa = 'levantada'; }, T.tapa);
  luego(destello, T.destello);

  let destellado = false;
  async function destello(){
    destellado = true;
    sonarSorpresa();
    const rev = revelado();
    const b = caja.getBoundingClientRect();
    const d = rev.querySelector('.revelado__destello');
    d.style.setProperty('--x', `${b.left + b.width / 2}px`);
    d.style.setProperty('--y', `${b.top + b.height / 2}px`);
    rev.querySelector('.revelado__nombre').textContent =
      textos['revelado.' + seccion] || textos['nav.' + seccion] || seccion;

    rev.hidden = false;
    requestAnimationFrame(() => {
      rev.dataset.visible = 'true';
      d.dataset.brilla = 'false'; void d.offsetWidth; d.dataset.brilla = 'true';
    });

    // se entra a los 1,3 s, esté como esté la imagen de la muñeca
    luego(() => irA(destino), 1300);

    // la muñeca sale de la caja y crece hasta el centro de la pantalla
    figura.prepararRevelado(seccion, textos['figura.' + seccion] || '');
    // ella es la que viaja a la página nueva (View Transitions). Solo
    // puede haber UNA con ese nombre: se le quita a la de la página.
    document.querySelectorAll('.figura').forEach(f => { if (f !== figura.el) f.style.viewTransitionName = 'none'; });
    figura.el.style.viewTransitionName = 'muneca';
    try { await figura.el.decode(); } catch (e) { /* ya estaba lista */ }

    const v = desvioDesdeElCentro(caja);

    figura.el.style.transition = 'none';
    figura.el.style.opacity = '0';
    figura.el.style.transform =
      `translate(calc(-50% + ${v.x}px), calc(-50% + ${v.y}px)) scale(.16)`;

    requestAnimationFrame(() => {
      figura.el.style.transition =
        'transform 480ms cubic-bezier(.34,1.56,.64,1), opacity 240ms ease-out';
      figura.el.style.opacity = '1';
      figura.el.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    // y no se queda clavada: flota un poco hasta que se entra
    luego(() => { figura.el.dataset.flota = 'true'; }, 480);
  }

  /* Saltárselo. Se escucha desde un poco después del clic que abre la
     caja (si no, ese mismo clic o un doble clic se lo saltaría). */
  const saltar = e => {
    if (e.type === 'keydown' && (e.repeat || ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key))) return;
    if (destellado){ irA(destino); return; }
    pendientes.splice(0).forEach(clearTimeout);
    document.dispatchEvent(new CustomEvent('caja:saltar'));
    caja.style.setProperty('--t-tapa', '1ms');
    if (precinto) precinto.dataset.roto = 'true';
    caja.querySelector('.caja__tira')?.remove();
    caja.dataset.tapa = 'levantada';
    destello();
  };
  setTimeout(() => {
    document.addEventListener('pointerdown', saltar, true);
    document.addEventListener('keydown', saltar, true);
  }, 280);
}
