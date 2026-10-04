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
    carpeta.trabajos.filter(x => x.publicado !== false).forEach((trabajo, n) => {
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
      // En esta página casi no hay que bajar, así que la muñeca se gira
      // al pasar por cada carpeta: si no, se quedaría siempre de frente.
      b.dataset.parada = String(n % 5);
      li.appendChild(b); ul.appendChild(li);
    });
    sec.append(h, ul); cuerpo.appendChild(sec);
  });

  caja.appendChild(mac);
  const indice = document.querySelector('.indice');
  if (indice) indice.hidden = true;
  return [];
}

/* Al bajar, la muñeca va cambiando de postura y de sitio.

   Se guía por CUÁNTO se ha bajado, no por los bloques de texto: hay
   páginas sin bloques ("Mis trabajos", que lleva carpetas) y otras con
   pocos ("Mi vida en España", tres), y así la muñeca se quedaba casi
   siempre en la misma postura. Con el avance del scroll, todas las
   páginas recorren las mismas paradas. */
function seguirElScroll(figura, totalParadas){
  const bloques = [...document.querySelectorAll('.bloque')];
  const enlaces = [...document.querySelectorAll('.indice a')];

  // Los bloques aparecen al acercarse a la pantalla
  if (bloques.length){
    bloques.forEach(b => { b.dataset.oculto = 'true'; });
    const entrada = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting){
        e.target.dataset.visto = 'true';
        delete e.target.dataset.oculto;
        entrada.unobserve(e.target);
      }});
    }, { rootMargin: '0px 0px -12% 0px' });
    bloques.forEach(b => entrada.observe(b));
  }

  // La postura, según lo que se lleva bajado
  let pedido = false;
  function mirar(){
    pedido = false;
    const alto = document.documentElement.scrollHeight - window.innerHeight;
    const avance = alto > 40 ? Math.min(1, Math.max(0, window.scrollY / alto)) : 0;
    const parada = Math.min(totalParadas - 1, Math.floor(avance * totalParadas));
    figura.irA(parada);
    document.querySelector('.pagina')?.setAttribute(
      'data-lado', parada % 2 === 1 ? 'izquierda' : 'derecha');

    // y de paso se marca en el índice el bloque que se está leyendo
    if (bloques.length && enlaces.length){
      const centro = window.innerHeight / 2;
      let cerca = 0, mejor = Infinity;
      bloques.forEach((b, n) => {
        const r = b.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - centro);
        if (d < mejor){ mejor = d; cerca = n; }
      });
      enlaces.forEach((a, n) => a.setAttribute('aria-current', String(n === cerca)));
    }
  }

  // En páginas que apenas se pueden bajar (Mis trabajos), la muñeca se
  // gira al pasar el ratón por una carpeta.
  document.querySelectorAll('[data-parada]').forEach(el => {
    el.addEventListener('pointerenter', () => figura.irA(+el.dataset.parada));
    el.addEventListener('focus', () => figura.irA(+el.dataset.parada));
  });

  window.addEventListener('scroll', () => {
    if (!pedido){ pedido = true; requestAnimationFrame(mirar); }
  }, { passive: true });
  window.addEventListener('resize', mirar, { passive: true });
  mirar();
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
    dibujar(textos);
    seguirElScroll(figura, figura.cuantasParadas());
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
