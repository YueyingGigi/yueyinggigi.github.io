/* ─────────────────────────────────────────────────────────────
   hand.js — la mano que sustituye al ratón en la mesa (DESIGN § 4).

   Reglas:
   · Solo con ratón de verdad (@media pointer:fine) y solo sobre la mesa.
     En el móvil NO se activa: taparía lo que se quiere tocar.
   · La punta del índice cae exactamente donde se va a pinchar. Las
     coordenadas de cada punta están en assets/hands/puntas.json.
   · Sigue con un poco de retraso y se inclina según la velocidad, para
     que no parezca una pegatina clavada al cursor.
   · Tres posturas: relajada, alargando la mano sobre una caja, y
     pellizcando al pulsar.
   · Con "menos movimiento" no se activa: se usa el ratón de siempre.
   ───────────────────────────────────────────────────────────── */

const POSTURAS = {
  reposo:   'assets/hands/mano-abierta.webp',
  alcanzar: 'assets/hands/mano-alcanzando.webp',
  pellizco: 'assets/hands/mano-pellizco.webp'
};

const SEGUIMIENTO = 0.22;   // cuánto se acerca al ratón en cada fotograma
const INCLINACION = 8;      // grados como mucho

export async function iniciarMano(zona){
  if (!zona) return;
  if (!matchMedia('(pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // dónde está la punta del índice en cada imagen
  let puntas = {};
  try {
    const r = await fetch('assets/hands/puntas.json');
    if (r.ok) puntas = await r.json();
  } catch (e) { /* se usará el centro de arriba */ }

  const mano = document.createElement('div');
  mano.className = 'mano';
  mano.setAttribute('aria-hidden', 'true');
  mano.innerHTML = '<img alt="">';
  const img = mano.querySelector('img');
  document.body.appendChild(mano);

  Object.values(POSTURAS).forEach(src => { new Image().src = src; });

  let postura = '';
  function ponerPostura(nombre){
    if (postura === nombre) return;
    postura = nombre;
    const archivo = POSTURAS[nombre];
    img.src = archivo;
    const clave = archivo.split('/').pop().replace('.webp', '');
    const p = puntas[clave]?.punta || [0.5, 0];
    // la punta del dedo tiene que caer en el ratón
    img.style.marginLeft = `${-p[0] * 100}%`;
    img.style.marginTop  = `${-p[1] * 100}%`;
  }
  ponerPostura('reposo');

  let ratonX = 0, ratonY = 0, x = 0, y = 0, anteriorX = 0, dentro = false;

  zona.addEventListener('pointerenter', e => {
    dentro = true;
    ratonX = x = anteriorX = e.clientX;
    ratonY = y = e.clientY;
    mano.dataset.visible = 'true';
    document.body.dataset.manoPuesta = 'true';
  });
  zona.addEventListener('pointerleave', () => {
    dentro = false;
    mano.dataset.visible = 'false';
    delete document.body.dataset.manoPuesta;
  });
  zona.addEventListener('pointermove', e => { ratonX = e.clientX; ratonY = e.clientY; });

  // sobre una caja, la mano se adelanta; al pulsar, pellizca
  zona.querySelectorAll('.caja').forEach(caja => {
    caja.addEventListener('pointerenter', () => ponerPostura('alcanzar'));
    caja.addEventListener('pointerleave', () => ponerPostura('reposo'));
  });
  zona.addEventListener('pointerdown', () => ponerPostura('pellizco'));
  zona.addEventListener('pointerup',   () => ponerPostura(postura === 'pellizco' ? 'reposo' : postura));

  // Si el ratón sale por encima de la barra o se abre una caja, fuera mano
  document.addEventListener('visibilitychange', () => { mano.dataset.visible = 'false'; });

  (function mover(){
    if (dentro){
      x += (ratonX - x) * SEGUIMIENTO;
      y += (ratonY - y) * SEGUIMIENTO;
      const giro = Math.max(-INCLINACION, Math.min(INCLINACION, (x - anteriorX) * 1.6));
      anteriorX = x;
      mano.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${giro.toFixed(2)}deg)`;
    }
    requestAnimationFrame(mover);
  })();
}
