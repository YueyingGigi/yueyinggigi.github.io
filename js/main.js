/* ─────────────────────────────────────────────────────────────
   main.js — arranque de la página.
   Etapa 1: idioma, barra, menú del móvil y colocación de la tapa.
   El desembalaje y las ventanas llegan en las etapas 2 y 5.
   ───────────────────────────────────────────────────────────── */

import { iniciarIdioma } from './i18n.js';

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
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
  // al volver al escritorio, que no quede el panel abierto
  matchMedia('(min-width: 901px)').addEventListener('change', cerrar);
}

/* ── Colocación de la tapa: ?tapa=a | b | c ──
   Provisional: sirve para que Gigi compare las tres. Cuando elija una,
   se deja fija en el HTML y se borra esto. */
function colocacionTapa(){
  const mesa = document.querySelector('[data-tapa]');
  if (!mesa) return;
  const pedida = new URLSearchParams(location.search).get('tapa');
  if (['a', 'b', 'c'].includes(pedida)) mesa.dataset.tapa = pedida;
}

/* ── Las cajas todavía no abren nada (etapa 2) ── */
function cajasProvisionales(){
  document.querySelectorAll('.caja').forEach(caja => {
    caja.addEventListener('click', () => {
      console.log('Caja:', caja.dataset.seccion, '— la ventana llega en la etapa 2');
    });
  });
}

async function iniciar(){
  colocacionTapa();
  barraAlBajar();
  menuMovil();
  cajasProvisionales();
  try {
    await iniciarIdioma();
  } catch (e) {
    console.error('No se han podido cargar los textos:', e);
  }
  document.body.dataset.listo = 'true';
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', iniciar)
  : iniciar();
