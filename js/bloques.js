/* ─────────────────────────────────────────────────────────────
   bloques.js — dibuja el contenido de content/*.json.

   Cada bloque del JSON lleva un "tipo", y aquí hay una función por
   tipo. Así, para añadir contenido nuevo no hace falta tocar el
   código: se escribe en el JSON y ya.

   Tres reglas que no se saltan:

   1. TODO SE VE SIN JAVASCRIPT BONITO. Nada queda escondido
      esperando a que una animación lo descubra. Si algo falla, el
      texto sigue ahí (ESTADO § 4.1).
   2. LOS VÍDEOS SE VEN AQUÍ, no se manda a nadie fuera. Solo salen
      enlaces a TikTok / Instagram / RedNote cuando no tenemos el
      archivo (los ocho de las prácticas y las Fallas).
   3. LOS NÚMEROS SON LOS DE VERDAD. Los de los vídeos externos se
      leyeron de TikTok el 2026-10-05 y están escritos en el JSON.
   ───────────────────────────────────────────────────────────── */

import { idiomaActual } from './i18n.js';
import { montarMesa } from './mesa.js';
import { conGsap, entradaSuave, salvavidas, sinMovimiento } from './anim.js';

/* Coge el texto en el idioma que toca. Acepta "hola" o {es,en,zh}. */
export function enIdioma(obj){
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[idiomaActual()] || obj.es || '';
}

function el(etiqueta, clase, texto){
  const n = document.createElement(etiqueta);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
}

/* ── Números ──
   363400 → «363.400» en español, «363,400» en inglés y «36.3万» en
   chino. En chino los miles no se agrupan de tres en tres: poner
   «363.400» ahí se lee raro. */
function numero(n){
  const idioma = idiomaActual();
  if (idioma === 'zh'){
    if (n >= 10000){
      const w = n / 10000;
      return (w >= 100 ? Math.round(w) : Math.round(w * 10) / 10) + '万';
    }
    return n.toLocaleString('zh-CN');
  }
  // useGrouping:'always' porque en español, por defecto, los números
  // de cuatro cifras salen sin punto («5665» en vez de «5.665») y al
  // lado de «35.000» parecía un error.
  return n.toLocaleString(idioma === 'en' ? 'en-US' : 'es-ES', { useGrouping: 'always' });
}

/* ── Enlaces que se van fuera ──
   La plataforma se saca de la URL: así basta con pegar el enlace en
   el JSON y no hay que escribir a mano de dónde es. */
const PLATAFORMAS = [
  [/tiktok\.com/i,          'tiktok',    'enlace.tiktok'],
  [/instagram\.com/i,       'instagram', 'enlace.instagram'],
  [/xiaohongshu|xhslink/i,  'rednote',   'enlace.rednote']
];

export function dePlataforma(url, declarada){
  if (declarada === 'web')      return { clave: 'web',       texto: 'enlace.web' };
  if (declarada === 'interno')  return { clave: 'interno',   texto: 'enlace.web' };
  for (const [patron, clave, texto] of PLATAFORMAS){
    if (patron.test(url)) return { clave, texto };
  }
  return { clave: declarada || 'web', texto: 'enlace.web' };
}

/* Iconos de línea, dibujados en código como los de las tapas */
const ICONOS = {
  tiktok:    'M14 3v9.6a3.4 3.4 0 1 1-2.6-3.3M14 3c.4 2.4 2 4 4.4 4.2',
  instagram: 'M7 3.5h10A3.5 3.5 0 0 1 20.5 7v10a3.5 3.5 0 0 1-3.5 3.5H7A3.5 3.5 0 0 1 3.5 17V7A3.5 3.5 0 0 1 7 3.5ZM12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4ZM17.2 6.6v.01',
  rednote:   'M4 5.5h16v13H4zM8 9.5v5M8 9.5h2.2a1.4 1.4 0 0 1 0 2.8H8M13 14.5v-5h3',
  web:       'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3.5 9.5h17M3.5 14.5h17M12 3c-2.4 2.3-3.6 5.3-3.6 9s1.2 6.7 3.6 9c2.4-2.3 3.6-5.3 3.6-9S14.4 5.3 12 3Z',
  linkedin:  'M5 9.5v9M5 5.5v.01M10 18.5v-9M10 13.2c0-2 1.3-3.4 3.2-3.4s3.3 1.4 3.3 3.4v5.3',
  correo:    'M3.5 6.5h17v11h-17zM3.5 7l8.5 6 8.5-6',
  cv:        'M12 3.5v11M8 11l4 3.5 4-3.5M4.5 18.5h15',
  interno:   'M5 12h12M13 7l5 5-5 5'
};

function icono(clave){
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', ICONOS[clave] || ICONOS.web);
  svg.appendChild(p);
  return svg;
}

/* Un enlace de los que se abren fuera. Lleva aviso para quien use
   lector de pantalla: si no, el enlace se abre en otra pestaña sin
   avisar y se pierde. */
export function enlaceFuera(url, texto, clavePlataforma, textos){
  const a = el('a', 'enlace-fuera');
  a.href = url;
  const interno = clavePlataforma === 'interno' || url.startsWith('mailto:') || !/^https?:/i.test(url);
  if (!interno){
    a.target = '_blank';
    a.rel = 'noopener';
  }
  a.append(icono(clavePlataforma), el('span', null, texto));
  if (!interno){
    a.appendChild(el('span', 'solo-lectores', ' (' + (textos['enlace.nueva-pestana'] || '') + ')'));
  }
  return a;
}

/* ── Vídeo que se reproduce aquí mismo ──
   preload="metadata" para que la página no se traiga 16 vídeos al
   abrirse; la portada es lo que se ve hasta que alguien le da. */
