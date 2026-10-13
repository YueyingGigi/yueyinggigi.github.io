/* ─────────────────────────────────────────────────────────────
   montar.js — la portada del espejo: un escritorio visto en oblicuo,
   con el portátil del espejo empañado en el centro, las cinco cajas
   delante y la luz de una ventana cruzando la mesa.

   Solo se carga en la versión «espejo» (js/portada.js). Todo va
   dentro de la cámara de js/escena.js, así que gira con el ratón.

   · opcionesDeEscena()  lo que se le pide a js/escena.js: cámara
                    quieta, y pintarMesa() en lugar de sus tres cosas
                    de siempre (lo de la mesa y la pared, y el portátil
                    vacío). Según el fondo: dibujado o foto.
   · montarEspejo() trae el vídeo y lo pone a andar en la pantalla.

   Todo está dibujado con CSS (css/espejo.css), menos las fotos. Si un
   día hay una ilustración de fondo, va en .fondo-espejo y se apaga lo
   que sobre de aquí.

   niebla.js y reproductor.js son COPIAS de las del proyecto espejo/
   (../../../espejo/src/). No se tocan aquí: se cambian allí y se
   vuelven a traer, igual que el vídeo (herramientas/traer-espejo.mjs).

   Nadie escribe en este espejo: no responde al ratón ni al dedo, y
   no usa la cámara ni el micrófono de quien visita.
   ───────────────────────────────────────────────────────────── */

import { crearEspejo } from './reproductor.js';
import { idiomaActual } from '../i18n.js';
import { sinMovimiento } from '../anim.js';

const CARPETA = 'assets/espejo/';
const RESPALDO = '-apple-system, "Helvetica Neue", "PingFang SC", sans-serif';
/* La letra de las dos líneas: la del vídeo (Caveat) y, en chino, una
   de pincel. Se piden aquí porque la página solo trae Caveat fina. */
const LETRAS = 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Ma+Shan+Zheng&display=swap';

function colgar(href){
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = href;
  document.head.appendChild(l);
  return new Promise(ok => { l.onload = l.onerror = ok; });
}
export const estilos = colgar('css/espejo.css');
const letras = colgar(LETRAS);

const leerJson = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url);
  return r.json();
};

/* Un libro: la tapa de arriba, el lomo (mira a quien mira) y el canto
   de las hojas. */
const libro = (n, lomo = '') =>
  `<div class="libro libro--${n}"><i class="libro__tapa"></i><i class="libro__lomo"><b>${lomo}</b></i><i class="libro__hojas"></i></div>`;

/* Los lomos solo llevan palabras que ya son de Gigi: las de la pared */
const lomos = (textos) => textos['pared.cinta'] || ['CONTENIDO', 'COMUNICACIÓN DE MARCA'];

/* ── Los dos fondos ──
   «dibujado»: todo lo de css/espejo.css (pared, ventana, sol, taza…).
   «foto»: la mesa de madera en la playa que hizo Gigi. Son dos capas,
   el paisaje y la mesa (recortada de la foto), para que al girar se
   muevan distinto; en el móvil, una sola foto vertical.
   La cámara de la foto es casi a ras de mesa: tiene que coincidir con
   la de quien hizo la foto, o las cajas no parecen apoyadas en ella. */
const enMovil = () => matchMedia('(max-width: 767px)').matches;
const anchoFoto = () => document.querySelector('.fondo-espejo')?.offsetWidth || innerWidth;
const CAMARA_FOTO = {
  rx: 87, pared: 1, giro: { x: 2.5, y: 4 },
  // la perspectiva va con el tamaño de la foto (que es 100 unidades de ancho)
  get perspectiva(){ return anchoFoto() * (enMovil() ? 2.6 : 1.74); }
};

export function opcionesDeEscena(fondo){
  const foto = fondo === 'foto';
  return {
    fija: true,
    cosas: (cosas, textos) => pintarMesa(cosas, textos, foto, fondo === 'playa'),
    camara: foto ? CAMARA_FOTO : null,
    // al girar la mesa, el paisaje se desliza un poco al revés
    alGirar: foto ? (rat) => {
      const u = anchoFoto() / 100;
      document.querySelectorAll('.fondo-espejo img').forEach(img => {
        const k = +img.dataset.lejos;
        img.style.transform = `translate3d(${(-rat.x * k * u).toFixed(1)}px, ${(rat.y * k * 0.4 * u).toFixed(1)}px, 0) scale(1.05)`;
      });
    } : null
  };
}

/* ── Las plantas del fondo «playa», dibujadas con SVG ──
   Una hoja de palmera: el nervio, que cae por su peso, y los foliolos
   a los dos lados, más largos hacia el medio. */
