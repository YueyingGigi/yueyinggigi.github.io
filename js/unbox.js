/* ─────────────────────────────────────────────────────────────
   unbox.js — abrir la caja y entrar en su página.

   La primera vez:
     0    – 0,20 s  se rompe el precinto; la caja tiembla; suena el "chas"
     0,20 – 0,50 s  la tapa se levanta
     0,50 s         DESTELLO. La mesa se apaga y la muñeca sale a lo
                    grande en medio de la pantalla: aquí está la gracia,
                    tiene que verse perfectamente cuál ha tocado
     0,95 s         debajo aparece el nombre del apartado
     1,80 s         se funde y entra en la página

   Una caja ya abierta va mucho más rápido (0,55 s en total). Quien
   vuelve no tiene por qué volver a esperar: esto lo miran empresas con
   prisa, y la segunda vez la sorpresa ya no sorprende.

   Cada apartado tiene su propia página (sobre-mi.html, trabajos.html…),
   no una ventana: así cada uno puede tener la pinta que le conviene.
   ───────────────────────────────────────────────────────────── */

import { sonarAbrir } from './sound.js';
import { marcar, estaAbierta } from './coleccion.js';

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
    y: Math.round(b.top + b.height * 0.55 - window.innerHeight * 0.46)
  };
}

function irA(destino){
  document.body.dataset.saliendo = 'true';
  setTimeout(() => { location.href = destino; }, 260);
}

export function abrirCaja(caja, seccion, figura, textos, destino){
  const repetida = estaAbierta(seccion);
  marcar(seccion);

  // Sin animación: quien ha pedido menos movimiento entra directo
  if (sinMovimiento()){ location.href = destino; return; }

  sonarAbrir();
  caja.dataset.abriendo = 'true';

  const precinto = caja.querySelector('.caja__precinto');
  if (precinto) precinto.dataset.roto = 'true';
  setTimeout(() => { caja.dataset.tapa = 'levantada'; }, repetida ? 90 : 200);

  // Ya la había abierto: se entra casi de seguido
  if (repetida){
    setTimeout(() => irA(destino), 550);
    return;
  }

  setTimeout(async () => {
    const rev = revelado();
    const b = caja.getBoundingClientRect();
    const d = rev.querySelector('.revelado__destello');
    d.style.setProperty('--x', `${b.left + b.width / 2}px`);
    d.style.setProperty('--y', `${b.top + b.height / 2}px`);
    rev.querySelector('.revelado__nombre').textContent = textos['nav.' + seccion] || seccion;

    rev.hidden = false;
    requestAnimationFrame(() => {
      rev.dataset.visible = 'true';
      d.dataset.brilla = 'false'; void d.offsetWidth; d.dataset.brilla = 'true';
    });

    // la muñeca sale de la caja y crece hasta el centro de la pantalla
    figura.prepararRevelado(seccion, textos['figura.' + seccion] || '');
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
  }, 500);

  setTimeout(() => irA(destino), 1800);
}
