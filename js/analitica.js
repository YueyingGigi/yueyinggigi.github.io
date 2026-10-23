/* ─────────────────────────────────────────────────────────────
   analitica.js — estadísticas (Google Tag Manager → GA4) con permiso.

   · El código de Google Tag Manager (GTM-5FHXS6Q2) va escrito en el
     <head> de cada página, junto con el permiso por defecto (Consent
     Mode v2: sin cookies de estadística hasta que la visita acepte).
     Este archivo NO carga GTM: solo pone el aviso, el enlace a
     privacidad y los eventos. En una página sin GTM no hace nada.
   · Solo si la visita pulsa «Aceptar» se permiten las cookies de
     estadística (analytics_storage). La publicidad, nunca.
   · El aviso sale abajo la primera vez; la respuesta se recuerda en el
     navegador (gigi.cookies). Se puede cambiar en privacidad.html.
   · Lo que se cuenta, como eventos en el dataLayer (en GTM, una sola
     etiqueta de evento de GA4 los manda todos; ver docs):
       cv_descarga        idioma, archivo
       caja_abierta       seccion
       formulario_enviado (Colabora conmigo)
       clic_red           red (tiktok, instagram, linkedin, rednote)
       idioma_cambiado    idioma
   ───────────────────────────────────────────────────────────── */

const LLAVE = 'gigi.cookies';                  // 'si' | 'no'
window.dataLayer = window.dataLayer || [];
function gtag(){ window.dataLayer.push(arguments); }

const leer = () => { try { return localStorage.getItem(LLAVE); } catch (e) { return null; } };
const guardar = v => { try { localStorage.setItem(LLAVE, v); } catch (e) { /* da igual */ } };

const permiso = si => ({
  analytics_storage: si ? 'granted' : 'denied',
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
});

const TEXTOS = {
  es: { frase: 'Uso cookies de Google Analytics para saber cómo se usa esta web, solo si aceptas.',
        si: 'Aceptar', no: 'Rechazar', mas: 'Más información' },
  en: { frase: 'I use Google Analytics cookies to see how this site is used, only if you accept.',
        si: 'Accept', no: 'Decline', mas: 'More info' },
  zh: { frase: '本网站用 Google Analytics 的 cookie 了解访问情况，只有你同意才会启用。',
        si: '接受', no: '拒绝', mas: '了解更多' }
};
const idioma = () => {
  const l = (document.documentElement.lang || 'es').slice(0, 2);
  return TEXTOS[l] ? l : 'es';
};

function aviso(){
  if (document.querySelector('.cookies')) return;
  const caja = document.createElement('div');
  caja.className = 'cookies';
  caja.setAttribute('role', 'region');
  caja.setAttribute('aria-label', 'Cookies');
  const pintar = () => {
    const t = TEXTOS[idioma()];
    caja.innerHTML = `
      <p class="cookies__frase"></p>
      <div class="cookies__botones">
        <button type="button" class="cookies__boton" data-r="no"></button>
        <button type="button" class="cookies__boton" data-r="si"></button>
      </div>
      <a class="cookies__mas" href="privacidad.html"></a>`;
    caja.querySelector('.cookies__frase').textContent = t.frase;
    caja.querySelector('[data-r="no"]').textContent = t.no;
    caja.querySelector('[data-r="si"]').textContent = t.si;
    caja.querySelector('.cookies__mas').textContent = t.mas;
  };
  pintar();
  document.addEventListener('idioma:cambiado', pintar);
  caja.addEventListener('click', e => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    const si = b.dataset.r === 'si';
    guardar(si ? 'si' : 'no');
    gtag('consent', 'update', permiso(si));
    document.removeEventListener('idioma:cambiado', pintar);
    caja.remove();
  });
  document.body.appendChild(caja);
}

/* Al final de cada apartado, un enlace discreto a privacidad y cookies
   (la portada es una sola pantalla: allí está en el aviso). */
const PIE = { es: 'Privacidad y cookies', en: 'Privacy and cookies', zh: '隐私与 cookie' };
function pie(){
  const main = document.querySelector('body[data-pagina] main');
  if (!main || document.querySelector('.pie-legal')) return;
  const p = document.createElement('p');
  p.className = 'pie-legal';
  p.innerHTML = '<a href="privacidad.html"></a>';
  const poner = () => { p.firstChild.textContent = PIE[idioma()]; };
  poner();
  document.addEventListener('idioma:cambiado', poner);
  main.after(p);
}

/* privacidad.html: «cambiar mi respuesta» */
export function preguntarOtraVez(){
  try { localStorage.removeItem(LLAVE); } catch (e) { /* da igual */ }
  gtag('consent', 'update', permiso(false));
  aviso();
}

function contar(){
  const empujar = (event, datos = {}) => window.dataLayer.push({ event, ...datos });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (/assets\/cv\//.test(href)) return empujar('cv_descarga', { idioma: idioma(), archivo: href.split('/').pop() });
    const red = /tiktok\.com/.test(href) ? 'tiktok' : /instagram\.com/.test(href) ? 'instagram'
              : /linkedin\.com/.test(href) ? 'linkedin' : /xiaohongshu\.com|xhslink/.test(href) ? 'rednote' : null;
    if (red) empujar('clic_red', { red });
  }, true);
  document.addEventListener('caja:abriendo', e => empujar('caja_abierta', { seccion: e.detail?.caja?.dataset?.seccion || '' }));
  document.addEventListener('formulario:enviado', () => empujar('formulario_enviado'));
  // (solo cuando la visita pulsa un idioma; al cargar la página también se «cambia», y eso no cuenta)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-idioma]');
    if (b) empujar('idioma_cambiado', { idioma: b.dataset.idioma });
  });
}

function iniciar(){
  // Solo si la página lleva el código de Google Tag Manager (en su <head>)
  const conGtm = (window.dataLayer || []).some(x => x && x.event === 'gtm.js');
  if (!conGtm) return;
  contar();
  pie();
  const respuesta = leer();
  if (respuesta !== 'si' && respuesta !== 'no') aviso();
}

iniciar();
