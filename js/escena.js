/* ─────────────────────────────────────────────────────────────
   escena.js — la mesa en 3D y el plano de entrada (docs/HOME-3D.md).

   1. Monta la escena alrededor de la lista de cajas que ya está en el
      HTML: cada caja pasa a ser la tapa de un cubo con cuatro caras.
      Sin este archivo, la mesa es la plana de siempre.
   2. El plano de entrada (≤ 3 s): de frente, las cajas caen sobre la
      mesa; detrás, en la pared, pasan en grande las palabras de la
      frase de presentación; luego la cámara sube hasta la vista desde
      arriba, que es la mesa de siempre.
      · Cualquier clic, tecla, rueda o toque lo acelera (~0,35 s hasta
        el final), no lo corta de golpe.
      · Si se pincha una caja en medio, primero se termina y luego se
        abre (`terminar()`).
      · Con «menos movimiento», o si GSAP no carga, no hay plano de
        entrada: se ve la mesa directamente.
   ───────────────────────────────────────────────────────────── */

import { conGsap, sinMovimiento } from './anim.js';

const FRENTE = 74;            // grados de la cámara en el plano de frente

/* Dónde se queda la cámara al acabar. Gigi probó las dos (2026-10-06)
   y eligió DESDE ARRIBA. La oblicua se puede ver aún con ?vista=oblicua. */
const OBLICUA = new URLSearchParams(location.search).get('vista') === 'oblicua';
const FINAL = OBLICUA
  ? { rx: 38, perspectiva: 2300, pared: 1 }
  : { rx: 0,  perspectiva: 1900, pared: 0 };

/* Cuánto gira la mesa siguiendo al ratón, y cuánto se mueve una caja
   al acercarse (grados / px). Desde arriba tiene que ser bastante más
   que en oblicuo: con 5–9° y 26 px Gigi «no notaba nada». */
const GIRO_MESA = { x: 10, y: 14 };
const CAJA = { inclina: 18, sube: 80 };
const enMovil = () => matchMedia('(max-width: 767px)').matches;

function el(etiqueta, clase){
  const n = document.createElement(etiqueta);
  if (clase) n.className = clase;
  return n;
}

/* La cinta de la pared: las dos frases con el sello en miniatura entre
   ellas, repetida para que el bucle no tenga costura. */
function pintarCinta(cinta, textos){
  const frases = textos['pared.cinta'] || ['CONTENIDO', 'COMUNICACIÓN DE MARCA'];
  cinta.innerHTML = '';
  for (let copia = 0; copia < 2; copia++){
    const grupo = el('span', 'pared__grupo');
    for (let r = 0; r < 3; r++){
      frases.forEach(f => {
        const s = el('span', 'pared__frase'); s.textContent = f;
        grupo.appendChild(s);
        grupo.insertAdjacentHTML('beforeend',
          '<svg class="pared__sello" viewBox="0 0 100 100" aria-hidden="true"><use href="#s-sello"></use></svg>');
      });
    }
    cinta.appendChild(grupo);
  }
}

