/* ─────────────────────────────────────────────────────────────
   chrome.js — lo que llevan todas las páginas por igual:
   la barra de arriba, el menú del móvil y el botón de silencio.
   ───────────────────────────────────────────────────────────── */

import { sonidoEncendido, cambiarSonido } from './sound.js';

function barraAlBajar(){
  const barra = document.querySelector('.barra');
  if (!barra) return;
  const mirar = () => barra.classList.toggle('pegada', window.scrollY > 4);
  mirar();
  window.addEventListener('scroll', mirar, { passive: true });
}

function menuMovil(){
  const boton = document.querySelector('.barra__hamburguesa');
  const panel = document.getElementById('panel-movil');
  if (!boton || !panel) return;

  const cerrar = () => {
    panel.dataset.abierto = 'false';
    boton.setAttribute('aria-expanded', 'false');
  };
  boton.addEventListener('click', () => {
    const abierto = panel.dataset.abierto === 'true';
    panel.dataset.abierto = String(!abierto);
    boton.setAttribute('aria-expanded', String(!abierto));
  });
  panel.addEventListener('click', e => { if (e.target.closest('a')) cerrar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
  matchMedia('(min-width: 901px)').addEventListener('change', cerrar);
}

function botonSonido(){
  const b = document.querySelector('.sonido');
  if (!b) return;
  b.setAttribute('aria-pressed', String(sonidoEncendido()));
  b.addEventListener('click', () => {
    const nuevo = b.getAttribute('aria-pressed') !== 'true';
    cambiarSonido(nuevo);
    b.setAttribute('aria-pressed', String(nuevo));
  });
}

export function iniciarBarra(){
  barraAlBajar();
  menuMovil();
  botonSonido();
}
