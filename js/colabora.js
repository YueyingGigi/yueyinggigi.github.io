/* ─────────────────────────────────────────────────────────────
   colabora.js — «Colabora conmigo», como una tienda de cajas sorpresa
   (diseño de Gigi, 2026-10-06; docs/TRASPASO-2026-10-06.md § 3.5).

   Quien llega aquí es una marca, por enlace directo, y solo ve esta
   página; está acostumbrada a ver vídeo vertical en el móvil. Por eso:

     1. Entrada     un móvil que va pasando una mezcla de los vídeos:
                    en cinco segundos se ve el estilo.
     2. Estanterías los vídeos por sector, de pie como productos. Al
                    pasar el ratón se mueven (sin sonido); al pinchar,
                    el vídeo crece desde su sitio hasta un visor a
                    pantalla completa, con el siguiente arriba y abajo.
     3. Marcas      un anillo de tarjetas con el logo (o el nombre) que
                    da vueltas; al pinchar una sale su foto o su vídeo.
     4. Cuentas     los datos, en los cuatro lados de una caja que se
                    gira con la mano.
     5. Caja vacía  sin etiqueta: «la próxima serie puede ser tu
                    marca». Se abre y sale una carta para escribirle.

   El orden es el de siempre (primero el trabajo, luego los datos, al
   final el contacto), con la entrada delante.

   Todo el contenido sale de content/colabora.json. Aquí no hay ni un
   dato. Sin reproducciones por vídeo (docs/ESTADO.md § 4).
   ───────────────────────────────────────────────────────────── */

import { enIdioma, enlaceFuera, dePlataforma } from './bloques.js';

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const conRaton = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

function el(etiqueta, clase, texto){
  const n = document.createElement(etiqueta);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
}
const svg = (camino, lado = 20, grosor = 2) => `<svg width="${lado}" height="${lado}" viewBox="0 0 24 24" fill="none"
  stroke="currentColor" stroke-width="${grosor}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${camino}"/></svg>`;

function seccion(id, titulo){
  const s = el('section', 'bloque tienda__seccion');
  s.id = 'b-' + id;
  if (titulo) s.appendChild(el('h2', 'bloque__titulo', titulo));
  return s;
}

/* Lo que se dice de un vídeo, en una línea: formato · idioma · dónde */
function lineaDe(v){
  const partes = [];
  if (v.formato) partes.push(enIdioma(v.formato));
  if (v.idioma) partes.push(enIdioma(v.idioma));
  if (v.plataformas) partes.push(v.plataformas.join(', '));
  return partes.join(' · ');
}

/* ═══════════ La página ═══════════ */

