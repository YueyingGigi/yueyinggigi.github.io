/* ─────────────────────────────────────────────────────────────
   page.js — lo que pasa en la página de un apartado.

   · Pone la muñeca de ese apartado en pantalla.
   · Al bajar por la página, la muñeca se da la vuelta y cambia de sitio
     según el bloque que se esté leyendo (DESIGN § 7).
   · Marca en el índice en qué bloque estamos.

   El contenido de cada bloque se rellena en la etapa 3 desde
   content/<apartado>.json.
   ───────────────────────────────────────────────────────────── */

import { iniciarIdioma, idiomaActual } from './i18n.js';
import { Figura } from './figure.js';
import { iniciarBarra } from './chrome.js';

const ICONOS = {
  'sobre-mi':'var(--lavanda-hondo)', 'experiencia':'var(--rojo-caja-hondo)',
  'trabajos':'var(--amarillo-hondo)', 'vida':'var(--azul-mar-hondo)',
  'colabora':'var(--rosa-hondo)'
};

const COLORES = {
  'sobre-mi':   'var(--lavanda-claro)',
  'experiencia':'var(--rojo-caja-claro)',
  'trabajos':   'var(--amarillo-claro)',
  'vida':       'var(--azul-mar-claro)',
  'colabora':   'var(--rosa-claro)'
};

function enIdioma(obj){
  if (!obj) return '';
  return obj[idiomaActual()] || obj.es || '';
}

async function cargarContenido(seccion){
  const r = await fetch(`content/${seccion}.json`);
  if (!r.ok) throw new Error(`No se ha podido cargar content/${seccion}.json`);
  return r.json();
}

function marcaPendiente(textos){
  const p = document.createElement('p');
  p.className = 'pendiente';
  p.textContent = textos['ventana.pendiente'] || 'Contenido en preparación.';
  return p;
}

/* Dibuja los bloques y el índice de arriba */
function pintar(datos, textos){
  const caja = document.querySelector('.bloques');
  const indice = document.querySelector('.indice');
  if (!caja) return [];
  caja.innerHTML = '';
  if (indice) indice.innerHTML = '';

  const apartados = datos.apartados || [];
  apartados.forEach(ap => {
    const sec = document.createElement('section');
    sec.className = 'bloque';
    sec.id = 'b-' + ap.id;
    const h = document.createElement('h2');
    h.className = 'bloque__titulo';
    h.textContent = enIdioma(ap.titulo);
    sec.append(h, marcaPendiente(textos));
    caja.appendChild(sec);

    if (indice){
      const a = document.createElement('a');
      a.href = '#b-' + ap.id;
      a.textContent = enIdioma(ap.titulo);
      indice.appendChild(a);
    }
  });
  if (indice) indice.hidden = apartados.length < 2;
  return apartados;
}

/* "Mis trabajos" es el único apartado con carpetas: ahí sí tiene
   sentido la ventana estilo Mac, incrustada en la página. */
function pintarCarpetas(datos, textos){
  const caja = document.querySelector('.bloques');
  if (!caja) return [];
  caja.innerHTML = '';

  const mac = document.createElement('div');
  mac.className = 'mac';
  mac.innerHTML = `
    <div class="mac__barra">
      <span class="mac__puntos" aria-hidden="true">
        <span class="mac__punto mac__punto--rojo"></span>
        <span class="mac__punto mac__punto--amarillo"></span>
        <span class="mac__punto mac__punto--verde"></span>
      </span>
      <span class="mac__titulo"></span>
    </div>
    <div class="mac__cuerpo"></div>`;
  mac.querySelector('.mac__titulo').textContent = textos['nav.trabajos'] || '';
  const cuerpo = mac.querySelector('.mac__cuerpo');

  (datos.carpetas || []).forEach(carpeta => {
    const sec = document.createElement('section');
    sec.className = 'carpeta';
    const h = document.createElement('p');
    h.className = 'carpeta__titulo';
    h.textContent = enIdioma(carpeta.titulo);

    const ul = document.createElement('ul');
    ul.className = 'rejilla';
    carpeta.trabajos.filter(x => x.publicado !== false).forEach(trabajo => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ficha';
      b.innerHTML = `
        <svg class="ficha__icono" width="44" height="36" viewBox="0 0 46 38" fill="none"
             stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
          <path d="M2 7a3 3 0 0 1 3-3h11l4 5h21a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z"/>
        </svg><span class="ficha__nombre"></span>`;
      b.querySelector('.ficha__nombre').textContent = enIdioma(trabajo.titulo);
      li.appendChild(b); ul.appendChild(li);
    });
    sec.append(h, ul); cuerpo.appendChild(sec);
  });

  caja.appendChild(mac);
  const indice = document.querySelector('.indice');
  if (indice) indice.hidden = true;
  return [];
}

/* Al bajar, la muñeca va cambiando de postura y de sitio */
function seguirElScroll(figura, apartados){
  const bloques = [...document.querySelectorAll('.bloque')];
  const enlaces = [...document.querySelectorAll('.indice a')];
  if (!bloques.length) return;

  const mirador = new IntersectionObserver(entradas => {
    // el bloque más visible manda
    const visible = entradas
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;

    const i = bloques.indexOf(visible.target);
    if (i < 0) return;

    figura.irA(i);
    document.querySelector('.pagina')?.setAttribute(
      'data-lado', i % 2 === 1 ? 'izquierda' : 'derecha');

    enlaces.forEach((a, n) => a.setAttribute('aria-current', String(n === i)));
  }, { rootMargin: '-45% 0px -45% 0px', threshold: [0, .25, .5, .75, 1] });

  bloques.forEach(b => mirador.observe(b));
}

async function iniciar(){
  const seccion = document.body.dataset.pagina;
  iniciarBarra();

  let textos = {};
  try { textos = await iniciarIdioma(); }
  catch (e) { console.error('No se han podido cargar los textos:', e); }

  document.documentElement.style.setProperty('--color-claro', COLORES[seccion] || 'var(--gris-calido)');
  document.documentElement.style.setProperty('--color-icono', ICONOS[seccion] || 'var(--tinta-tenue)');

  const figura = new Figura(document.querySelector('img.figura'));
  figura.mostrar(seccion, textos['figura.' + seccion] || '');

  try {
    const datos = await cargarContenido(seccion);
    const dibujar = t => datos.vista === 'carpetas' ? pintarCarpetas(datos, t) : pintar(datos, t);
    const apartados = dibujar(textos);
    seguirElScroll(figura, apartados);
    document.addEventListener('idioma:cambiado', e => {
      dibujar(e.detail.textos);
      figura.el.alt = e.detail.textos['figura.' + seccion] || '';
    });
  } catch (e) {
    console.error(e);
  }

  document.body.dataset.listo = 'true';
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', iniciar)
  : iniciar();
