/* ─────────────────────────────────────────────────────────────
   coleccion.js — qué cajas ha abierto ya quien visita la web.

   Solo sirve para que las cajas abiertas sigan abiertas al volver a la
   mesa. NO hay contador ni barra de progreso: esto lo miran empresas,
   y poner "2 / 5" convierte el portfolio en un juego a medio terminar
   en vez de en un trabajo que mirar (decidido con Gigi, 2026-10-04).

   Si el navegador no deja guardar (ventana privada, cookies
   bloqueadas) funciona todo igual, solo que no se recuerda.
   ───────────────────────────────────────────────────────────── */

export const SECCIONES = ['sobre-mi', 'experiencia', 'trabajos', 'vida', 'colabora'];
const LLAVE = 'gigi.abiertas';

function leer(){
  try {
    const crudo = localStorage.getItem(LLAVE);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista.filter(x => SECCIONES.includes(x)) : [];
  } catch (e) { return []; }
}

export function abiertas(){ return leer(); }
export function estaAbierta(seccion){ return leer().includes(seccion); }
export function cuantas(){ return leer().length; }

export function marcar(seccion){
  const lista = leer();
  if (!lista.includes(seccion)){
    lista.push(seccion);
    try { localStorage.setItem(LLAVE, JSON.stringify(lista)); } catch (e) { /* da igual */ }
  }
  return lista.length;
}
