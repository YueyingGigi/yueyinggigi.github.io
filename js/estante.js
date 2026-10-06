/* ─────────────────────────────────────────────────────────────
   estante.js — «otra caja», en todos los apartados.

   Antes, para abrir otro apartado CON su caja había que volver a la
   mesa. Ahora cada apartado lleva abajo a la derecha una cajita; al
   pulsarla se abre un cajón con las cinco cajas (la de este apartado
   ya abierta) y la que se elija se abre aquí mismo, con el mismo
   revelado de la mesa, y se pasa a su página (Gigi, 2026-10-05).

   La barra de arriba sigue llevando a cualquier apartado SIN
   animación, para quien tenga prisa.
   ───────────────────────────────────────────────────────────── */

import { Figura } from './figure.js';
import { abrirCaja } from './unbox.js';

const CAJAS = [
  { s: 'sobre-mi',    icono: 'i-marco',   color: '--lavanda',   hondo: '--lavanda-hondo' },
  { s: 'experiencia', icono: 'i-sello',   color: '--rojo-caja', hondo: '--rojo-caja-hondo',
    etiqueta: '--rojo-sobre-blanco', tinta: '#fff' },
  { s: 'trabajos',    icono: 'i-movil',   color: '--amarillo',  hondo: '--amarillo-hondo' },
  { s: 'vida',        icono: 'i-fallera', color: '--azul-mar',  hondo: '--azul-mar-hondo' },
  { s: 'colabora',    icono: 'i-regalo',  color: '--rosa',      hondo: '--rosa-hondo' }
];

/* La misma caja de la mesa (css/caja.css), en pequeño */
function caja(c, textos, actual){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'caja';
  b.dataset.seccion = c.s;
  let estilo = `--color:var(${c.color}); --color-hondo:var(${c.hondo})`;
  if (c.etiqueta) estilo += `; --color-etiqueta:var(${c.etiqueta}); --tinta-etiqueta:${c.tinta}`;
  b.setAttribute('style', estilo);
  const nombre = textos['nav.' + c.s] || c.s;
  b.innerHTML = `
    <span class="caja__sombra" aria-hidden="true"></span>
    <img class="caja__dentro" src="assets/boxes/caja-abierta.webp" width="682" height="800" alt="">
    <img class="caja__foto" src="assets/boxes/caja-cerrada.webp" width="777" height="800" alt="">
    <span class="caja__tapa" aria-hidden="true">
      <span class="caja__precinto"></span>
      <span class="caja__etiqueta"></span>
      <svg class="caja__icono" viewBox="0 0 24 24"><use href="#${c.icono}"></use></svg>
      <svg class="sello caja__sello" viewBox="0 0 100 100"><use href="#s-sello"></use></svg>
    </span>`;
  b.querySelector('.caja__etiqueta').textContent = nombre;
  if (c.s === actual){
    // la de este apartado: ya abierta, no se puede volver a abrir
    b.dataset.abierta = 'true';
    b.setAttribute('aria-disabled', 'true');
    b.setAttribute('aria-label', `${nombre} — ${textos['estante.aqui'] || ''}`);
  } else {
    b.setAttribute('aria-label', (textos['caja.abrir'] || '{seccion}').replace('{seccion}', nombre));
  }
  return b;
}

function pintar(raiz, textos, actual){
  raiz.querySelector('.estante__boton').setAttribute('aria-label', textos['estante.abrir'] || '');
  raiz.querySelector('.estante__pista').textContent = textos['estante.abrir'] || '';
  raiz.querySelector('.estante__titulo').textContent = textos['estante.titulo'] || '';
  raiz.querySelector('.estante__cerrar').setAttribute('aria-label', textos['estante.cerrar'] || '');
  raiz.querySelector('.estante__cajon').setAttribute('aria-label', textos['estante.titulo'] || '');
  const ul = raiz.querySelector('.estante__cajas');
  ul.innerHTML = '';
  CAJAS.forEach(c => {
    const li = document.createElement('li');
    li.appendChild(caja(c, textos, actual));
    if (c.s === actual){
      const aqui = document.createElement('span');
      aqui.className = 'estante__aqui';
      aqui.textContent = textos['estante.aqui'] || '';
      li.appendChild(aqui);
    }
    ul.appendChild(li);
  });
}

export function iniciarEstante(actual, textosIniciales){
  let textos = textosIniciales;

  // El velo y la muñeca del revelado, como en la mesa
  if (!document.querySelector('.revelado')){
    document.body.insertAdjacentHTML('beforeend', `
      <div class="revelado" hidden aria-hidden="true">
        <div class="revelado__destello"></div>
        <p class="revelado__nombre"></p>
      </div>
      <img class="figura-revelado" src="" alt="" hidden>`);
  }
  const figura = new Figura(document.querySelector('.figura-revelado'));

  const raiz = document.createElement('div');
  raiz.className = 'estante';
  raiz.dataset.tapa = 'a';               // la misma colocación de tapa que la mesa
  raiz.innerHTML = `
    <div class="estante__cajon" role="dialog" hidden>
      <div class="estante__cabeza">
        <p class="estante__titulo"></p>
        <button class="estante__cerrar" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <ul class="estante__cajas"></ul>
    </div>
    <button class="estante__boton" type="button" aria-expanded="false">
      <img src="assets/boxes/caja-cerrada.webp" alt="" width="777" height="800">
      <svg class="sello" viewBox="0 0 100 100" aria-hidden="true"><use href="#s-sello"></use></svg>
    </button>
    <span class="estante__pista" aria-hidden="true"></span>`;
  document.body.appendChild(raiz);

  const boton = raiz.querySelector('.estante__boton');
  const cajon = raiz.querySelector('.estante__cajon');
  pintar(raiz, textos, actual);

  const abrir = () => {
    cajon.hidden = false;
    requestAnimationFrame(() => { raiz.dataset.abierto = 'true'; });
    boton.setAttribute('aria-expanded', 'true');
    cajon.querySelector('.caja:not([aria-disabled])')?.focus();
  };
  const cerrar = (devolverFoco = true) => {
    raiz.dataset.abierto = 'false';
    boton.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (raiz.dataset.abierto !== 'true') cajon.hidden = true; }, 260);
    if (devolverFoco) boton.focus();
  };

  boton.addEventListener('click', () => raiz.dataset.abierto === 'true' ? cerrar() : abrir());
  raiz.querySelector('.estante__cerrar').addEventListener('click', () => cerrar());
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && raiz.dataset.abierto === 'true') cerrar(); });
  document.addEventListener('pointerdown', e => {
    if (raiz.dataset.abierto === 'true' && !raiz.contains(e.target)) cerrar(false);
  });

  cajon.addEventListener('click', e => {
    const c = e.target.closest('.caja');
    if (!c || c.getAttribute('aria-disabled') === 'true' || c.dataset.abriendo === 'true') return;
    // el cajón se queda abierto mientras se abre la caja: se ve
    // cómo se rompe el precinto y se levanta la tapa
    raiz.dataset.abriendo = 'true';
    abrirCaja(c, c.dataset.seccion, figura, textos, `${c.dataset.seccion}.html`);
  });

  document.addEventListener('idioma:cambiado', e => {
    textos = e.detail.textos;
    pintar(raiz, textos, actual);
  });
}
