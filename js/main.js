/* ─────────────────────────────────────────────────────────────
   main.js — la mesa (index.html).

   Aquí solo pasan tres cosas: elegir idioma, abrir una caja y entrar
   en la página de ese apartado. El contenido de cada apartado vive en
   su propia página.
   ───────────────────────────────────────────────────────────── */

import { iniciarIdioma } from './i18n.js';
import { Figura } from './figure.js';
import { abrirCaja } from './unbox.js';
import { iniciarBarra } from './chrome.js';
import { iniciarMano } from './hand.js';
import { montarEscena } from './escena.js';

async function iniciar(){
  iniciarBarra();

  let textos = {};
  try { textos = await iniciarIdioma(); }
  catch (e) { console.error('No se han podido cargar los textos:', e); }

  // la mesa en 3D y el plano de entrada (docs/HOME-3D.md)
  const escena = montarEscena(document.querySelector('.mesa'), textos);

  iniciarMano(document.querySelector('.mesa'));

  const figura = new Figura(document.querySelector('img.figura'));

  document.querySelectorAll('.caja').forEach(caja => {
    caja.addEventListener('click', async () => {
      if (caja.dataset.abriendo === 'true') return;
      // si el plano de entrada aún va, primero se termina (~0,35 s)
      if (escena) await escena.terminar();
      const s = caja.dataset.seccion;
      // la cámara se pone encima de esa caja mientras las manos llegan
      abrirCaja(caja, s, figura, textos, `${s}.html`, { enfocar: c => escena?.enfocar(c) });
    });
  });

  // si cambia el idioma con la página puesta, los textos ya se repintan
  // solos; aquí no hay nada más que hacer.
  document.body.dataset.listo = 'true';
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', iniciar)
  : iniciar();