export function montarEscena(mesa, textos){
  const lista = mesa?.querySelector('.cajas');
  if (!lista) return null;

  // ── el andamio ──
  const escena = el('div', 'escena');
  const camara = el('div', 'camara');
  const pared = el('div', 'pared'); pared.setAttribute('aria-hidden', 'true');
  const cinta = el('div', 'pared__cinta');
  pared.appendChild(cinta);
  const tablero = el('div', 'tablero'); tablero.setAttribute('aria-hidden', 'true');
  lista.replaceWith(escena);
  escena.appendChild(camara);
  camara.append(pared, tablero, lista);
  pintarCinta(cinta, textos);

  // ── cada caja, un cubo ──
  const cubos = [...lista.children].map(li => {
    const caja = li.querySelector('.caja');
    const cubo = el('div', 'cubo');
    li.insertBefore(cubo, caja);
    cubo.appendChild(caja);
    ['frente', 'atras', 'izq', 'der'].forEach(c => cubo.appendChild(el('span', 'cubo__cara cubo__cara--' + c)));
    // la sombra va en la mesa, no en el cubo: cuando la caja sube, la
    // sombra se queda abajo y se separa — así se ve que ha subido
    const sombra = el('span', 'cubo__sombra');
    sombra.setAttribute('aria-hidden', 'true');
    li.insertBefore(sombra, cubo);
    return cubo;
  });
  // el alto del cubo depende de su ancho (en px, para translateZ)
  const medir = () => cubos.forEach(c => {
    c.style.setProperty('--ancho-cubo', c.offsetWidth + 'px');
    c.parentElement.querySelector('.cubo__sombra')?.style.setProperty('--ancho-cubo', c.offsetWidth + 'px');
  });
  new ResizeObserver(medir).observe(lista);
  medir();
  document.documentElement.classList.add('con-3d');

  document.addEventListener('idioma:cambiado', e => pintarCinta(cinta, e.detail.textos));

  // ── el plano de entrada ──
  let tl = null;
  let alAcabar = [];
  const acabado = () => { tl = null; alAcabar.splice(0).forEach(f => f()); quitarAtajos(); };

  const acelerar = () => {
    if (!tl) return;
    const queda = tl.duration() - tl.time();
    if (queda > 0.35) tl.timeScale(queda / 0.35);
  };
  const atajos = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
  const quitarAtajos = () => atajos.forEach(t => window.removeEventListener(t, acelerar, true));

  const api = {
    /* Promesa que se cumple cuando la cámara está arriba */
    terminar(){
      if (!tl) return Promise.resolve();
      acelerar();
      return new Promise(ok => alAcabar.push(ok));
    }
  };

  if (sinMovimiento()){
    // sin plano de entrada ni movimiento, pero en su ángulo final
    camara.style.transform = `rotateX(${FINAL.rx}deg)`;
    pared.style.opacity = String(FINAL.pared);
    escena.style.perspective = FINAL.perspectiva + 'px';
    escena.dataset.lista = 'true';
    return api;
  }

  // Hasta que arranque el plano de entrada, la escena no se enseña: si
  // no, se vería un instante la mesa desde arriba y luego saltaría de
  // frente. Si GSAP no llega, se enseña igual a los 2,5 s.
  escena.style.opacity = '0';
  const enseniar = () => { escena.style.opacity = ''; };
  const porSiAcaso = setTimeout(enseniar, 2500);

  conGsap(async (gsap) => {
    // espera a que las fotos de las cajas estén listas (como mucho 1,2 s):
    // si no, la caída se haría con huecos en blanco
    const fotos = [...lista.querySelectorAll('.caja__foto')];
    await Promise.race([
      Promise.all(fotos.map(f => f.decode ? f.decode().catch(() => {}) : null)),
      new Promise(ok => setTimeout(ok, 1200))
    ]);

    const movil = enMovil();
    if (movil) lista.classList.add('en-fila');   // de frente, las cinco en fila
    medir();

    gsap.set(camara, { rotationX: FRENTE });
    gsap.set(escena, { perspective: 1500 });
    gsap.set(pared, { opacity: 1 });
    cubos.forEach(c => gsap.set(c, { z: 320, opacity: 0 }));

    clearTimeout(porSiAcaso);
    enseniar();
    tl = gsap.timeline({ onComplete: acabado });
    tl.to(cubos, {
      z: 0, opacity: 1, duration: 0.62, ease: 'back.out(1.5)', stagger: 0.12,
      clearProps: 'opacity'
    }, 0);
    tl.addLabel('subir', 1.5);

    // en el móvil: de la fila a las dos columnas, mientras sube la cámara
    if (movil){
      tl.add(() => {
        const antes = cubos.map(c => c.getBoundingClientRect());
        lista.classList.remove('en-fila');
        medir();
        cubos.forEach((c, n) => {
          const despues = c.getBoundingClientRect();
          gsap.from(c, {
            x: antes[n].left - despues.left, y: antes[n].top - despues.top,
            scale: antes[n].width / despues.width,
            duration: 1.3, ease: 'power2.inOut', immediateRender: true
          });
        });
      }, 'subir');
    }

    tl.to(camara, { rotationX: FINAL.rx, duration: 1.5, ease: 'power2.inOut' }, 'subir');
    tl.to(escena, { perspective: FINAL.perspectiva, duration: 1.5, ease: 'power2.inOut' }, 'subir');
    if (!FINAL.pared) tl.to(pared, { opacity: 0, duration: 0.7, ease: 'power1.in' }, 'subir+=0.45');
    tl.add(() => {
      cubos.forEach(c => gsap.set(c, { clearProps: 'opacity' }));
      interactuar(gsap);
      escena.dataset.lista = 'true';
      document.dispatchEvent(new CustomEvent('escena:lista'));
    });

    atajos.forEach(t => window.addEventListener(t, acelerar, { capture: true, passive: true }));
  }).then(hay => {
    if (!hay){ clearTimeout(porSiAcaso); enseniar(); escena.dataset.lista = 'true'; document.dispatchEvent(new CustomEvent('escena:lista')); }
  });

  /* ── Después del plano de entrada: la mesa responde ──
     1. La mesa entera gira un poco siguiendo al ratón (o la inclinación
        del móvil, donde el navegador la da sin pedir permiso).
     2. Cada caja, al acercarse el ratón, sube y se inclina hacia él; al
        irse, vuelve con un pequeño bamboleo; al pulsar, se aplasta un
        poco. */
  function interactuar(gsap){
    const rx = gsap.quickTo(camara, 'rotationX', { duration: 0.9, ease: 'power3.out' });
    const ry = gsap.quickTo(camara, 'rotationY', { duration: 0.9, ease: 'power3.out' });
    const mover = (nx, ny) => {               // -1 … 1
      rx(FINAL.rx - ny * GIRO_MESA.x);
      ry(nx * GIRO_MESA.y);
    };
    if (matchMedia('(pointer: fine)').matches){
      window.addEventListener('pointermove', e => {
        mover((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => mover(0, 0));
    } else if ('DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function'){
      window.addEventListener('deviceorientation', e => {
        if (e.gamma == null) return;
        mover(Math.max(-1, Math.min(1, e.gamma / 25)), Math.max(-1, Math.min(1, (e.beta - 45) / 25)));
      }, { passive: true });
    }

    if (!matchMedia('(pointer: fine)').matches) return;
    cubos.forEach(cubo => {
      const caja = cubo.querySelector('.caja');
      const giro = parseFloat(getComputedStyle(cubo).getPropertyValue('--giro')) || 0;
      gsap.set(cubo, { rotation: giro, z: 0 });
      const sombra = cubo.parentElement.querySelector('.cubo__sombra');
      const z  = gsap.quickTo(cubo, 'z', { duration: 0.45, ease: 'power3.out' });
      const ix = gsap.quickTo(cubo, 'rotationX', { duration: 0.45, ease: 'power3.out' });
      const iy = gsap.quickTo(cubo, 'rotationY', { duration: 0.45, ease: 'power3.out' });
      const subirSombra = (k) => gsap.to(sombra, {     // k: 0 en la mesa … 1 arriba
        x: 34 * k, y: 48 * k, scale: 1 + 0.16 * k, opacity: 1 - 0.5 * k,
        duration: 0.45, ease: 'power3.out', overwrite: 'auto'
      });
      caja.addEventListener('pointermove', e => {
        if (caja.dataset.abriendo === 'true') return;
        const r = caja.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        if (!cubo.dataset.encima) subirSombra(1);
        cubo.dataset.encima = 'true';
        z(CAJA.sube); ix(-py * CAJA.inclina); iy(px * CAJA.inclina);
        // desde arriba, subir 80 px apenas agranda; se exagera un poco
        gsap.to(cubo, { scaleX: 1.07, scaleY: 1.07, duration: 0.45, ease: 'power3.out', overwrite: false });
      });
      caja.addEventListener('pointerleave', () => {
        delete cubo.dataset.encima;
        gsap.to(cubo, { z: 0, rotationX: 0, rotationY: 0, scaleX: 1, scaleY: 1, duration: 1.1, ease: 'elastic.out(1, 0.38)', overwrite: 'auto' });
        gsap.to(sombra, { x: 0, y: 0, scale: 1, opacity: 1, duration: 1.1, ease: 'elastic.out(1, 0.38)', overwrite: 'auto' });
      });
      caja.addEventListener('pointerdown', () => gsap.to(cubo, { scaleZ: 0.82, scaleX: 1.03, scaleY: 1.03, duration: 0.12, ease: 'power2.out' }));
      const soltar = () => gsap.to(cubo, { scaleZ: 1, scaleX: cubo.dataset.encima ? 1.07 : 1, scaleY: cubo.dataset.encima ? 1.07 : 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      caja.addEventListener('pointerup', soltar);
      caja.addEventListener('pointercancel', soltar);
    });
  }

  return api;
}