export function pintarTienda(datos, textos){
  const caja = document.querySelector('.bloques');
  if (!caja) return [];
  cerrarVisor?.(true);
  caja.innerHTML = '';
  caja.classList.add('tienda');
  const t = clave => textos[clave] || '';
  const videos = (datos.estantes || []).flatMap(e => e.videos || []);

  // ── 1 · la entrada: el móvil con la mezcla ──
  const entrada = el('section', 'tienda__entrada');
  const dicho = el('div', 'tienda__dicho');
  dicho.appendChild(el('p', 'tienda__presentacion', enIdioma(datos.presentacion)));
  const bajar = el('a', 'tienda__bajar', t('colabora.ver-estantes'));
  bajar.href = '#b-estantes';
  bajar.insertAdjacentHTML('beforeend', svg('M12 5v13M6 13l6 6 6-6', 16));
  dicho.appendChild(bajar);
  entrada.appendChild(dicho);

  if (datos.mezcla){
    const movil = el('button', 'movil-mezcla');
    movil.type = 'button';
    movil.setAttribute('aria-label', t('colabora.ver-videos'));
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = !sinMovimiento();
    v.preload = 'metadata';
    v.poster = datos.mezcla.portada || '';
    v.src = datos.mezcla.archivo;
    v.setAttribute('aria-hidden', 'true');
    movil.appendChild(v);
    movil.appendChild(el('span', 'movil-mezcla__isla'));
    movil.insertAdjacentHTML('beforeend', `<span class="movil-mezcla__ver">${svg('M7 4.5v15l13-7.5z', 14)}<i></i></span>`);
    movil.querySelector('.movil-mezcla__ver i').textContent = t('colabora.ver-videos');
    movil.addEventListener('click', () => abrirVisor(videos, 0, movil, textos));
    entrada.appendChild(movil);
    // solo se mueve mientras se ve
    if (!sinMovimiento() && 'IntersectionObserver' in window){
      new IntersectionObserver(([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }, { threshold: 0.25 }).observe(movil);
    }
  }
  caja.appendChild(entrada);

  // ── 2 · las estanterías: un mueble entero, con sus tres baldas ──
  // (Gigi, 2026-10-07: «que sea un expositor de verdad, entero». El
  //  título y la línea de cada vídeo van en una etiqueta de precio
  //  colgada del canto de la balda. Abajo del todo, una balda libre
  //  con «Tu marca aquí», que lleva a la carta: primero hubo un hueco
  //  al final de cada balda, pero la de moda está llena y se quedaba
  //  sin el suyo.)
  const estantes = seccion('estantes', t('colabora.estantes'));
  const mueble = el('div', 'mueble');
  // todas las baldas con las mismas columnas (las de la más llena),
  // para que los vídeos queden en vertical unos sobre otros
  const columnas = Math.max(5, ...(datos.estantes || []).map(e => (e.videos || []).length));
  (datos.estantes || []).forEach(e => {
    const balda = el('div', 'estanteria');
    balda.appendChild(el('h3', 'estanteria__rotulo', enIdioma(e.titulo)));
    const fila = el('ul', 'estanteria__fila');
    fila.style.setProperty('--columnas', String(columnas));
    fila.style.setProperty('--cuantos', String((e.videos || []).length));
    (e.videos || []).forEach((v, n) => {
      const li = el('li', 'producto');
      li.id = 'v-' + v.id;
      // la columna, dicha: la tabla ocupa la fila de en medio entera y,
      // si no, la rejilla echaría los productos a columnas nuevas
      li.style.gridColumn = String(n + 1);
      const b = el('button', 'producto__caja');
      b.type = 'button';
      b.setAttribute('aria-label', (t('video.reproducir') || '') + ': ' + enIdioma(v.titulo));
      const img = document.createElement('img');
      img.src = v.portada; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      b.appendChild(img);
      if (v.marca) b.appendChild(el('span', 'producto__marca', v.marca));
      b.insertAdjacentHTML('beforeend', `<span class="producto__play">${svg('M7 4.5v15l13-7.5z', 16)}</span>`);
      // al pasar el ratón, el vídeo se mueve sin sonido
      if (conRaton() && !sinMovimiento()){
        let prev = null;
        b.addEventListener('pointerenter', () => {
          if (prev) return;
          prev = document.createElement('video');
          prev.muted = true; prev.loop = true; prev.playsInline = true; prev.preload = 'auto';
          prev.src = v.archivo; prev.className = 'producto__previa';
          prev.setAttribute('aria-hidden', 'true');
          b.appendChild(prev);
          prev.play().then(() => { if (prev) prev.dataset.va = 'true'; }).catch(() => {});
        });
        b.addEventListener('pointerleave', () => { if (prev){ prev.pause(); prev.removeAttribute('src'); prev.load(); prev.remove(); prev = null; } });
      }
      b.addEventListener('click', () => abrirVisor(videos, videos.indexOf(v), b, textos));
      li.appendChild(b);
      const precio = el('div', 'producto__precio');
      precio.appendChild(el('p', 'producto__titulo', enIdioma(v.titulo)));
      precio.appendChild(el('p', 'producto__linea', lineaDe(v)));
      li.appendChild(precio);
      fila.appendChild(li);
    });
    balda.appendChild(fila);
    mueble.appendChild(balda);
  });
  if (datos.contacto){
    const libre = el('div', 'estanteria estanteria--libre');
    const vacio = el('span', 'estanteria__rotulo estanteria__rotulo--vacio');
    vacio.setAttribute('aria-hidden', 'true');
    libre.appendChild(vacio);
    const hueco = el('a', 'estanteria__hueco');
    hueco.href = '#b-contacto';
    hueco.appendChild(el('span', null, t('colabora.hueco')));
    libre.appendChild(hueco);
    libre.appendChild(el('div', 'estanteria__tabla'));
    mueble.appendChild(libre);
  }
  estantes.appendChild(mueble);
  caja.appendChild(estantes);

  // ── 3 · las marcas: un anillo de tarjetas que da vueltas ──
  const marcas = seccion('marcas', t('colabora.marcas'));
  marcas.appendChild(pintarAnillo(datos.marcas || [], videos, textos));
  caja.appendChild(marcas);

  // ── 4 · las cuentas: una caja que se gira para leer sus lados ──
  const cuentas = seccion('datos', t('colabora.ficha'));
  cuentas.appendChild(pintarCajaDeDatos(datos.ficha || [], textos));
  if (datos.cuentas?.length){
    const ul = el('ul', 'ficha-caja__cuentas');
    datos.cuentas.forEach(c => {
      const li = document.createElement('li');
      li.appendChild(enlaceFuera(c.url, enIdioma(c.texto), dePlataforma(c.url, c.icono).clave, textos));
      ul.appendChild(li);
    });
    cuentas.appendChild(ul);
  }
  caja.appendChild(cuentas);

  // ── 5 · la caja vacía y la carta ──
  if (datos.contacto) caja.appendChild(pintarContacto(datos.contacto, textos));

  return [];
}

/* ═══════════ El anillo de marcas ═══════════
   Tercera versión (Gigi, 2026-10-06). Primero fue un muro de nombres
   en grande («no pega»); luego un carrusel de fotos de lado a lado
   («todo fotos, muy apretado, y tapa a la muñeca»). Ahora:

   · un ANILLO de tarjetas —solo el logo, o el nombre donde no hay
     logo— que da vueltas despacio, visto un poco desde arriba, como
     el CircularCarousel de React Bits que puso de referencia (aquello
     es React; esto es lo mismo con CSS 3D y un poco de JS);
   · se para al pasar el ratón o al enfocarlo, y se puede arrastrar;
   · al pinchar una marca, su tarjeta viene al frente y sale la foto
     (o la portada del vídeo) de lo que se hizo con ella, con una
     línea que dice qué fue y, donde la hay, una frase (2026-10-07:
     «solo una foto sabe a poco»); si hay vídeo, un botón lo abre;
   · el anillo gira sobre una peana, dentro de una hornacina (también
     del 07: suelto sobre el papel «quedaba brusco»);
   · todo dentro del ancho de la sección: NO se sale hacia donde está
     la muñeca.

   Con «menos movimiento» no hay anillo: las mismas tarjetas, en una
   rejilla quieta, y se pinchan igual. */
function pintarAnillo(marcas, videos, textos){
  const t = clave => textos[clave] || '';
  const calma = sinMovimiento();
  const raiz = el('div', 'anillo');
  const escenario = el('div', 'anillo__escenario');
  const camara = el('div', 'anillo__camara');
  const rueda = el('div', 'anillo__rueda');
  camara.appendChild(rueda);
  // la ventana recorta el anillo cuando no cabe (móvil); la foto que
  // sale al pinchar va fuera de ella, para que no la recorte también
  const ventana = el('div', 'anillo__ventana');
  ventana.appendChild(camara);
  // la hornacina: la pared y el suelo donde está puesto el expositor
  const nicho = el('div', 'anillo__nicho');
  escenario.appendChild(nicho);
  // la peana sobre la que gira. Es un óvalo PLANO, colocado con las
  // cuentas de la perspectiva (medir): cuando era un disco dentro del
  // 3D, en el móvil parpadeaba contra las tarjetas (Gigi, 2026-10-07)
  const peana = el('div', 'anillo__peana');
  nicho.appendChild(peana);          // dentro de la hornacina: lo que no cabe, recortado
  escenario.appendChild(ventana);
  // en estrecho, los lados se funden con la pared (antes una máscara
  // sobre todo el 3D: otra cosa que el móvil repintaba a cada paso)
  escenario.appendChild(el('div', 'anillo__bordes'));
  raiz.appendChild(escenario);

  const cartas = marcas.map(m => {
    const b = el('button', 'anillo__carta');
    b.type = 'button';
    b.setAttribute('aria-label', m.nombre);
    const cara = el('span', 'anillo__cara');
    if (m.logo){
      const i = document.createElement('img');
      i.src = m.logo; i.alt = ''; i.draggable = false; i.loading = 'lazy';
      cara.appendChild(i);
      if (m.fondo) cara.style.background = m.fondo;
    } else {
      cara.appendChild(el('span', 'anillo__nombre', m.nombre));
    }
    b.append(cara, el('span', 'anillo__dorso'));
    rueda.appendChild(b);
    return b;
  });
  raiz.appendChild(el('p', 'anillo__nota', t('colabora.marcas-nota')));

  // ── lo que sale al pinchar una marca ──
  const ficha = el('div', 'anillo__ficha');
  ficha.hidden = true;
  ficha.setAttribute('role', 'dialog');
  escenario.appendChild(ficha);
  let elegida = -1;
  function cerrarFicha(devolverFoco = true){
    if (elegida < 0) return;
    const de = cartas[elegida];
    elegida = -1;
    ficha.hidden = true;
    ficha.innerHTML = '';
    delete raiz.dataset.elegida;
    if (devolverFoco) de?.focus({ preventScroll: true });
  }
  function abrirFicha(n){
    const m = marcas[n];
    const video = m.video ? videos.find(v => v.id === m.video) : null;
    const imagen = m.foto || video?.portada;
    if (!imagen) return;
    elegida = n;
    raiz.dataset.elegida = 'true';
    ficha.innerHTML = '';
    ficha.setAttribute('aria-label', m.nombre);
    const foto = document.createElement('img');
    foto.src = imagen; foto.alt = ''; foto.className = 'anillo__foto'; foto.draggable = false;
    ficha.appendChild(foto);
    // al lado de la foto: quién, qué fue (una línea) y, si la hay, una frase
    const cuerpo = el('div', 'anillo__cuerpo');
    cuerpo.id = 'anillo-cuerpo';
    const pie = el('div', 'anillo__pie');
    if (m.logo){
      const i = document.createElement('img');
      i.src = m.logo; i.alt = m.nombre; i.className = 'anillo__logo';
      if (m.fondo) i.dataset.sello = 'true';
      pie.appendChild(i);
      if (m.conNombre){ i.alt = ''; pie.appendChild(el('span', 'anillo__nombre', m.nombre)); }
    } else pie.appendChild(el('span', 'anillo__nombre', m.nombre));
    cuerpo.appendChild(pie);
    const tipo = m.tipo ? enIdioma(m.tipo) : (video ? lineaDe(video) : '');
    if (tipo) cuerpo.appendChild(el('p', 'anillo__tipo', tipo));
    if (m.texto) cuerpo.appendChild(el('p', 'anillo__texto', enIdioma(m.texto)));
    if (video){
      const ver = el('button', 'anillo__ver');
      ver.type = 'button';
      ver.innerHTML = svg('M7 4.5v15l13-7.5z', 14);
      ver.appendChild(el('span', null, t('colabora.marca-video')));
      ver.addEventListener('click', () => abrirVisor(videos, videos.indexOf(video), ver, textos));
      cuerpo.appendChild(ver);
    }
    ficha.appendChild(cuerpo);
    ficha.setAttribute('aria-describedby', 'anillo-cuerpo');
    const x = el('button', 'anillo__cerrar');
    x.type = 'button';
    x.setAttribute('aria-label', t('ventana.cerrar'));
    x.innerHTML = svg('M6 6l12 12M18 6L6 18', 16, 2.4);
    x.addEventListener('click', () => cerrarFicha());
    ficha.appendChild(x);
    ficha.hidden = false;
    if (!calma){
      // sale de su tarjeta: empieza pequeña, donde está ella
      const a = cartas[n].getBoundingClientRect(), b = ficha.getBoundingClientRect();
      ficha.animate([
        { transform: `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${Math.max(0.2, a.width / b.width)})`, opacity: 0.4 },
        { transform: 'none', opacity: 1 }
      ], { duration: 420, easing: 'cubic-bezier(.2,.85,.25,1.08)' });
    }
    (ficha.querySelector('.anillo__ver') || x).focus({ preventScroll: true });
  }
  raiz.addEventListener('keydown', e => { if (e.key === 'Escape' && elegida >= 0){ e.stopPropagation(); cerrarFicha(); } });
  escenario.addEventListener('click', e => { if (elegida >= 0 && !e.target.closest('.anillo__ficha, .anillo__carta')) cerrarFicha(false); });

  if (calma){
    // sin anillo: las tarjetas en una rejilla, y se pinchan igual
    raiz.dataset.quieto = 'true';
    cartas.forEach((b, n) => b.addEventListener('click', () => elegida === n ? cerrarFicha() : (cerrarFicha(false), abrirFicha(n))));
    return raiz;
  }

  // ── el anillo ──
  const N = cartas.length, PASO = 360 / N, PASEO = 9;        // grados por segundo cuando va solo
  let radio = 300, escala = 1;
  let ang = 0, vel = 0, meta = null, parado = false, cogido = false, visible = false, raf = 0, antes = 0;
  const vuelta = g => ((((g + 180) % 360) + 360) % 360) - 180;
  const velos = [], atras = [];

  function medir(){
    const carta = cartas[0];
    const ancho = carta.offsetWidth || 130, hueco = 16;
    radio = Math.max(150, (N * (ancho + hueco)) / (2 * Math.PI));
    // que quepa entero en la sección; si la pantalla es muy estrecha no
    // se encoge más y se ve solo el arco de delante (los lados, cortados)
    const sitio = escenario.clientWidth || 1;
    // (el anillo se ve más estrecho que su diámetro: los lados quedan
    //  lejos y la perspectiva los encoge; ocupa ~0,86 del diámetro)
    escala = Math.max(0.74, Math.min(1, sitio / (2 * radio * 0.9)));
    raiz.dataset.cortado = String(2 * radio * 0.9 * escala > sitio + 2);
    camara.style.setProperty('--radio', radio + 'px');
    camara.style.setProperty('--escala', String(escala));
    cartas.forEach((b, n) => { b.style.transform = `rotateY(${n * PASO}deg) translateZ(${radio}px)`; });
    // dónde cae en la pantalla un punto del anillo (las mismas cuentas
    // que hace el CSS: girar 9°, alejar el radio, escalar, perspectiva)
    const W = escenario.clientWidth, H = escenario.clientHeight, D = 1500, a = -9 * Math.PI / 180;
    const cae = (x, y, z) => {
      const Y = (y * Math.cos(a) - z * Math.sin(a)) * escala, Z = y * Math.sin(a) + z * Math.cos(a) - radio;
      const f = D / (D - Z);
      return [W / 2 + x * escala * f, 0.38 * H + (0.5 * H + Y - 0.38 * H) * f];
    };
    const R = radio * 1.13, y0 = carta.offsetHeight / 2 + 7;
    const izq = cae(-R, y0, 0), der = cae(R, y0, 0), detras = cae(0, y0, -R), delante = cae(0, y0, R);
    peana.style.left = izq[0] + 'px'; peana.style.width = (der[0] - izq[0]) + 'px';
    peana.style.top = detras[1] + 'px'; peana.style.height = (delante[1] - detras[1]) + 'px';
    pintar();
  }
  function pintar(){
    rueda.style.transform = `rotateY(${ang}deg)`;
    // el velo de cada tarjeta, a saltos de 0,04 y solo cuando cambia:
    // escribirlo en las 15 a cada fotograma hacía ir a tirones al móvil
    for (let n = 0; n < N; n++){
      const mira = Math.cos(vuelta(n * PASO + ang) * Math.PI / 180);    // 1 de frente … −1 de espaldas
      const lejos = (Math.round(0.62 * Math.pow((1 - mira) / 2, 1.2) * 25) / 25).toFixed(2);
      const detras = mira < 0.05;
      if (velos[n] !== lejos){ velos[n] = lejos; cartas[n].style.setProperty('--lejos', lejos); }
      if (atras[n] !== detras){ atras[n] = detras; cartas[n].dataset.detras = String(detras); }
    }
  }
  function paso(ahora){
    raf = 0;
    const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora;
    if (cogido){ /* la lleva la mano */ }
    else if (meta != null){
      // un muelle hasta la tarjeta elegida
      const k = 70, c = 2 * Math.sqrt(k);
      vel += (k * (meta - ang) - c * vel) * dt;
      ang += vel * dt;
      if (Math.abs(meta - ang) < 0.05 && Math.abs(vel) < 0.5){ ang = meta; vel = 0; meta = null; }
    } else {
      const crucero = parado || elegida >= 0 ? 0 : -PASEO;
      vel += (crucero - vel) * (1 - Math.exp(-dt / 0.5));
      ang += vel * dt;
    }
    pintar();
    const quieto = !cogido && meta == null && Math.abs(vel) < 0.02 && (parado || elegida >= 0);
    if (visible && !quieto) raf = requestAnimationFrame(paso);
  }
  const andar = () => { if (!raf && visible){ antes = performance.now(); raf = requestAnimationFrame(paso); } };
  const traerAlFrente = n => {
    let a = -n * PASO;
    a += 360 * Math.round((ang - a) / 360);
    meta = a; andar();
  };

  new ResizeObserver(medir).observe(escenario);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; andar(); }).observe(raiz);

  escenario.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') parado = true; });
  escenario.addEventListener('pointerleave', () => { parado = false; andar(); });
  raiz.addEventListener('focusin', () => { parado = true; });
  raiz.addEventListener('focusout', () => { parado = false; andar(); });

  // cogerlo y lanzarlo
  let id = -1, x0 = 0, ang0 = 0, movido = false, muestras = [];
  const porPixel = () => 180 / (Math.PI * radio * escala);
  escenario.addEventListener('pointerdown', e => {
    if (e.button > 0 || elegida >= 0) return;
    id = e.pointerId; x0 = e.clientX; ang0 = ang; movido = false;
    muestras = [{ a: ang, t: performance.now() }];
  });
  escenario.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - x0;
    if (!cogido && Math.abs(dx) > 6){
      cogido = movido = true; meta = null; vel = 0;
      escenario.dataset.cogido = 'true';
      try { escenario.setPointerCapture(id); } catch (err) { /* da igual */ }
      andar();
    }
    if (!cogido) return;
    ang = ang0 + dx * porPixel();
    const ahora = performance.now();
    muestras.push({ a: ang, t: ahora });
    while (muestras.length > 2 && ahora - muestras[0].t > 110) muestras.shift();
  });
  const soltar = e => {
    if (e.pointerId !== id) return;
    id = -1;
    if (cogido){
      const a = muestras[0], b = muestras[muestras.length - 1];
      vel = b.t > a.t && performance.now() - b.t < 80 ? (b.a - a.a) / (b.t - a.t) * 1000 : 0;
      vel = Math.max(-420, Math.min(420, vel));
    }
    cogido = false;
    delete escenario.dataset.cogido;
    andar();
  };
  escenario.addEventListener('pointerup', soltar);
  escenario.addEventListener('pointercancel', soltar);
  // si se ha arrastrado, ese clic no cuenta como pinchar una tarjeta
  escenario.addEventListener('click', e => { if (movido){ e.stopPropagation(); e.preventDefault(); movido = false; } }, true);

  cartas.forEach((b, n) => {
    b.addEventListener('click', () => {
      if (elegida === n){ cerrarFicha(); return; }
      cerrarFicha(false);
      traerAlFrente(n);
      setTimeout(() => abrirFicha(n), 260);
    });
    // con el teclado: la tarjeta enfocada viene al frente
    b.addEventListener('focus', () => { if (b.matches(':focus-visible')) traerAlFrente(n); });
  });
  raiz.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' || elegida >= 0) return;
    e.preventDefault();
    meta = (meta ?? Math.round(ang / PASO) * PASO) + (e.key === 'ArrowRight' ? -PASO : PASO);
    andar();
  });
  // al cerrar la ficha, el anillo vuelve a andar
  new MutationObserver(andar).observe(raiz, { attributes: true, attributeFilter: ['data-elegida'] });

  requestAnimationFrame(medir);
  return raiz;
}

