/* ─────────────────────────────────────────────────────────────
   window.js — abrir, cerrar y rellenar la ventana.

   Accesibilidad (DESIGN § 11):
   · La ventana es role="dialog" aria-modal="true".
   · Al abrir, el foco entra en la ventana; el tabulador no se escapa fuera.
   · Al cerrar, el foco vuelve a la caja desde la que se abrió.
   · Se cierra con el punto rojo, con Esc y pinchando fuera.
   ───────────────────────────────────────────────────────────── */

import { leerRuta, escribirRuta } from './router.js';
import { idiomaActual } from './i18n.js';
import { Figura } from './figure.js';
import { abrirCaja, asentarCaja } from './unbox.js';
import { sonarCerrar } from './sound.js';

const COLORES = {
  'sobre-mi':   { color: 'var(--lavanda)',   claro: 'var(--lavanda-claro)' },
  'experiencia':{ color: 'var(--rojo-caja)', claro: 'var(--rojo-caja-claro)' },
  'trabajos':   { color: 'var(--amarillo)',  claro: 'var(--amarillo-claro)' },
  'vida':       { color: 'var(--azul-mar)',  claro: 'var(--azul-mar-claro)' },
  'colabora':   { color: 'var(--rosa)',      claro: 'var(--rosa-claro)' }
};

/* Qué forma toma cada apartado (decidido con Gigi, 2026-10-04):
   solo "Mis trabajos" es ventana de Mac, porque es el único con
   carpetas de verdad. Los demás son la hoja que viene en la caja. */
const FORMAS = {
  'sobre-mi': 'ficha', 'experiencia': 'ficha', 'trabajos': 'ventana',
  'vida': 'ficha', 'colabora': 'ficha'
};

const ENFOCABLES = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

const contenidos = {};        // lo ya descargado de content/*.json
let textos = {};              // los textos de interfaz del idioma actual
let abierta = null;           // { seccion, ficha } o null
let quienAbrio = null;        // a dónde devolver el foco al cerrar
let figura = null;            // la muñeca que acompaña al contenido

const velo    = () => document.querySelector('.velo');
const ventana = () => document.querySelector('.ventana');

/* ── Utilidades ── */
const t = (clave, sino = '') => (clave in textos ? textos[clave] : sino);

function enIdioma(obj){
  if (!obj) return '';
  const l = idiomaActual();
  return obj[l] || obj.es || '';
}

async function cargarSeccion(id){
  if (contenidos[id]) return contenidos[id];
  const r = await fetch(`content/${id}.json`);
  if (!r.ok) throw new Error(`No se ha podido cargar content/${id}.json`);
  contenidos[id] = await r.json();
  return contenidos[id];
}

/* ── Pintar el contenido ─────────────────────────────────────── */

function marcaPendiente(){
  const p = document.createElement('p');
  p.className = 'pendiente';
  p.textContent = t('ventana.pendiente', 'Contenido en preparación.');
  return p;
}

/* Lista de apartados de la barra lateral */
function pintarLado(datos, activo){
  const lado = ventana().querySelector('.ventana__lado ul');
  lado.innerHTML = '';
  (datos.apartados || []).forEach((ap, i) => {
    const li = document.createElement('li');
    const b  = document.createElement('button');
    b.type = 'button';
    b.textContent = enIdioma(ap.titulo);
    b.setAttribute('aria-current', String(ap.id === activo || (!activo && i === 0)));
    b.addEventListener('click', () => {
      const destino = ventana().querySelector(`#ap-${CSS.escape(ap.id)}`);
      if (destino) destino.scrollIntoView({ block: 'start' });
      lado.querySelectorAll('button').forEach(x => x.setAttribute('aria-current', 'false'));
      b.setAttribute('aria-current', 'true');
      if (figura) figura.irA(i);          // la muñeca cambia de ángulo y de sitio
    });
    li.appendChild(b);
    lado.appendChild(li);
  });
  lado.closest('.ventana__lado').hidden = !(datos.apartados || []).length;
}

