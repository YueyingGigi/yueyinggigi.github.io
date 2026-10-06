/* ─────────────────────────────────────────────────────────────
   page.js — lo que pasa en la página de un apartado.

   · Carga content/<apartado>.json y lo dibuja (bloques.js).
   · Pone la muñeca de ese apartado y la va girando al bajar.
   · «Mis trabajos» es distinto: carpetas a la izquierda, el trabajo
     elegido en el centro, y todo metido en un portátil (§ 4 del plan,
     DESIGN § 15.2).

   Para cambiar textos NO hace falta tocar este archivo: se edita
   content/*.json.
   ───────────────────────────────────────────────────────────── */

import { iniciarIdioma } from './i18n.js';
import { Figura } from './figure.js';
import { iniciarBarra } from './chrome.js';
import { enIdioma, pintarBloques, pintarMateriales,
         animarBloques, etiquetaContenido } from './bloques.js';
import { volar } from './anim.js';
import { iniciarEstante } from './estante.js';
import { escenario, abrirSerie, volarEnArco, miniaturaDe, precargarSerie } from './trabajos.js';

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

async function cargarContenido(seccion){
  const r = await fetch(`content/${seccion}.json`);
  if (!r.ok) throw new Error(`No se ha podido cargar content/${seccion}.json`);
  return r.json();
}

/* ═══════════ Las cuatro páginas normales ═══════════ */

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
    sec.appendChild(h);
    pintarBloques(sec, ap.bloques, textos);
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

/* ═══════════ «Mis trabajos»: el portátil ═══════════

   Un portátil dibujado con CSS (ni una imagen), y dentro la ventana
   estilo Mac: carpetas a la izquierda, el trabajo elegido en el
   centro. Se abre creciendo, igual que en la web que puso Gigi de
   referencia (junhayashii0.github.io/Portfolio): 260 ms, un 1,5 % de
   escala y un poco de desenfoque. Nada de saltos grandes.

   La dirección se queda escrita en la barra (#trabajos/niunos), así
   que se puede mandar el enlace de un trabajo concreto y las flechas
   de atrás y adelante del navegador funcionan. */
