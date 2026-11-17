// Solmara: every tuning number, colour and story beat in one place.
// The city is a grid of blocks split by roads; the beach and the sea sit
// on the east edge. Nothing here names a real place or a commercial game.

export const CITY = {
  blocks: 7, // blocks across and down
  pitch: 62, // road centre to road centre, in metres
  roadWidth: 14,
  blockSize: 48,
  bound: 235, // half-width of the drivable city, in metres
  beachX: 245, // where the sand starts
  waterX: 285, // where the sea starts
};

export const STEP = 1 / 60;

export const PLAYER = {
  walkSpeed: 6.5,
  runSpeed: 10.5,
  accel: 40,
  radius: 0.55,
  maxHealth: 100,
  startCash: 150,
};

export const CAR = {
  accel: 16,
  brake: 30,
  maxSpeed: 42,
  maxReverse: 13,
  steer: 1.9,
  radius: 2.4,
  length: 4.6,
  width: 2.0,
};

export const TRAFFIC_COUNT = 14;
export const PED_COUNT = 26;
export const COP_CAR_MAX = 4;

export const WANTED = {
  stealCar: 25,
  shoot: 12,
  hitPed: 20,
  hitCop: 30,
  kill: 25,
  decayPerSecond: 2.5,
  calmSeconds: 8,
};

// Stars from heat: 0 heat = clean, then one star per 20 heat, capped at 5.
export function starsForHeat(heat) {
  if (heat <= 0) return 0;
  return Math.min(5, 1 + Math.floor(heat / 20));
}

export const PALETTE = {
  skyDay: 0x8ec9e8,
  skyDusk: 0x2e3a5c,
  skyNight: 0x0b1026,
  sunDay: 0xfff2d8,
  sunDusk: 0xffb36b,
  fogDay: 0xa8c8dd,
  ground: 0x3d3a35,
  road: 0x2b2b30,
  roadLine: 0xd8c86a,
  sidewalk: 0x8a8578,
  sand: 0xe3c98f,
  water: 0x1e6f8e,
  building: [0xe8b48c, 0xd98f7a, 0x9fb8c8, 0xc9a86a, 0xb98a9e, 0x7fa88f, 0xe0d0b0, 0xa8a0c8],
  glass: 0x2e4a5e,
  palm: 0x3f7a3a,
  trunk: 0x6b4a2f,
  playerJacket: 0xe8533f,
  playerPants: 0x2b3440,
  copCar: 0x1c2f4a,
  copLightRed: 0xff2a2a,
  copLightBlue: 0x2a6bff,
  taxi: 0xf5c542,
  marker: 0xffc93c,
};

export const STORY = {
  city: 'Solmara',
  hero: 'Mara Voss',
  fixer: 'Dante Kroll',
  rival: 'the Salt Kings',
  intro:
    'Mara Voss came to Solmara with $150 and a grudge. Dante Kroll, the fixer who runs the Marina, has work for anyone fast enough to take it.',
};

export const MISSIONS = [
  {
    id: 'm1-meet-dante',
    title: 'First Day in Solmara',
    brief: 'Dante Kroll runs jobs out of the Marina. Walk to the gold marker and talk to him.',
    reward: 200,
    steps: [
      { kind: 'goto', x: 150, z: -120, radius: 5, text: 'Reach Dante at the Marina' },
      { kind: 'talk', x: 150, z: -120, radius: 4, text: 'Talk to Dante (press E)' },
    ],
  },
  {
    id: 'm2-borrowed-wheels',
    title: 'Borrowed Wheels',
    brief: 'Dante needs wheels. Steal the red coupe parked by the plaza and bring it to the garage on Palm Row.',
    reward: 350,
    steps: [
      { kind: 'steal', x: -31, z: 62, radius: 6, text: 'Steal the red coupe by the plaza (press E)' },
      { kind: 'drive', x: -155, z: 93, radius: 7, text: 'Drive the coupe to the garage on Palm Row' },
    ],
  },
  {
    id: 'm3-heat-on-the-strip',
    title: 'Heat on the Strip',
    brief: 'The coupe was hot. The Solmara PD is on you — lose the wanted level, then reach the hideout.',
    reward: 400,
    steps: [
      { kind: 'wanted', text: 'Lose the police (stay out of sight until the stars clear)' },
      { kind: 'goto', x: 93, z: 155, radius: 6, text: 'Reach the hideout on Coral Street' },
    ],
  },
  {
    id: 'm4-package-run',
    title: 'The Package Run',
    brief: 'Pick up the package at the docks and deliver it to the north pier before the clock runs out.',
    reward: 600,
    timeLimit: 75,
    steps: [
      { kind: 'goto', x: 200, z: 155, radius: 5, text: 'Pick up the package at the docks' },
      { kind: 'drive', x: 186, z: -186, radius: 7, text: 'Deliver the package to the north pier' },
    ],
  },
  {
    id: 'm5-rooftop-standoff',
    title: 'Rooftop Standoff',
    brief: 'The Salt Kings want the package back. Clear the plaza of their crew, then get to the extraction car.',
    reward: 1000,
    steps: [
      { kind: 'clear', x: -31, z: 0, radius: 26, count: 4, text: 'Clear the plaza of Salt Kings crew (0/4)' },
      { kind: 'goto', x: -62, z: -31, radius: 6, text: 'Reach the extraction car' },
    ],
  },
];

export const SAVE_KEY = 'solmara-save-v1';