const r1 = n => n.toFixed(1);
function hojaDePalmera(L, n, claro, oscuro){
  const cae = 0.3;
  let s = `<path d="M0 0Q${r1(L * 0.5)} 0 ${r1(L)} ${r1(cae * L)}" fill="none" stroke="${oscuro}" stroke-width="${r1(L * 0.014)}" stroke-linecap="round"/>`;
  for (let i = 1; i <= n; i++){
    const t = i / (n + 1);
    const x = L * (2 * t * (1 - t) * 0.5 + t * t), y = cae * L * t * t;      // punto del nervio
    let tx = L * (1 - t) + L * t, ty = 2 * cae * L * t;                       // hacia dónde va
    const m = Math.hypot(tx, ty); tx /= m; ty /= m;
    const l = L * (0.07 + 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.12)) ** 0.7);
    for (const lado of [-1, 1]){
      const a = lado * 1.0;
      const dx = tx * Math.cos(a) - ty * Math.sin(a), dy = tx * Math.sin(a) + ty * Math.cos(a);
      const ex = x + dx * l, ey = y + dy * l + l * 0.3;                       // la punta, que también cae
      const g = l * 0.085, mx = (x + ex) / 2, my = (y + ey) / 2, nx = -dy, ny = dx;
      s += `<path d="M${r1(x)} ${r1(y)}Q${r1(mx + nx * g)} ${r1(my + ny * g)} ${r1(ex)} ${r1(ey)}Q${r1(mx - nx * g)} ${r1(my - ny * g)} ${r1(x)} ${r1(y)}Z" fill="${(i + (lado > 0 ? 1 : 0)) % 2 ? claro : oscuro}"/>`;
    }
  }
  return s;
}
/* Varias hojas que salen del mismo sitio. `hojas`: [largo, giro en grados] */
function palmera(hojas, { claro = '#7FA650', oscuro = '#4E7A3A', clase = '' } = {}){
  return `<svg class="palmera ${clase}" viewBox="-110 -110 220 220" aria-hidden="true">${
    hojas.map(([L, giro]) => `<g transform="rotate(${giro})">${hojaDePalmera(L, 15, claro, oscuro)}</g>`).join('')}</svg>`;
}
/* Unas ramas finas con hojitas, como las del olivo de la foto */
function ramitas(){
  let s = '';
  [[-34, 78], [-16, 96], [2, 104], [19, 90], [36, 70]].forEach(([grados, largo], k) => {
    const a = (grados - 90) * Math.PI / 180, cx = Math.cos(a), cy = Math.sin(a);
    s += `<path d="M0 0L${r1(cx * largo)} ${r1(cy * largo)}" stroke="#6B5A3A" stroke-width="1.6" stroke-linecap="round"/>`;
    for (let i = 2; i <= 9; i++){
      const d = largo * i / 9.4, lado = (i + k) % 2 ? 1 : -1;
      const g = grados + lado * 52;
      s += `<ellipse cx="0" cy="-7" rx="2.7" ry="7.4" fill="${i % 3 ? '#7C9A5C' : '#5F7F47'}" transform="translate(${r1(cx * d)} ${r1(cy * d)}) rotate(${g})"/>`;
    }
  });
  return `<svg class="ramitas" viewBox="-70 -112 140 114" aria-hidden="true">${s}</svg>`;
}

