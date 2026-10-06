/* ─────────────────────────────────────────────────────────────
   trabajos.js — «Mis trabajos»: cada tipo de trabajo sale de la
   pantalla a su manera (Gigi, 2026-10-05).

   · web   (Niu&Nos, UPV Respira): en la pantalla se abre un navegador
           con la web de verdad, que se puede tocar y bajar. En el
           móvil, un botón la abre a pantalla completa.
   · cine  (Essencia, Book trailer): la pantalla se vuelve un
           reproductor panorámico. Si hay un vídeo vertical, va al
           lado como un móvil.
   · serie (Guía UPV, Fallera): el móvil de la muñeca se levanta del
           estabilizador (el vídeo que hizo Gigi), la página se
           oscurece, el móvil se acerca y se abre en cuatro, uno por
           capítulo. Debajo, la etiqueta «Contenido de esta caja».

   Al pinchar un archivo, su miniatura vuela en arco hasta el centro
   de la pantalla antes de abrirse (`volarEnArco`).

   Nada de esto oculta contenido si algo falla: sin vídeo, la serie se
   abre directamente; con «menos movimiento», sin vuelos.
   ───────────────────────────────────────────────────────────── */

import { enIdioma, pintarMateriales, etiquetaContenido, tarjetaVideoExterno } from './bloques.js';

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const enMovil = () => matchMedia('(max-width: 900px)').matches;

function el(etiqueta, clase, texto){
  const n = document.createElement(etiqueta);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
}

/* ═══════════ La miniatura que vuela en arco ═══════════
   Igual que «Thumbnail Flow» de Codrops, pero sin plugin: la curva
   (una cuadrática con el punto de control por encima) se muestrea en
   12 puntos y se pasa como fotogramas a la Web Animations API. */