/* ═══════════ La caja de los datos ═══════════
   Los datos de las cuentas van en los cuatro lados de una caja de
   verdad (Gigi, 2026-10-06), como la etiqueta del lateral de una caja
   sorpresa. Se coge y se gira; al soltarla se queda de frente en el
   lado más cercano. Dos flechas y el teclado hacen lo mismo.
   Los mismos datos están además en una lista normal, oculta a la
   vista: quien use lector de pantalla no tiene que girar nada. */
function pintarCajaDeDatos(ficha, textos){
  const t = clave => textos[clave] || '';
  // cuatro lados: los tres primeros datos, uno cada uno; el resto, juntos
  const lados = [ficha.slice(0, 1), ficha.slice(1, 2), ficha.slice(2, 3), ficha.slice(3)].filter(l => l.length);
  const raiz = el('div', 'caja-datos');

  const escena = el('div', 'caja-datos__escena');
  escena.tabIndex = 0;
  escena.setAttribute('role', 'group');
  escena.setAttribute('aria-label', t('colabora.ficha'));
  const cubo = el('div', 'caja-datos__cubo');
  lados.forEach((lado, n) => {
    const cara = el('div', 'caja-datos__cara');
    cara.style.setProperty('--n', String(n));
    cara.setAttribute('aria-hidden', 'true');
    const etiqueta = el('div', 'caja-datos__etiqueta');
    lado.forEach(f => {
      etiqueta.appendChild(el('p', 'caja-datos__clave', enIdioma(f.clave)));
      etiqueta.appendChild(el('p', 'caja-datos__valor', enIdioma(f.valor)));
    });
    etiqueta.appendChild(el('p', 'caja-datos__num', `${n + 1} / ${lados.length}`));
    cara.appendChild(etiqueta);
    cubo.appendChild(cara);
  });
  const tapa = el('div', 'caja-datos__tapa');
  tapa.setAttribute('aria-hidden', 'true');
  tapa.innerHTML = '<svg class="sello" viewBox="0 0 100 100"><use href="#s-sello"></use></svg>';
  cubo.appendChild(tapa);
  escena.appendChild(cubo);
  escena.appendChild(el('span', 'caja-datos__sombra'));
  raiz.appendChild(escena);

  const mandos = el('div', 'caja-datos__mandos');
  const flecha = (clave, camino) => {
    const b = el('button', 'caja-datos__flecha');
    b.type = 'button'; b.setAttribute('aria-label', t(clave)); b.innerHTML = svg(camino, 18, 2.2);
    return b;
  };
  const izq = flecha('colabora.gira.izquierda', 'M15 6l-6 6 6 6');
  const der = flecha('colabora.gira.derecha', 'M9 6l6 6-6 6');
  mandos.append(izq, el('span', 'caja-datos__pista', t('colabora.gira')), der);
  raiz.appendChild(mandos);

  // que ninguna etiqueta se salga de su lado: si el texto es largo
  // para el tamaño de la caja (móvil), la letra encoge hasta que quepa
  const ajustar = () => cubo.querySelectorAll('.caja-datos__etiqueta').forEach(e => {
    const sitio = e.parentElement.clientHeight * 0.84;
    let k = 1; e.style.removeProperty('--letra');
    while (e.offsetHeight > sitio && k > 0.72){ k -= 0.04; e.style.setProperty('--letra', k.toFixed(2)); }
  });
  requestAnimationFrame(ajustar);
  document.fonts?.ready?.then(ajustar);
  new ResizeObserver(ajustar).observe(escena);

  // lo mismo, para leer sin girar
  const lista = el('dl', 'solo-lectores');
  ficha.forEach(f => { lista.appendChild(el('dt', null, enIdioma(f.clave))); lista.appendChild(el('dd', null, enIdioma(f.valor))); });
  raiz.appendChild(lista);

  // girar
  const calma = sinMovimiento();
  let ang = 0, id = -1, x0 = 0, ang0 = 0;
  const poner = (a, suave) => {
    ang = a;
    cubo.style.transition = suave && !calma ? 'transform 560ms cubic-bezier(.2,.9,.3,1.12)' : 'none';
    cubo.style.setProperty('--giro', ang + 'deg');
  };
  const encajar = (a) => poner(Math.round(a / 90) * 90, true);
  izq.addEventListener('click', () => encajar(ang + 90));
  der.addEventListener('click', () => encajar(ang - 90));
  escena.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft'){ e.preventDefault(); encajar(ang + 90); }
    else if (e.key === 'ArrowRight'){ e.preventDefault(); encajar(ang - 90); }
  });
  escena.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    id = e.pointerId; x0 = e.clientX; ang0 = ang;
    try { escena.setPointerCapture(id); } catch (err) { /* da igual */ }
    escena.dataset.cogida = 'true';
  });
  escena.addEventListener('pointermove', e => { if (e.pointerId === id) poner(ang0 + (e.clientX - x0) * 0.6, false); });
  const soltar = e => {
    if (e.pointerId !== id) return;
    id = -1; delete escena.dataset.cogida;
    encajar(ang);
  };
  escena.addEventListener('pointerup', soltar);
  escena.addEventListener('pointercancel', soltar);

  // la primera vez que se ve, se menea sola: «se puede girar»
  if (!calma && 'IntersectionObserver' in window){
    const ojo = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      ojo.disconnect();
      setTimeout(() => { if (id < 0 && ang === 0){ poner(-24, true); setTimeout(() => { if (id < 0 && ang === -24) poner(0, true); }, 520); } }, 500);
    }, { threshold: 0.6 });
    ojo.observe(escena);
  }
  return raiz;
}

