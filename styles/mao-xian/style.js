// Scaffolded runtime for "mao-xian" (from base "pixel"). Honest starter: reuse the base pack's hooks via composition.
// Edit hooks / title / effect / music; `vk style new` only fills schema + this shell + peek checks — not a magic look transfer.
import base from '../pixel/style.js';
export default vk => {
  const B = base(vk);
  return {
    ...B,
    // override examples:
    // title(sc, text, o = {}, S) { return B.title(sc, text, o, S); },
    // effect(sc, name, o = {}, S) { return B.effect(sc, name, o, S); },
  };
};
