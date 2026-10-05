// Built-in style packs (styles/<id>/style.json + style.js), bundled by esbuild. Order = gallery order.
import inkData from '../../styles/ink/style.json';
import ink from '../../styles/ink/style.js';
import papercutData from '../../styles/papercut/style.json';
import papercut from '../../styles/papercut/style.js';
import shadowData from '../../styles/shadow/style.json';
import shadow from '../../styles/shadow/style.js';
import operaData from '../../styles/opera/style.json';
import opera from '../../styles/opera/style.js';
import techData from '../../styles/tech/style.json';
import tech from '../../styles/tech/style.js';
import neonData from '../../styles/neon/style.json';
import neon from '../../styles/neon/style.js';
import pixelData from '../../styles/pixel/style.json';
import pixel from '../../styles/pixel/style.js';
import crayonData from '../../styles/crayon/style.json';
import crayon from '../../styles/crayon/style.js';
import reelData from '../../styles/reel/style.json';
import reel from '../../styles/reel/style.js';

export const PACKS = [
  { data: inkData, make: ink }, { data: papercutData, make: papercut }, { data: shadowData, make: shadow }, { data: operaData, make: opera },
  { data: techData, make: tech }, { data: neonData, make: neon }, { data: pixelData, make: pixel }, { data: crayonData, make: crayon },
  { data: reelData, make: reel },
];