/* ═══════════ La caja vacía ═══════════
   Una caja como las de la mesa, pero con la etiqueta en blanco. Al
   acercarse, la tapa se levanta un poco; al pinchar se abre (igual que
   las otras: la tapa cae hacia atrás) y de dentro sale una carta, que
   es el formulario. Por si acaso, el correo está siempre a la vista:
   escribirle no depende de que la animación funcione. */
function pintarContacto(c, textos){
  const t = clave => textos[clave] || '';
  const sec = seccion('contacto', enIdioma(c.texto));
  sec.classList.add('tienda__contacto');
  sec.dataset.tapa = 'a';

  const lado = el('div', 'caja-vacia');
  const caja = el('button', 'caja caja--vacia');
  caja.type = 'button';
  caja.style.setProperty('--color', 'var(--rosa)');
  caja.setAttribute('aria-label', t('colabora.abrir-caja'));
  caja.setAttribute('aria-expanded', 'false');
  caja.innerHTML = `
    <img class="caja__dentro" src="assets/boxes/caja-abierta.webp" width="682" height="800" alt="" loading="lazy">
    <img class="caja__foto" src="assets/boxes/caja-cerrada.webp" width="777" height="800" alt="" loading="lazy">
    <span class="caja__tapa" aria-hidden="true">
      <span class="caja__precinto"></span>
      <span class="caja__etiqueta caja__etiqueta--vacia"></span>
      <svg class="sello caja__sello" viewBox="0 0 100 100"><use href="#s-sello"></use></svg>
    </span>`;
  lado.appendChild(caja);
  lado.appendChild(el('p', 'caja-vacia__nota', enIdioma(c.nota)));
  sec.appendChild(lado);

  // la carta
  const carta = el('form', 'carta');
  carta.hidden = true;
  carta.noValidate = false;
  const campo = (nombre, tipo, etiqueta, extra = {}) => {
    const l = el('label', 'carta__campo');
    l.appendChild(el('span', null, etiqueta));
    const i = tipo === 'textarea' ? document.createElement('textarea') : Object.assign(document.createElement('input'), { type: tipo });
    i.name = nombre;
    Object.assign(i, extra);
    l.appendChild(i);
    return l;
  };
  carta.appendChild(campo('name', 'text', t('colabora.form.nombre'), { required: true, autocomplete: 'name' }));
  carta.appendChild(campo('email', 'email', t('colabora.form.correo'), { required: true, autocomplete: 'email' }));
  carta.appendChild(campo('marca', 'text', t('colabora.form.marca'), { autocomplete: 'organization' }));
  carta.appendChild(campo('message', 'textarea', t('colabora.form.mensaje'), { required: true, rows: 9, value: enIdioma(c.plantilla) }));
  // el cebo para los robots: una casilla que una persona no ve
  const cebo = Object.assign(document.createElement('input'), { type: 'checkbox', name: 'botcheck', tabIndex: -1, autocomplete: 'off' });
  cebo.className = 'carta__cebo'; cebo.setAttribute('aria-hidden', 'true');
  carta.appendChild(cebo);
  const pie = el('div', 'carta__pie');
  const enviar = el('button', 'boton', t('colabora.form.enviar'));
  enviar.type = 'submit';
  pie.appendChild(enviar);
  const estado = el('p', 'carta__estado');
  estado.setAttribute('role', 'status');
  pie.appendChild(estado);
  carta.appendChild(pie);
  if (!c.web3forms) carta.appendChild(el('p', 'carta__aviso', t('colabora.form.sin-envio')));
  sec.appendChild(carta);

  // siempre a la vista: el correo, copiarlo o abrirlo en el programa de correo
  const mano = el('div', 'correo-a-mano');
  mano.appendChild(el('span', 'correo-a-mano__direccion', c.email));
  const copiar = el('button', 'correo-a-mano__boton', t('colabora.copiar'));
  copiar.type = 'button';
  copiar.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(c.email); }
    catch (e) {
      // sin permiso para el portapapeles: se selecciona para copiarlo a mano
      const r = document.createRange(); r.selectNodeContents(mano.firstChild);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
      return;
    }
    copiar.textContent = t('colabora.copiado');
    setTimeout(() => { copiar.textContent = t('colabora.copiar'); }, 1800);
  });
  mano.appendChild(copiar);
  const porCorreo = (cuerpo) => 'mailto:' + c.email + '?subject=' + encodeURIComponent(enIdioma(c.asunto)) + '&body=' + encodeURIComponent(cuerpo);
  const abrir = el('a', 'correo-a-mano__boton', t('colabora.abrir-correo'));
  abrir.href = porCorreo(enIdioma(c.plantilla));
  mano.appendChild(abrir);
  sec.appendChild(mano);

  // abrir la caja
  let abierta = false;
  caja.addEventListener('click', () => {
    if (abierta){ carta.querySelector('input')?.focus(); return; }
    abierta = true;
    caja.setAttribute('aria-expanded', 'true');
    const calma = sinMovimiento();
    const T = calma ? 0 : 650;
    caja.style.setProperty('--t-tapa', T + 'ms');
    caja.dataset.abriendo = 'true';
    caja.querySelector('.caja__precinto').dataset.roto = 'true';
    caja.dataset.tapa = 'levantada';
    setTimeout(() => {
      carta.hidden = false;
      sec.dataset.abierta = 'true';
      if (!calma){
        // la carta sale de la caja: empieza pequeña, donde está la caja
        const a = caja.getBoundingClientRect(), b = carta.getBoundingClientRect();
        carta.animate([
          { transform: `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px, ${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(.12) rotate(-8deg)`, opacity: 0 },
          { opacity: 1, offset: 0.35 },
          { transform: 'none', opacity: 1 }
        ], { duration: 620, easing: 'cubic-bezier(.2,.9,.3,1.1)' });
      }
      carta.querySelector('input')?.focus({ preventScroll: true });
      if (matchMedia('(max-width: 900px)').matches) carta.scrollIntoView({ block: 'nearest', behavior: calma ? 'auto' : 'smooth' });
    }, T * 0.8);
  });

  // enviar
  carta.addEventListener('submit', async e => {
    e.preventDefault();
    const d = new FormData(carta);
    if (d.get('botcheck')) return;                      // un robot
    const firma = [d.get('name'), d.get('marca'), d.get('email')].filter(Boolean).join(' · ');
    if (!c.web3forms){
      // aún sin servicio de envío: el mensaje, ya escrito, al programa de correo
      location.href = porCorreo(d.get('message') + '\n\n' + firma);
      estado.textContent = t('colabora.form.por-correo');
      return;
    }
    enviar.disabled = true;
    estado.dataset.tipo = '';
    estado.textContent = t('colabora.form.enviando');
    try {
      /* Como formulario de los de siempre (FormData) y no como JSON: así
         el navegador no hace la petición previa de permiso (CORS), que
         Web3Forms rechaza con un 403 y deja el envío en «Failed to fetch». */
      const envio = new FormData();
      Object.entries({
        access_key: c.web3forms,
        subject: enIdioma(c.asunto) + (d.get('marca') ? ' · ' + d.get('marca') : ''),
        from_name: d.get('name'),
        name: d.get('name'), email: d.get('email'), marca: d.get('marca') || '', message: d.get('message')
      }).forEach(([k, v]) => envio.append(k, v));
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { Accept: 'application/json' }, body: envio });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.success) throw new Error(j.message || r.status);
      estado.dataset.tipo = 'bien';
      estado.textContent = t('colabora.form.enviado');
      carta.reset();
    } catch (err) {
      console.error('No se ha podido enviar el formulario:', err);
      estado.dataset.tipo = 'mal';
      estado.textContent = (t('colabora.form.error') || '').replace('{correo}', c.email);
    } finally {
      enviar.disabled = false;
    }
  });

  return sec;
}

