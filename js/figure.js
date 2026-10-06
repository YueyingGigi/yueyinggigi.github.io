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

/* Cada parada: dónde se pone, hacia dónde mira, y lo CERCA que está.

   3. LA PROFUNDIDAD (Gigi, 2026-10-05, con la grabación de «阿车的AI
      随意门» de referencia). Antes medía siempre lo mismo y la página
      se veía plana. Ahora unas paradas son un primer plano enorme
      que se sale por el borde de la pantalla, y otras la dejan
      pequeña, lejos. Al bajar, además, se desliza a su propio ritmo
      (`k`): cuanto más cerca, más se mueve. Esa diferencia de
      velocidad con el texto es lo que da el fondo.

   escala  tamaño respecto al normal (62vh)
   x       cuánto se sale por su borde (en % de su propio ancho, sin
           escalar; negativo = hacia la izquierda)
   y       cuánto se hunde por abajo (vh)
   k       cuánto se desliza con el scroll                       */
const PARADAS = [
  { sitio: 'derecha',      angulo: 'frente',   escala: 1,    x:   0, y:  0, k: .22 },
  { sitio: 'derecha',      angulo: 'lado-izq', escala: 1.95, x:  70, y: 34, k: .55 },
  { sitio: 'derecha-alta', angulo: 'espalda',  escala: .80,  x:   0, y:  0, k: .12 },
  { sitio: 'izquierda',    angulo: 'lado-der', escala: .9,   x: -22, y:  0, k: .2  },
  { sitio: 'derecha',      angulo: 'frente',   escala: 1.5,  x:  28, y: 16, k: .4  }
];
/* Los primeros planos van SIEMPRE a la derecha: el texto está a la
   izquierda y es ancho (la portada mide 1040 px); un primer plano a
   la izquierda le caía encima. A la izquierda solo sale a tamaño
   normal, y el texto se aparta. */

/* En «Mis trabajos» se queda a la derecha y cambia poco de tamaño:
   más grande taparía el portátil. En el móvil no hay sitio para
   primeros planos: tamaño normal, solo gira y se desliza un poco. */
const PARADAS_TRABAJOS = PARADAS.map((p, n) => ({
  ...p, sitio: 'derecha', escala: [1, 1.12, .9, 1.08, 1][n], x: 0, y: 0, k: .12,
  angulo: ['frente', 'lado-izq', 'espalda', 'lado-izq', 'frente'][n]
}));
const enMovil = () => matchMedia('(max-width: 900px)').matches;

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

  /* La lista de paradas que toca en esta página y esta pantalla */
  parada(n){
    const lista = this.seccion === 'trabajos' ? PARADAS_TRABAJOS : PARADAS;
    const p = lista[n % lista.length];
    // móvil: siempre abajo a la derecha, pequeña y por delante (como
    // antes); por detrás de las tarjetas se veía a trozos
    if (enMovil()) return { ...p, sitio: 'derecha', escala: 1, x: 0, y: 0, k: .08 };
    return p;
  }
  sitioDe(n){ return this.parada(n).sitio; }

  /* Tamaño y salida por el borde. El deslizamiento va aparte
     (`deslizar`), porque cambia en cada fotograma de scroll. */
  colocar(p){
    this.el.dataset.sitio = p.sitio;
    this.el.style.setProperty('--escala', p.escala);
    this.el.style.setProperty('--sale-x', p.x + '%');
    this.el.style.setProperty('--sale-y', p.y + 'vh');
    this.k = p.k;
  }

  /* `avance` va de -0,5 a 0,5 dentro de la parada actual; `tramo` es
     cuántos píxeles de scroll dura la parada. */
  deslizar(avance, tramo){
    if (sinMovimiento() || this.k == null) return;
    const px = Math.max(-0.12 * innerHeight, Math.min(0.12 * innerHeight, -avance * tramo * this.k));
    this.el.style.setProperty('--deriva', Math.round(px) + 'px');
  }

  /* En su sitio, de cara. Es lo normal al entrar en una página. */
  mostrar(seccion, textoAlternativo){
    this.seccion = seccion;
    this.paso = 0;
    precargar(seccion);
    const p = this.parada(0);
    this.el.src = rutaFigura(seccion, p.angulo);
    this.el.alt = textoAlternativo || '';
    this.el.removeAttribute('style');
    this.el.dataset.saltando = 'false';
    this.el.dataset.girando = 'false';
    this.colocar(p);
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

  /* Al cambiar el tamaño de la ventana (de escritorio a móvil, por
     ejemplo) se recoloca en la parada en la que está. */
  recolocar(){ if (this.seccion && !this.girando) this.colocar(this.parada(this.paso)); }

  /* Pasa a la parada que toca: se da la vuelta y se coloca.

     Si llega una petición mientras está girando se apunta y se atiende
     al terminar. Antes se descartaba, y como nadie la volvía a pedir,
     la muñeca se quedaba clavada en la segunda postura. */
  irA(indice){
    if (!this.seccion) return;
    if (this.girando){ this.pendiente = indice; return; }
    if (indice === this.paso) return;

    const desde  = this.parada(this.paso).angulo;
    const destino = this.parada(indice);
    this.paso = indice;

    if (sinMovimiento()){
      this.el.src = rutaFigura(this.seccion, destino.angulo);
      this.colocar(destino);
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
    this.colocar(destino);

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