function crearVideo(datos, textos){
  const fig = el('figure', 'video' + (datos.vertical ? ' video--vertical' : ''));
  const v = document.createElement('video');
  v.controls = true;
  v.preload = 'metadata';
  v.playsInline = true;
  if (datos.portada) v.poster = datos.portada;
  v.src = datos.archivo;
  v.appendChild(document.createTextNode(textos['video.sin-soporte'] || ''));
  const titulo = enIdioma(datos.titulo);
  if (titulo) v.setAttribute('aria-label', titulo);
  fig.appendChild(v);
  const pie = enIdioma(datos.pie) || titulo;
  if (pie) fig.appendChild(el('figcaption', null, pie));
  return fig;
}

/* ═══════════ Fotos a pantalla completa ═══════════
   Un solo <dialog> para toda la página: el navegador ya se encarga
   del foco y de la tecla Esc, así que no hay que reinventarlo. */
let caja = null;
function cajaDeFotos(textos){
  if (caja) return caja;
  caja = document.createElement('dialog');
  caja.className = 'lupa';
  caja.innerHTML = `
    <button class="lupa__cerrar" type="button">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18"/>
      </svg>
    </button>
    <figure class="lupa__marco"><img alt=""><figcaption></figcaption></figure>`;
  const cerrar = caja.querySelector('.lupa__cerrar');
  cerrar.setAttribute('aria-label', textos['foto.cerrar'] || 'Cerrar');
  cerrar.addEventListener('click', () => caja.close());
  // pinchar fuera de la foto también cierra
  caja.addEventListener('click', e => { if (e.target === caja) caja.close(); });
  document.body.appendChild(caja);
  return caja;
}

function abrirFoto(foto, textos){
  const d = cajaDeFotos(textos);
  const img = d.querySelector('img');
  img.src = foto.archivo;
  img.alt = enIdioma(foto.alt);
  d.querySelector('figcaption').textContent = enIdioma(foto.pie);
  d.showModal();
}

/* Una foto con marco de polaroid: borde blanco, más ancho abajo,
   y el pie escrito a mano en ese hueco. */
function polaroid(foto, textos, clase){
  const b = el('button', 'polaroid' + (clase ? ' ' + clase : ''));
  b.type = 'button';
  const img = document.createElement('img');
  img.src = foto.mini || foto.archivo;
  img.alt = enIdioma(foto.alt);
  img.loading = 'lazy';
  img.decoding = 'async';
  b.appendChild(img);
  const pie = enIdioma(foto.pie);
  if (pie) b.appendChild(el('span', 'polaroid__pie', pie));
  b.setAttribute('aria-label', (textos['foto.ampliar'] || '') + ': ' + (enIdioma(foto.alt) || pie));
  b.addEventListener('click', () => abrirFoto(foto, textos));
  return b;
}

/* Dos fotos sobre la mesa. Al pasar el ratón por una, sube encima
   (si estaba debajo) y se acerca: crece un poco con más sombra. Al
   quitar el ratón vuelve a su tamaño. En el móvil, un toque la acerca
   y otro la devuelve.
   El z-index cambia justo a mitad del movimiento, cuando la foto
   está apartada, así no se ve el salto. */
function barajar(fotos){
  const figs = [...fotos.querySelectorAll('.b-portada__foto')];
  if (!figs.length) return;
  let arriba = figs.length - 1;   // al principio la pequeña queda encima
  let moviendo = false;
  const ponerEncima = (n) => figs.forEach((f, m) => f.style.zIndex = m === n ? '3' : '1');
  const subir = (n) => {
    if (figs.length < 2 || n === arriba || moviendo) return;
    moviendo = true;
    const fin = () => { ponerEncima(n); arriba = n; moviendo = false; };
    if (sinMovimiento()){ fin(); return; }
    const sube = figs[n].querySelector('.b-portada__papel');
    const baja = figs[arriba].querySelector('.b-portada__papel');
    const dx = n === 0 ? '-18%' : '22%';
    sube.animate([{ translate: '0 0' }, { translate: `${dx} -8%`, offset: .45 }, { translate: '0 0' }],
                 { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)' });
    baja.animate([{ translate: '0 0' }, { translate: '0 3%', offset: .45 }, { translate: '0 0' }],
                 { duration: 520, easing: 'ease-out' });
    setTimeout(() => ponerEncima(n), 230);
    setTimeout(fin, 530);
  };
  const acercar = (n, si) => {
    figs.forEach((f, m) => { if (m !== n || !si) delete f.dataset.cerca; });
    if (si) figs[n].dataset.cerca = 'true';
  };
  figs.forEach((f, n) => {
    f.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'mouse') return;
      subir(n); acercar(n, true);
    });
    f.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') acercar(n, false); });
    f.addEventListener('pointerup', e => {
      if (e.pointerType === 'mouse') return;
      subir(n); acercar(n, f.dataset.cerca !== 'true');
    });
  });
}

/* ═══════════════════ Un pintor por tipo ═══════════════════ */