/* ═══════════ El visor a pantalla completa ═══════════
   El vídeo crece desde donde estaba (FLIP, como en Codrops) hasta
   ocupar la pantalla, en vertical. Arriba y abajo —flechas, rueda o
   deslizando— se pasa al siguiente; un toque en el vídeo quita o pone
   el sonido. De Reels y TikTok solo se toma cómo se maneja, no la
   pinta. */
let cerrarVisor = null;

function abrirVisor(videos, indice, origen, textos){
  if (cerrarVisor || !videos.length) return;
  const t = clave => textos[clave] || '';
  const calma = sinMovimiento();
  let n = Math.max(0, indice), mudo = false;

  const capa = el('div', 'visor');
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  const marco = el('div', 'visor__marco');
  const v = document.createElement('video');
  v.playsInline = true; v.loop = true; v.preload = 'auto';
  marco.appendChild(v);
  const sonido = el('span', 'visor__sonido');
  marco.appendChild(sonido);
  const pie = el('div', 'visor__pie');
  const boton = (clase, clave, camino) => {
    const b = el('button', 'visor__boton ' + clase);
    b.type = 'button';
    b.setAttribute('aria-label', t(clave));
    b.innerHTML = svg(camino, 20, 2.2);
    return b;
  };
  const cerrar = boton('visor__cerrar', 'ventana.cerrar', 'M6 6l12 12M18 6L6 18');
  const antes = boton('visor__antes', 'colabora.visor.anterior', 'M6 15l6-6 6 6');
  const despues = boton('visor__despues', 'colabora.visor.siguiente', 'M6 9l6 6 6-6');
  const cuenta = el('p', 'visor__cuenta');
  capa.append(marco, pie, antes, despues, cuenta, cerrar);

  function poner(k, sentido = 0){
    n = (k + videos.length) % videos.length;
    const x = videos[n];
    capa.setAttribute('aria-label', enIdioma(x.titulo));
    v.poster = x.portada || '';
    v.src = x.archivo;
    v.muted = mudo;
    v.play().catch(() => { v.muted = mudo = true; pintarSonido(); v.play().catch(() => {}); });
    pie.innerHTML = '';
    if (x.marca) pie.appendChild(el('p', 'visor__marca', x.marca));
    pie.appendChild(el('p', 'visor__titulo', enIdioma(x.titulo)));
    pie.appendChild(el('p', 'visor__linea', lineaDe(x)));
    if (x.enlaces?.length){
      const ul = el('ul', 'visor__enlaces');
      x.enlaces.forEach(e => {
        const p = dePlataforma(e.url, e.plataforma);
        const li = document.createElement('li');
        li.appendChild(enlaceFuera(e.url, t(p.texto), p.clave, textos));
        ul.appendChild(li);
      });
      pie.appendChild(ul);
    }
    cuenta.textContent = `${n + 1} / ${videos.length}`;
    if (sentido && !calma){
      marco.animate([{ transform: `translateY(${sentido * 9}%)`, opacity: 0.2 }, { transform: 'none', opacity: 1 }],
        { duration: 300, easing: 'cubic-bezier(.2,.8,.3,1)' });
    }
  }
  function pintarSonido(){
    sonido.innerHTML = svg(mudo ? 'M4 9v6h3.5L12 19V5L7.5 9zM16 10l4 4M20 10l-4 4' : 'M4 9v6h3.5L12 19V5L7.5 9zM15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10', 20, 1.9);
    sonido.dataset.pulso = 'false'; void sonido.offsetWidth; sonido.dataset.pulso = 'true';
  }

  document.body.appendChild(capa);
  document.body.style.overflow = 'hidden';      // en el <body>, no en el <html> (ESTADO, tropiezo 18)
  const desde = origen?.getBoundingClientRect();
  poner(n);
  pintarSonido();
  requestAnimationFrame(() => {
    capa.dataset.abierto = 'true';
    if (desde && desde.width && !calma){
      const a = marco.getBoundingClientRect();
      marco.animate([
        { transform: `translate(${desde.left + desde.width / 2 - (a.left + a.width / 2)}px, ${desde.top + desde.height / 2 - (a.top + a.height / 2)}px) scale(${desde.width / a.width}, ${desde.height / a.height})`, borderRadius: '10px' },
        { transform: 'none' }
      ], { duration: 460, easing: 'cubic-bezier(.2,.85,.25,1)' });
    }
  });
  cerrar.focus({ preventScroll: true });

  const pasar = s => poner(n + s, s);
  marco.addEventListener('click', () => { mudo = !mudo; v.muted = mudo; pintarSonido(); });
  antes.addEventListener('click', () => pasar(-1));
  despues.addEventListener('click', () => pasar(1));

  let ultimaRueda = 0;
  const rueda = e => {
    e.preventDefault();
    const ahora = performance.now();
    if (Math.abs(e.deltaY) < 18 || ahora - ultimaRueda < 520) return;
    ultimaRueda = ahora;
    pasar(e.deltaY > 0 ? 1 : -1);
  };
  capa.addEventListener('wheel', rueda, { passive: false });
  let dedo = null;
  capa.addEventListener('touchstart', e => { dedo = e.touches[0].clientY; }, { passive: true });
  capa.addEventListener('touchmove', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  capa.addEventListener('touchend', e => {
    if (dedo == null) return;
    const d = dedo - e.changedTouches[0].clientY; dedo = null;
    if (Math.abs(d) > 56) pasar(d > 0 ? 1 : -1);
  });
  const tecla = e => {
    if (e.key === 'Escape') fuera();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown'){ e.preventDefault(); pasar(1); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp'){ e.preventDefault(); pasar(-1); }
    else if (e.key === 'm' || e.key === 'M'){ mudo = !mudo; v.muted = mudo; pintarSonido(); }
    else if (e.key === 'Tab'){
      // el foco no sale del visor
      const f = [...capa.querySelectorAll('button, a[href]')];
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
    }
  };
  document.addEventListener('keydown', tecla);
  capa.addEventListener('click', e => { if (e.target === capa) fuera(); });
  cerrar.addEventListener('click', () => fuera());

  function fuera(yaMismo){
    if (!cerrarVisor) return;
    cerrarVisor = null;
    v.pause();
    document.removeEventListener('keydown', tecla);
    document.body.style.overflow = '';
    capa.dataset.abierto = 'false';
    setTimeout(() => capa.remove(), yaMismo || calma ? 0 : 240);
    origen?.focus?.({ preventScroll: true });
  }
  cerrarVisor = fuera;
}