/* Apartados normales, uno detrás de otro */
function pintarApartados(datos){
  const caja = ventana().querySelector('.ventana__contenido');
  caja.innerHTML = '';
  (datos.apartados || []).forEach(ap => {
    const sec = document.createElement('section');
    sec.id = 'ap-' + ap.id;
    const h = document.createElement('h3');
    h.textContent = enIdioma(ap.titulo);
    sec.append(h, marcaPendiente());
    caja.appendChild(sec);
  });
}

/* Vista de carpetas (Mis trabajos) */
function pintarCarpetas(datos){
  const caja = ventana().querySelector('.ventana__contenido');
  caja.innerHTML = '';
  const cont = document.createElement('div');
  cont.className = 'carpetas';

  (datos.carpetas || []).forEach(carpeta => {
    const sec = document.createElement('section');
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
        <svg class="ficha__icono" width="46" height="38" viewBox="0 0 46 38" fill="none"
             stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">
          <path d="M2 7a3 3 0 0 1 3-3h11l4 5h21a3 3 0 0 1 3 3v21a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z"/>
        </svg>
        <span class="ficha__nombre"></span>`;
      b.querySelector('.ficha__nombre').textContent = enIdioma(trabajo.titulo);
      b.addEventListener('click', () => abrir(datos.id, trabajo.id));
      li.appendChild(b);
      ul.appendChild(li);
    });

    sec.append(h, ul);
    cont.appendChild(sec);
  });

  caja.appendChild(cont);
  ventana().querySelector('.ventana__lado').hidden = true;
}

/* Ficha de un trabajo concreto */
function pintarFicha(datos, idFicha){
  const trabajo = (datos.carpetas || [])
    .flatMap(c => c.trabajos)
    .find(x => x.id === idFicha);

  if (!trabajo){ pintarCarpetas(datos); return; }

  const caja = ventana().querySelector('.ventana__contenido');
  caja.innerHTML = '';

  const volver = document.createElement('button');
  volver.type = 'button';
  volver.className = 'volver';
  volver.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6"/></svg><span></span>`;
  volver.querySelector('span').textContent = t('ventana.volver', 'Volver');
  volver.addEventListener('click', () => abrir(datos.id, null));

  const h = document.createElement('h3');
  h.className = 'detalle__titulo';
  h.textContent = enIdioma(trabajo.titulo);

  caja.append(volver, h);

  // Las cuatro partes de una ficha (docs/DESIGN.md § 6)
  ['contexto', 'rol', 'proceso', 'resultado'].forEach(parte => {
    const bloque = document.createElement('div');
    bloque.className = 'detalle__bloque';
    const h4 = document.createElement('h4');
    h4.textContent = t('ficha.' + parte, parte);
    bloque.append(h4, marcaPendiente());
    caja.appendChild(bloque);
  });

  ventana().querySelector('.ventana__lado').hidden = true;
}

/* ── Foco ──
   Solo cuentan los elementos que de verdad se ven: en el móvil los tres
   puntitos están ocultos y el botón de cerrar es otro, así que no sirve
   buscar siempre el mismo. */
function enfocables(){
  return [...ventana().querySelectorAll(ENFOCABLES)].filter(el => el.offsetParent !== null);
}

function atraparTabulador(e){
  if (e.key !== 'Tab') return;
  const lista = enfocables();
  if (!lista.length) return;
  const primero = lista[0], ultimo = lista[lista.length - 1];
  if (e.shiftKey && document.activeElement === primero){ e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && document.activeElement === ultimo){ e.preventDefault(); primero.focus(); }
}

function alPulsarTecla(e){
  if (e.key === 'Escape'){ e.preventDefault(); cerrar(); return; }
  atraparTabulador(e);
}

/* ── Abrir y cerrar ─────────────────────────────────────────── */

export async function abrir(seccion, ficha = null, { desde = null, cambiarRuta = true } = {}){
  const v = ventana(), f = velo();
  if (!v || !COLORES[seccion]) return;

  let datos;
  try { datos = await cargarSeccion(seccion); }
  catch (err){ console.error(err); return; }

  const eraPrimera = !abierta;
  if (desde) quienAbrio = desde;
  if (!quienAbrio) quienAbrio = document.querySelector(`.caja[data-seccion="${seccion}"]`);

  // color y forma del apartado
  v.style.setProperty('--color', COLORES[seccion].color);
  v.style.setProperty('--color-claro', COLORES[seccion].claro);
  v.dataset.forma = FORMAS[seccion] || 'ficha';

  // título
  v.querySelector('.ventana__titulo').textContent = t('nav.' + seccion, seccion);

  // contenido
  if (datos.vista === 'carpetas'){
    ficha ? pintarFicha(datos, ficha) : pintarCarpetas(datos);
  } else {
    pintarLado(datos, null);
    pintarApartados(datos);
  }
  v.querySelector('.ventana__contenido').scrollTop = 0;

  // La muñeca acompaña a la visita. Si ya está puesta (acaba de salir de
  // la caja) no se toca, para no cortar la animación.
  if (figura && !figura.estaVisible()) figura.mostrar(seccion, t('figura.' + seccion, ''));

  abierta = { seccion, ficha };
  if (cambiarRuta) escribirRuta({ seccion, ficha }, eraPrimera);

  if (eraPrimera){
    f.hidden = false; v.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => { f.dataset.abierto = 'true'; v.dataset.abierto = 'true'; });
    document.addEventListener('keydown', alPulsarTecla);
    // el foco entra en la ventana, en el primer elemento que se vea
    const primero = enfocables()[0] || v.querySelector('.ventana__contenido');
    if (primero) primero.focus();
  }
}

export function cerrar({ cambiarRuta = true } = {}){
  const v = ventana(), f = velo();
  if (!v || !abierta) return;

  sonarCerrar();
  v.dataset.abierto = 'false';
  f.dataset.abierto = 'false';
  document.removeEventListener('keydown', alPulsarTecla);
  document.body.style.overflow = '';

  const tiempo = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250;
  setTimeout(() => { v.hidden = true; f.hidden = true; }, tiempo);

  abierta = null;
  if (figura) figura.ocultar();
  asentarCaja(quienAbrio && quienAbrio.classList.contains('caja') ? quienAbrio : null);
  if (cambiarRuta) escribirRuta({ seccion: null }, false);

  if (quienAbrio && document.contains(quienAbrio)) quienAbrio.focus();
  quienAbrio = null;
}

export function estaAbierta(){ return abierta; }

/* Al cambiar de idioma, se vuelve a pintar lo que esté abierto */
export function refrescarIdioma(nuevosTextos){
  textos = nuevosTextos;
  if (abierta) abrir(abierta.seccion, abierta.ficha, { cambiarRuta: false });
}

/* ── Arranque ───────────────────────────────────────────────── */
export function iniciarVentanas(textosIniciales){
  textos = textosIniciales;
  const v = ventana(), f = velo();
  figura = new Figura(document.querySelector('img.figura'));

  v.querySelector('.punto--rojo').addEventListener('click', () => cerrar());
  v.querySelector('.cerrar-movil').addEventListener('click', () => cerrar());
  f.addEventListener('click', () => cerrar());

  // Las cajas de la mesa: primero se abre la caja, después la ventana
  document.querySelectorAll('.caja').forEach(caja => {
    caja.addEventListener('click', async () => {
      if (caja.dataset.abriendo === 'true') return;      // ya está en marcha
      const s = caja.dataset.seccion;
      quienAbrio = caja;
      await abrirCaja(caja, s, figura, t('figura.' + s, ''));
      abrir(s, null, { desde: caja });
    });
  });

  // Los enlaces de la barra y del menú del móvil
  document.querySelectorAll('a[href^="#"]').forEach(enlace => {
    const destino = enlace.getAttribute('href').slice(1);
    if (!(destino in COLORES)) return;
    enlace.addEventListener('click', e => { e.preventDefault(); abrir(destino, null, { desde: enlace }); });
  });

  // Si alguien llega con un enlace directo (#colabora), se abre ya
  const ruta = leerRuta();
  if (ruta.seccion) abrir(ruta.seccion, ruta.ficha, { cambiarRuta: false });
}

/* Botón atrás / adelante del navegador y enlaces pegados */
export function sincronizarConRuta(ruta){
  if (!ruta.seccion){ if (abierta) cerrar({ cambiarRuta: false }); return; }
  if (!abierta || abierta.seccion !== ruta.seccion || abierta.ficha !== ruta.ficha){
    abrir(ruta.seccion, ruta.ficha, { cambiarRuta: false });
  }
}
