export function drawTokenRing(token, color, { width, alpha }) {
  const graphics = new PIXI.Graphics();
  const radius = Math.max(token.w, token.h) / 2 + 6;
  graphics.lineStyle(width, color, alpha);
  graphics.drawCircle(token.w / 2, token.h / 2, radius);
  token.addChild(graphics);
  return graphics;
}
