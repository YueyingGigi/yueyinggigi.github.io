/* ─────────────────────────────────────────────────────────────
   escena.js — la mesa en 3D (docs/HOME-3D.md).

   1. Monta la escena alrededor de la lista de cajas que ya está en el
      HTML: cada caja pasa a ser la tapa de un cubo con cuatro caras.
      Sin este archivo, la mesa es la plana de siempre.

   2. LA CÁMARA LA MUEVE QUIEN MIRA (Gigi, 2026-10-06). Se llega con la
      mesa vista de frente, las cajas en fila y las palabras grandes
      pasando por la pared; al bajar con la rueda, el dedo o las
      flechas, la cámara sube hasta la vista desde arriba, y al volver
      a subir, baja. Antes era un plano de entrada que se reproducía
      solo: «aparece un momento y desaparece, como un vídeo».
      · No hay scroll de verdad mientras tanto: la rueda mueve la
        cámara, y solo cuando ya está arriba vuelve a mover la página
        (en el móvil, las cajas en dos columnas no caben en una
        pantalla). Así no depende de lo alto que sea nada.
      · Si se pincha una caja a medio camino, la cámara termina de
        subir y luego se abre (`terminar()`).
      · Quien ya subió en esta visita, al volver a la mesa la
        encuentra arriba; puede bajar a verla de frente cuando quiera.
      · Con «menos movimiento», o si GSAP no carga: la mesa desde
        arriba, sin más.

   3. Arriba, la mesa responde: gira con el ratón, las cajas se
      levantan, la luz sigue al ratón y las sombras huyen de ella, de
      vez en cuando una caja se menea sola, y hay tres cosas sueltas
      encima que se pueden empujar.

   4. Al abrir una caja, la cámara se pone encima de ella (`enfocar`).
   ───────────────────────────────────────────────────────────── */

import { conGsap, sinMovimiento } from './anim.js';

const FRENTE = 74;            // grados de la cámara en la vista de frente
const CERCA = 1500;           // perspectiva de frente (px)

/* Dónde se queda la cámara arriba. Gigi probó las dos (2026-10-06)
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
const conRaton = () => matchMedia('(pointer: fine)').matches;

/* Para recordar, dentro de la visita, que ya se subió a mirar */
const LLAVE = 'gigi.mesa.arriba';
const yaSubio = () => { try { return sessionStorage.getItem(LLAVE) === 'si'; } catch (e) { return false; } };
const apuntarSubida = () => { try { sessionStorage.setItem(LLAVE, 'si'); } catch (e) { /* da igual */ } };

