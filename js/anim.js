/* ─────────────────────────────────────────────────────────────
   anim.js — lo común a todas las animaciones del sitio.

   Dos reglas que no se tocan:

   1. LA ANIMACIÓN DECIDE *CÓMO* APARECE ALGO, NUNCA *SI* APARECE.
      Nada se queda escondido esperando a que el scroll lo descubra.
      Si GSAP no carga, o alguien tiene el JavaScript desactivado, o
      la red se cae a medias, la página se lee igual (ESTADO § 4.1).
      Comprobado apuntando la URL de GSAP a un archivo que no existe:
      las cinco páginas siguen completas.

   2. CON «MENOS MOVIMIENTO» NO SE MUEVE NADA. Ni desplazamientos ni
      escalas: como mucho, un fundido. Se comprueba una sola vez
      aquí y todos preguntan a `sinMovimiento`.

   GSAP se carga desde jsDelivr con la versión clavada (CLAUDE.md § 5).
   Si no llega, `conGsap()` simplemente no hace nada y la página se
   queda quieta, que es un resultado perfectamente aceptable.
   ───────────────────────────────────────────────────────────── */

const GSAP = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js';
const TRIGGER = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js';

export const sinMovimiento = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches;

function guion(src){
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = ok; s.onerror = () => mal(new Error('no se ha podido cargar ' + src));
    document.head.appendChild(s);
  });
}

let pedido = null;

/* Carga GSAP una sola vez y llama a `hacer(gsap, ScrollTrigger)`.
   Si falla o hay «menos movimiento», no llama a nadie. */
export function conGsap(hacer){
  if (sinMovimiento()) return Promise.resolve(false);
  if (!pedido){
    pedido = guion(GSAP)
      .then(() => guion(TRIGGER))
      .then(() => {
        window.gsap.registerPlugin(window.ScrollTrigger);
        return true;
      })
      .catch(e => { console.warn('Sin animaciones:', e.message); return false; });
  }
  return pedido.then(hay => {
    if (hay) hacer(window.gsap, window.ScrollTrigger);
    return hay;
  });
}

/* ── FLIP a mano ──
   Para «el archivo crece desde la columna hasta el centro».

   No se usa el plugin Flip de GSAP: esto son veinte líneas, una
   dependencia menos y ningún lío de licencias.

   Cómo va: se mide dónde está el elemento de origen (First), se
   mide dónde ha acabado el de destino (Last), se calcula la
   diferencia y se coloca el destino ENCIMA del origen (Invert), y
   desde ahí se suelta hasta su sitio real (Play). El contenido ya
   está en su posición final todo el rato: lo único que se mueve es
   una transformación.  */
export function volar(origen, destino, { duracion = 420 } = {}){
  if (sinMovimiento() || !origen || !destino) return;

  const a = origen.getBoundingClientRect();
  const b = destino.getBoundingClientRect();
  if (!a.width || !b.width) return;

  const escalaX = a.width  / b.width;
  const escalaY = a.height / b.height;
  const dx = (a.left + a.width  / 2) - (b.left + b.width  / 2);
  const dy = (a.top  + a.height / 2) - (b.top  + b.height / 2);

  destino.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${escalaX}, ${escalaY})`,
        opacity: 0.35, filter: 'blur(3px)' },
      { transform: 'none', opacity: 1, filter: 'blur(0px)' }
    ],
    { duration: duracion, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'none' }
  );
}

/* Entrada sencilla al acercarse a la pantalla, para lo que no
   necesita nada más elaborado.

   `immediateRender: false` es LA línea importante: sin ella, GSAP
   pone el elemento a opacidad 0 nada más crear el tween y lo deja
   así hasta que el disparador se active. Si el disparador no llega
   a activarse nunca (pestaña en segundo plano, un `refresh` que no
   se dispara, el elemento ya pasado), el texto se queda invisible y
   la página aparece medio vacía. Con esta línea no se toca nada
   hasta que de verdad toca animar.

   Y por si acaso, `salvavidas()` destapa a los dos segundos
   cualquier cosa que se haya quedado a medias: antes muerta la
   animación que el contenido (ESTADO § 4.1). */
export function entradaSuave(elementos, { y = 18, escalonado = 0.06 } = {}){
  const lista = [...elementos];
  if (!lista.length) return;
  conGsap((gsap) => {
    gsap.from(lista, {
      opacity: 0, y,
      duration: 0.6, ease: 'power2.out', stagger: escalonado,
      immediateRender: false,
      scrollTrigger: { trigger: lista[0], start: 'top 92%', once: true }
    });
    salvavidas(lista);
  });
}

/* Red de seguridad: lo que siga invisible a los 2 s, se destapa. */
export function salvavidas(elementos){
  const lista = [...elementos];
  if (!lista.length) return;
  setTimeout(() => {
    lista.forEach(e => {
      const o = parseFloat(getComputedStyle(e).opacity);
      if (!Number.isNaN(o) && o < 0.05){
        e.style.opacity = '1';
        e.style.transform = 'none';
      }
    });
  }, 2000);
}