function pintarMesa(cosas, textos, foto, playa){
  const camara = cosas.parentElement;
  const [uno, dos] = lomos(textos);

  // ── encima de la mesa (se dejan empujar, como las de siempre) ──
  cosas.innerHTML = `
    <div class="cosa cosa--libros">
      <i class="cosa__sombra"></i>
      ${libro(1, dos)}${libro(2, uno)}${libro(3)}
    </div>
    <div class="cosa cosa--rollo"><i></i></div>
    <div class="cosa cosa--tira"></div>
    <div class="cosa cosa--taza">
      <i class="taza__posavasos"></i><i class="cosa__sombra"></i>
      <i class="taza__pie"></i><i class="taza__asa"></i><i class="taza__cuerpo"></i><i class="taza__boca"></i>
    </div>
    ${playa ? `<div class="cosa cosa--maceta">
      <i class="cosa__sombra"></i><i class="taza__pie"></i><i class="maceta__cuerpo"></i><i class="maceta__boca"></i>
      <i class="maceta__planta">${ramitas()}</i>
    </div>` : ''}
    <div class="cosa cosa--boli"></div>
    <div class="cosa cosa--movil"><i></i></div>
    <p class="cosa cosa--pista">
      <span data-t="entrada.pista"></span>
      <svg viewBox="0 0 60 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 9c14 12 30 14 50 6M44 8l10 7-11 6"/>
      </svg>
    </p>`;
  cosas.querySelector('.cosa--pista span').textContent = textos['entrada.pista'] || '';

  // ── en la pared: la ventana y tres fotos pegadas con cinta ──
  const pared = camara.querySelector('.pared');
  pared.insertAdjacentHTML('beforeend', `
    <div class="ventana">
      <i class="ventana__cielo"></i>
      ${playa ? `<div class="ventana__vista">
        <i class="ventana__brillos"></i>
        <svg class="ventana__tronco" viewBox="0 0 40 200" preserveAspectRatio="none" aria-hidden="true"><path d="M30 0C22 60 14 130 2 200h12C24 130 32 60 40 0z" fill="#8A6A45"/></svg>
        ${palmera([[100, 18], [92, 52], [84, 84], [70, -12]], { clase: 'palmera--ventana' })}
      </div>` : ''}
      <i class="ventana__cruz"></i><i class="ventana__repisa"></i>
      ${playa ? `<div class="ventana__maceta"><i></i>${ramitas()}</div>` : ''}
    </div>
    <figure class="foto foto--1"><img src="assets/media/fotos/playa-640.webp" alt="" loading="lazy"></figure>
    <figure class="foto foto--2"><img src="assets/media/fotos/autorretrato-640.webp" alt="" loading="lazy"></figure>
    <figure class="foto foto--3"><img src="assets/media/fotos/retrato-640.webp" alt="" loading="lazy"></figure>`);

  // ── el sol de la ventana, en cuatro cuadros sobre la mesa ──
  const sol = document.createElement('div');
  sol.className = 'sol'; sol.setAttribute('aria-hidden', 'true');
  sol.innerHTML = '<i></i><i></i><i></i><i></i>' + (playa ? '<i></i><i></i>' : '');
  cosas.before(sol);
  if (playa){
    // la sombra de las hojas de la palmera, dentro de ese sol
    const sombra = document.createElement('div');
    sombra.className = 'sombra-hojas'; sombra.setAttribute('aria-hidden', 'true');
    sombra.innerHTML = palmera([[100, 30], [96, 62], [88, 8], [80, 96]], { claro: '#4A3520', oscuro: '#4A3520' });
    cosas.before(sombra);
  }

  // ── el portátil, todavía sin nada en la pantalla ──
  const portatil = document.createElement('div');
  portatil.className = 'espejo';
  portatil.setAttribute('aria-hidden', 'true');   // el saludo y la frase siguen escritos en la página
  portatil.innerHTML = `
    <i class="espejo__sombra"></i>
    <div class="espejo__base"><i class="espejo__teclas"></i><i class="espejo__panel"></i></div>
    <i class="espejo__canto"></i>
    <div class="espejo__tapa"><div class="espejo__pantalla"><canvas></canvas></div></div>`;
  cosas.after(portatil);

  // ── por fuera del 3D: el sitio de la ilustración y el polvo en la luz ──
  const mesa = camara.closest('.mesa');
  const fondo = document.createElement('div');
  fondo.className = 'fondo-espejo'; fondo.setAttribute('aria-hidden', 'true');
  if (foto){
    fondo.innerHTML = enMovil()
      ? '<img src="assets/espejo/fondo-playa-movil.webp" alt="" data-lejos="0.5">'
      : '<img src="assets/espejo/fondo-playa.webp" alt="" data-lejos="1.3"><img src="assets/espejo/mesa-playa.webp" alt="" data-lejos="0.25">';
  }
  mesa.prepend(fondo);
  const polvo = document.createElement('div');
  polvo.className = 'polvo'; polvo.setAttribute('aria-hidden', 'true');
  // sitios fijos (no al azar): que cada visita sea la misma mesa
  polvo.innerHTML = [[8, 22, 0], [15, 48, -7], [22, 30, -3], [27, 62, -11], [33, 40, -5], [12, 70, -9], [38, 18, -2], [19, 12, -13]]
    .map(([x, y, t]) => `<i style="left:${x}%;top:${y}%;animation-delay:${t}s"></i>`).join('');
  mesa.append(polvo);
  if (playa){
    // unas hojas que asoman por la izquierda, por delante de todo
    const delante = document.createElement('div');
    delante.className = 'hojas-delante'; delante.setAttribute('aria-hidden', 'true');
    delante.innerHTML = palmera([[104, -34], [96, -4], [84, 24]], { claro: '#6F9A48', oscuro: '#3F6B33' });
    mesa.append(delante);
  }
}

const lineas = (textos) => ({ intro: textos['espejo.intro'], bienvenida: textos['espejo.bienvenida'] });

