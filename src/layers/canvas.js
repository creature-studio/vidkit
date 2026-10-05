// Canvas2D render layer. draw(ctx, local, info) is called every frame while its scene is on screen
// (or always, for video-level layers). The backing store follows devicePixelRatio so `vk render --scale 2` stays sharp.
// info: {t, local, p, W, H, fps, frame, frameT, beats, scene, video}
// o.motionBlur: {shutter:'1/40', samples:4} (or true) → in-page sub-frame motion blur: draw() runs once per sample time
// inside the shutter window and the samples are averaged (additive, 1/N each = exact mean of premultiplied pixels).
// Skipped when `vk render` already averages sub-frames in the capture pipeline (?mb=1), so nothing is blurred twice.
import { motionBlurCfg, subTimes } from '../fx/mg/math.js';

export class CanvasLayer {
  constructor(video, draw, o = {}) {
    this.video = video; this.draw = draw; this.o = o;
    const c = this.el = document.createElement('canvas'); c.className = 'vk-canvas';
    this.dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
    c.width = Math.round(video.W * this.dpr); c.height = Math.round(video.H * this.dpr);
    if (o.blend) c.style.mixBlendMode = o.blend;
    this.ctx = c.getContext('2d');
    this.mb = o.motionBlur && !o.keep ? motionBlurCfg(o.motionBlur === 'video' ? video.cfg.motionBlur : o.motionBlur, video.fps) : null;
  }
  render(local, info) {
    const g = this.ctx; g.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.o.keep) g.clearRect(0, 0, this.el.width, this.el.height);
    const mb = this.mb && !this.video.mbPipeline ? this.mb : null;
    if (!mb) { g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); g.save(); this.draw(g, local, info); g.restore(); return; }
    if (!this.off) { this.off = document.createElement('canvas'); this.off.width = this.el.width; this.off.height = this.el.height; this.og = this.off.getContext('2d'); }
    const og = this.og, ts = subTimes(info.t, mb.shutter, mb.samples, mb.phase), fps = info.fps || this.video.fps;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 / ts.length;
    for (const tt of ts) {
      og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, this.off.width, this.off.height); og.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const dl = local - (info.t - tt);
      og.save(); this.draw(og, dl, { ...info, t: tt, local: dl, frame: Math.floor(tt * fps), sub: true }); og.restore();
      g.drawImage(this.off, 0, 0);
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
}
