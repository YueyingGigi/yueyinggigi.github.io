/* ─────────────────────────────────────────────────────────────
   mesa.js — «Mi vida»: la caja volcada y las fotos por la mesa.

   Idea de Gigi (2026-10-05): al llegar, una caja se vuelca sobre una
   mesa de papel (la misma de la portada) y las fotos se esparcen. Se
   pueden arrastrar y lanzar; un clic sin arrastrar la amplía. Para
   quien no quiera jugar, «Ordenar» las pone en fila.
   En el móvil arrastrar por una mesa pelearía con el scroll, así que
   son un montón: se desliza la de arriba a un lado y pasa al fondo.

   El arrastre está hecho a mano (eventos de puntero), sin GSAP: así
   la mesa funciona aunque la librería no cargue. Las fotos tienen
   SIEMPRE una posición en la mesa; las animaciones solo deciden cómo
   llegan a ella (ESTADO § 5.1).
   ───────────────────────────────────────────────────────────── */

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const enMovil = () => matchMedia('(max-width: 900px)').matches;

/* Dónde cae cada foto (centro, en % de la mesa) y cuánto gira.
   Escrito a mano, no al azar: así la mesa sale igual cada vez. */
const SUELTAS = [
  [31, 27, -8], [48, 20, 6], [65, 28, -4], [83, 22, 9], [24, 70, 5],
  [41, 63, -10], [58, 72, 7], [75, 65, -6], [89, 71, 4], [52, 45, -3]
];
const MONTON = [[50, 50, -4], [50, 50, 3], [50, 50, -2], [50, 50, 5], [50, 50, -6],
                [50, 50, 2], [50, 50, -3], [50, 50, 6], [50, 50, -5], [50, 50, 1]];

