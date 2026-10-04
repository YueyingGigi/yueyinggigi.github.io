/* ─────────────────────────────────────────────────────────────
   figure.js — la muñeca que acompaña a quien visita la web.

   Una sola imagen, grande, fija en la pantalla. La que sale de la caja
   es la misma que luego acompaña en la página del apartado.

   Dos cosas que costó acertar (Gigi, 2026-10-04):

   1. HACIA DÓNDE MIRA. Si está a la derecha tiene que mirar hacia la
      izquierda, o sea hacia el texto. Mirando al borde parece
      castigada. Por eso cada parada lleva su ángulo escrito y no se va
      rotando a ciegas. Y NUNCA se voltea con scaleX(-1): eso cambiaría
      de lado la raya del pelo y el vestido.

   2. LA VUELTA. Con cuatro fotos no sale un giro de 360° suave. Lo que
      se hace es pasar deprisa por las cuatro, como un folioscopio, con
      un giro en 3D encima. Para un giro de verdad harían falta de 24 a
      36 fotogramas de una vuelta grabada.
   ───────────────────────────────────────────────────────────── */

const ANGULOS = ['frente', 'lado-der', 'espalda', 'lado-izq'];

/* Cada parada: dónde se pone y hacia dónde mira estando ahí */
const PARADAS = [
  { sitio: 'derecha',      angulo: 'frente'   },
  { sitio: 'izquierda',    angulo: 'lado-der' },
  { sitio: 'derecha-alta', angulo: 'lado-izq' },
  { sitio: 'izquierda',    angulo: 'frente'   },
  { sitio: 'derecha',      angulo: 'lado-izq' }
];

export function rutaFigura(seccion, angulo){
  return `assets/figures/${seccion}-${angulo}.webp`;
}

const yaPedidas = new Set();
export function precargar(seccion){
  if (yaPedidas.has(seccion)) return;
  yaPedidas.add(seccion);
  ANGULOS.forEach(a => { new Image().src = rutaFigura(seccion, a); });
}

const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Figura{
  constructor(el){
    this.el = el;
    this.seccion = null;
    this.paso = 0;
    this.girando = false;
    this.pendiente = null;
  }

  /* En su sitio, de cara. Es lo normal al entrar en una página. */
  mostrar(seccion, textoAlternativo){
    this.seccion = seccion;
    this.paso = 0;
    precargar(seccion);
    this.el.src = rutaFigura(seccion, PARADAS[0].angulo);
    this.el.alt = textoAlternativo || '';
    this.el.removeAttribute('style');
    this.el.dataset.saltando = 'false';
    this.el.dataset.girando = 'false';
    this.el.dataset.sitio = PARADAS[0].sitio;
    this.el.hidden = false;
  }

  /* Para el momento de salir de la caja: visible, pero colocada a mano
     desde unbox.js, sin sitio de reposo. */
  prepararRevelado(seccion, textoAlternativo){
    this.seccion = seccion;
    this.paso = 0;
    precargar(seccion);
    this.el.src = rutaFigura(seccion, 'frente');
    this.el.alt = textoAlternativo || '';
    this.el.dataset.sitio = 'derecha';
    this.el.dataset.saltando = 'true';
    this.el.hidden = false;
  }

  ocultar(){ this.el.hidden = true; this.el.removeAttribute('style'); }
  estaVisible(){ return !this.el.hidden; }

  cuantasParadas(){ return PARADAS.length; }

  /* Pasa a la parada que toca: se da la vuelta y se coloca.

     Si llega una petición mientras está girando se apunta y se atiende
     al terminar. Antes se descartaba, y como nadie la volvía a pedir,
     la muñeca se quedaba clavada en la segunda postura. */
  irA(indice){
    if (!this.seccion) return;
    if (this.girando){ this.pendiente = indice; return; }
    if (indice === this.paso) return;

    const desde  = PARADAS[this.paso % PARADAS.length].angulo;
    const destino = PARADAS[indice % PARADAS.length];
    this.paso = indice;

    if (sinMovimiento()){
      this.el.src = rutaFigura(this.seccion, destino.angulo);
      this.el.dataset.sitio = destino.sitio;
      return;
    }

    // el camino más corto por el círculo de ángulos
    const i0 = ANGULOS.indexOf(desde), i1 = ANGULOS.indexOf(destino.angulo);
    const vuelta = [];
    let i = i0;
    while (i !== i1){ i = (i + 1) % ANGULOS.length; vuelta.push(ANGULOS[i]); }
    if (!vuelta.length) vuelta.push(destino.angulo);

    this.girando = true;
    this.el.dataset.girando = 'true';
    this.el.dataset.sitio = destino.sitio;

    const paso = Math.max(95, Math.round(400 / vuelta.length));
    vuelta.forEach((ang, n) => {
      setTimeout(() => {
        this.el.src = rutaFigura(this.seccion, ang);
        if (n === vuelta.length - 1){
          this.el.dataset.girando = 'false';
          this.girando = false;
          if (this.pendiente != null){
            const siguiente = this.pendiente;
            this.pendiente = null;
            this.irA(siguiente);
          }
        }
      }, paso * (n + 1));
    });
  }
}
