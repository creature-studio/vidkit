// Canvas2D render layer. draw(ctx, local, info) is called every frame while its scene is on screen
// (or always, for video-level layers). The backing store follows devicePixelRatio so `vk render --scale 2` stays sharp.
// info: {t, local, p, W, H, fps, frame, beats, scene, video}
export class CanvasLayer {
  constructor(video, draw, o = {}) {
    this.video = video; this.draw = draw; this.o = o;
    const c = this.el = document.createElement('canvas'); c.className = 'vk-canvas';
    this.dpr = Math.max(1, Math.min(4, window.devicePixelRatio || 1));
    c.width = Math.round(video.W * this.dpr); c.height = Math.round(video.H * this.dpr);
    if (o.blend) c.style.mixBlendMode = o.blend;
    this.ctx = c.getContext('2d');
  }
  render(local, info) {
    const g = this.ctx; g.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.o.keep) g.clearRect(0, 0, this.el.width, this.el.height);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.save(); this.draw(g, local, info); g.restore();
  }
}