export function montarMesa(raiz, textos){
  const caja = raiz.querySelector('.b-mesa');
  if (!caja) return;
  const tablero = caja.querySelector('.b-mesa__tablero');
  const volcada = caja.querySelector('.b-mesa__caja');
  const nota = caja.querySelector('.b-mesa__nota');
  const boton = caja.querySelector('.b-mesa__ordenar');
  const fotos = [...caja.querySelectorAll('.b-mesa__foto')];
  if (!tablero || !fotos.length) return;

  let modo = enMovil() ? 'monton' : 'suelto';   // 'suelto' | 'fila' | 'monton'
  let arriba = fotos.length;                     // z-index de la última tocada
  let tocada = false;                            // ¿ya ha jugado alguien?
  const pos = fotos.map(() => ({ x: 0, y: 0, r: 0 }));

  const pintar = (n) => {
    const f = fotos[n], p = pos[n];
    f.style.transform = `translate(${p.x - f.offsetWidth / 2}px, ${p.y - f.offsetHeight / 2}px) rotate(${p.r}deg)`;
  };
  const pintarTodas = () => fotos.forEach((_, n) => pintar(n));

  /* Coloca todas las fotos según el modo. `suave` = con transición. */
  function colocar(suave){
    // primero el modo: el CSS cambia el ancho de las fotos según él
    caja.dataset.modo = modo;
    const W = tablero.clientWidth;
    let H;
    if (modo === 'fila'){
      const cols = enMovil() ? 2 : 5;
      const w = fotos[0].offsetWidth, h = fotos[0].offsetHeight;
      const hueco = (W - cols * w) / (cols + 1);
      const filas = Math.ceil(fotos.length / cols);
      H = filas * (h + 26) + 40;
      tablero.style.height = H + 'px';
      fotos.forEach((f, n) => {
        const c = n % cols, fil = Math.floor(n / cols);
        pos[n] = { x: hueco + w / 2 + c * (w + hueco), y: 30 + h / 2 + fil * (h + 26), r: 0 };
      });
    } else {
      tablero.style.height = '';
      H = tablero.clientHeight;
      const lista = modo === 'monton' ? MONTON : SUELTAS;
      fotos.forEach((f, n) => {
        const [px, py, r] = lista[n % lista.length];
        // en el montón, cada una un pelín desplazada: se ve que hay más debajo
        const d = modo === 'monton' ? (fotos.length - n) * 1.5 : 0;
        pos[n] = { x: W * px / 100 + d, y: H * py / 100 - d, r };
      });
    }
    fotos.forEach((f, n) => { f.style.zIndex = String(n + 1); });
    arriba = fotos.length;
    tablero.dataset.suave = String(!!suave && !sinMovimiento());
    pintarTodas();
    if (suave) setTimeout(() => { tablero.dataset.suave = 'false'; }, 650);
    if (boton) boton.textContent = modo === 'fila'
      ? (textos['mesa.desordenar'] || '') : (textos['mesa.ordenar'] || '');
    if (nota) nota.textContent = modo === 'monton'
      ? (textos['mesa.pista-movil'] || '') : (textos['mesa.pista'] || '');
  }

  /* ── Arrastrar, con un poco de inercia al soltar ── */
  fotos.forEach((f, n) => {
    let ini = null, movida = false, muestras = [];

    f.addEventListener('pointerdown', e => {
      if (e.button !== 0 || modo === 'fila') return;
      // en el montón solo se mueve la de arriba
      if (modo === 'monton' && +f.style.zIndex !== arriba) return;
      ini = { px: e.clientX, py: e.clientY, x: pos[n].x, y: pos[n].y };
      movida = false; muestras = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
      f.setPointerCapture(e.pointerId);
      if (modo === 'suelto') f.style.zIndex = String(++arriba);
      f.dataset.arrastrando = 'true';
      tocada = true;
    });

    f.addEventListener('pointermove', e => {
      if (!ini) return;
      const dx = e.clientX - ini.px, dy = e.clientY - ini.py;
      if (Math.abs(dx) + Math.abs(dy) > 6) movida = true;
      if (modo === 'monton'){
        pos[n].x = ini.x + dx;
        pos[n].r = MONTON[n % MONTON.length][2] + dx / 18;
      } else {
        pos[n].x = ini.x + dx; pos[n].y = ini.y + dy;
      }
      muestras.push({ t: performance.now(), x: e.clientX, y: e.clientY });
      if (muestras.length > 5) muestras.shift();
      pintar(n);
    });

    const soltar = () => {
      if (!ini) return;
      const desde = { ...ini };
      ini = null;
      delete f.dataset.arrastrando;
      const a = muestras[0], b = muestras[muestras.length - 1];
      const dt = Math.max(16, b.t - a.t);
      const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;   // px por ms

      if (modo === 'monton'){
        const dx = pos[n].x - desde.x;
        if (Math.abs(dx) > 80 || Math.abs(vx) > 0.6){
          // fuera por un lado y al fondo del montón
          const W = tablero.clientWidth;
          pos[n].x = desde.x + Math.sign(dx || vx) * W;
          tablero.dataset.suave = 'true'; pintar(n);
          setTimeout(() => {
            fotos.forEach(o => { o.style.zIndex = String(+o.style.zIndex + 1); });
            f.style.zIndex = '1';
            arriba = Math.max(...fotos.map(o => +o.style.zIndex));
            pos[n] = { x: desde.x, y: pos[n].y, r: MONTON[n % MONTON.length][2] };
            pintar(n);
            setTimeout(() => { tablero.dataset.suave = 'false'; }, 450);
          }, 280);
        } else {
          pos[n].x = desde.x; pos[n].r = MONTON[n % MONTON.length][2];
          tablero.dataset.suave = 'true'; pintar(n);
          setTimeout(() => { tablero.dataset.suave = 'false'; }, 450);
        }
        return;
      }

      // suelto: se desliza un poco en la dirección del lanzamiento
      if (!sinMovimiento() && movida){
        const W = tablero.clientWidth, H = tablero.clientHeight;
        const mx = f.offsetWidth * 0.2, my = f.offsetHeight * 0.2;
        const fx = Math.max(mx, Math.min(W - mx, pos[n].x + vx * 140));
        const fy = Math.max(my, Math.min(H - my, pos[n].y + vy * 140));
        const x0 = pos[n].x, y0 = pos[n].y, t0 = performance.now();
        const paso = (t) => {
          const k = Math.min(1, (t - t0) / 380), e = 1 - Math.pow(1 - k, 3);
          pos[n].x = x0 + (fx - x0) * e; pos[n].y = y0 + (fy - y0) * e;
          pintar(n);
          if (k < 1) requestAnimationFrame(paso);
        };
        requestAnimationFrame(paso);
      }
    };
    f.addEventListener('pointerup', soltar);
    f.addEventListener('pointercancel', soltar);

    // si se ha arrastrado, ese clic NO amplía la foto
    f.addEventListener('click', e => {
      if (movida){ e.stopImmediatePropagation(); e.preventDefault(); movida = false; }
    }, true);
  });

  boton?.addEventListener('click', () => {
    tocada = true;
    modo = modo === 'fila' ? (enMovil() ? 'monton' : 'suelto') : 'fila';
    colocar(true);
  });

  let ancho = innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(innerWidth - ancho) < 40) return;   // la barra del móvil cambia el alto, no el ancho
    ancho = innerWidth;
    if (modo !== 'fila') modo = enMovil() ? 'monton' : 'suelto';
    colocar(false);
  }, { passive: true });

  colocar(false);
  // las fotos aún pueden estar cargando: su alto cambia al llegar
  fotos.forEach(f => f.querySelector('img')?.addEventListener('load', () => { if (!tocada) colocar(false); }, { once: true }));

  /* ── La caja se vuelca y las fotos salen de ella ──
     Primero, nada más asomar la mesa, se meten todas en la caja
     (pequeñas, pero visibles). Luego, ya a la vista, salen volando a
     su sitio una a una. */
  if (sinMovimiento() || !volcada) return;
  caja.dataset.volcada = 'false';
  let fase = 0;
  const desdeLaCaja = () => {
    const t = tablero.getBoundingClientRect(), c = volcada.getBoundingClientRect();
    return { x: c.left + c.width * 0.62 - t.left, y: c.top + c.height * 0.5 - t.top };
  };
  const meter = () => {
    if (fase) return; fase = 1;
    const o = desdeLaCaja();
    fotos.forEach(f => {
      f.style.transform = `translate(${o.x - f.offsetWidth / 2}px, ${o.y - f.offsetHeight / 2}px) rotate(0deg) scale(.3)`;
    });
    // si nadie llega a verla entera, que no se queden en la caja
    setTimeout(sacar, 4000);
  };
  const sacar = () => {
    if (fase === 2) return;
    meter(); fase = 2;
    caja.dataset.volcada = 'true';
    const o = desdeLaCaja();
    fotos.forEach((f, n) => {
      const p = pos[n];
      const fin = `translate(${p.x - f.offsetWidth / 2}px, ${p.y - f.offsetHeight / 2}px) rotate(${p.r}deg)`;
      f.animate([
        { transform: `translate(${o.x - f.offsetWidth / 2}px, ${o.y - f.offsetHeight / 2}px) rotate(${p.r - 40}deg) scale(.3)` },
        { transform: fin }
      ], { duration: 720, delay: 260 + n * 70, easing: 'cubic-bezier(.2,.85,.3,1.08)', fill: 'backwards' });
      pintar(n);
    });
    // un empujoncito a una foto, por si no se ve que se pueden mover
    if (modo === 'suelto') setTimeout(() => {
      if (tocada) return;
      const n = fotos.length - 1, f = fotos[n];
      f.animate([{ translate: '0 0' }, { translate: '34px -10px' }, { translate: '0 0' }],
                { duration: 900, easing: 'ease-in-out' });
    }, 260 + fotos.length * 70 + 1100);
  };
  const vigia = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    if (e.intersectionRatio < 0.3){ meter(); return; }
    sacar(); vigia.disconnect();
  }), { threshold: [0, 0.3] });
  vigia.observe(tablero);
}
