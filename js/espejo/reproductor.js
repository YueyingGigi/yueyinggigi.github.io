// 播放器：干净视频 + 一遍的 JSON → 雾镜画面。
// 独立、轻：只用 canvas 2D 和 niebla.js，不响应鼠标和触摸，不依赖页面结构。
import { crearNiebla } from './niebla.js';

// canvas：画雾镜的 canvas；video：干净视频的 <video>（可以隐藏）；datos：一遍的 JSON；
// textos：{ intro: '…', bienvenida: ['…', '…'] }；fuente：两行字用的字体；
// ajustar：false 表示 canvas 的像素尺寸由调用方定，不跟着显示尺寸变；
// autopausa：false 表示不管在不在视口里都照常播（canvas 不在页面上时用）。
export function crearEspejo({
  canvas,
  video,
  datos,
  textos = {},
  fuente,
  config = {},
  ajustar = true,
  autopausa = true,
}) {
  const ctx = canvas.getContext('2d');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;

  const niebla = crearNiebla({
    ancho: canvas.width,
    alto: canvas.height,
    // datos.ajustes：录的时候调过的雾的数值，播放时用同样的
    config: { ...datos.ajustes, ...config, pincel: { ...datos.pincel, ...config.pincel } },
  });

  function ponerDatos(nuevos) {
    datos = nuevos;
    niebla.cargar(datos);
    ponerTextos();
  }

  function ponerTextos() {
    const zonas = datos.zonas ?? {};
    const lineas = {};
    if (textos.intro && zonas.B) lineas.intro = { texto: textos.intro, caja: zonas.B, alinear: 'center' };
    if (textos.bienvenida && zonas.C) {
      lineas.bienvenida = { texto: [].concat(textos.bienvenida).join('\n'), caja: zonas.C, alinear: 'right' };
    }
    niebla.ponerTextos(lineas, fuente);
  }

  ponerDatos(datos);

  // 雾的时间线跟着视频走：视频卡顿、循环回到 0，字和手仍然对得上
  function dibujar(t = video.currentTime) {
    if (video.readyState >= 2) niebla.dibujar(ctx, video, t, { espejo: true });
  }

  const conCuadros = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  let pedido = null;
  let vivo = true;

  function bucle(_, meta) {
    if (!vivo) return;
    dibujar(meta?.mediaTime);
    pedir();
  }
  function pedir() {
    pedido = conCuadros ? video.requestVideoFrameCallback(bucle) : requestAnimationFrame(() => bucle());
  }
  pedir();

  // canvas 用显示尺寸的 1 倍分辨率，不乘 devicePixelRatio
  let observadorTamano = null;
  if (ajustar) {
    observadorTamano = new ResizeObserver(() => {
      const w = Math.round(canvas.clientWidth);
      const h = Math.round(canvas.clientHeight);
      if (!w || !h || (w === canvas.width && h === canvas.height)) return;
      canvas.width = w;
      canvas.height = h;
      niebla.redimensionar(w, h);
      dibujar();
    });
    observadorTamano.observe(canvas);
  }

  // 不在视口内、或标签页隐藏时自动暂停
  let quiereSonar = false;
  let enVista = true;
  const actualizar = () => {
    const puede = !autopausa || (enVista && !document.hidden);
    if (quiereSonar && puede) video.play().catch(() => {});
    else video.pause();
  };
  let observadorVista = null;
  if (autopausa) {
    observadorVista = new IntersectionObserver(([entrada]) => {
      enVista = entrada.isIntersecting;
      actualizar();
    });
    observadorVista.observe(canvas);
    document.addEventListener('visibilitychange', actualizar);
  }

  return {
    play() {
      quiereSonar = true;
      actualizar();
    },
    pause() {
      quiereSonar = false;
      actualizar();
    },
    setTextos(nuevos, nuevaFuente = fuente) {
      textos = nuevos;
      fuente = nuevaFuente;
      ponerTextos();
      dibujar();
    },
    // 回放检查改了数据以后重新载入
    setDatos(nuevos) {
      ponerDatos(nuevos);
      dibujar();
    },
    dibujar,
    destroy() {
      vivo = false;
      if (pedido != null) {
        if (conCuadros) video.cancelVideoFrameCallback(pedido);
        else cancelAnimationFrame(pedido);
      }
      observadorTamano?.disconnect();
      observadorVista?.disconnect();
      document.removeEventListener('visibilitychange', actualizar);
      video.pause();
    },
  };
}