export function volarEnArco(imagen, desde, hasta, { duracion = 620, escalaFin = 1.6 } = {}){
  if (sinMovimiento() || !imagen || !desde || !hasta) return Promise.resolve();
  const a = desde.getBoundingClientRect(), b = hasta.getBoundingClientRect();
  if (!a.width || !b.width) return Promise.resolve();
  const ficha = el('img', 'ficha-vuelo');
  ficha.src = imagen; ficha.alt = '';
  document.body.appendChild(ficha);
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
  const x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - Math.max(120, Math.abs(x1 - x0) * 0.35);
  const marcos = [];
  for (let i = 0; i <= 12; i++){
    const t = i / 12, u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    marcos.push({
      transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${(1 - t) * -14}deg) scale(${0.5 + t * (escalaFin - 0.5)})`,
      opacity: i === 12 ? 0 : 1
    });
  }
  return ficha.animate(marcos, { duration: duracion, easing: 'cubic-bezier(.45,.05,.3,1)' })
    .finished.catch(() => {}).then(() => ficha.remove());
}

/* La imagen que vuela para cada trabajo */
export function miniaturaDe(t){
  const m = (t.media || []);
  const conPortada = m.find(x => x.portada) || m.find(x => x.mini || x.archivo && x.tipo === 'foto');
  return conPortada ? (conPortada.portada || conPortada.mini || conPortada.archivo) : null;
}

/* Cada trabajo se reparte en dos sitios (Gigi, 2026-10-06: «está
   todo muy apretado»):
   · PANTALLA — dentro del portátil: solo lo principal (la web, el
     reproductor, la portada de la serie).
   · MESA — debajo del portátil, «encima de la mesa»: la frase que lo
     explica, las fotos, los botones de los vídeos y la etiqueta
     «Contenido de esta caja». */

/* Un botón de vídeo para la mesa. Si el vídeo es vertical, se ve en
   el móvil de la muñeca; si es horizontal, en una pantalla grande. */
function botonVideo(m, t, textos){
  const b = el('button', 'boton-video');
  b.type = 'button';
  b.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';
  b.appendChild(el('span', null, enIdioma(m.titulo)));
  if (m.portada){
    const i = document.createElement('img');
    i.src = m.portada; i.alt = ''; i.loading = 'lazy';
    i.className = 'boton-video__mini' + (m.vertical ? ' boton-video__mini--vertical' : '');
    b.prepend(i);
  }
  b.addEventListener('click', () => m.vertical ? abrirVideoEnMovil(m, t, textos, b) : abrirPantalla(m, textos, b));
  return b;
}

/* ═══════════ web: un navegador dentro de la pantalla ═══════════
   La web se pinta a tamaño de ordenador (1280 × 800) y se encoge
   para caber en la pantalla del portátil. Si se metía tal cual en un
   hueco de 560 px, la web se ponía en versión tableta y además se
   cortaba por abajo: por eso «se veía rara». Se puede tocar y bajar. */
const WEB_ANCHO = 1280, WEB_ALTO = 800;
function escenarioWeb(t, textos){
  const pantalla = el('div', 'esc esc--web');
  const url = t.web;
  const nav = el('div', 'navegador');
  const barra = el('div', 'navegador__barra');
  barra.innerHTML = '<span class="navegador__puntos" aria-hidden="true"><i></i><i></i><i></i></span>';
  barra.appendChild(el('span', 'navegador__url', url.replace(/^https?:\/\//, '').replace(/\/$/, '')));
  const fuera = el('a', 'navegador__fuera', textos['web.abrir-fuera'] || '');
  fuera.href = url; fuera.target = '_blank'; fuera.rel = 'noopener';
  barra.appendChild(fuera);
  nav.appendChild(barra);

  if (enMovil()){
    const abrir = el('button', 'navegador__movil boton', textos['web.abrir'] || '');
    abrir.type = 'button';
    abrir.addEventListener('click', () => webCompleta(url, enIdioma(t.titulo), textos));
    nav.appendChild(abrir);
  } else {
    const vista = el('div', 'navegador__vista');
    const marco = document.createElement('iframe');
    marco.className = 'navegador__marco';
    marco.src = url;
    marco.loading = 'lazy';
    marco.title = enIdioma(t.titulo);
    marco.referrerPolicy = 'no-referrer';
    marco.width = WEB_ANCHO; marco.height = WEB_ALTO;
    vista.appendChild(marco);
    const ajustar = () => {
      const k = vista.clientWidth / WEB_ANCHO;
      if (k > 0) marco.style.transform = `scale(${k})`;
    };
    new ResizeObserver(ajustar).observe(vista);
    nav.appendChild(vista);
  }
  pantalla.appendChild(nav);

  const mesa = el('div', 'mesa-trabajo__cosas');
  const fotos = (t.media || []).filter(m => m.tipo === 'foto');
  if (fotos.length) pintarMateriales(mesa, fotos, textos);
  (t.media || []).filter(m => m.tipo === 'video').forEach(m => mesa.appendChild(botonVideo(m, t, textos)));
  return { pantalla, mesa };
}

function webCompleta(url, titulo, textos){
  const capa = el('div', 'web-completa');
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', titulo);
  const barra = el('div', 'web-completa__barra');
  barra.appendChild(el('span', null, titulo));
  const cerrar = el('button', 'web-completa__cerrar', textos['ventana.cerrar'] || 'Cerrar');
  cerrar.type = 'button';
  barra.appendChild(cerrar);
  const marco = document.createElement('iframe');
  marco.src = url; marco.title = titulo;
  capa.append(barra, marco);
  document.body.appendChild(capa);
  document.documentElement.style.overflow = 'hidden';
  const fuera = () => { capa.remove(); document.documentElement.style.overflow = ''; };
  cerrar.addEventListener('click', fuera);
  cerrar.focus();
}

/* ═══════════ cine: la pantalla se vuelve un reproductor ═══════════
   El vídeo horizontal llena la pantalla; los verticales van a la mesa
   como botones y se ven en el móvil de la muñeca. */
function escenarioCine(t, textos){
  const pantalla = el('div', 'esc esc--cine');
  const videos = (t.media || []).filter(m => m.tipo === 'video');
  const ancho = videos.find(v => !v.vertical);
  const sala = el('div', 'cine');
  if (ancho){
    const v = document.createElement('video');
    v.controls = true; v.preload = 'metadata'; v.playsInline = true;
    v.poster = ancho.portada || ''; v.src = ancho.archivo;
    v.setAttribute('aria-label', enIdioma(ancho.titulo));
    sala.appendChild(v);
    sala.appendChild(el('p', 'cine__rotulo', enIdioma(ancho.titulo)));
  }
  pantalla.appendChild(sala);
  const mesa = el('div', 'mesa-trabajo__cosas');
  videos.filter(v => v.vertical).forEach(m => mesa.appendChild(botonVideo(m, t, textos)));
  return { pantalla, mesa };
}

/* ═══════════ serie: en la pantalla, la portada de la serie ═══════════ */
function escenarioSerie(t, textos){
  const pantalla = el('div', 'esc esc--serie');
  const total = enIdioma(t.total);
  if (total) pantalla.appendChild(el('p', 'serie__total', total));
  const fila = el('div', 'serie__mini');
  (t.media || []).filter(m => m.tipo === 'video-enlace').slice(0, 4).forEach(m => {
    const i = document.createElement('img');
    i.src = m.portada; i.alt = ''; i.loading = 'lazy';
    fila.appendChild(i);
  });
  pantalla.appendChild(fila);
  const b = el('button', 'serie__ver boton', textos['serie.ver'] || '');
  b.type = 'button';
  b.addEventListener('click', () => abrirSerie(t, textos, b));
  pantalla.appendChild(b);
  return { pantalla, mesa: null };
}

/* Devuelve { pantalla, mesa } */
export function escenario(t, textos){
  if (t.presentacion === 'web' && t.web) return escenarioWeb(t, textos);
  if (t.presentacion === 'cine') return escenarioCine(t, textos);
  if (t.presentacion === 'serie') return escenarioSerie(t, textos);
  const pantalla = el('div', 'detalle__materiales');
  pintarMateriales(pantalla, t.media, textos);
  return { pantalla, mesa: null };
}

/* ═══════════ La serie: el móvil de la muñeca ═══════════

   Tres trozos de vídeo con fondo transparente (assets/media/video/
   trabajos-movil-*): SUBIR (el móvil se levanta), QUEDAR (en bucle,
   ella reacciona detrás) y BAJAR (vuelve al estabilizador).
   WebM con alfa para Chrome y Firefox; Safari no lo entiende y usa el
   .mov HEVC con alfa.

   El móvil del vídeo, mientras está quieto, ocupa este recuadro del
   fotograma (medido en el fotograma 120): */
const MOVIL = { x: .2105, y: .0458, w: .401, h: .495 };
/* En reposo (final de BAJAR) el móvil está en el estabilizador, en
   horizontal: centro y largo, medidos en el último fotograma. Al
   cerrar, el móvil grande vuelve encogiéndose hasta aquí. */
const REPOSO = { x: .403, y: .372, largo: .138 };
/* y la muñeca ocupa casi todo el alto del fotograma */
const ALTO_MUNIECA = .94;

const esSafari = /^((?!chrome|chromium|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
const RUTA = 'assets/media/video/trabajos-movil-';
const fuenteDe = tramo => RUTA + tramo + (esSafari ? '.mov' : '.webm');

let escena = null;
function prepararEscena(){
  if (escena) return escena;
  const raiz = el('div', 'escena-movil');
  raiz.setAttribute('aria-hidden', 'true');
  const videos = {};
  ['subir', 'quedar', 'bajar'].forEach(tramo => {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.src = fuenteDe(tramo);
    if (tramo === 'quedar') v.loop = true;
    v.dataset.tramo = tramo;
    raiz.appendChild(v);
    videos[tramo] = v;
  });
  document.body.appendChild(raiz);
  escena = { raiz, videos };
  return escena;
}

/* Se descargan los vídeos en cuanto la página está tranquila, para
   que al pinchar no haya espera. */
export function precargarSerie(){
  if (enMovil() || sinMovimiento()) return;
  const ir = () => prepararEscena();
  'requestIdleCallback' in window ? requestIdleCallback(ir, { timeout: 2500 }) : setTimeout(ir, 1500);
}

/* Subir y bajar van un poco más deprisa que el vídeo original (3 s y
   2,2 s): quien pincha quiere ver los vídeos, no esperar. */
const VELOCIDAD = { subir: 1.35, quedar: 1, bajar: 1.35 };
function mostrarTramo(tramo){
  Object.values(escena.videos).forEach(v => { v.dataset.activo = String(v.dataset.tramo === tramo); });
  const v = escena.videos[tramo];
  v.currentTime = 0;
  v.playbackRate = VELOCIDAD[tramo] || 1;
  return v.play().then(() => v).catch(() => null);
}
/* La muñeca en reposo (último fotograma de BAJAR: el móvil ya está en
   el estabilizador). Se pone en cuanto el móvil grande sale hacia el
   centro: si se quedara QUEDAR, se verían dos móviles a la vez, el de
   la capa y el que ella sigue sujetando. */
function mostrarReposo(){
  const v = escena.videos.bajar;
  Object.values(escena.videos).forEach(x => { x.dataset.activo = String(x === v); if (x !== v) x.pause(); });
  v.pause();
  if (v.duration) v.currentTime = Math.max(0, v.duration - 0.05);
}
const acabar = v => new Promise(ok => {
  if (!v) return ok();
  const listo = () => { v.removeEventListener('ended', listo); ok(); };
  v.addEventListener('ended', listo);
  setTimeout(listo, (v.duration || 3) * 1000 / (v.playbackRate || 1) + 600);   // por si «ended» no llega
});

/* Coloca la escena encima de la muñeca de la página */
function ponerSobreLaMunieca(){
  const fig = document.querySelector('img.figura');
  if (!fig || fig.hidden) return null;
  const r = fig.getBoundingClientRect();
  const alto = r.height / ALTO_MUNIECA;
  const ancho = alto * 482 / 900;
  // centrada en la muñeca y con los pies en el mismo sitio
  const caja = { left: r.left + r.width / 2 - ancho / 2, top: r.bottom - alto, width: ancho, height: alto };
  Object.assign(escena.raiz.style, {
    left: caja.left + 'px', top: caja.top + 'px', width: caja.width + 'px', height: caja.height + 'px'
  });
  return { fig, caja };
}

/* La capa oscura de encima: velo, cabecera, los móviles (o la
   pantalla grande), la ficha de abajo y el botón de cerrar. La usan
   la serie, el vídeo vertical y el vídeo horizontal. */
function capa({ titulo, cifra, cuerpo, ficha, clase }, textos){
  const capa = el('div', 'serie' + (clase ? ' ' + clase : ''));
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-label', titulo || '');
  capa.appendChild(el('div', 'serie__velo'));
  const cab = el('div', 'serie__cabeza');
  if (titulo) cab.appendChild(el('p', 'serie__nombre', titulo));
  if (cifra) cab.appendChild(el('p', 'serie__cifra', cifra));
  capa.appendChild(cab);
  capa.appendChild(cuerpo);
  if (ficha){ ficha.classList.add('serie__ficha'); capa.appendChild(ficha); }
  const cerrar = el('button', 'serie__cerrar');
  cerrar.type = 'button';
  cerrar.setAttribute('aria-label', textos['ventana.cerrar'] || 'Cerrar');
  cerrar.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
  capa.appendChild(cerrar);
  return { capa, cerrar };
}

/* Un móvil de la capa: la carcasa negra con lo que sea dentro */
function movilDeCapa(contenido, k){
  const li = el('li', 'serie__movil');
  li.style.setProperty('--n', String(k));
  li.style.setProperty('--abs', String(Math.abs(k)));
  const pantalla = el('div', 'serie__pantalla');
  pantalla.appendChild(contenido);
  li.appendChild(pantalla);
  return li;
}

/* La serie: cuatro móviles en abanico, cada uno con su portada,
   su cifra y sus enlaces. */
export function abrirSerie(t, textos, origen){
  const abanico = el('ul', 'serie__abanico');
  const caps = (t.media || []).filter(m => m.tipo === 'video-enlace').slice(0, 4);
  caps.forEach((m, n) => {
    const tarjeta = tarjetaVideoExterno({ ...m, etiqueta: m.etiqueta || { es: `Nº ${n + 1}`, en: `No. ${n + 1}`, zh: `第 ${n + 1} 条` } }, textos);
    abanico.appendChild(movilDeCapa(tarjeta, n - (caps.length - 1) / 2));
  });
  const piezas = capa({ titulo: enIdioma(t.titulo), cifra: enIdioma(t.total), cuerpo: abanico,
                        ficha: etiquetaContenido(t.contenido, textos) }, textos);
  return abrirEnElMovil(piezas, miniaturaDe(t), origen);
}

/* Un vídeo vertical: un solo móvil, y dentro el vídeo de verdad,
   con sonido (quien ha pinchado quiere verlo). */
export function abrirVideoEnMovil(m, t, textos, origen){
  const abanico = el('ul', 'serie__abanico serie__abanico--uno');
  const v = document.createElement('video');
  v.controls = true; v.playsInline = true; v.preload = 'auto';
  v.poster = m.portada || ''; v.src = m.archivo;
  v.setAttribute('aria-label', enIdioma(m.titulo));
  v.className = 'serie__video';
  abanico.appendChild(movilDeCapa(v, 0));
  const piezas = capa({ titulo: enIdioma(t.titulo), cifra: enIdioma(m.titulo), cuerpo: abanico,
                        ficha: etiquetaContenido(t.contenido, textos) }, textos);
  piezas.alAbrir = () => v.play().catch(() => {});
  piezas.alCerrar = () => v.pause();
  return abrirEnElMovil(piezas, m.portada, origen);
}

/* Un vídeo horizontal: sin muñeca, pantalla grande sobre el velo */
export function abrirPantalla(m, textos, origen){
  const sala = el('div', 'serie__sala');
  const v = document.createElement('video');
  v.controls = true; v.playsInline = true; v.preload = 'auto';
  v.poster = m.portada || ''; v.src = m.archivo;
  v.setAttribute('aria-label', enIdioma(m.titulo));
  sala.appendChild(v);
  const piezas = capa({ titulo: enIdioma(m.titulo), cuerpo: sala, clase: 'serie--sala' }, textos);
  piezas.alAbrir = () => v.play().catch(() => {});
  piezas.alCerrar = () => v.pause();
  piezas.sinMunieca = true;
  return abrirEnElMovil(piezas, m.portada, origen);
}

let abierta = false;
async function abrirEnElMovil(piezas, miniatura, origen){
  if (abierta) return;
  abierta = true;
  const { capa, cerrar } = piezas;
  const conVideo = !piezas.sinMunieca && !enMovil() && !sinMovimiento();
  let puesto = null;

  // 1 · la miniatura vuela hasta el móvil de la muñeca y este se levanta
  if (conVideo){
    prepararEscena();
    puesto = ponerSobreLaMunieca();
    if (puesto){
      const destino = el('div'); // un punto donde está el móvil quieto
      const c = puesto.caja;
      Object.assign(destino.style, { position: 'fixed', left: (c.left + c.width * (MOVIL.x + MOVIL.w / 2)) + 'px',
        top: (c.top + c.height * (MOVIL.y + MOVIL.h / 2)) + 'px', width: '2px', height: '2px' });
      document.body.appendChild(destino);
      const vuelo = volarEnArco(miniatura, origen, destino, { escalaFin: 0.6, duracion: 560 });
      escena.raiz.dataset.visible = 'true';
      puesto.fig.style.opacity = '0';
      const subir = await mostrarTramo('subir');
      await vuelo; destino.remove();
      if (subir){ await acabar(subir); }
      else { escena.raiz.dataset.visible = 'false'; puesto.fig.style.opacity = ''; puesto = null; }
    }
  }

  // 2 · se oscurece la página y el móvil se acerca (y se abre)
  document.body.appendChild(capa);
  document.documentElement.style.overflow = 'hidden';
  if (puesto){
    const c = puesto.caja;
    const m = { left: c.left + c.width * MOVIL.x, top: c.top + c.height * MOVIL.y,
                width: c.width * MOVIL.w, height: c.height * MOVIL.h };
    capa.style.setProperty('--desde-x', (m.left + m.width / 2) + 'px');
    capa.style.setProperty('--desde-y', (m.top + m.height / 2) + 'px');
    capa.style.setProperty('--desde-alto', m.height + 'px');
    capa.dataset.desdeMovil = 'true';
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    capa.dataset.abierta = 'true';
    // el móvil grande se va al centro: ella se queda con el suyo en el estabilizador
    if (puesto) setTimeout(mostrarReposo, 90);
    setTimeout(() => piezas.alAbrir?.(), sinMovimiento() ? 0 : 500);
  }));
  cerrar.focus();

  const salir = async () => {
    if (capa.dataset.cerrando) return;
    capa.dataset.cerrando = 'true';
    if (puesto){
      // vuelve a sus manos: al móvil del estabilizador, girado en horizontal
      const c = puesto.caja;
      capa.style.setProperty('--desde-x', (c.left + c.width * REPOSO.x) + 'px');
      capa.style.setProperty('--desde-y', (c.top + c.height * REPOSO.y) + 'px');
      capa.style.setProperty('--desde-alto', (c.height * REPOSO.largo) + 'px');
      capa.style.setProperty('--desde-giro', '-90deg');
      capa.dataset.volviendo = 'true';
    }
    capa.dataset.abierta = 'false';
    piezas.alCerrar?.();
    document.removeEventListener('keydown', tecla);
    await new Promise(ok => setTimeout(ok, sinMovimiento() ? 0 : 520));
    capa.remove();
    document.documentElement.style.overflow = '';
    if (puesto){
      // el móvil ya ha vuelto a sus manos (la capa se encoge hacia él);
      // la muñeca de la página vuelve a su sitio con un fundido
      escena.raiz.dataset.visible = 'false';
      puesto.fig.style.opacity = '';
      Object.values(escena.videos).forEach(v => v.pause());
    }
    abierta = false;
    origen?.focus?.();
  };
  const tecla = e => { if (e.key === 'Escape') salir(); };
  document.addEventListener('keydown', tecla);
  cerrar.addEventListener('click', salir);
  capa.querySelector('.serie__velo').addEventListener('click', salir);
}
