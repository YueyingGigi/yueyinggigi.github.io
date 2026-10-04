/* ─────────────────────────────────────────────────────────────
   sound.js — los dos sonidos de la web.

   No hay archivos de audio: los sonidos se fabrican con WebAudio.
   Así no pesan nada, no hay que pagar licencias y suenan igual en
   todos los navegadores.

   · abrir()  → un "pop" corto y suave, al romper la caja
   · cerrar() → un clic seco y más grave

   Reglas que nos hemos puesto:
   · Solo suena cuando la persona pincha algo. Nunca solo.
   · Hay un botón para quitarlo y se recuerda (localStorage).
   · El navegador no deja crear audio hasta el primer clic, así que
     el contexto se crea en ese momento, no al cargar la página.
   ───────────────────────────────────────────────────────────── */

const LLAVE = 'gigi.sonido';
let ctx = null;
let encendido = true;

try { encendido = localStorage.getItem(LLAVE) !== 'no'; } catch (e) { /* da igual */ }

function contexto(){
  if (!ctx){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/* Un tono con su envolvente. dur en segundos, vol de 0 a 1. */
function tono({ de, a, dur, vol, tipo = 'sine' }){
  const c = contexto();
  if (!c) return;
  const osc = c.createOscillator();
  const gan = c.createGain();
  const t = c.currentTime;

  osc.type = tipo;
  osc.frequency.setValueAtTime(de, t);
  osc.frequency.exponentialRampToValueAtTime(a, t + dur);

  gan.gain.setValueAtTime(0, t);
  gan.gain.linearRampToValueAtTime(vol, t + 0.008);
  gan.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gan).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/* Un soplo corto de ruido: el "chas" del precinto al romperse */
function roce(dur = 0.09, vol = 0.05){
  const c = contexto();
  if (!c) return;
  const marcos = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, marcos, c.sampleRate);
  const datos = buf.getChannelData(0);
  for (let i = 0; i < marcos; i++){
    datos[i] = (Math.random() * 2 - 1) * (1 - i / marcos);   // se apaga solo
  }
  const fuente = c.createBufferSource();
  const filtro = c.createBiquadFilter();
  const gan = c.createGain();
  fuente.buffer = buf;
  filtro.type = 'highpass';
  filtro.frequency.value = 1800;
  gan.gain.value = vol;
  fuente.connect(filtro).connect(gan).connect(c.destination);
  fuente.start();
}

export function sonarAbrir(){
  if (!encendido) return;
  roce(0.10, 0.045);                                     // el precinto
  setTimeout(() => tono({ de: 420, a: 880, dur: 0.16, vol: 0.09 }), 150);  // la tapa
  setTimeout(() => {                                     // ¡sorpresa!
    tono({ de: 660, a: 1320, dur: 0.22, vol: 0.10, tipo: 'triangle' });
    setTimeout(() => tono({ de: 990, a: 1760, dur: 0.20, vol: 0.06, tipo: 'triangle' }), 70);
  }, 470);
}

export function sonarCerrar(){
  if (!encendido) return;
  tono({ de: 520, a: 240, dur: 0.11, vol: 0.07 });
}

export function sonidoEncendido(){ return encendido; }

export function cambiarSonido(valor){
  encendido = valor;
  try { localStorage.setItem(LLAVE, valor ? 'si' : 'no'); } catch (e) { /* da igual */ }
}
