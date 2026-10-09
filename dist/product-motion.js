import {smooth} from './experience-timeline.js';

// Angles are in radians. Distance is continuous, including halfway between slots.
export function carouselPose(offset, logical, seconds, pointerX=0, pointerY=0, motion=true, velocity=0) {
  const focus=1-smooth(Math.abs(offset));
  const phase=motion?seconds*.42+logical*.71:0;
  const sway=motion?Math.sin(phase):0;
  const turn=(Math.abs(logical)%2===1?Math.PI*.78:-Math.PI*.34)+offset*.12;
  const transfer=motion?Math.atan(velocity)*.30:0;
  return {
    focus,
    depth:.30*focus-.44*Math.abs(offset)**1.4,
    float:motion?Math.sin(phase*.83)*.026:0,
    pitch:.10+.14*focus+(motion?Math.cos(phase*.91)*.065*focus:0)+(motion?pointerY*.17*focus:0),
    yaw:turn*(1-focus)+focus*(.20+sway*.15+(motion?pointerX*.42:0))-transfer,
    roll:.32*focus+Math.sin(logical*1.9)*.045*(1-focus)+sway*.025*focus+transfer*.08,
    lidPitch:.50+sway*.045,
    lidYaw:motion?seconds*.14:0,
    lidRoll:-.04+sway*.065,
    basePitch:.20-sway*.045,
    baseYaw:motion?-seconds*.11:0,
    baseRoll:.045-sway*.045
  };
}

// The closing row is viewed obliquely: nearer left ends show their bases,
// while the receding right side exposes its lids.
export function lineupPose(offset,mobile=false) {
  return {
    x:offset*(mobile?.28:.094),
    y:(mobile?.09:.065)+offset*.010,
    depth:-offset*.20-offset*offset*.025,
    pitch:.16+offset*.07,
    yaw:-.10+offset*.09,
    roll:.22+Math.sin(offset*.5)*.015
  };
}