const PINTORES = {

  texto(b){
    return el('p', 'b-texto', enIdioma(b.texto));
  },

  /* La frase de Gigi, con la letra manuscrita */
  firma(b){
    return el('p', 'b-firma', enIdioma(b.texto));
  },

  /* Idiomas, dónde vive, formación… */
  datos(b){
    const dl = el('dl', 'b-datos');
    (b.filas || []).forEach(f => {
      dl.appendChild(el('dt', null, enIdioma(f.etiqueta)));
      dl.appendChild(el('dd', null, enIdioma(f.valor)));
    });
    return dl;
  },

  enlaces(b, textos){
    const ul = el('ul', 'b-enlaces');
    (b.enlaces || []).forEach(e => {
      const li = document.createElement('li');
      // "cv" no es una URL: es el PDF del idioma activo
      const url = e.url === 'cv' ? (textos['cv.archivo'] || 'assets/cv/CV-Gigi-ES.pdf') : e.url;
      const a = enlaceFuera(url, enIdioma(e.texto), e.icono || dePlataforma(url, e.icono).clave, textos);
      if (e.url === 'cv'){ a.setAttribute('download', ''); a.removeAttribute('target'); }
      li.appendChild(a);
      ul.appendChild(li);
    });
    return ul;
  },

  video(b, textos){
    return crearVideo(b, textos);
  },

  /* ── La pila de fotos de «Sobre mí» ──
     Van sueltas, giradas y montadas unas sobre otras, como fotos
     tiradas encima de la mesa. El ángulo de cada una se decide aquí
     (no al azar: así no baila en cada recarga) y el CSS lo coloca. */
  'pila-fotos'(b, textos){
    const giros = [-7, 5, -3, 8, -5, 3, -9, 6, -2, 7];
    const caja = el('div', 'b-pila');
    (b.fotos || []).forEach((f, n) => {
      const envoltura = el('div', 'b-pila__hueco');
      envoltura.style.setProperty('--giro', giros[n % giros.length] + 'deg');
      envoltura.style.setProperty('--orden', String(n));
      envoltura.appendChild(polaroid(f, textos));
      caja.appendChild(envoltura);
    });
    return caja;
  },

  /* ── «Mi vida»: la caja volcada y las fotos por la mesa ──
     El movimiento (volcar, arrastrar, ordenar) está en js/mesa.js. */
  'mesa-fotos'(b, textos){
    const caja = el('div', 'b-mesa');
    const tablero = el('div', 'b-mesa__tablero');
    const volcada = document.createElement('img');
    volcada.className = 'b-mesa__caja';
    volcada.src = 'assets/boxes/caja-abierta.webp';
    volcada.alt = '';
    volcada.setAttribute('aria-hidden', 'true');
    tablero.appendChild(volcada);
    tablero.appendChild(el('p', 'b-mesa__nota', textos['mesa.pista'] || ''));
    (b.fotos || []).forEach(f => tablero.appendChild(polaroid(f, textos, 'b-mesa__foto')));
    caja.appendChild(tablero);
    const boton = el('button', 'b-mesa__ordenar', textos['mesa.ordenar'] || '');
    boton.type = 'button';
    caja.appendChild(boton);
    return caja;
  },

  /* ── La rejilla de «Mi vida en España» ──
     Aquí sí van ordenadas, cada una con su etiqueta de afición. */
  'rejilla-fotos'(b, textos){
    const ul = el('ul', 'b-rejilla');
    (b.fotos || []).forEach(f => {
      const li = document.createElement('li');
      li.appendChild(polaroid(f, textos, 'polaroid--recta'));
      ul.appendChild(li);
    });
    return ul;
  },

  'linea-tiempo'(b){
    const ol = el('ol', 'b-tiempo');
    (b.puestos || []).forEach(p => {
      const li = el('li', 'b-tiempo__parada');
      li.appendChild(el('p', 'b-tiempo__fechas', enIdioma(p.fechas)));
      li.appendChild(el('h3', 'b-tiempo__cargo', enIdioma(p.cargo)));
      li.appendChild(el('p', 'b-tiempo__entidad', enIdioma(p.entidad)));
      const detalle = enIdioma(p.detalle);
      if (detalle) li.appendChild(el('p', 'b-tiempo__detalle', detalle));
      if (p.logros && p.logros.length){
        const ul = el('ul', 'b-tiempo__logros');
        p.logros.forEach(l => ul.appendChild(el('li', null, enIdioma(l))));
        li.appendChild(ul);
      }
      ol.appendChild(li);
    });
    return ol;
  },

  lista(b){
    const ul = el('ul', 'b-lista');
    (b.items || []).forEach(i => {
      const li = document.createElement('li');
      li.appendChild(el('p', 'b-lista__titulo', enIdioma(i.titulo)));
      const d = enIdioma(i.detalle);
      if (d) li.appendChild(el('p', 'b-lista__detalle', d));
      ul.appendChild(li);
    });
    return ul;
  },

  /* Capacidad a la izquierda, prueba a la derecha */
  tabla(b){
    const caja = el('div', 'b-tabla');
    (b.filas || []).forEach(f => {
      const fila = el('div', 'b-tabla__fila');
      fila.appendChild(el('p', 'b-tabla__izq', enIdioma(f.izq)));
      fila.appendChild(el('p', 'b-tabla__der', enIdioma(f.der)));
      caja.appendChild(fila);
    });
    return caja;
  },

  etiquetas(b){
    const caja = el('div', 'b-etiquetas');
    (b.grupos || []).forEach(g => {
      const grupo = el('div', 'b-etiquetas__grupo');
      grupo.appendChild(el('p', 'b-etiquetas__titulo', enIdioma(g.titulo)));
      const ul = el('ul', null);
      (g.items || []).forEach(i => ul.appendChild(el('li', null, i)));
      grupo.appendChild(ul);
      caja.appendChild(grupo);
    });
    return caja;
  },

  /* ── El muro de marcas ──
     Las que tienen logo lo llevan en su color; las que no, van en
     texto. Todos se alinean por ALTURA, no por anchura: si no, un
     logo largo y estrecho queda gigante al lado de uno cuadrado. */
  marcas(b){
    const ul = el('ul', 'b-marcas');
    (b.marcas || []).forEach(m => {
      const li = el('li', m.logo ? 'b-marcas__logo' : 'b-marcas__nombre');
      if (m.logo){
        const img = document.createElement('img');
        img.src = m.logo;
        img.alt = m.nombre;
        img.loading = 'lazy';
        li.appendChild(img);
      } else {
        li.textContent = m.nombre;
      }
      ul.appendChild(li);
    });
    return ul;
  },

  cifras(b){
    const ul = el('ul', 'b-cifras');
    (b.cifras || []).forEach(c => {
      const li = document.createElement('li');
      // el número también cambia de idioma: en chino no se separan los
      // miles con punto («9.000» se lee «nueve coma cero»)
      li.appendChild(el('strong', null, enIdioma(c.numero)));
      li.appendChild(el('span', null, enIdioma(c.pie)));
      ul.appendChild(li);
    });
    return ul;
  },

  /* ── El muro de vídeos UGC ──
     Vertical, como se graban y como se ven. Agrupados por sector.
     Sin reproducciones por vídeo: en este apartado el número que
     importa es el de arriba, no el de cada pieza. */
  'muro-videos'(b, textos){
    const caja = el('div', 'b-muro');
    (b.grupos || []).forEach(g => {
      const sec = el('section', 'b-muro__grupo');
      sec.appendChild(el('h3', 'b-muro__titulo', enIdioma(g.titulo)));
      const ul = el('ul', 'b-muro__lista');
      (g.videos || []).forEach(v => {
        const li = el('li', 'tarjeta-video');
        li.appendChild(crearVideo({ ...v, vertical: true, titulo: null, pie: null }, textos));
        const pie = el('div', 'tarjeta-video__pie');
        pie.appendChild(el('p', 'tarjeta-video__titulo', enIdioma(v.titulo)));
        const meta = [];
        if (v.marca)   meta.push(v.marca);
        if (v.formato) meta.push(enIdioma(v.formato));
        if (v.idioma)  meta.push(enIdioma(v.idioma));
        if (v.plataformas) meta.push(v.plataformas.join(' · '));
        pie.appendChild(el('p', 'tarjeta-video__meta', meta.join(' · ')));
        if (v.enlaces && v.enlaces.length){
          const ulE = el('ul', 'tarjeta-video__enlaces');
          v.enlaces.forEach(e => {
            const p = dePlataforma(e.url, e.plataforma);
            const liE = document.createElement('li');
            liE.appendChild(enlaceFuera(e.url, textos[p.texto] || '', p.clave, textos));
            ulE.appendChild(liE);
          });
          pie.appendChild(ulE);
        }
        li.appendChild(pie);
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      caja.appendChild(sec);
    });
    return caja;
  },

  contacto(b, textos){
    const caja = el('div', 'b-contacto');
    caja.appendChild(el('p', null, enIdioma(b.texto)));
    const a = el('a', 'boton', textos['contacto.escribir'] || '');
    a.href = 'mailto:' + b.email;
    caja.appendChild(a);
    caja.appendChild(el('p', 'b-contacto__correo', b.email));
    return caja;
  },

  /* ── La ruta de Chengdu a València (Experiencia) ──

     Vertical (Gigi, 2026-10-05). Antes era un arco horizontal con una
     muñeca de 78 px que no se veía, y al bajar la ruta se iba de la
     pantalla mientras las paradas cambiaban de estilo: dos cosas
     moviéndose a la vez que no se entendían.

     Ahora: una línea a la izquierda, de Chengdu (arriba) a València
     (abajo), y las paradas a su derecha, quietas. La muñeca va
     PEGADA a la línea (position: sticky) y baja con el scroll; detrás
     de ella la línea se va pintando de rojo. Al pasar por una parada
     se gira hacia el texto (perfil derecho) y la parada se marca.
     Nunca se voltea con scaleX(-1) (ESTADO § 5.4).

     Sin JavaScript: la línea sale entera en rojo y la muñeca baja
     igual, porque el sticky es CSS. */
  ruta(b, textos){
    const caja = el('div', 'b-ruta');

    const via = el('div', 'b-ruta__via');
    via.setAttribute('aria-hidden', 'true');
    via.appendChild(el('span', 'b-ruta__ciudad b-ruta__ciudad--arriba', enIdioma(b.origen)));
    const carril = el('div', 'b-ruta__carril');
    carril.appendChild(el('div', 'b-ruta__tinta'));
    via.appendChild(carril);
    via.appendChild(el('div', 'b-ruta__paralela'));
    via.appendChild(el('span', 'b-ruta__ciudad b-ruta__ciudad--abajo', enIdioma(b.destino)));
    const caminante = el('div', 'b-ruta__caminante');
    const img = document.createElement('img');
    img.src = 'assets/figures/experiencia-frente.webp';
    img.alt = '';
    img.decoding = 'async';
    caminante.appendChild(img);
    via.appendChild(caminante);
    caja.appendChild(via);

    const lista = el('div', 'b-ruta__lista');
    const ol = el('ol', 'b-ruta__paradas');
    const verCaso = (caso) => {
      const a = el('a', 'b-ruta__caso');
      a.href = 'trabajos.html#trabajos/' + caso;
      a.textContent = (textos['ruta.ver-caso'] || 'Ver caso') + ' →';
      return a;
    };
    (b.paradas || []).forEach((p, n) => {
      const li = el('li', 'b-ruta__parada');
      li.dataset.hito = String(n);
      const cab = el('p', 'b-ruta__cuando');
      cab.textContent = [enIdioma(p.lugar), enIdioma(p.fechas)].filter(Boolean).join(' · ');
      li.appendChild(cab);
      li.appendChild(el('p', 'b-ruta__que', enIdioma(p.titulo)));
      if (p.caso) li.appendChild(verCaso(p.caso));
      ol.appendChild(li);
    });
    lista.appendChild(ol);

    // lo que va en paralelo a todo (creadora independiente, 2021 →):
    // una segunda línea fina, punteada, que arranca en la parada de
    // 2019–2023 y llega hasta el final
    if (b.continua){
      const c = el('div', 'b-ruta__continua');
      c.appendChild(el('p', 'b-ruta__cuando', enIdioma(b.continua.fechas)));
      c.appendChild(el('p', 'b-ruta__que', enIdioma(b.continua.titulo)));
      if (b.continua.caso) c.appendChild(verCaso(b.continua.caso));
      lista.appendChild(c);
    }
    caja.appendChild(lista);
    return caja;
  },

  /* ── Habilidades BLANDAS, como cartas que salen de una caja ──
     Al llegar, una caja abierta suelta las cartas una a una y cada
     una vuela a su sitio, como las cartas coleccionables de un blind
     box. Cada carta: número, la habilidad y una o dos frases de dónde
     sale. Las técnicas se cuentan en Sobre mí, aquí no.
     La rejilla es el estado normal: sin GSAP se ven las cartas
     colocadas y la caja al lado. */
  blandas(b){
    const caja = el('div', 'b-cartas');
    const fuente = el('div', 'b-cartas__caja');
    fuente.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.src = 'assets/boxes/caja-abierta.webp';
    img.alt = '';
    img.loading = 'lazy';
    fuente.appendChild(img);
    caja.appendChild(fuente);
    const giros = [-2.5, 1.8, -1.2, 2.4, -1.8, 1.2, -2.2, 2];
    const ol = el('ol', 'b-cartas__lista');
    (b.filas || []).forEach((f, n) => {
      const li = el('li', 'b-carta');
      li.style.setProperty('--giro', giros[n % giros.length] + 'deg');
      li.appendChild(el('span', 'b-carta__num', 'Nº ' + String(n + 1).padStart(2, '0')));
      li.appendChild(el('p', 'b-carta__que', enIdioma(f.habilidad)));
      li.appendChild(el('p', 'b-carta__prueba', enIdioma(f.prueba)));
      ol.appendChild(li);
    });
    caja.appendChild(ol);
    return caja;
  },

  /* ── Datos rápidos en cuadrícula (Sobre mí) ──
     Lo que un reclutador quiere ver en tres segundos, sin párrafos. */
  bento(b, textos){
    const caja = el('div', 'b-bento');
    (b.celdas || []).forEach(c => {
      const url = c.url === 'cv' ? (textos['cv.archivo'] || 'assets/cv/CV-Gigi-ES.pdf') : c.url;
      const nodo = url ? el('a', 'b-bento__celda') : el('div', 'b-bento__celda');
      if (url){
        nodo.href = url;
        if (c.url === 'cv') nodo.setAttribute('download', '');
        else if (/^https?:/i.test(url)){ nodo.target = '_blank'; nodo.rel = 'noopener'; }
      }
      if (c.ancho) nodo.dataset.ancho = c.ancho;
      nodo.appendChild(el('p', 'b-bento__etiqueta', enIdioma(c.etiqueta)));
      nodo.appendChild(el('p', 'b-bento__valor', enIdioma(c.valor)));
      const pie = enIdioma(c.pie);
      if (pie) nodo.appendChild(el('p', 'b-bento__pie', pie));
      caja.appendChild(nodo);
    });
    return caja;
  },

  /* ── La portada de «Sobre mí» ──
     Maquetada como una revista: la frase de Gigi escrita a mano, los
     párrafos de qué hace debajo, y las dos fotos sueltas a un lado.

     La frase vuelve a ir a mano (Gigi, 2026-10-05): en negrita pesaba
     demasiado. Cada línea se «escribe» de izquierda a derecha.

     Las fotos van como polaroids con cinta, cada una con su giro, y se
     mueven poco: flotan, se desplazan a distinta velocidad al bajar, y
     la que queda debajo sube encima al pasarle el ratón (o al tocarla
     en el móvil), como si barajaras dos fotos sobre la mesa. */
  portada(b, textos){
    const caja = el('div', 'b-portada');

    const texto = el('div', 'b-portada__texto');
    const firma = el('p', 'b-portada__firma');
    // una línea por <span> para poder escribirlas una detrás de otra
    (enIdioma(b.firma) || '').split(/(?<=[.!?…])\s+/).forEach(trozo => {
      if (trozo.trim()) firma.appendChild(el('span', null, trozo.trim()));
    });
    texto.appendChild(firma);
    (b.parrafos || []).forEach(p => texto.appendChild(el('p', 'b-portada__parrafo', enIdioma(p))));
    caja.appendChild(texto);

    const fotos = el('div', 'b-portada__fotos');
    [b.foto, b.foto2].filter(Boolean).forEach((f, n) => {
      const fig = el('figure', 'b-portada__foto' + (n ? ' b-portada__foto--atras' : ''));
      // el papel es lo que gira y flota; la figura es lo que se
      // desplaza con el scroll. Separados, no se pisan los transform.
      const papel = el('div', 'b-portada__papel');
      const img = document.createElement('img');
      img.src = f.archivo;
      img.alt = enIdioma(f.alt);
      img.loading = n ? 'lazy' : 'eager';
      img.decoding = 'async';
      papel.appendChild(img);
      const pie = enIdioma(f.pie);
      if (pie) papel.appendChild(el('figcaption', null, pie));
      fig.appendChild(papel);
      fotos.appendChild(fig);
    });
    if (fotos.children.length) caja.appendChild(fotos);
    barajar(fotos);
    return caja;
  },

  /* ── El vídeo CV ──
     Sin texto que lo explique: el vídeo ya se presenta solo. Va en un
     móvil apoyado y torcido, con unos recortes de papel detrás (el
     vídeo es de estética collage) y una nota a mano.

     Al llegar a él, el móvil se endereza y arranca SIN SONIDO, como
     un avance. Un toque y empieza desde el principio con sonido y con
     los controles normales. Con «menos movimiento» no arranca solo. */
  'video-cv'(b, textos){
    const caja = el('div', 'b-videocv');
    ['a', 'b', 'c'].forEach(x => caja.appendChild(el('span', 'b-videocv__recorte b-videocv__recorte--' + x)));

    const movil = el('div', 'b-videocv__movil');
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.playsInline = true;
    v.muted = true;
    v.loop = true;
    if (b.portada) v.poster = b.portada;
    v.src = b.archivo;
    v.appendChild(document.createTextNode(textos['video.sin-soporte'] || ''));
    const titulo = enIdioma(b.titulo);
    if (titulo) v.setAttribute('aria-label', titulo);
    movil.appendChild(v);

    const boton = el('button', 'b-videocv__sonido');
    boton.type = 'button';
    boton.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 9v6h3.5L12 19V5L7.5 9z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/></svg>`;
    boton.appendChild(el('span', null, textos['videocv.sonido'] || ''));
    movil.appendChild(boton);
    caja.appendChild(movil);

    const nota = el('p', 'b-videocv__nota');
    nota.appendChild(el('span', null, textos['videocv.nota'] || ''));
    nota.insertAdjacentHTML('beforeend', `<svg class="b-videocv__flecha" viewBox="0 0 120 70" aria-hidden="true">
      <path d="M112 8 C 92 40, 58 58, 14 52"/><path d="M28 40 L 12 52 L 30 62"/></svg>`);
    caja.appendChild(nota);

    const conSonido = () => {
      v.muted = false;
      v.loop = false;
      v.controls = true;
      v.currentTime = 0;
      v.play().catch(() => {});
      caja.dataset.sonando = 'true';
    };
    boton.addEventListener('click', conSonido);
    v.addEventListener('click', () => { if (v.muted) conSonido(); });

    if (sinMovimiento()){
      caja.dataset.recto = 'true';
    } else {
      new IntersectionObserver(es => es.forEach(e => {
        caja.dataset.recto = String(e.isIntersecting);
        if (caja.dataset.sonando === 'true') { if (!e.isIntersecting) v.pause(); return; }
        if (e.isIntersecting) v.play().catch(() => {}); else v.pause();
      }), { threshold: 0.55 }).observe(movil);
    }
    return caja;
  },

  /* ── El final de Experiencia: el CV, en forma de pregunta ── */
  'cv-pregunta'(b, textos){
    const caja = el('div', 'b-cvpregunta');
    caja.appendChild(el('p', 'b-cvpregunta__que', enIdioma(b.pregunta)));
    const a = el('a', 'boton', enIdioma(b.boton));
    a.href = textos['cv.archivo'] || 'assets/cv/CV-Gigi-ES.pdf';
    a.setAttribute('download', '');
    caja.appendChild(a);
    return caja;
  },

  /* ── Cómo sale un vídeo ──
     Sin nota de «esto es solo un ejemplo» debajo (Gigi, 2026-10-05:
     sonaba a explicar por explicar). El perfil de arriba ya cuenta
     que su trabajo va más allá de montar vídeos. */
  proceso(b){
    const caja = el('div', 'b-proceso');
    const ol = el('ol', 'b-proceso__pasos');
    (b.pasos || []).forEach(p => {
      const li = el('li', 'b-proceso__paso');
      li.appendChild(el('p', 'b-proceso__que', enIdioma(p.paso)));
      if (p.herramientas && p.herramientas.length){
        li.appendChild(el('p', 'b-proceso__con', p.herramientas.map(h => typeof h === 'string' ? h : enIdioma(h)).join(' · ')));
      }
      ol.appendChild(li);
    });
    caja.appendChild(ol);
    const nota = enIdioma(b.nota);
    if (nota) caja.appendChild(el('p', 'b-proceso__nota', nota));
    return caja;
  }
};

/* ── La etiqueta del lateral de la caja ──
   Como el recuadro que llevan impreso los blind box de verdad con
   lo que hay dentro. Va al pie de cada trabajo: así las herramientas
   quedan pegadas a un encargo concreto y no son una lista suelta
   (idea de Gigi, 2026-10-05). Sin animación, a propósito. */
export function etiquetaContenido(contenido, textos){
  if (!contenido) return null;
  const caja = el('aside', 'contenido-caja');
  caja.appendChild(el('p', 'contenido-caja__titulo',
    textos['contenido.titulo'] || 'Contenido de esta caja'));
  const aporte = enIdioma(contenido.aporte);
  if (aporte) caja.appendChild(el('p', 'contenido-caja__aporte', aporte));
  if (contenido.herramientas && contenido.herramientas.length){
    const h = el('p', 'contenido-caja__util');
    h.appendChild(el('span', 'contenido-caja__clave',
      (textos['contenido.herramientas'] || 'Herramientas') + ': '));
    h.appendChild(document.createTextNode(contenido.herramientas.join(' · ')));
    caja.appendChild(h);
  }
  return caja;
}

/* ── Vídeo que NO tenemos: portada + datos + enlace ──
   Se usa en «Mis trabajos» para los ocho de las prácticas y las
   Fallas. No es un bloque de página, es un trozo de ficha, así que
   se exporta aparte. */
export function tarjetaVideoExterno(v, textos){
  const li = el('li', 'tarjeta-fuera');
  const a = el('a', 'tarjeta-fuera__foto');
  const principal = (v.enlaces || [])[0];
  if (principal){
    a.href = principal.url;
    a.target = '_blank';
    a.rel = 'noopener';
  }
  const img = document.createElement('img');
  img.src = v.portada;
  img.alt = enIdioma(v.titulo);
  img.loading = 'lazy';
  img.width = 450; img.height = 800;
  a.appendChild(img);
  if (v.reproducciones){
    a.appendChild(el('span', 'tarjeta-fuera__dato',
      numero(v.reproducciones) + ' ' + (textos['datos.reproducciones'] || '')));
  }
  li.appendChild(a);

  const pie = el('div', 'tarjeta-fuera__pie');
  const etiqueta = enIdioma(v.etiqueta);
  if (etiqueta) pie.appendChild(el('p', 'tarjeta-fuera__parte', etiqueta));
  pie.appendChild(el('p', 'tarjeta-fuera__titulo', enIdioma(v.titulo)));
  if (v.enlaces && v.enlaces.length){
    const ul = el('ul', 'tarjeta-fuera__enlaces');
    v.enlaces.forEach(e => {
      const p = dePlataforma(e.url, e.plataforma);
      const liE = document.createElement('li');
      liE.appendChild(enlaceFuera(e.url, textos[p.texto] || '', p.clave, textos));
      ul.appendChild(liE);
    });
    pie.appendChild(ul);
  }
  li.appendChild(pie);
  return li;
}

/* Los materiales de un trabajo: vídeos de aquí, fotos y enlaces */
export function pintarMateriales(contenedor, media, textos){
  const externos = (media || []).filter(m => m.tipo === 'video-enlace');
  const resto    = (media || []).filter(m => m.tipo !== 'video-enlace');

  if (externos.length){
    const ul = el('ul', 'tarjetas-fuera');
    externos.forEach(v => ul.appendChild(tarjetaVideoExterno(v, textos)));
    contenedor.appendChild(ul);
  }

  resto.forEach(m => {
    if (m.tipo === 'video'){
      contenedor.appendChild(crearVideo(m, textos));
    } else if (m.tipo === 'foto'){
      const caja = el('div', 'material-foto');
      caja.appendChild(polaroid(m, textos, 'polaroid--recta'));
      contenedor.appendChild(caja);
    } else if (m.tipo === 'enlace'){
      const p = dePlataforma(m.url, m.plataforma);
      const caja = el('p', 'material-enlace');
      caja.appendChild(enlaceFuera(m.url, enIdioma(m.texto) || (textos[p.texto] || ''), p.clave, textos));
      contenedor.appendChild(caja);
    }
  });
}

/* ═══════════════════ Las animaciones ═══════════════════

   Se llaman DESPUÉS de pintar, cuando los elementos ya están en la
   página y se pueden medir. Todas animan desde un estado raro hacia
   el normal: si GSAP no llega, el estado normal es lo que se ve, y
   no falta nada (ESTADO § 4.1). */
export function animarBloques(raiz = document){
  andarRuta(raiz);
  montarMesa(raiz, textosActuales);
  sacarCartas(raiz);
  animarPila(raiz);
  escribirFirma(raiz);
  moverFotos(raiz);
  repartirBento(raiz);
  entradaSuave(raiz.querySelectorAll('.b-proceso__paso'), { y: 12, escalonado: 0.07 });
}

/* La frase de Sobre mí se escribe línea a línea, de izquierda a
   derecha, como con un rotulador. Solo cambia el recorte: el texto
   está ahí desde el principio (si GSAP no carga, se lee entero). */
function escribirFirma(raiz){
  const lineas = [...raiz.querySelectorAll('.b-portada__firma span')];
  if (!lineas.length) return;
  conGsap((gsap) => {
    gsap.fromTo(lineas,
      { clipPath: 'inset(-20% 100% -20% 0)' },
      { clipPath: 'inset(-20% 0% -20% 0)', duration: 1.1, ease: 'power1.inOut',
        stagger: 0.85, delay: 0.25, immediateRender: false,
        onComplete: () => lineas.forEach(l => l.style.clipPath = '') });
    setTimeout(() => lineas.forEach(l => { l.style.clipPath = ''; }), 6000);
  });
}

/* «De un vistazo»: al llegar, las tarjetas están todas juntas en el
   centro, un poco torcidas, como un mazo de cartas; y de golpe se
   reparten cada una a su sitio.
   El sitio de verdad es la rejilla: las tarjetas solo se MUEVEN al
   centro un instante, cuando la rejilla asoma por abajo de la
   pantalla, y desde ahí vuelan a su hueco. Sin GSAP no pasa nada y
   la rejilla se ve normal. */
function repartirBento(raiz){
  const caja = raiz.querySelector('.b-bento');
  if (!caja) return;
  const celdas = [...caja.querySelectorAll('.b-bento__celda')];
  if (!celdas.length) return;
  conGsap((gsap, ScrollTrigger) => {
    const giros = [-6, 4, -3, 7, -5, 3, -8, 5, -2];
    let hecho = false;
    const juntar = () => {
      if (hecho) return;
      const c = caja.getBoundingClientRect();
      const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
      celdas.forEach((el, n) => {
        gsap.set(el, { x: 0, y: 0, rotate: 0 });
        const r = el.getBoundingClientRect();
        gsap.set(el, {
          x: cx - (r.left + r.width / 2),
          y: cy - (r.top + r.height / 2),
          rotate: giros[n % giros.length],
          zIndex: celdas.length - n,
          boxShadow: '0 6px 16px rgba(30,30,30,.10)'
        });
      });
    };
    const repartir = () => {
      if (hecho) return;
      hecho = true;
      gsap.to(celdas, {
        x: 0, y: 0, rotate: 0, duration: 0.75, ease: 'back.out(1.3)',
        stagger: 0.04, immediateRender: false,
        onComplete: () => celdas.forEach(el => { el.style.zIndex = ''; el.style.boxShadow = ''; })
      });
    };
    ScrollTrigger.create({ trigger: caja, start: 'top bottom', once: true, onEnter: juntar });
    ScrollTrigger.create({ trigger: caja, start: 'top 72%', once: true, onEnter: () => { juntar(); repartir(); } });
    // si ya se ha pasado de largo (recarga a media página), que no se quede amontonado
    setTimeout(() => { if (!hecho && caja.getBoundingClientRect().top < innerHeight * 0.72) repartir(); }, 1500);
    salvavidas(celdas);
  });
}

/* Las dos fotos de la portada bajan a distinta velocidad al hacer
   scroll: la pequeña más deprisa, así se separan un poco. */
function moverFotos(raiz){
  const figs = [...raiz.querySelectorAll('.b-portada__foto')];
  if (!figs.length) return;
  conGsap((gsap) => {
    figs.forEach((f, n) => {
      gsap.to(f, {
        y: n ? -70 : -24, ease: 'none', immediateRender: false,
        scrollTrigger: { trigger: f.parentElement, start: 'top 80%', end: 'bottom top', scrub: 0.5 }
      });
    });
  });
}

/* La ruta vertical: la muñeca baja pegada a la línea (sticky, CSS);
   aquí solo se pinta de rojo lo recorrido, se marca la parada en la
   que está y se la gira hacia el texto cuando llega a una. Mientras
   se baja, da saltitos al andar. */
const CAMINAR = 'assets/figures/experiencia-frente.webp';
const MIRAR   = 'assets/figures/experiencia-lado-der.webp';
new Image().src = MIRAR;

function andarRuta(raiz){
  const caja = raiz.querySelector('.b-ruta');
  if (!caja) return;
  const via = caja.querySelector('.b-ruta__via');
  const carril = caja.querySelector('.b-ruta__carril');
  const tinta = caja.querySelector('.b-ruta__tinta');
  const paralela = caja.querySelector('.b-ruta__paralela');
  const caminante = caja.querySelector('.b-ruta__caminante');
  const img = caminante?.querySelector('img');
  const paradas = [...caja.querySelectorAll('.b-ruta__parada')];
  const continua = caja.querySelector('.b-ruta__continua');
  if (!via || !caminante || !img || !paradas.length) return;

  let quieta = null, pedido = false, mirando = null;

  function medir(){
    pedido = false;
    const v = via.getBoundingClientRect();
    const c = carril.getBoundingClientRect();
    const m = caminante.getBoundingClientRect();
    // los pies de la muñeca son lo que va sobre la línea
    const pies = m.top + m.height * 0.92;
    const hecho = Math.max(0, Math.min(c.height, pies - c.top));
    tinta.style.height = hecho + 'px';

    // la segunda línea, desde la parada 2019–2023 hasta el final
    if (paralela && paradas[1] && continua){
      const ini = paradas[1].getBoundingClientRect().top + 20 - v.top;
      const fin = continua.getBoundingClientRect().bottom - 18 - v.top;
      paralela.style.top = ini + 'px';
      paralela.style.height = Math.max(0, fin - ini) + 'px';
    }

    // ¿en qué parada está? La última cuyo punto ya ha pasado
    let aqui = -1, cerca = false;
    paradas.forEach((li, n) => {
      const r = li.getBoundingClientRect();
      const punto = r.top + 22;
      if (punto <= pies + 4) aqui = n;
      if (Math.abs(punto - pies) < 70) cerca = true;
    });
    paradas.forEach((li, n) => li.classList.toggle('es-aqui', n === aqui));
    const mira = cerca ? MIRAR : CAMINAR;
    if (mira !== mirando){ mirando = mira; img.src = mira; }
  }

  function alBajar(){
    caminante.dataset.andando = 'true';
    clearTimeout(quieta);
    quieta = setTimeout(() => { caminante.dataset.andando = 'false'; }, 180);
    if (!pedido){ pedido = true; requestAnimationFrame(medir); }
  }

  // un solo oyente aunque se repinte (cambio de idioma)
  if (andarRuta._oyente) window.removeEventListener('scroll', andarRuta._oyente);
  andarRuta._oyente = alBajar;
  window.addEventListener('scroll', alBajar, { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(medir), { passive: true });
  img.addEventListener('load', () => requestAnimationFrame(medir), { once: true });
  medir();
}

/* Las cartas de habilidades salen volando de la caja abierta, una
   detrás de otra, y aterrizan cada una en su hueco con un rebote. */
function sacarCartas(raiz){
  const caja = raiz.querySelector('.b-cartas');
  if (!caja) return;
  const fuente = caja.querySelector('.b-cartas__caja');
  const cartas = [...caja.querySelectorAll('.b-carta')];
  if (!fuente || !cartas.length) return;
  conGsap((gsap, ScrollTrigger) => {
    let hecho = false;
    const desdeLaCaja = () => {
      const f = fuente.getBoundingClientRect();
      const fx = f.left + f.width / 2, fy = f.top + f.height * 0.45;
      return cartas.map(c => {
        gsap.set(c, { x: 0, y: 0, scale: 1 });
        const r = c.getBoundingClientRect();
        return { x: fx - (r.left + r.width / 2), y: fy - (r.top + r.height / 2) };
      });
    };
    const meter = () => {
      if (hecho) return;
      // pequeñas y amontonadas sobre la caja, pero visibles: la
      // animación decide cómo aparecen, nunca si aparecen
      desdeLaCaja().forEach((d, n) => gsap.set(cartas[n], { x: d.x, y: d.y, scale: 0.25 }));
    };
    const soltar = () => {
      if (hecho) return;
      meter();
      hecho = true;
      gsap.to(cartas, {
        x: 0, y: 0, scale: 1,
        duration: 0.8, ease: 'back.out(1.5)', stagger: 0.11, immediateRender: false,
        onComplete: () => cartas.forEach(c => { c.style.transform = ''; })
      });
      gsap.fromTo(fuente, { rotate: 0 }, { rotate: 4, yoyo: true, repeat: 5, duration: 0.09, ease: 'sine.inOut', immediateRender: false });
    };
    ScrollTrigger.create({ trigger: caja, start: 'top bottom', once: true, onEnter: meter });
    ScrollTrigger.create({ trigger: caja, start: 'top 70%', once: true, onEnter: soltar });
    setTimeout(() => { if (!hecho && caja.getBoundingClientRect().top < innerHeight * 0.7) soltar(); }, 1500);
    salvavidas(cartas);
  });
}

/* Las polaroids caen una a una, como si se vaciara la caja. */
function animarPila(raiz){
  const huecos = [...raiz.querySelectorAll('.b-pila__hueco')];
  if (!huecos.length) return;
  conGsap((gsap) => {
    huecos.forEach((h, n) => {
      gsap.from(h, {
        y: -26 - (n % 3) * 10,
        opacity: 0,
        rotate: (n % 2 ? 6 : -6),
        duration: 0.62,
        ease: 'back.out(1.4)',
        immediateRender: false,   // si no, se quedan invisibles (ver anim.js)
        scrollTrigger: { trigger: h, start: 'top 96%', once: true },
        delay: (n % 4) * 0.05
      });
    });
    salvavidas(huecos);
  });
}

/* Dibuja todos los bloques de un apartado dentro de `contenedor` */
let textosActuales = {};
export function pintarBloques(contenedor, bloques, textos){
  textosActuales = textos;
  (bloques || []).forEach(b => {
    const pintor = PINTORES[b.tipo];
    if (!pintor){ console.warn('Tipo de bloque desconocido:', b.tipo); return; }
    contenedor.appendChild(pintor(b, textos));
  });
}
