// 雾：画雾、擦除、回雾、哈气，以及手掌抹出来的那两行字。录制台和播放器共用这一个模块。
// 坐标都归一化到 0–1，是镜像后的坐标（看到的位置）。时间 t 以秒计，由调用方给。
// 同一组笔画和事件、同一个 t，画出来的结果相同，所以播放器可以直接跟着视频时间走。

export const CONFIG = {
  desenfoque: 0.48, // 模糊程度 0–1
  densidad: 0.36, // 奶白层不透明度 0–1
  calidez: -0.23, // 雾的冷暖 -1（冷）… 1（暖）
  grano: 0, // 颗粒不透明度
  borde: 0.6, // 水痕深浅 0–0.6
  pincel: { escribir: 0.015, limpiar: 0.13 }, // 笔刷半径，占画面宽度的比例
  dureza: 0.3, // 笔刷中心实心部分占半径的比例，其余是软边
  flujo: 0.4, // 单个笔刷印的浓度
  paso: 0.22, // 笔刷印的间距，占半径的比例
  rebrote: {
    escribir: { mantener: 8, volver: 5, fuerza: 1 },
    limpiar: { mantener: 1.5, volver: 5, fuerza: 0.35 },
  },
  vaho: {
    // 雾只铺在嘴经过的地方：嘴每到一处留下一团，嘴张得越久这一团越大
    radioInicial: 0.08, // 一团雾刚出现时的半径，占画面宽度的比例
    radio: 0.5, // 一团雾最大的半径
    crecer: 1.0, // 长到最大要多久
    inercia: 0.3, // 嘴合上以后还继续长这么久
    aparecer: 0.25, // 一团雾从无到有的时间
    rebrote: 0.6, // 哈气后已有笔画回雾的时间
    exceso: 1.6, // 嘴合上以后，嘴附近那团更浓的雾多久散掉
    subida: 0.3, // 那团雾浓起来的时间
    intensidad: 0.4,
  },
  // 手掌抹出来的字：字形处的雾挖掉。不自己回雾（mantener 很长），等下一口气把它盖掉
  texto: { mantener: 600, volver: 5, tinte: 0.64, peso: 700 },
  escalaMascara: 0.5, // 擦除蒙版相对画面的分辨率
};

const TINTE_BORDE = 'rgb(38, 46, 58)';
const VAHO_SUELTO = 0.8; // 没有嘴的数据时（按键、麦克风），一口气算这么长
const PASO_RUTA = 0.08; // 嘴的位置最多隔这么久记一次
const TOQUES_INICIO = 4; // 起笔处多盖几个印，轻点一下也能留下一个点

const FUENTE = '-apple-system, "Helvetica Neue", "PingFang SC", sans-serif';

// 把文字排进一个框里：换行符分好的就照着排；没分的试 1 行和 2 行，取字号大的那种。
// ancho、alto 是像素。返回 { lineas, tamano }。
export function encajar(g, texto, ancho, alto, fuente = FUENTE, peso = 400) {
  const opciones = [];
  if (texto.includes('\n')) opciones.push(texto.split('\n'));
  else {
    opciones.push([texto]);
    const palabras = texto.split(' ');
    let mejor = null;
    for (let i = 1; i < palabras.length; i++) {
      const par = [palabras.slice(0, i).join(' '), palabras.slice(i).join(' ')];
      const largo = Math.max(par[0].length, par[1].length);
      if (!mejor || largo < mejor.largo) mejor = { par, largo };
    }
    if (mejor) opciones.push(mejor.par);
  }
  g.font = `${peso} 100px ${fuente}`;
  let resultado = null;
  for (const lineas of opciones) {
    const anchoTexto = Math.max(...lineas.map((l) => g.measureText(l).width)) / 100;
    const tamano = Math.min((ancho * 0.94) / anchoTexto, (alto * 0.86) / (lineas.length * 1.25));
    if (!resultado || tamano > resultado.tamano) resultado = { lineas, tamano };
  }
  return resultado;
}

const suave = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p));
const mezcla = (a, b, u) => a + (b - a) * u;

function combinar(base, extra) {
  const salida = Array.isArray(base) ? [...base] : { ...base };
  for (const clave in extra) {
    const v = extra[clave];
    salida[clave] =
      v && typeof v === 'object' && !Array.isArray(v) && base[clave] ? combinar(base[clave], v) : v;
  }
  return salida;
}

function crearLienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function crearSello(dureza, flujo) {
  const n = 64;
  const c = crearLienzo(n, n);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  for (let i = 0; i <= 10; i++) {
    const r = i / 10;
    const a = r <= dureza ? 1 : 1 - suave((r - dureza) / (1 - dureza));
    grad.addColorStop(r, `rgba(255,255,255,${(a * flujo).toFixed(4)})`);
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  return c;
}

function crearGrano() {
  const n = 128;
  const c = crearLienzo(n, n);
  const g = c.getContext('2d');
  const img = g.createImageData(n, n);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() < 0.5 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.random() * 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function colorNiebla(calidez, alfa) {
  const frio = [224, 233, 246];
  const neutro = [240, 241, 242];
  const calido = [249, 241, 228];
  const [a, b, u] = calidez < 0 ? [neutro, frio, -calidez] : [neutro, calido, calidez];
  const c = a.map((v, i) => Math.round(mezcla(v, b[i], Math.min(1, u))));
  return `rgba(${c[0]},${c[1]},${c[2]},${alfa})`;
}

export function crearNiebla({ ancho, alto, config = {} }) {
  const cfg = combinar(CONFIG, config);

  let trazos = [];
  // { tipo: 'vaho', t, fuerza, ruta: [[t, x, y], …], fin } | { tipo: 'despejar', t, dur }，按 t 排序
  // vaho 的 ruta 是嘴的位置随时间的变化；fin 是嘴合上的时间，还张着就是 null
  let eventos = [];
  let textos = {}; // { intro: { texto, caja, alinear }, bienvenida: {…} }
  let fuenteTexto = FUENTE;
  let glifos = {}; // 每一行排好的字，整张画布大小
  let nivelInicial = 1; // 1：一开始就满屏是雾（调雾的测试页）；0：没有雾，哈到哪铺到哪

  let capa, gCapa; // 雾这一层
  let mascara, gMascara; // 擦除蒙版
  let aparte, gAparte; // 正在回雾的笔画先画在这里，再按透明度并进蒙版
  let tinte, gTinte; // 水痕：只跟着写字的笔画，手掌擦淡的宽带不染
  let hayTinte = false;
  let capaTexto, gTexto; // 这一帧要挖掉的字
  let aparteTexto, gAparteTexto;
  let cobertura, gCobertura; // 雾还没铺满时，哪里有雾
  let cadena = []; // 逐级缩小的画布，用来模糊
  let claveCadena = '';
  let sello, claveSello = '';
  const grano = crearGrano();
  let patronGrano = null;

  function redimensionar(w, h) {
    ancho = Math.round(w);
    alto = Math.round(h);
    capa = crearLienzo(ancho, alto);
    gCapa = capa.getContext('2d');
    patronGrano = gCapa.createPattern(grano, 'repeat');
    const mw = ancho * cfg.escalaMascara;
    const mh = alto * cfg.escalaMascara;
    mascara = crearLienzo(mw, mh);
    gMascara = mascara.getContext('2d');
    aparte = crearLienzo(mw, mh);
    gAparte = aparte.getContext('2d');
    tinte = crearLienzo(mw, mh);
    gTinte = tinte.getContext('2d');
    capaTexto = crearLienzo(ancho, alto);
    gTexto = capaTexto.getContext('2d');
    aparteTexto = crearLienzo(ancho, alto);
    gAparteTexto = aparteTexto.getContext('2d');
    cobertura = crearLienzo(ancho / 8, alto / 8);
    gCobertura = cobertura.getContext('2d');
    claveCadena = '';
    componerTextos();
  }

  // ---------- 字 ----------

  // 把每一行字排进它的框里，存成一张整幅的图。字不镜像。
  function componerTextos() {
    glifos = {};
    for (const [linea, { texto, caja, alinear = 'center' }] of Object.entries(textos)) {
      if (!texto) continue;
      const c = crearLienzo(ancho, alto);
      const g = c.getContext('2d');
      const [x, y, w, h] = [caja[0] * ancho, caja[1] * alto, caja[2] * ancho, caja[3] * alto];
      const { lineas, tamano } = encajar(g, texto, w, h, fuenteTexto, cfg.texto.peso);
      g.font = `${cfg.texto.peso} ${tamano}px ${fuenteTexto}`;
      g.textBaseline = 'middle';
      g.textAlign = alinear;
      const tx = alinear === 'right' ? x + w * 0.97 : alinear === 'left' ? x + w * 0.03 : x + w / 2;
      lineas.forEach((l, i) => g.fillText(l, tx, y + h / 2 + (i - (lineas.length - 1) / 2) * tamano * 1.25));
      glifos[linea] = c;
    }
  }

  function ponerTextos(nuevos, fuente = FUENTE) {
    textos = nuevos;
    fuenteTexto = fuente;
    componerTextos();
  }
  redimensionar(ancho, alto);

  // ---------- 笔画 ----------

  function ponerSello(trazo, x, y, t) {
    trazo.sellos.push(x, y, t);
    const r = trazo.radio;
    const ry = (r * ancho) / alto;
    const c = trazo.caja;
    if (x - r < c[0]) c[0] = x - r;
    if (y - ry < c[1]) c[1] = y - ry;
    if (x + r > c[2]) c[2] = x + r;
    if (y + ry > c[3]) c[3] = y + ry;
  }

  // 沿二次曲线 a → b（控制点 c）每隔固定距离盖一个印。距离以画面宽度为单位。
  function sembrar(trazo, a, c, b) {
    const k = alto / ancho;
    const dist = (p, q) => Math.hypot(q[0] - p[0], (q[1] - p[1]) * k);
    const paso = trazo.radio * cfg.paso;
    const n = Math.max(2, Math.ceil((dist(a, c) + dist(c, b)) / (paso / 2)));
    let previo = a;
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const v = 1 - u;
      const q = [0, 1, 2].map((j) => v * v * a[j] + 2 * v * u * c[j] + u * u * b[j]);
      let desde = previo;
      let tramo = dist(desde, q);
      while (tramo > 0 && trazo.resto + tramo >= paso) {
        const f = (paso - trazo.resto) / tramo;
        desde = [0, 1, 2].map((j) => mezcla(desde[j], q[j], f));
        ponerSello(trazo, desde[0], desde[1], desde[2]);
        tramo = dist(desde, q);
        trazo.resto = 0;
      }
      trazo.resto += tramo;
      previo = q;
    }
  }

  const medio = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];

  function empezarTrazo(tipo, x, y, t, radio) {
    const trazo = {
      tipo,
      radio: radio ?? cfg.pincel[tipo],
      puntos: [[x, y, t]],
      sellos: [],
      caja: [x, y, x, y],
      resto: 0,
      fin: null,
    };
    for (let i = 0; i < TOQUES_INICIO; i++) ponerSello(trazo, x, y, t);
    trazos.push(trazo);
    return trazo;
  }

  // 连线穿过相邻点的中点，转角不出折角。
  function moverTrazo(trazo, x, y, t) {
    const p = trazo.puntos;
    const ultimo = p[p.length - 1];
    if (ultimo[0] === x && ultimo[1] === y) return;
    p.push([x, y, t]);
    const n = p.length;
    if (n === 2) {
      const m = medio(p[0], p[1]);
      sembrar(trazo, p[0], medio(p[0], m), m);
    } else {
      sembrar(trazo, medio(p[n - 3], p[n - 2]), p[n - 2], medio(p[n - 2], p[n - 1]));
    }
  }

  function terminarTrazo(trazo, t) {
    const p = trazo.puntos;
    const n = p.length;
    if (n >= 2) {
      const m = medio(p[n - 2], p[n - 1]);
      sembrar(trazo, m, medio(m, p[n - 1]), p[n - 1]);
    }
    trazo.fin = t;
  }

  // 把一笔截到 t 为止（收笔时手势变化带出来的尾巴不要），按剩下的点重新铺一遍。
  function recortarTrazo(trazo, t) {
    const puntos = trazo.puntos.filter((p, i) => i === 0 || p[2] <= t);
    const [x, y, t0] = puntos[0];
    trazo.puntos = [puntos[0]];
    trazo.sellos = [];
    trazo.caja = [x, y, x, y];
    trazo.resto = 0;
    for (let i = 0; i < TOQUES_INICIO; i++) ponerSello(trazo, x, y, t0);
    for (const p of puntos.slice(1)) moverTrazo(trazo, p[0], p[1], p[2]);
    terminarTrazo(trazo, Math.max(t, t0));
  }

  function alfaTrazo(trazo, t, r = cfg.rebrote[trazo.tipo]) {
    if (trazo.fin == null || t < trazo.fin) return 1;
    let a = 1 - suave((t - trazo.fin - r.mantener) / r.volver);
    for (const ev of eventos) {
      if (ev.t > t) break;
      if (ev.tipo === 'vaho' && ev.t >= trazo.fin) {
        a = Math.min(a, 1 - suave((t - ev.t) / cfg.vaho.rebrote));
      }
    }
    return a;
  }

  // ---------- 事件 ----------

  function agregarEvento(ev) {
    eventos.push(ev);
    eventos.sort((a, b) => a.t - b.t);
  }

  // 哈一口气。abierto：嘴还张着，之后用 moverVaho 跟着嘴走，合上时调 terminarVaho。
  function vaho(t, boca = [0.5, 0.45], fuerza = 1, abierto = false) {
    const ev = { tipo: 'vaho', t, fuerza, ruta: [[t, boca[0], boca[1]]], fin: abierto ? null : t + VAHO_SUELTO };
    agregarEvento(ev);
    return ev;
  }

  function moverVaho(ev, t, boca) {
    if (t - ev.ruta[ev.ruta.length - 1][0] >= PASO_RUTA) ev.ruta.push([t, boca[0], boca[1]]);
  }

  function terminarVaho(ev, t) {
    ev.fin = t;
  }

  // 播放器用：把 JSON 里存的一口气原样放回来
  function cargarVaho({ t, fuerza = 1, boca, ruta, fin }) {
    agregarEvento({ tipo: 'vaho', t, fuerza, ruta: ruta ?? [[t, boca[0], boca[1]]], fin: fin ?? t + VAHO_SUELTO });
  }

  // 这口气在 t 时刻嘴的位置
  function bocaEn(ev, t) {
    let p = ev.ruta[0];
    for (const q of ev.ruta) {
      if (q[0] > t) break;
      p = q;
    }
    return [p[1], p[2]];
  }

  function despejar(t, dur = 1.5) {
    agregarEvento({ tipo: 'despejar', t, dur });
  }

  // completa：满屏都是雾，不用算哪里有雾。hay：画面上可能有雾。
  // resto：结尾散雾时还剩多少（1 还没散，0 散完了）。
  function estadoNiebla(t) {
    let completa = nivelInicial >= 1;
    let hay = nivelInicial > 0;
    let resto = 1;
    for (const ev of eventos) {
      if (ev.t > t) break;
      if (ev.tipo === 'vaho') {
        hay = true;
        resto = 1;
      } else {
        completa = false;
        resto *= 1 - suave((t - ev.t) / ev.dur);
      }
    }
    return { completa, hay, resto };
  }

  function reiniciar(nivel = 1) {
    trazos = [];
    eventos = [];
    nivelInicial = nivel;
  }

  // ---------- 存和取 ----------

  // 录下来的一遍：笔画、哈气、结尾的散雾。坐标和时间取够用的位数。
  function exportar() {
    const r = (v, n) => +v.toFixed(n);
    const vahos = eventos.filter((ev) => ev.tipo === 'vaho');
    const despeje = eventos.findLast((ev) => ev.tipo === 'despejar');
    return {
      trazos: trazos.map((tr) => {
        const ultimo = tr.puntos[tr.puntos.length - 1][2];
        return {
          tipo: tr.tipo,
          ...(tr.linea ? { linea: tr.linea } : {}),
          fin: r(tr.fin ?? ultimo, 3),
          puntos: tr.puntos.map(([x, y, t]) => [r(x, 4), r(y, 4), r(t, 3)]),
        };
      }),
      vaho: vahos.map((ev) => ({
        t: r(ev.t, 3),
        fin: r(ev.fin ?? ev.ruta[ev.ruta.length - 1][0], 3),
        fuerza: r(ev.fuerza, 2),
        ruta: ev.ruta.map(([t, x, y]) => [r(t, 3), r(x, 4), r(y, 4)]),
      })),
      despeje: despeje ? { t: r(despeje.t, 3), dur: r(despeje.dur, 3) } : null,
    };
  }

  // 把一遍放回来（播放器、回放检查用）。从没有雾开始。
  function cargar(datos) {
    reiniciar(0);
    for (const d of datos.trazos ?? []) {
      const [p0, ...resto] = d.puntos;
      const tr = empezarTrazo(d.tipo, p0[0], p0[1], p0[2], datos.pincel?.[d.tipo]);
      if (d.linea) tr.linea = d.linea;
      for (const p of resto) moverTrazo(tr, p[0], p[1], p[2]);
      terminarTrazo(tr, d.fin ?? d.puntos[d.puntos.length - 1][2]);
    }
    for (const v of datos.vaho ?? []) cargarVaho(v);
    if (datos.despeje) despejar(datos.despeje.t, datos.despeje.dur);
  }

  // 实时使用时（测试页、录制台）定期调用：丢掉已经回雾完的笔画和已经结束的事件。
  function podar(t) {
    trazos = trazos.filter((tr) => tr.fin == null || alfaTrazo(tr, t) > 0);
    // 雾散完以后，之前的事件都不用留了
    const i = eventos.findLastIndex((ev) => ev.tipo === 'despejar' && t - ev.t >= ev.dur);
    if (i >= 0) {
      eventos.splice(0, i + 1);
      nivelInicial = 0;
    }
    // 满屏是雾的时候，哈气只是让笔画回雾，过后就可以丢掉；否则它决定哪里有雾，要留着
    if (nivelInicial >= 1 && !eventos.some((ev) => ev.tipo === 'despejar')) {
      const v = cfg.vaho;
      eventos = eventos.filter((ev) => ev.fin == null || t - ev.fin < v.exceso || t - ev.t < v.rebrote);
    }
  }

  // ---------- 画 ----------

  function desenfocar(origen) {
    const factor = 4 + cfg.desenfoque * 28;
    const clave = `${ancho}x${alto}/${factor.toFixed(2)}`;
    if (clave !== claveCadena) {
      claveCadena = clave;
      const factores = [];
      for (let f = 2; f < factor; f *= 2) factores.push(f);
      factores.push(factor);
      cadena = factores.map((f) => {
        const c = crearLienzo(ancho / f, alto / f);
        return [c, c.getContext('2d')];
      });
    }
    let previo = origen;
    for (const [c, g] of cadena) {
      g.drawImage(previo, 0, 0, c.width, c.height);
      previo = c;
    }
    // 在最小的两级上再抹匀一次（叠第二遍），放大后不留块状和棱
    for (let i = cadena.length - 1; i >= 0; i--) {
      const [c, g] = cadena[i];
      if (i < cadena.length - 1) g.drawImage(cadena[i + 1][0], 0, 0, c.width, c.height);
      if (i >= cadena.length - 2) {
        g.globalAlpha = 0.5;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g.drawImage(c, dx, dy);
        g.globalAlpha = 1;
      }
    }
    return cadena[0][0];
  }

  function estampar(g, trazo, t, mw, mh) {
    const s = trazo.sellos;
    const r = trazo.radio * mw;
    let hay = false;
    for (let i = 0; i < s.length; i += 3) {
      if (s[i + 2] > t) break;
      g.drawImage(sello, s[i] * mw - r, s[i + 1] * mh - r, r * 2, r * 2);
      hay = true;
    }
    return hay;
  }

  function construirMascara(t) {
    const clave = `${cfg.dureza}/${cfg.flujo}`;
    if (clave !== claveSello) {
      claveSello = clave;
      sello = crearSello(cfg.dureza, cfg.flujo);
    }
    const mw = mascara.width;
    const mh = mascara.height;
    gMascara.clearRect(0, 0, mw, mh);
    let hay = false;
    hayTinte = false;
    for (const tipo of ['escribir', 'limpiar']) {
      for (const trazo of trazos) {
        if ((trazo.tipo === 'limpiar') !== (tipo === 'limpiar')) continue;
        const alfa = alfaTrazo(trazo, t) * cfg.rebrote[trazo.tipo].fuerza;
        if (alfa <= 0) continue;
        if (alfa >= 0.999) {
          if (estampar(gMascara, trazo, t, mw, mh)) hay = true;
          continue;
        }
        const c = trazo.caja;
        const x = Math.max(0, Math.floor(c[0] * mw) - 1);
        const y = Math.max(0, Math.floor(c[1] * mh) - 1);
        const w = Math.min(mw, Math.ceil(c[2] * mw) + 1) - x;
        const h = Math.min(mh, Math.ceil(c[3] * mh) + 1) - y;
        if (w <= 0 || h <= 0) continue;
        gAparte.clearRect(x, y, w, h);
        if (!estampar(gAparte, trazo, t, mw, mh)) continue;
        gMascara.globalAlpha = alfa;
        gMascara.drawImage(aparte, x, y, w, h, x, y, w, h);
        gMascara.globalAlpha = 1;
        hay = true;
      }
      if (tipo === 'escribir' && hay && cfg.borde > 0) {
        gTinte.globalCompositeOperation = 'copy';
        gTinte.drawImage(mascara, 0, 0);
        gTinte.globalCompositeOperation = 'source-in';
        gTinte.fillStyle = TINTE_BORDE;
        gTinte.fillRect(0, 0, mw, mh);
        hayTinte = true;
      }
    }
    return hay;
  }

  // 哪里有雾：嘴经过的每一处留下一团，按时间顺序叠起来；雾散开时把之前的一起淡掉。
  function construirCobertura(t) {
    const v = cfg.vaho;
    const g = gCobertura;
    const cw = cobertura.width;
    const ch = cobertura.height;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, cw, ch);
    if (nivelInicial > 0) {
      g.fillStyle = `rgba(255,255,255,${nivelInicial})`;
      g.fillRect(0, 0, cw, ch);
    }
    for (const ev of eventos) {
      if (ev.t > t) break;
      if (ev.tipo === 'despejar') {
        g.globalCompositeOperation = 'destination-in';
        g.fillStyle = `rgba(0,0,0,${1 - suave((t - ev.t) / ev.dur)})`;
        g.fillRect(0, 0, cw, ch);
        g.globalCompositeOperation = 'source-over';
        continue;
      }
      const limite = ev.fin == null ? t : Math.min(t, ev.fin + v.inercia);
      for (const [ts, bx, by] of ev.ruta) {
        if (ts > t) break;
        const edad = Math.max(0, limite - ts);
        const r = (v.radioInicial + (v.radio - v.radioInicial) * suave(edad / v.crecer)) * cw;
        const a = Math.min(1, (t - ts) / v.aparecer);
        const x = bx * cw;
        const y = by * ch;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(255,255,255,${a})`);
        grad.addColorStop(0.5, `rgba(255,255,255,${a})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
  }

  // 手掌抹过的横向范围里，把那一行字的字形画到 capaTexto 上。字跟着手掌出现。
  function construirTexto(t) {
    let hay = false;
    for (const trazo of trazos) {
      const glifo = trazo.tipo === 'limpiar' && glifos[trazo.linea];
      if (!glifo) continue;
      const alfa = alfaTrazo(trazo, t, cfg.texto);
      if (alfa <= 0) continue;
      const s = trazo.sellos;
      let x0 = Infinity;
      let x1 = -Infinity;
      for (let i = 0; i < s.length; i += 3) {
        if (s[i + 2] > t) break;
        if (s[i] < x0) x0 = s[i];
        if (s[i] > x1) x1 = s[i];
      }
      if (x1 < x0) continue;
      const r = trazo.radio * ancho;
      const izq = x0 * ancho - r;
      const largo = (x1 - x0) * ancho + r * 2;
      const borde = Math.min(0.5, (r * 0.8) / largo);
      const g = gAparteTexto;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, ancho, alto);
      const grad = g.createLinearGradient(izq, 0, izq + largo, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(borde, '#000');
      grad.addColorStop(1 - borde, '#000');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(izq, 0, largo, alto);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(glifo, 0, 0);
      if (!hay) {
        gTexto.globalCompositeOperation = 'source-over';
        gTexto.clearRect(0, 0, ancho, alto);
      }
      gTexto.globalAlpha = alfa;
      gTexto.drawImage(aparteTexto, 0, 0);
      gTexto.globalAlpha = 1;
      hay = true;
    }
    return hay;
  }

  function dibujar(ctx, fuente, t, { espejo = true } = {}) {
    const fw = fuente.videoWidth || fuente.width;
    const fh = fuente.videoHeight || fuente.height;
    if (!fw || !fh) return;

    // 清晰的画面铺满，多出来的部分居中裁掉
    const escala = Math.max(ancho / fw, alto / fh);
    const sw = ancho / escala;
    const sh = alto / escala;
    ctx.save();
    if (espejo) {
      ctx.translate(ancho, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(fuente, (fw - sw) / 2, (fh - sh) / 2, sw, sh, 0, 0, ancho, alto);
    ctx.restore();

    const { completa, hay, resto } = estadoNiebla(t);
    if (!hay) return;

    // 1 雾底：模糊的画面
    const g = gCapa;
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.drawImage(desenfocar(ctx.canvas), 0, 0, ancho, alto);

    // 2 奶白色雾气
    g.fillStyle = colorNiebla(cfg.calidez, cfg.densidad);
    g.fillRect(0, 0, ancho, alto);

    // 哈气：嘴附近先浓一团，嘴张着就一直跟着嘴，合上以后慢慢散
    for (const ev of eventos) {
      if (ev.t > t) break;
      if (ev.tipo !== 'vaho') continue;
      const edad = t - ev.t;
      const caida = ev.fin == null || t < ev.fin ? 1 : 1 - suave((t - ev.fin) / cfg.vaho.exceso);
      if (caida <= 0) continue;
      const a = ev.fuerza * cfg.vaho.intensidad * Math.min(1, edad / cfg.vaho.subida) * caida;
      const [bx, by] = bocaEn(ev, t);
      const x = bx * ancho;
      const y = by * alto;
      const r = (0.16 + 0.26 * Math.min(1, edad / cfg.vaho.exceso)) * ancho;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, colorNiebla(cfg.calidez, a));
      grad.addColorStop(0.5, colorNiebla(cfg.calidez, a * 0.55));
      grad.addColorStop(1, colorNiebla(cfg.calidez, 0));
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // 3 极淡的颗粒
    if (cfg.grano > 0) {
      g.globalAlpha = cfg.grano;
      g.fillStyle = patronGrano;
      g.fillRect(0, 0, ancho, alto);
      g.globalAlpha = 1;
    }

    if (construirMascara(t)) {
      // 5 水痕：蒙版软边的地方雾只擦掉一半，染上的深色正好留在这一圈
      if (hayTinte) {
        g.globalAlpha = cfg.borde;
        g.drawImage(tinte, 0, 0, ancho, alto);
        g.globalAlpha = 1;
      }
      // 4 擦开的地方：把雾挖掉，露出下面清晰的画面
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(mascara, 0, 0, ancho, alto);
    }

    // 手掌抹出来的字：字形处的雾完全挖掉
    const hayTexto = construirTexto(t);
    if (hayTexto) {
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(capaTexto, 0, 0);
    }

    // 雾没铺满：只留下有雾的地方
    if (!completa) {
      construirCobertura(t);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(cobertura, 0, 0, ancho, alto);
      if (hayTexto) {
        gTexto.globalCompositeOperation = 'destination-in';
        gTexto.drawImage(cobertura, 0, 0, ancho, alto);
      }
    }
    g.globalCompositeOperation = 'source-over';

    ctx.drawImage(capa, 0, 0, ancho, alto);

    // 字里面略微压暗一点：擦干净的玻璃比起雾的地方暗，浅色背景上字也看得清
    if (hayTexto && cfg.texto.tinte > 0) {
      gTexto.globalCompositeOperation = 'source-in';
      gTexto.fillStyle = TINTE_BORDE;
      gTexto.fillRect(0, 0, ancho, alto);
      // 雾散开时字要比雾先淡掉，不然雾快没了，字还浮在清晰的脸上
      ctx.globalAlpha = cfg.texto.tinte * resto * resto;
      ctx.drawImage(capaTexto, 0, 0);
      ctx.globalAlpha = 1;
    }
  }

  return {
    config: cfg,
    redimensionar,
    empezarTrazo,
    moverTrazo,
    terminarTrazo,
    recortarTrazo,
    vaho,
    moverVaho,
    terminarVaho,
    cargarVaho,
    exportar,
    cargar,
    ponerTextos,
    despejar,
    reiniciar,
    podar,
    dibujar,
    get trazos() {
      return trazos;
    },
  };
}
