/* ─────────────────────────────────────────────────────────────
   main.js — la mesa (index.html).

   Aquí solo pasan tres cosas: elegir idioma, abrir una caja y entrar
   en la página de ese apartado. El contenido de cada apartado vive en
   su propia página.
   ───────────────────────────────────────────────────────────── */

import { iniciarIdioma } from './i18n.js';
import { Figura } from './figure.js';
import { abrirCaja } from './unbox.js';
import { estaAbierta } from './coleccion.js';
import { sonidoEncendido, cambiarSonido } from './sound.js';
import { iniciarBarra } from './chrome.js';

/* Las cajas que ya se abrieron se quedan abiertas: ese es todo el
   "progreso" que hay. Sin contadores (ver js/coleccion.js). */
function marcarCajasAbiertas(){
  document.querySelectorAll('.caja').forEach(caja => {
    if (estaAbierta(caja.dataset.seccion)) caja.dataset.abierta = 'true';
  });
}

async function iniciar(){
  iniciarBarra();

  let textos = {};
  try { textos = await iniciarIdioma(); }
  catch (e) { console.error('No se han podido cargar los textos:', e); }

  marcarCajasAbiertas();

  const figura = new Figura(document.querySelector('img.figura'));

  document.querySelectorAll('.caja').forEach(caja => {
    caja.addEventListener('click', () => {
      if (caja.dataset.abriendo === 'true') return;
      const s = caja.dataset.seccion;
      abrirCaja(caja, s, figura, textos, `${s}.html`);
    });
  });

  // si cambia el idioma con la página puesta, los textos ya se repintan
  // solos; aquí no hay nada más que hacer.
  document.body.dataset.listo = 'true';
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', iniciar)
  : iniciar();
