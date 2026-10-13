/* ─────────────────────────────────────────────────────────────
   portada.js — qué versión de la mesa ve quien entra.

   Hay dos: la «clasica» (la de siempre) y la de «espejo» (un
   escritorio visto en oblicuo, con el portátil del espejo empañado
   en el centro y las cajas delante).
   · Manda content/portada.json, que Gigi cambia desde el panel.
   · ?portada=espejo  o  ?portada=clasica  la fuerzan solo para quien
     abre ese enlace: sirve para mirar antes de cambiar.
   · Si el archivo no se puede leer, la clásica.
   Lo del espejo (código, estilos, vídeo, letra) solo se descarga si toca.

   La del espejo tiene, además, tres fondos (también en portada.json, y
   ?fondo=… para probar):
     «dibujado»  la habitación pintada con CSS: pared, ventana, sol, taza…
     «playa»     esa misma habitación, con un ventanal al mar, palmeras
                 y plantas (lleva las dos clases: fondo-dibujado y
                 fondo-playa; lo del mar solo AÑADE)
     «foto»      la mesa de madera en la playa, en fotografía
   Los tres se conservan: se cambia de uno a otro sin tocar código.
   ───────────────────────────────────────────────────────────── */

const VERSIONES = ['clasica', 'espejo'];
const FONDOS = ['dibujado', 'playa', 'foto'];
const valida = (v, lista) => (lista.includes(v) ? v : lista[0]);

/* Lo que se pide con ?portada= y ?fondo= se recuerda mientras dure la
   visita: si no, al volver a la portada desde el sello o desde otro
   apartado (enlaces a index.html, sin nada detrás) se perdería y
   saldría otra vez la que manda portada.json. */
function pedidoDeLaVisita(){
  const pedido = new URLSearchParams(location.search);
  for (const clave of ['portada', 'fondo']){
    try {
      if (pedido.has(clave)) sessionStorage.setItem('gigi.prueba.' + clave, pedido.get(clave));
      else if (sessionStorage.getItem('gigi.prueba.' + clave)) pedido.set(clave, sessionStorage.getItem('gigi.prueba.' + clave));
    } catch (e) { /* sin memoria: solo vale la dirección */ }
  }
  return pedido;
}

export async function cualPortada(){
  const pedido = pedidoDeLaVisita();
  let guardado = {};
  try {
    const r = await fetch('content/portada.json', { cache: 'no-cache' });
    guardado = await r.json();
  } catch (e) { /* sin archivo: la clásica */ }
  return {
    version: valida(VERSIONES.includes(pedido.get('portada')) ? pedido.get('portada') : guardado.version, VERSIONES),
    fondo: valida(FONDOS.includes(pedido.get('fondo')) ? pedido.get('fondo') : guardado.fondo, FONDOS)
  };
}

/* Devuelve el módulo del espejo, ya con sus estilos puestos (la mesa
   se mide al montarla y tiene que tener ya su forma), o null. */
export async function cargarEspejo({ version, fondo }){
  if (version !== 'espejo') return null;
  try {
    const modulo = await import('./espejo/montar.js');
    await modulo.estilos;
    document.documentElement.classList.add('con-espejo', 'fondo-' + fondo);
    if (fondo === 'playa') document.documentElement.classList.add('fondo-dibujado');
    return modulo;
  } catch (e) {
    console.error('No se ha podido poner el espejo:', e);
    return null;
  }
}