const entre = (v, a, b) => Math.max(a, Math.min(b, v));
const paso = (v, a, b) => { const t = entre((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function el(etiqueta, clase){
  const n = document.createElement(etiqueta);
  if (clase) n.className = clase;
  return n;
}

/* La cinta de letras: las dos frases con el sello en miniatura entre
   ellas, repetida para que el bucle no tenga costura. Va en la pared
   (de frente) y, más floja, pintada en la mesa (desde arriba). */
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

/* Las tres cosas de encima de la mesa (Gigi, 2026-10-06): una
   polaroid, una nota a mano y lo que queda de abrir cajas (un rollo
   de cinta y un trozo de precinto). Dibujadas con CSS, menos la foto. */
function pintarCosas(cosas, textos){
  cosas.innerHTML = `
    <div class="cosa cosa--polaroid"><img src="assets/media/fotos/autorretrato-640.webp" alt="" loading="lazy"><i></i></div>
    <p class="cosa cosa--nota"></p>
    <div class="cosa cosa--rollo"><i></i></div>
    <div class="cosa cosa--tira"></div>`;
  cosas.querySelector('.cosa--nota').textContent = textos['mesa.nota'] || 'Bienvenid@, aquí se mira y se toca ;)';
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
  const luz = el('div', 'luz'); luz.setAttribute('aria-hidden', 'true');
  const rotulo = el('div', 'rotulo'); rotulo.setAttribute('aria-hidden', 'true');
  const cintaMesa = el('div', 'pared__cinta');
  rotulo.appendChild(cintaMesa);
  const cosas = el('div', 'cosas'); cosas.setAttribute('aria-hidden', 'true');
  lista.replaceWith(escena);
  escena.appendChild(camara);
  camara.append(pared, tablero, luz, rotulo, cosas, lista);
  pintarCinta(cinta, textos);
  pintarCinta(cintaMesa, textos);
  pintarCosas(cosas, textos);

  // la pista de abajo: «baja y asómate»
  const pista = el('button', 'asomate');
  pista.type = 'button';
  pista.innerHTML = `<span></span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v13M6 13l6 6 6-6"/></svg>`;
  pista.firstElementChild.textContent = textos['mesa.baja'] || '';
  pista.hidden = true;
  mesa.appendChild(pista);

  // ── cada caja, un cubo ──
  const cubos = [...lista.children].map(li => {
    const caja = li.querySelector('.caja');
    const cubo = el('div', 'cubo');
    li.insertBefore(cubo, caja);
    cubo.appendChild(caja);
    // la etiqueta de cristal: el nombre del apartado, flotando encima
    const cristal = el('span', 'cubo__cristal');
    cristal.setAttribute('aria-hidden', 'true');
    cristal.style.setProperty('--color', getComputedStyle(caja).getPropertyValue('--color'));
    const nombre = () => { cristal.textContent = caja.querySelector('.caja__etiqueta')?.textContent || ''; };
    nombre();
    caja.addEventListener('pointerenter', nombre);
    caja.addEventListener('focus', nombre);
    cubo.appendChild(cristal);
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
  document.documentElement.classList.add('con-3d');
  medir();

  document.addEventListener('idioma:cambiado', e => {
    pintarCinta(cinta, e.detail.textos);
    pintarCinta(cintaMesa, e.detail.textos);
    cosas.querySelector('.cosa--nota').textContent = e.detail.textos['mesa.nota'] || '';
    pista.firstElementChild.textContent = e.detail.textos['mesa.baja'] || '';
  });

  let G = null;               // GSAP, cuando llega
  let enfocada = false;       // la cámara está encima de una caja: ya no manda nadie más
  let arriba = false;         // la cámara está (casi) arriba: la mesa responde
  const est = { p: 0 };       // 0 = de frente · 1 = desde arriba
  const rat = { x: 0, y: 0 }; // el ratón, de −1 a 1, suavizado
  let objetivo = 0;
  let alLlegar = [];
  let fila = null;            // móvil: cuánto se aparta cada cubo para ir en fila

  const cambiarVista = ar => {
    arriba = ar;
    escena.dataset.lista = String(ar);
    if (ar) apuntarSubida();
    document.dispatchEvent(new CustomEvent('escena:vista', { detail: { arriba: ar } }));
  };

  /* Todo lo que depende de dónde está la cámara, en un solo sitio */
  function aplicar(){
    if (!G || enfocada) return;
    const e = paso(est.p, 0, 1);
    G.set(camara, {
      rotationX: FRENTE + (FINAL.rx - FRENTE) * e - rat.y * GIRO_MESA.x * e,
      rotationY: rat.x * GIRO_MESA.y * (0.22 + 0.78 * e)
    });
    G.set(escena, { perspective: CERCA + (FINAL.perspectiva - CERCA) * e });
    pared.style.opacity = String(1 + (FINAL.pared - 1) * paso(e, 0.45, 0.85));
    const enLaMesa = paso(e, 0.62, 1);
    rotulo.style.opacity = String(enLaMesa);
    luz.style.opacity = String(enLaMesa);
    if (fila){
      cubos.forEach((c, n) => {
        const s = 1 + (fila[n].s - 1) * (1 - e);
        const donde = { x: fila[n].x * (1 - e), y: fila[n].y * (1 - e), scaleX: s, scaleY: s };
        const sombra = c.parentElement.querySelector('.cubo__sombra');
        G.set(c, donde);
        G.set(sombra, donde);
        // el alto del cubo va en px (translateZ) y la escala no lo toca:
        // se le da el ancho que se VE para que siga siendo un cubo
        c.style.setProperty('--ancho-cubo', c.offsetWidth * s + 'px');
        sombra.style.setProperty('--ancho-cubo', c.offsetWidth * s + 'px');
      });
    }
    pista.dataset.visible = String(est.p < 0.06);
    const ar = est.p > 0.93;
    if (ar !== arriba) cambiarVista(ar);
    if (est.p > 0.995 && alLlegar.length) alLlegar.splice(0).forEach(f => f());
  }

  function ir(v, dur = 0.6){
    if (!G || enfocada) return;
    objetivo = entre(v, 0, 1);
    G.to(est, { p: objetivo, duration: dur, ease: 'power2.out', overwrite: true, onUpdate: aplicar });
  }

  /* En el móvil, de frente, las cinco van en fila (en dos columnas no
     se ven); al subir la cámara cada una va a su sitio. Se mide una vez
     dónde caería cada cubo en fila y se guarda la diferencia. */
  function medirFila(){
    fila = null;
    if (!enMovil()){
      cubos.forEach(c => G?.set([c, c.parentElement.querySelector('.cubo__sombra')], { x: 0, y: 0, scaleX: 1, scaleY: 1 }));
      return;
    }
    const sitio = c => {
      const li = c.parentElement;
      return { x: li.offsetLeft + c.offsetLeft + c.offsetWidth / 2, y: li.offsetTop + c.offsetTop + c.offsetHeight / 2, w: c.offsetWidth };
    };
    const suyo = cubos.map(sitio);
    lista.classList.add('en-fila');
    const enFila = cubos.map(sitio);
    lista.classList.remove('en-fila');
    // la fila, a media altura de la lista: es donde gira la cámara
    const medio = lista.offsetHeight * 0.36;
    fila = suyo.map((a, n) => ({ x: enFila[n].x - a.x, y: medio - a.y, s: enFila[n].w / a.w }));
  }

  const api = {
    /* Promesa que se cumple cuando la cámara está arriba */
    terminar(){
      if (!G || est.p > 0.995) return Promise.resolve();
      return new Promise(ok => { alLlegar.push(ok); ir(1, 0.42); });
    },

    /* Al pinchar una caja, la cámara se va ENCIMA de ella y se acerca
       (Gigi, 2026-10-06: «debería girar hasta ponerse encima de la caja
       y entonces abrirla»; antes se abría donde estuviera, con la mesa
       ladeada, y parecía una puerta). La mesa se endereza, la caja se
       pone recta y en el centro, y las otras cuatro se apagan.
       Devuelve cuánto tarda y DÓNDE va a quedar la tapa en pantalla,
       para que las manos (js/hand.js) vayan ya hacia allí. */
    enfocar(caja){
      const cubo = caja.closest('.cubo');
      if (!G || !cubo || enfocada) return null;
      enfocada = true;
      G.killTweensOf([est, rat]);
      let x = 0, y = 0;
      for (let n = cubo; n && n !== escena; n = n.offsetParent){ x += n.offsetLeft; y += n.offsetTop; }
      const w = cubo.offsetWidth, h = cubo.offsetHeight;
      const E = escena.getBoundingClientRect();
      const cx = x + w / 2, cy = y + h / 2;                 // centro de la caja, dentro de la escena
      // con el punto de fuga encima de ella, la tapa (a la altura del
      // cubo) se ve en su sitio y un poco más grande
      const f = FINAL.perspectiva / (FINAL.perspectiva - w * 0.873);
      // la caja no va al centro sino algo más abajo y no tan grande:
      // al abrirse, la tapa cae hacia atrás y ocupa otra caja entera
      // por encima, y tiene que caber sin meterse bajo la barra
      const ancho = Math.min(innerHeight * 0.37, innerWidth * 0.62);
      const k = Math.max(1, ancho / (w * f));
      const medio = { x: innerWidth / 2, y: innerHeight * 0.66 };
      const D = 0.5;
      G.set(escena, { transformOrigin: `${cx}px ${cy}px` });
      G.to(escena, {
        scale: k, x: medio.x - (E.left + cx), y: medio.y - (E.top + cy),
        perspective: FINAL.perspectiva, perspectiveOrigin: `${cx}px ${cy}px`,
        duration: D, ease: 'power2.inOut', overwrite: true
      });
      G.to(camara, { rotationX: 0, rotationY: 0, duration: D, ease: 'power2.inOut', overwrite: true });
      G.to([pared, rotulo, luz, cosas], { opacity: 0, duration: 0.25, overwrite: true });
      G.to(cubo, { z: 0, rotationX: 0, rotationY: 0, rotation: 0, scaleX: 1, scaleY: 1, scaleZ: 1,
                   duration: 0.42, ease: 'power2.out', overwrite: true });
      const sombra = cubo.parentElement.querySelector('.cubo__sombra');
      if (sombra) G.to(sombra, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.42, overwrite: true });
      lista.dataset.enfocada = 'true';
      cubo.parentElement.dataset.foco = 'true';
      document.documentElement.classList.add('enfocando');
      pista.hidden = true;
      const W = w * f * k, H = h * f * k;
      return { duracion: D * 1000, rect: { left: medio.x - W / 2, top: medio.y - H / 2, width: W, height: H } };
    }
  };

  /* Sin movimiento, o sin GSAP: la mesa desde arriba y ya está */
  const sinMas = () => {
    camara.style.transform = `rotateX(${FINAL.rx}deg)`;
    pared.style.opacity = String(FINAL.pared);
    rotulo.style.opacity = '1';
    escena.style.perspective = FINAL.perspectiva + 'px';
    escena.style.opacity = '';
    cambiarVista(true);
  };
  if (sinMovimiento()){ sinMas(); return api; }

  // Hasta que GSAP coloque la cámara, la escena no se enseña: si no, se
  // vería un instante la mesa desde arriba y luego saltaría de frente.
  // Si GSAP no llega, se enseña igual a los 2,5 s.
  escena.style.opacity = '0';
  const porSiAcaso = setTimeout(() => { escena.style.opacity = ''; }, 2500);

  conGsap(async (gsap) => {
    G = gsap;
    // espera a que las fotos de las cajas estén listas (como mucho 1,2 s):
    // si no, la caída se haría con huecos en blanco
    const fotos = [...lista.querySelectorAll('.caja__foto')];
    await Promise.race([
      Promise.all(fotos.map(f => f.decode ? f.decode().catch(() => {}) : null)),
      new Promise(ok => setTimeout(ok, 1200))
    ]);

    medir();
    medirFila();
    new ResizeObserver(() => { medir(); medirFila(); aplicar(); }).observe(lista);

    est.p = objetivo = yaSubio() ? 1 : 0;
    cubos.forEach(c => gsap.set(c, { rotation: parseFloat(getComputedStyle(c).getPropertyValue('--giro')) || 0 }));
    aplicar();
    pista.hidden = false;

    clearTimeout(porSiAcaso);
    escena.style.opacity = '';
    // las cajas caen sobre la mesa, una detrás de otra
    gsap.from(cubos, { z: 320, opacity: 0, duration: 0.62, ease: 'back.out(1.5)', stagger: 0.1, clearProps: 'opacity' });

    mandar(gsap);
    responder(gsap);
  }).then(hay => { if (!hay){ clearTimeout(porSiAcaso); sinMas(); } });

  /* ── Quien mira mueve la cámara ──
     La rueda (o el dedo, o las flechas) no mueve la página hasta que
     la cámara está arriba; y con la página arriba del todo, subir
     vuelve a bajar la cámara. */
  function mandar(gsap){
    let reposo = null;
    const empujar = (cuanto) => {
      ir(objetivo + cuanto, 0.55);
      // al soltar, si se quedó casi en un extremo, termina de llegar
      clearTimeout(reposo);
      reposo = setTimeout(() => {
        if (objetivo > 0.8 && objetivo < 1) ir(1, 0.5);
        else if (objetivo < 0.14 && objetivo > 0) ir(0, 0.5);
      }, 240);
    };
    const leToca = (baja) => !enfocada && (baja ? objetivo < 1 : (objetivo > 0 && scrollY <= 0));

    window.addEventListener('wheel', e => {
      if (e.ctrlKey || !e.deltaY) return;             // el zoom con dos dedos no es esto
      if (!leToca(e.deltaY > 0)) return;
      e.preventDefault();
      const px = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
      empujar(entre(px, -160, 160) / 620);
    }, { passive: false });

    // Un mismo gesto del dedo o mueve la cámara o mueve la página, no
    // las dos cosas: si ha movido la cámara y llega arriba a medio
    // gesto, lo que queda no se convierte en scroll.
    let dedoY = null, deLaCamara = false;
    window.addEventListener('touchstart', e => {
      dedoY = e.touches.length === 1 ? e.touches[0].clientY : null;
      deLaCamara = false;
    }, { passive: true });
    window.addEventListener('touchmove', e => {
      if (dedoY == null || e.touches.length !== 1) return;
      const y = e.touches[0].clientY, d = dedoY - y;   // > 0: el dedo sube, se baja por la página
      const toca = Math.abs(d) >= 2 && leToca(d > 0);
      if (!toca && !deLaCamara){ dedoY = y; return; }
      if (e.cancelable) e.preventDefault();
      dedoY = y;
      deLaCamara = true;
      if (toca) empujar(d / (innerHeight * 0.42));
    }, { passive: false });

    window.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const baja = ['ArrowDown', 'PageDown', 'End'].includes(e.key);
      const sube = ['ArrowUp', 'PageUp', 'Home'].includes(e.key);
      if ((!baja && !sube) || !leToca(baja)) return;
      e.preventDefault();
      ir(baja ? 1 : 0, 0.9);
    });

    pista.addEventListener('click', () => ir(1, 0.9));
  }

  /* ── La mesa responde ──
     1. Gira un poco siguiendo al ratón (o la inclinación del móvil,
        donde el navegador la da sin pedir permiso).
     2. La luz sigue al ratón y las sombras de las cajas huyen de ella.
     3. Cada caja, al acercarse el ratón, sube y se inclina hacia él; al
        irse, vuelve con un pequeño bamboleo; al pulsar, se aplasta.
     4. Si nadie toca nada, de vez en cuando una caja se menea sola.
     5. Las cosas sueltas de la mesa se dejan empujar. */
  function responder(gsap){
    const mover = (nx, ny) => {               // -1 … 1
      if (enfocada) return;
      gsap.to(rat, { x: nx, y: ny, duration: 0.9, ease: 'power3.out', overwrite: true, onUpdate: aplicar });
    };
    const sombras = cubos.map(c => c.parentElement.querySelector('.cubo__sombra'));
    let ultimoGesto = performance.now(), pendiente = false, mx = 0, my = 0;

    const alumbrar = () => {
      pendiente = false;
      if (!arriba || enfocada) return;
      const r = luz.getBoundingClientRect();
      luz.style.setProperty('--lx', ((mx - r.left) / r.width * 100).toFixed(1) + '%');
      luz.style.setProperty('--ly', ((my - r.top) / r.height * 100).toFixed(1) + '%');
      // la sombra de cada caja cae al lado contrario de la luz, y más
      // larga cuanto más lejos está
      cubos.forEach((c, n) => {
        const b = c.parentElement.getBoundingClientRect();
        const dx = b.left + b.width / 2 - mx, dy = b.top + b.height / 2 - my;
        const d = Math.hypot(dx, dy) || 1, largo = 0.13 + 0.17 * Math.min(1, d / 700);
        sombras[n].style.setProperty('--sx', (dx / d * largo).toFixed(3));
        sombras[n].style.setProperty('--sy', (dy / d * largo).toFixed(3));
      });
    };

    if (conRaton()){
      window.addEventListener('pointermove', e => {
        ultimoGesto = performance.now();
        mx = e.clientX; my = e.clientY;
        mover((mx / innerWidth - 0.5) * 2, (my / innerHeight - 0.5) * 2);
        if (!pendiente){ pendiente = true; requestAnimationFrame(alumbrar); }
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => {
        mover(0, 0);
        escena.dataset.sinLuz = 'true';
        sombras.forEach(s => { s.style.removeProperty('--sx'); s.style.removeProperty('--sy'); });
      });
      document.documentElement.addEventListener('pointerenter', () => { delete escena.dataset.sinLuz; });
    } else if ('DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function'){
      window.addEventListener('deviceorientation', e => {
        if (e.gamma == null) return;
        mover(entre(e.gamma / 25, -1, 1), entre((e.beta - 45) / 25, -1, 1));
      }, { passive: true });
    }
    window.addEventListener('touchstart', () => { ultimoGesto = performance.now(); }, { passive: true });

    // una caja se menea sola: «ábreme»
    let ultimoMeneo = performance.now();
    setInterval(() => {
      const ahora = performance.now();
      if (!arriba || enfocada || document.hidden) return;
      if (ahora - ultimoGesto < 3600 || ahora - ultimoMeneo < 4600) return;
      const libres = cubos.filter(c => !c.dataset.encima);
      const c = libres[Math.floor(Math.random() * libres.length)];
      if (!c) return;
      ultimoMeneo = ahora;
      const giro = parseFloat(getComputedStyle(c).getPropertyValue('--giro')) || 0;
      gsap.timeline({ overwrite: 'auto' })
        .to(c, { z: 26, rotation: giro + 3.2, duration: 0.16, ease: 'power2.out' })
        .to(c, { rotation: giro - 2.6, duration: 0.13, ease: 'sine.inOut' })
        .to(c, { rotation: giro + 1.6, duration: 0.12, ease: 'sine.inOut' })
        .to(c, { z: 0, rotation: giro, duration: 0.5, ease: 'bounce.out' });
    }, 900);

    // las cosas sueltas: el ratón las empuja y se quedan donde las dejan
    cosas.querySelectorAll('.cosa').forEach(cosa => {
      let x = 0, y = 0, g = 0;
      cosa.addEventListener('pointermove', e => {
        if (!arriba || enfocada) return;
        x = entre(x + e.movementX * 0.55, -70, 70);
        y = entre(y + e.movementY * 0.55, -50, 50);
        g = entre(g + e.movementX * 0.05, -9, 9);
        gsap.to(cosa, { x, y, rotation: g, duration: 0.35, ease: 'power2.out', overwrite: true });
      });
    });

    if (!conRaton()) return;
    cubos.forEach(cubo => {
      const caja = cubo.querySelector('.caja');
      const giro = parseFloat(getComputedStyle(cubo).getPropertyValue('--giro')) || 0;
      const sombra = cubo.parentElement.querySelector('.cubo__sombra');
      const z  = gsap.quickTo(cubo, 'z', { duration: 0.45, ease: 'power3.out' });
      const ix = gsap.quickTo(cubo, 'rotationX', { duration: 0.45, ease: 'power3.out' });
      const iy = gsap.quickTo(cubo, 'rotationY', { duration: 0.45, ease: 'power3.out' });
      const subirSombra = (k) => gsap.to(sombra, {     // k: 0 en la mesa … 1 arriba
        x: 34 * k, y: 48 * k, scale: 1 + 0.16 * k, opacity: 1 - 0.5 * k,
        duration: 0.45, ease: 'power3.out', overwrite: 'auto'
      });
      const libre = () => arriba && !enfocada && caja.dataset.abriendo !== 'true';
      caja.addEventListener('pointermove', e => {
        if (!libre()) return;
        const r = caja.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        if (!cubo.dataset.encima) subirSombra(1);
        cubo.dataset.encima = 'true';
        z(CAJA.sube); ix(-py * CAJA.inclina); iy(px * CAJA.inclina);
        // desde arriba, subir 80 px apenas agranda; se exagera un poco
        gsap.to(cubo, { scaleX: 1.07, scaleY: 1.07, duration: 0.45, ease: 'power3.out', overwrite: false });
      });
      caja.addEventListener('pointerleave', () => {
        if (!cubo.dataset.encima) return;
        delete cubo.dataset.encima;
        if (enfocada) return;
        gsap.to(cubo, { z: 0, rotationX: 0, rotationY: 0, rotation: giro, scaleX: 1, scaleY: 1, duration: 1.1, ease: 'elastic.out(1, 0.38)', overwrite: 'auto' });
        gsap.to(sombra, { x: 0, y: 0, scale: 1, opacity: 1, duration: 1.1, ease: 'elastic.out(1, 0.38)', overwrite: 'auto' });
      });
      caja.addEventListener('pointerdown', () => libre() && gsap.to(cubo, { scaleZ: 0.82, scaleX: 1.03, scaleY: 1.03, duration: 0.12, ease: 'power2.out' }));
      const soltar = () => libre() && gsap.to(cubo, { scaleZ: 1, scaleX: cubo.dataset.encima ? 1.07 : 1, scaleY: cubo.dataset.encima ? 1.07 : 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      caja.addEventListener('pointerup', soltar);
      caja.addEventListener('pointercancel', soltar);
    });
  }

  return api;
}
