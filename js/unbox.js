/* ─────────────────────────────────────────────────────────────
   unbox.js — abrir la caja y entrar en su página.

   La primera vez:
     0    – 0,20 s  se rompe el precinto; la caja tiembla; suena el "chas"
     0,20 – 0,50 s  la tapa se levanta
     0,50 s         DESTELLO. La mesa se apaga y la muñeca sale a lo
                    grande en medio de la pantalla: aquí está la gracia,
                    tiene que verse perfectamente cuál ha tocado
     0,95 s         debajo aparece UNA FRASE de lo que hay dentro (no el
                    nombre del apartado: ese ya está en la etiqueta de la
                    caja y repetirlo no aporta — Gigi, 2026-10-05)
     2,40 s         se entra en la página. Antes era a 1,8 s y la
                    frase no daba tiempo a leerse (Gigi, 2026-10-05).
                    Quien no quiera esperar pincha en cualquier sitio o
                    pulsa una tecla y entra ya.

   Se abre entera SIEMPRE, también al recargar: Gigi quiere poder ver
   el efecto cada vez. Quien tenga prisa tiene la barra de arriba, que
   lleva a cualquier apartado sin animación ninguna.

   Cada apartado tiene su propia página (sobre-mi.html, trabajos.html…),
   no una ventana: así cada uno puede tener la pinta que le conviene.
   ───────────────────────────────────────────────────────────── */

import { sonarAbrir } from './sound.js';

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

export function abrirCaja(caja, seccion, figura, textos, destino){
  // Sin animación: quien ha pedido menos movimiento entra directo
  if (sinMovimiento()){ location.href = destino; return; }

  sonarAbrir();
  caja.dataset.abriendo = 'true';
  /* En la mesa con manos (js/hand.js), las manos ABREN la caja: la
     izquierda la sujeta, la derecha pellizca el precinto y lo arranca,
     luego levanta la tapa, y se van antes del destello. Por eso aquí
     cada paso espera un poco a que llegue la mano. Sin manos (móvil,
     apartados), los tiempos de siempre. */
  const conManos = !!document.querySelector('.mano[data-visible="true"]');
  const T = conManos ? { precinto: 140, tapa: 380, destello: 700 } : { precinto: 0, tapa: 200, destello: 500 };
  document.dispatchEvent(new CustomEvent('caja:abriendo', { detail: { caja, tiempos: T } }));

  const precinto = caja.querySelector('.caja__precinto');
  setTimeout(() => { if (precinto) precinto.dataset.roto = 'true'; }, T.precinto);
  setTimeout(() => { caja.dataset.tapa = 'levantada'; }, T.tapa);

  setTimeout(async () => {
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
  }, T.destello);

  // Entrar ya: un clic en el velo o cualquier tecla, a partir de que
  // sale la muñeca (antes no hay nada que saltarse).
  setTimeout(() => {
    const ya = () => {
      revelado().removeEventListener('click', ya);
      document.removeEventListener('keydown', ya);
      irA(destino);
    };
    revelado().addEventListener('click', ya);
    document.addEventListener('keydown', ya);
  }, T.destello + 100);

  setTimeout(() => irA(destino), T.destello + 1900);
}