function pintarCarpetas(datos, textos){
  const caja = document.querySelector('.bloques');
  if (!caja) return [];
  caja.innerHTML = '';

  const todos = [];
  (datos.carpetas || []).forEach(c => {
    (c.trabajos || []).filter(t => t.publicado !== false).forEach(t => todos.push(t));
  });

  const portatil = document.createElement('div');
  portatil.className = 'portatil';
  portatil.innerHTML = `
    <div class="portatil__pantalla">
      <div class="mac">
        <div class="mac__barra">
          <span class="mac__puntos" aria-hidden="true">
            <span class="mac__punto mac__punto--rojo"></span>
            <span class="mac__punto mac__punto--amarillo"></span>
            <span class="mac__punto mac__punto--verde"></span>
          </span>
          <span class="mac__titulo"></span>
        </div>
        <div class="mac__cuerpo">
          <nav class="mac__lateral"></nav>
          <div class="mac__principal"><div class="detalle"></div></div>
        </div>
      </div>
    </div>
    <div class="portatil__base" aria-hidden="true"><span class="portatil__muesca"></span></div>`;

  portatil.querySelector('.mac__titulo').textContent = textos['nav.trabajos'] || '';
  const lateral = portatil.querySelector('.mac__lateral');
  const detalle = portatil.querySelector('.detalle');
  lateral.setAttribute('aria-label', textos['trabajos.carpetas'] || '');

  /* ── La columna de carpetas ── */
  (datos.carpetas || []).forEach(c => {
    const grupo = document.createElement('div');
    grupo.className = 'mac__grupo';
    grupo.appendChild(Object.assign(document.createElement('p'), {
      className: 'mac__carpeta', textContent: enIdioma(c.titulo)
    }));
    const ul = document.createElement('ul');
    (c.trabajos || []).filter(t => t.publicado !== false).forEach(t => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mac__archivo';
      b.dataset.trabajo = t.id;
      b.dataset.parada = String(todos.findIndex(x => x.id === t.id) % 5);
      b.textContent = enIdioma(t.titulo);
      b.addEventListener('click', () => {
        // Deja la dirección escrita: así el enlace se puede compartir
        // y las flechas del navegador funcionan.
        location.hash = 'trabajos/' + t.id;
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
    grupo.appendChild(ul);
    lateral.appendChild(grupo);
  });

  /* ── El trabajo elegido ──
     Al pinchar un archivo de la columna, el detalle CRECE desde el
     sitio que ocupa ese archivo, en vez de aparecer sin más. Es un
     FLIP hecho a mano (js/anim.js), no el plugin de GSAP: veinte
     líneas y una dependencia menos. */
  function mostrar(id, conAnimacion){
    const t = todos.find(x => x.id === id) || todos[0];
    if (!t) return;
    const origen = lateral.querySelector(`[data-trabajo="${CSS.escape(t.id)}"]`);
    detalle.innerHTML = '';
    detalle.dataset.trabajo = t.id;

    // En la pantalla, una cabecera de una línea y lo principal;
    // lo demás va debajo del portátil, en la mesa (js/trabajos.js).
    const cab = document.createElement('div');
    cab.className = 'detalle__cabeza';
    const h = document.createElement('h2');
    h.className = 'detalle__titulo';
    h.textContent = enIdioma(t.titulo);
    cab.appendChild(h);
    const etiqueta = enIdioma(t.etiqueta);
    if (etiqueta){
      const e = document.createElement('p');
      e.className = 'detalle__etiqueta';
      e.textContent = etiqueta;
      cab.appendChild(e);
    }
    detalle.appendChild(cab);

    const { pantalla, mesa } = escenario(t, textos);
    detalle.appendChild(pantalla);

    sobreLaMesa.innerHTML = '';
    const resumen = enIdioma(t.resumen);
    if (resumen){
      const p = document.createElement('p');
      p.className = 'mesa-trabajo__resumen';
      p.textContent = resumen;
      sobreLaMesa.appendChild(p);
    }
    if (mesa && mesa.children.length) sobreLaMesa.appendChild(mesa);
    // la etiqueta del lateral de la caja; en las series sale con los móviles
    if (t.presentacion !== 'serie'){
      const fichaCaja = etiquetaContenido(t.contenido, textos);
      if (fichaCaja) sobreLaMesa.appendChild(fichaCaja);
    }

    lateral.querySelectorAll('.mac__archivo').forEach(b => {
      b.setAttribute('aria-current', String(b.dataset.trabajo === t.id));
    });

    document.querySelector('.mac__principal').scrollTop = 0;
    if (!conAnimacion) return;
    if (t.presentacion === 'serie'){
      // la miniatura vuela al móvil de la muñeca y se abre la serie
      abrirSerie(t, textos, origen);
    } else {
      // la miniatura vuela en arco hasta el centro de la pantalla y el
      // trabajo se abre desde ahí
      detalle.style.opacity = '0';
      volarEnArco(miniaturaDe(t), origen, document.querySelector('.mac__principal'), { escalaFin: 1.9 })
        .then(() => {
          detalle.style.opacity = '';
          // y se abre desde el centro, donde ha aterrizado
          detalle.animate([{ opacity: 0, transform: 'scale(.82)', filter: 'blur(4px)' },
                           { opacity: 1, transform: 'none', filter: 'blur(0)' }],
                          { duration: 380, easing: 'cubic-bezier(.22,.8,.3,1)' });
        });
    }
  }

  function deLaDireccion(){
    const m = location.hash.match(/^#trabajos\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  caja.appendChild(portatil);
  const sobreLaMesa = document.createElement('div');
  sobreLaMesa.className = 'mesa-trabajo';
  caja.appendChild(sobreLaMesa);
  mostrar(deLaDireccion(), false);

  // Un solo oyente para toda la página; se quita al repintar
  if (pintarCarpetas._oyente) window.removeEventListener('hashchange', pintarCarpetas._oyente);
  pintarCarpetas._oyente = () => mostrar(deLaDireccion(), true);
  window.addEventListener('hashchange', pintarCarpetas._oyente);

  const indice = document.querySelector('.indice');
  if (indice) indice.hidden = true;
  precargarSerie();
  return [];
}

/* ═══════════ La muñeca y el scroll ═══════════

   Se guía por CUÁNTO se ha bajado, no por los bloques de texto: hay
   páginas sin bloques («Mis trabajos») y otras con pocos («Mi vida»),
   y así la muñeca se quedaba casi siempre en la misma postura. */
function seguirElScroll(figura, totalParadas){
  const bloques = [...document.querySelectorAll('.bloque')];
  const enlaces = [...document.querySelectorAll('.indice a')];
  // En «Mis trabajos» la muñeca se queda siempre a la derecha: a la
  // izquierda se pone justo encima de la columna de carpetas y no se
  // lee ninguna. Ahí ya cambia de postura al pasar por cada trabajo.
  const soloDerecha = document.body.dataset.pagina === 'trabajos';

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

  let pedido = false;
  function mirar(){
    pedido = false;
    const alto = document.documentElement.scrollHeight - window.innerHeight;
    const avance = alto > 40 ? Math.min(1, Math.max(0, window.scrollY / alto)) : 0;
    const parada = Math.min(totalParadas - 1, Math.floor(avance * totalParadas));
    figura.irA(parada);
    // desliza a su ritmo dentro de la parada (la profundidad, figure.js)
    figura.deslizar(avance * totalParadas - parada - 0.5, alto / totalParadas);
    // el texto se aparta al lado contrario de donde está la muñeca
    document.querySelector('.pagina')?.setAttribute(
      'data-lado', (!soloDerecha && figura.sitioDe(parada) === 'izquierda') ? 'izquierda' : 'derecha');

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

  // En páginas que apenas se bajan (Mis trabajos), la muñeca se gira
  // al pasar el ratón por cada trabajo.
  document.querySelectorAll('[data-parada]').forEach(el => {
    el.addEventListener('pointerenter', () => figura.irA(+el.dataset.parada));
    el.addEventListener('focus', () => figura.irA(+el.dataset.parada));
  });

  window.addEventListener('scroll', () => {
    if (!pedido){ pedido = true; requestAnimationFrame(mirar); }
  }, { passive: true });
  window.addEventListener('resize', () => { figura.recolocar(); mirar(); }, { passive: true });
  mirar();
}

/* Experiencia: la muñeca del HTML (.aterrizaje) aguanta hasta que
   la transición de entrada ha terminado y la de la ruta está pintada;
   entonces se cambian sin que se note. */
function relevarAterrizaje(){
  const puesta = document.querySelector('.aterrizaje');
  if (!puesta) return;
  const deVerdad = document.querySelector('.b-ruta__caminante');
  if (!deVerdad){ puesta.remove(); return; }
  deVerdad.style.visibility = 'hidden';
  setTimeout(() => { deVerdad.style.visibility = ''; puesta.remove(); },
             Math.max(0, 950 - performance.now()));
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
  // En Experiencia la muñeca YA está en la página: es el punto que
  // recorre la ruta. Si además saliera la grande fija a un lado,
  // habría dos muñecas a la vez.
  if (seccion === 'experiencia') figura.ocultar();
  else figura.mostrar(seccion, textos['figura.' + seccion] || '');

  try {
    const datos = await cargarContenido(seccion);
    const dibujar = t => {
      const r = datos.vista === 'carpetas' ? pintarCarpetas(datos, t) : pintar(datos, t);
      // las animaciones se montan DESPUÉS de pintar: antes no hay
      // nada que medir
      animarBloques(document);
      return r;
    };
    dibujar(textos);
    relevarAterrizaje();
    seguirElScroll(figura, figura.cuantasParadas());
    document.addEventListener('idioma:cambiado', e => {
      dibujar(e.detail.textos);
      figura.el.alt = e.detail.textos['figura.' + seccion] || '';
    });
  } catch (e) {
    console.error(e);
  }

  // la cajita de abajo a la derecha: abrir otro apartado con su caja
  iniciarEstante(seccion, textos);

  document.body.dataset.listo = 'true';
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', iniciar)
  : iniciar();