async function letra(datos, textos){
  const nombre = idiomaActual() === 'zh' ? 'Ma Shan Zheng' : (datos.fuente ?? 'Caveat');
  const muestra = (textos['espejo.intro'] || '') + [].concat(textos['espejo.bienvenida'] || []).join('');
  await document.fonts.load(`700 40px "${nombre}"`, muestra).catch(() => {});
  return `"${nombre}", ${RESPALDO}`;
}

export async function montarEspejo(mesa, textos){
  const portatil = mesa?.querySelector('.espejo');
  if (!portatil) return;

  /* Con ?fps en la dirección, un contador de fotogramas por segundo
     arriba a la derecha: para que Gigi pueda decir cómo va en su
     ordenador (60 es lo normal; por debajo de 40 se nota a tirones). */
  if (new URLSearchParams(location.search).has('fps')){
    const marca = document.createElement('output');
    marca.style.cssText = 'position:fixed;right:10px;top:74px;z-index:99;padding:4px 10px;border-radius:6px;background:#1E1E1E;color:#fff;font:600 14px/1.4 system-ui';
    document.body.append(marca);
    let cuenta = 0, desde = performance.now();
    (function contar(ahora){
      cuenta++;
      if (ahora - desde >= 1000){ marca.textContent = Math.round(cuenta * 1000 / (ahora - desde)) + ' fps'; cuenta = 0; desde = ahora; }
      requestAnimationFrame(contar);
    })(desde);
  }
  const canvas = portatil.querySelector('canvas');

  /* En oblicuo las tapas se ven de canto y su etiqueta se lee mal: el
     nombre de cada caja va también en la cara de delante, que es la
     que mira a quien entra. (Las caras las pone js/escena.js.) */
  mesa.querySelectorAll('.cubo').forEach(cubo => {
    const caja = cubo.querySelector('.caja');
    const pegatina = document.createElement('span');
    pegatina.className = 'cubo__nombre';
    pegatina.style.cssText = caja.getAttribute('style') || '';
    pegatina.dataset.t = 'nav.' + caja.dataset.seccion;       // js/i18n.js la traduce sola
    pegatina.textContent = textos['nav.' + caja.dataset.seccion] || '';
    cubo.querySelector('.cubo__cara--frente')?.appendChild(pegatina);
  });

  document.addEventListener('idioma:cambiado', e => {
    const [uno, dos] = lomos(e.detail.textos);
    const b = mesa.querySelectorAll('.libro__lomo b');
    if (b[0]) b[0].textContent = dos;
    if (b[1]) b[1].textContent = uno;
  });

  // si Gigi cambia el vídeo, la dirección cambia con él y no sale el viejo
  const sello = await leerJson(CARPETA + 'origen.json').then(o => '?' + Date.parse(o.fecha)).catch(() => '');
  const datos = await leerJson(CARPETA + 'gigi.json' + sello);

  const video = document.createElement('video');
  video.muted = true; video.playsInline = true; video.preload = 'auto';
  video.innerHTML = `<source src="${CARPETA}gigi.webm${sello}" type="video/webm"><source src="${CARPETA}gigi.mp4${sello}" type="video/mp4">`;
  await new Promise((listo, fallo) => { video.onloadeddata = listo; video.onerror = fallo; video.load(); });

  await letras;      // sin esto, la primera vez las dos líneas saldrían con letra de imprenta

  // nítido en pantallas de doble densidad, pero nunca más que el vídeo
  const ancho = Math.min(datos.video.w, Math.round(canvas.clientWidth * Math.min(devicePixelRatio || 1, 2))) || datos.video.w;
  canvas.width = ancho;
  canvas.height = Math.round(ancho * datos.video.h / datos.video.w);

  const espejo = crearEspejo({ canvas, video, datos, textos: lineas(textos), fuente: await letra(datos, textos), ajustar: false });

  if (sinMovimiento()){
    // quieto: el momento en que ya está todo escrito, antes de que se vaya el vaho
    const fija = Math.max(0, (datos.despeje?.t ?? datos.video.duracion) - 0.1);
    video.addEventListener('seeked', () => {
      if (Math.abs(video.currentTime - fija) < 0.5) return espejo.dibujar();
      // hay servidores que no dejan saltar dentro del vídeo (el de pruebas
      // de casa, por ejemplo): entonces, la foto fija que viene con él
      const foto = new Image();
      foto.alt = ''; foto.src = CARPETA + 'gigi-poster.jpg' + sello;
      canvas.replaceWith(foto);
    }, { once: true });
    video.currentTime = fija;
  } else {
    espejo.play();
    // mientras se abre una caja, que no compita con las manos
    document.addEventListener('caja:abriendo', () => espejo.pause());
  }
  portatil.dataset.listo = 'true';

  document.addEventListener('idioma:cambiado', async e => {
    const t = e.detail.textos;
    espejo.setTextos(lineas(t), await letra(datos, t));
  });
}
