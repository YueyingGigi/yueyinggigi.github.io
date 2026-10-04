/* ─────────────────────────────────────────────────────────────
   router.js — la dirección de la página y lo que se ve.

   Formas que entiende:
     (vacío)              la mesa, sin ventana
     #colabora            abre la ventana de "Colabora conmigo"
     #trabajos            abre "Mis trabajos" en las carpetas
     #trabajos/niunos     abre "Mis trabajos" y entra en la ficha de Niu&Nos

   Así Gigi puede mandar a una marca el enlace .../#colabora y esa persona
   cae directamente en el apartado, sin tener que buscar nada.
   ───────────────────────────────────────────────────────────── */

export const SECCIONES = ['sobre-mi', 'experiencia', 'trabajos', 'vida', 'colabora'];

/* Lee la dirección actual y la traduce a { seccion, ficha } */
export function leerRuta(){
  const bruto = decodeURIComponent(location.hash.replace(/^#/, '')).trim();
  if (!bruto) return { seccion: null, ficha: null };

  const [seccion, ficha] = bruto.split('/');
  if (!SECCIONES.includes(seccion)) return { seccion: null, ficha: null };
  return { seccion, ficha: ficha || null };
}

/* Escribe la dirección. reemplazar=true no añade una entrada nueva al
   historial (se usa al abrir, para que "atrás" devuelva a la mesa). */
export function escribirRuta({ seccion, ficha } = {}, reemplazar = false){
  const destino = seccion ? '#' + seccion + (ficha ? '/' + ficha : '') : location.pathname + location.search;
  if (location.hash === destino || (!seccion && !location.hash)) return;
  reemplazar ? history.replaceState(null, '', destino) : history.pushState(null, '', destino);
}

/* Avisa cada vez que cambia la dirección, venga de donde venga:
   un clic, el botón atrás del navegador o un enlace pegado. */
export function alCambiarRuta(hacer){
  window.addEventListener('hashchange', () => hacer(leerRuta()));
  window.addEventListener('popstate',  () => hacer(leerRuta()));
}
