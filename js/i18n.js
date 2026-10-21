/* ─────────────────────────────────────────────────────────────
   i18n.js — cambiar de idioma.

   Cómo funciona:
   · En el HTML, cualquier elemento con  data-t="clave"  recibe el texto
     de esa clave. Con  data-t-attr="aria-label:clave"  se traduce un atributo.
   · Los textos están en i18n/es.json, en.json y zh.json.
   · El idioma elegido se guarda en el navegador (localStorage) para la
     próxima visita. Si el navegador no deja guardar, no pasa nada.
   ───────────────────────────────────────────────────────────── */

const IDIOMAS = ['es', 'en', 'zh'];
const POR_DEFECTO = 'es';
const LLAVE = 'gigi.idioma';

const cache = {};
let actual = POR_DEFECTO;

/* ── Guardar y leer la preferencia sin que falle en modo privado ── */
function guardar(idioma){
  try { localStorage.setItem(LLAVE, idioma); } catch (e) { /* da igual */ }
}
function leerGuardado(){
  try { return localStorage.getItem(LLAVE); } catch (e) { return null; }
}

/* ── Qué idioma toca: ?lang= manda, luego lo que eligió la persona,
      y si no, español. NO se mira el idioma del navegador: el sitio es
      para empresas españolas y el español es el idioma por defecto
      (CLAUDE.md § 5). ── */
function elegirIdioma(){
  const pedido = new URLSearchParams(location.search).get('lang');
  if (IDIOMAS.includes(pedido)) return pedido;

  const guardado = leerGuardado();
  if (IDIOMAS.includes(guardado)) return guardado;

  return POR_DEFECTO;
}

/* El CV de cada idioma lo elige Gigi en el panel (content/cv.json).
   Si el archivo no se puede leer o un idioma está vacío, vale el de
   i18n/*.json («cv.archivo»). Se lee una sola vez por visita. */
let cvs = null;
const leerCvs = () => cvs || (cvs = fetch('content/cv.json', { cache: 'no-cache' })
  .then(r => (r.ok ? r.json() : {}))
  .catch(() => ({})));

async function cargar(idioma){
  if (cache[idioma]) return cache[idioma];
  const [r, cv] = await Promise.all([fetch(`i18n/${idioma}.json`), leerCvs()]);
  if (!r.ok) throw new Error(`No se ha podido cargar i18n/${idioma}.json`);
  cache[idioma] = await r.json();
  if (typeof cv[idioma] === 'string' && cv[idioma].trim()) cache[idioma]['cv.archivo'] = cv[idioma].trim();
  return cache[idioma];
}

/* ── Rellena {seccion} y demás huecos ── */
function rellenar(plantilla, datos){
  if (!datos) return plantilla;
  return plantilla.replace(/\{(\w+)\}/g, (_, k) => (k in datos ? datos[k] : `{${k}}`));
}

/* Datos para rellenar los huecos de una plantilla.
   Si el elemento tiene data-seccion, {seccion} se traduce solo:
   así "Abrir: Sobre mí" pasa a "Open: About me" al cambiar de idioma. */
function datosDe(el, textos){
  const datos = el.dataset.tDatos ? JSON.parse(el.dataset.tDatos) : {};
  if (el.dataset.seccion) datos.seccion = textos['nav.' + el.dataset.seccion] || el.dataset.seccion;
  return datos;
}

function aplicar(textos){
  // Texto de los elementos
  document.querySelectorAll('[data-t]').forEach(el => {
    const clave = el.dataset.t;
    if (!(clave in textos)) { console.warn('Falta la clave:', clave); return; }
    el.textContent = rellenar(textos[clave], datosDe(el, textos));
  });

  // Atributos:  data-t-attr="aria-label:caja.abrir"  (varios separados por coma)
  document.querySelectorAll('[data-t-attr]').forEach(el => {
    el.dataset.tAttr.split(',').forEach(par => {
      const [attr, clave] = par.split(':').map(s => s.trim());
      if (!(clave in textos)) { console.warn('Falta la clave:', clave); return; }
      el.setAttribute(attr, rellenar(textos[clave], datosDe(el, textos)));
    });
  });

  // Cabecera del documento
  document.documentElement.lang = textos['html.lang'];
  // (cada apartado, su título y su descripción; la portada, los generales)
  const pagina = document.body.dataset.pagina;
  document.title = pagina && textos['nav.' + pagina]
    ? `${textos['nav.' + pagina]} · Gigi — Yueying Guan`
    : textos['doc.titulo'];
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = (pagina && textos['doc.descripcion.' + pagina]) || textos['doc.descripcion'];

  // Botón del CV: cada idioma descarga su PDF
  document.querySelectorAll('[data-cv]').forEach(a => { a.href = textos['cv.archivo']; });
}

function marcarBotones(idioma){
  document.querySelectorAll('[data-idioma]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.idioma === idioma));
  });
}

export async function cambiarIdioma(idioma, guardarlo = true){
  if (!IDIOMAS.includes(idioma)) idioma = POR_DEFECTO;
  const textos = await cargar(idioma);
  actual = idioma;
  aplicar(textos);
  marcarBotones(idioma);
  if (guardarlo) guardar(idioma);
  document.dispatchEvent(new CustomEvent('idioma:cambiado', { detail: { idioma, textos } }));
  return textos;
}

export function idiomaActual(){ return actual; }

export async function iniciarIdioma(){
  const textos = await cambiarIdioma(elegirIdioma(), false);

  document.querySelectorAll('[data-idioma]').forEach(boton => {
    boton.addEventListener('click', () => cambiarIdioma(boton.dataset.idioma));
  });
  return textos;
}
