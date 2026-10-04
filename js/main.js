/* ─────────────────────────────────────────────────────────────
   main.js — arranque de la página.
   Etapa 1: idioma, barra y menú del móvil.
   Etapa 2: ventanas y enlaces directos.
   El desembalaje y la mano llegan en la etapa 5.
   ───────────────────────────────────────────────────────────── */

import { iniciarIdioma } from './i18n.js';
import { alCambiarRuta } from './router.js';
import { iniciarVentanas, sincronizarConRuta, refrescarIdioma, estaAbierta } from './window.js';

/* ── La barra se marca con una línea al bajar ── */
function barraAlBajar(){
  const barra = document.querySelector('.barra');
  if (!barra) return;
  const mirar = () => barra.classList.toggle('pegada', window.scrollY > 4);
  mirar();
  window.addEventListener('scroll', mirar, { passive: true });
}

/* ── Menú desplegable del móvil ── */
function menuMovil(){
  const boton = document.querySelector('.barra__hamburguesa');
  const panel = document.getElementById('panel-movil');
  if (!boton || !panel) return;

  const cerrar = () => {
    panel.dataset.abierto = 'false';
    boton.setAttribute('aria-expanded', 'false');
  };
  const abrir = () => {
    panel.dataset.abierto = 'true';
    boton.setAttribute('aria-expanded', 'true');
  };

  boton.addEventListener('click', () => {
    panel.dataset.abierto === 'true' ? cerrar() : abrir();
  });
  panel.addEventListener('click', e => { if (e.target.closest('a')) cerrar(); });
  // Esc cierra el menú solo si no hay una ventana abierta (esa tiene prioridad)
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !estaAbierta()) cerrar(); });
  matchMedia('(min-width: 901px)').addEventListener('change', cerrar);
}

async function iniciar(){
  barraAlBajar();
  menuMovil();

  let textos = {};
  try {
    textos = await iniciarIdioma();
  } catch (e) {
    console.error('No se han podido cargar los textos:', e);
  }

  iniciarVentanas(textos);
  alCambiarRuta(sincronizarConRuta);

  // Si se cambia de idioma con una ventana abierta, se vuelve a pintar
  document.addEventListener('idioma:cambiado', e => refrescarIdioma(e.detail.textos));

  document.body.dataset.listo = 'true';
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', iniciar)
  : iniciar();
