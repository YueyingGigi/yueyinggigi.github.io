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

import { PELADO } from './unbox.js';

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
  let coreo = null;          // durante la apertura: { der, izq } — un punto {x,y,giro} o una función que lo da
  let coreoFuera = null;     // para cortar la apertura si se la saltan
  let abriendo = false;      // mientras se abre una caja, el ratón ya no manda
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
      const d = typeof coreo.der === 'function' ? coreo.der() : coreo.der;
      der.ox = d.x; der.oy = d.y; der.objGiro = d.giro || 0;
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

  /* Las manos son de la vista desde arriba: suben desde abajo cuando
     la cámara llega arriba y se van si vuelve a bajar (js/escena.js
     avisa con `escena:vista`). */
  function entrar(){
    saliendo = false;
    if (der.el.dataset.visible !== 'true'){
      colocarAlInstante(der, { x: reposo.der().x, y: reposo.fuera().y });
      colocarAlInstante(izq, { x: reposo.izq().x, y: reposo.fuera().y });
      der.el.dataset.visible = 'true'; izq.el.dataset.visible = 'true';
    }
    despertar();
  }
  function salir(){ if (abriendo) return; saliendo = true; siguiendo = false; cajaEncima = null; despertar(); }
  if (document.documentElement.classList.contains('con-3d')){
    document.addEventListener('escena:vista', e => e.detail.arriba ? entrar() : salir());
    if (document.querySelector('.escena')?.dataset.lista === 'true') entrar();
  } else {
    entrar();
  }

  zona.addEventListener('pointerenter', e => {
    if (abriendo || saliendo) return;
    siguiendo = true;
    ratonX = e.clientX; ratonY = e.clientY;
    document.body.dataset.manoPuesta = 'true';
    despertar();
  });
  zona.addEventListener('pointerleave', () => {
    if (abriendo) return;
    siguiendo = false;
    delete document.body.dataset.manoPuesta;
    ponerPostura(der, 'reposo');
    despertar();
  });
  zona.addEventListener('pointermove', e => {
    ratonX = e.clientX; ratonY = e.clientY;
    // (si las manos acaban de volver, el ratón ya estaba dentro)
    if (!abriendo && !saliendo && !siguiendo){ siguiendo = true; document.body.dataset.manoPuesta = 'true'; }
    despertar();
  });

  zona.querySelectorAll('.caja').forEach(caja => {
    // (al acercarse la cámara las cajas pasan por debajo del ratón quieto
    //  y saltan estos mismos eventos: por eso el `abriendo`)
    caja.addEventListener('pointerenter', () => { if (abriendo) return; ponerPostura(der, 'alcanzar'); cajaEncima = caja; despertar(); });
    caja.addEventListener('pointerleave', () => { if (abriendo) return; ponerPostura(der, 'reposo'); cajaEncima = null; despertar(); });
  });
  zona.addEventListener('pointerdown', () => { if (!abriendo) ponerPostura(der, 'pellizco'); });
  zona.addEventListener('pointerup',   () => !abriendo && ponerPostura(der, der.postura === 'pellizco' ? (cajaEncima ? 'alcanzar' : 'reposo') : der.postura));

  /* ── Abrir la caja con las manos (lo dispara js/unbox.js) ──
     Los tiempos vienen de unbox.js: el precinto se rompe en
     `precinto`, la tapa se levanta en `tapa`, el destello en `destello`. */
  document.addEventListener('caja:abriendo', e => {
    const caja = e.detail?.caja;
    abriendo = true;
    siguiendo = false; cajaEncima = null;
    delete document.body.dataset.manoPuesta;
    if (!caja || der.el.dataset.visible !== 'true'){ saliendo = true; despertar(); return; }
    const T = e.detail.tiempos;
    /* Dónde va a estar la tapa cuando la cámara termine de acercarse
       (lo calcula js/escena.js): las manos van ya hacia allí. */
    const b = e.detail.rect || caja.getBoundingClientRect();
    const W = b.width, H = b.height;
    // el precinto cruza la tapa de lado a lado, un poco por debajo del medio
    const p = { izq: b.left, ancho: W, y: b.top + H * 0.482 };
    const sujeta = { x: b.left + W * 0.03, y: b.top + H * 0.5, giro: 18 };
    const pasos = [];
    const en = (ms, f) => pasos.push(setTimeout(() => { f(); despertar(); }, ms));
    coreoFuera = () => pasos.splice(0).forEach(clearTimeout);

    // 1 · mientras la cámara baja: la izquierda sujeta la caja y la
    //     derecha va a pellizcar la punta izquierda del precinto
    rapidez = 0.11;
    ponerPostura(der, 'pellizco');
    coreo = { der: { x: p.izq + W * 0.03, y: p.y, giro: -6 }, izq: sujeta };
    despertar();

    // 2 · lo despega de punta a punta: la mano lleva la punta de la
    //     tira que js/unbox.js va levantando (mismo recorrido: PELADO)
    en(T.precinto, () => {
      const t0 = performance.now(), dur = T.pelar * PELADO.hasta;
      rapidez = 0.5;
      coreo.der = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        const ang = (PELADO.giro[0] + (PELADO.giro[2] - PELADO.giro[0]) * Math.min(1, k * 1.6)) * Math.PI / 180;
        const largo = W * PELADO.largo * Math.min(1, 0.15 + k * 2.2);
        return { x: p.izq + p.ancho * k + Math.cos(ang) * largo, y: p.y - Math.sin(ang) * largo, giro: 4 + k * 10 };
      };
    });
    // …y lo suelta arriba a la derecha
    en(T.precinto + T.pelar * PELADO.hasta, () => {
      rapidez = 0.16;
      coreo.der = { x: b.left + W * 1.12, y: b.top - H * 0.02, giro: 16 };
    });

    // 3 · vuelve a por la tapa: la coge por el borde de delante
    en(T.tapa - 330, () => {
      rapidez = 0.2;
      ponerPostura(der, 'alcanzar');
      coreo.der = { x: b.left + W * 0.52, y: b.top + H * 0.97, giro: 0 };
    });
    en(T.tapa - 50, () => ponerPostura(der, 'pellizco'));

    // 4 · la levanta por delante y la vuelca hacia atrás.
    //     La izquierda suelta un poco: ya no hay nada que sujetar.
    en(T.tapa, () => {
      const t0 = performance.now();
      rapidez = 0.85;        // casi pegada: al final la tapa va muy deprisa
      coreo.izq = { x: sujeta.x - W * 0.07, y: sujeta.y + H * 0.04, giro: 12 };
      // no se calcula: se mira dónde está la tapa en cada fotograma. La
      // mano va cogida de su borde de delante, que es el que se aleja de
      // la bisagra (el borde de atrás de la caja, arriba en pantalla):
      // primero baja un poco hacia la cámara y luego pasa por encima
      const tapa = caja.querySelector('.caja__foto');
      const bisagra = b.top;
      coreo.der = () => {
        const r = tapa.getBoundingClientRect();
        const y = Math.abs(r.bottom - bisagra) >= Math.abs(r.top - bisagra) ? r.bottom : r.top;
        return { x: r.left + r.width * 0.5, y, giro: 0 };
      };
    });

    // 5 · la suelta cuando ya cae sola y se aparta; con el destello se
    //     van las dos por abajo
    en(T.tapa + T.quitar * 0.72, () => {
      rapidez = 0.14;
      coreo.der = { x: b.left + W * 1.08, y: b.top + H * 0.2, giro: 14 };
    });
    en(T.destello, () => { coreo = null; saliendo = true; rapidez = 0.26; });
  });
  // si se salta la apertura, las manos se van sin terminar
  document.addEventListener('caja:saltar', () => {
    coreoFuera?.(); coreo = null; saliendo = true; rapidez = 0.3; despertar();
  });
  window.addEventListener('resize', despertar, { passive: true });
}
