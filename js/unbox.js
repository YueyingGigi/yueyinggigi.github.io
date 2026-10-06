/* ─────────────────────────────────────────────────────────────
   unbox.js — abrir la caja y entrar en su página.

   En la mesa, con manos (Gigi, 2026-10-06: «las manos van demasiado
   rápido y la caja se abre como una puerta»), dura unos 2 s:
     0    – 0,5 s   la cámara se pone encima de la caja y se acerca
                    (js/escena.js · enfocar); las manos van hacia ella
     0,65 – 1,1 s   la derecha despega el precinto de punta a punta
     1,4  – 2,1 s   coge la tapa por delante y la vuelca hacia atrás,
                    hasta dejarla como en la foto de la caja abierta
                    — debajo ya está la muñeca, tumbada en la caja
     2,1 s          DESTELLO. La mesa se apaga y la muñeca SALTA de la
                    caja hasta el medio de la pantalla, a lo grande, con UNA FRASE de lo
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
import { rutaFigura } from './figure.js';

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const revelado = () => document.querySelector('.revelado');

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

  // la muñeca ya está dentro, debajo de la tapa: al volcarse se la ve
  caja.querySelector('.caja__muneca')?.remove();
  const dentro = document.createElement('img');
  dentro.className = 'caja__muneca'; dentro.alt = ''; dentro.draggable = false;
  dentro.src = rutaFigura(seccion, 'frente');
  caja.querySelector('.caja__dentro')?.after(dentro);

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
                : { precinto: 450, pelar: 300, tapa: 800,  quitar: 600, destello: 1800 })
    :             { precinto: 0,   pelar: 220, tapa: 250,  quitar: 500, destello: 1100 };
  // (sin manos, el destello espera 0,4 s con la tapa ya abierta: en el
  //  móvil la muñeca se veía un instante dentro y parecía salir de la nada)
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

    /* Sale de DONDE ESTÁ: la grande empieza justo encima de la que
       hay en la caja (mismo sitio, mismo tamaño) y esa se quita. Se
       agacha un instante, salta hacia quien mira y se asienta. */
    figura.el.style.transition = 'none';
    figura.el.style.opacity = '1';
    figura.el.style.transform = 'translate(-50%, -50%) scale(1)';
    const f = figura.el.getBoundingClientRect();
    const c = caja.getBoundingClientRect();
    const m = dentro.getBoundingClientRect();
    const hay = m.height > 4 && m.width > 4;
    const alto = hay ? m.height : c.height * 0.7;
    const s = alto / (f.height || 1);
    const dx = (hay ? m.left + m.width / 2 : c.left + c.width / 2) - (f.left + f.width / 2);
    const dy = (hay ? m.top + m.height / 2 : c.top + c.height * 0.53) - (f.top + f.height / 2);
    dentro.dataset.fuera = 'true';
    const en = (x, y, e) => `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px)) scale(${e})`;
    figura.el.animate([
      { transform: en(dx, dy, s), offset: 0, easing: 'ease-out' },
      { transform: en(dx, dy + alto * 0.05, `${(s * 1.12).toFixed(4)}, ${(s * 0.86).toFixed(4)}`), offset: 0.2, easing: 'cubic-bezier(.3,0,.25,1)' },
      { transform: en(dx * 0.12, dy * 0.12 - window.innerHeight * 0.05, '1.07, 1.11'), offset: 0.66, easing: 'ease-in-out' },
      { transform: en(0, 6, '1.04, .96'), offset: 0.84, easing: 'ease-out' },
      { transform: en(0, 0, 1), offset: 1 }
    ], { duration: 700 });
    // y no se queda clavada: flota un poco hasta que se entra
    luego(() => { figura.el.dataset.flota = 'true'; }, 700);
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
