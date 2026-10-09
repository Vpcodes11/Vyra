// Shared scroll beats keep copy, camera movement and lighting in sync.
export const clamp = value => Math.min(1, Math.max(0, value));
export const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const chapterStops = [0.08, 0.35, 0.52, 0.68];
export function experienceBeat(progress) {
  const p = clamp(progress);
  return {
    chapter: p < 0.28 ? 0 : p < 0.46 ? 1 : p < 0.62 ? 2 : 3,
    focus: smooth((p - 0.23) / 0.08) * (1 - smooth((p - 0.73) / 0.07)),
    scan: smooth((p - 0.41) / 0.055) + smooth((p - 0.57) / 0.055),
    turn: smooth((p - 0.16) / 0.13),
    returnTurn: smooth((p - 0.75) / 0.09),
    lineup: smooth((p - 0.82) / 0.10),
    copy: 1 - smooth((p - 0.77) / 0.055),
  };
}
