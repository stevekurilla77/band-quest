/* Band Quest — ORIGINAL hand-authored pixel art. Every sprite is a grid of palette letters drawn
   by hand in this file and rendered to canvas at load time. No external or AI-generated art. */
(() => {
'use strict';
const PAL = {
  s:'#ffd9b8', S:'#e8b48c', k:'#1a1030', w:'#ffffff', W:'#c8d0e8', r:'#e83a4a', R:'#9c1c30', y:'#ffd23f', Y:'#c08a10',
  h:'#4a2a12', e:'#1a1030', b:'#3a6ee8', B:'#1f3c94', p:'#26205a', o:'#2b2b2b', g:'#4ec04e', G:'#237a34',
  n:'#a8642a', N:'#5a3412', c:'#ff9ab0', O:'#ff8c42', l:'#7cc0ff', L:'#3d7fc4', v:'#9b5de5', V:'#5a2a9a',
  x:'#9aa0b4', X:'#4a4e66', t:'#ffe9a0', m:'#2e2e3e', z:'#f2f6ff'
};
// one friendly skin tone for every hero (no skin-colour picker); hair style is the hero's look choice
const HAIRS = ['short', 'long'];
// hero skin: a neutral warm medium tan (s), a darker shade (S) for the shadow under the hat brim + neck, and a rose-brown mouth (c)
const HERO_PAL = { s:'#c68b59', S:'#a06a3e', c:'#8e4a3c' };

// hero: head + torso + legs (facing right)
const HEAD = [
"......rr", ".....rrrr", "......rr", ".....kkkkk", "....kwwwwwk", "....kyyyyyk", "....kwwwwwk",
"...kkkkkkkkkk", "....khhSSSSk", "....khsssesk", "....khssssssk", "....kkssscsk", ".....kkSssk"];
const TORSO = ["....kbbyybbk", "...kbbbyybbbk", "...kbbbyybbbsk", "...ksbbyybbbk", "....kBBBBBBk"];
const LEGS = {
  stand:["....kppkkppk", "....kppkkppk", "...koookkoook"],
  run1: ["....kppkkppk", "...kppk..kppk", "..koook...koook"],
  run2: [".....kpppk", ".....kppk", "....koook"],
  jump: ["...kppkkppk", "..kppk..kpppk", "..kook....kook"],
};
const HERO = {}; for (const k in LEGS) HERO[k] = [...HEAD, ...TORSO, ...LEGS[k]];
// long hair: flows out from under the band hat and down the hero's back (drawn BEHIND the body; H = highlight)
const LONG_HAIR = [["....kkk", "..kkhhhk", ".khhHhhk", ".khhHhhk", "khhHhhhk", "khhHhhhk", "khhhHhhk", ".khhHhk", ".khhhhk", "..khhk", "...kk"], 0, 7];
const HAIR_PAL = { H:'#7a4a22' };

// instruments, drawn over the hero (facing right; mouth at col 9,row 11): [rows, offsetX, offsetY]
const INSTR = {
  // flute: silver, held level to the right, lip plate at the lips, key cups along the tube
  flute: [[
"...kkk",
"..kwWWkkkkkkkkkkkk",
"..kWWxWXWXWXWXWWXk",
"...kxxXxxxxxxxxxXk",
"....kkkkkkkkkkkkk"], 8, 10],
  // clarinet: black wood, silver ligature/rings/keys, barrel, flared bell, angled down & out from the mouth
  clarinet: [[
"ooW",
".kWk",
"..kXmk",
"..kXmmk",
"...kWWk",
"...kXmWk",
"....kXmk",
"....kWWk",
"...kXmmmk",
"..kXXmmmmk"], 9, 11],
  // saxophone: gold body, neck curving from the mouthpiece, key pads, U-bow and an upturned flared bell
  sax: [[
"..kkkk",
".kyyyyk",
"ookkkyyk..kkkkkkk",
"....kyytk.kYYYYYk",
".....kYyk..kyyyk",
".....kyyk..kyyk",
".....kYytk.kyyk",
".....kyyyk.kyyk",
".....kYyyyykyyk",
"......kyyyyyyk",
".......kkkkkk"], 9, 9],
  // trumpet: mouthpiece + leadpipe, three valves with finger buttons, tubing loop below, flared bell
  trumpet: [[
"....W.W.W......kk",
"...kxkxkxk....kyk",
"kkkkyyyyyykkkkkyk",
"oyyyyyyyyyyyyyyyk",
"kkkkyYyYyYkkkkkyk",
"...kyyyyyyyyyk.kyk",
"...kykkkkkkkyk..kk",
"...kyyyyyyyyyk",
"....kkkkkkkkk"], 10, 8],
  // trombone: bell section over the shoulder with a big forward bell, long slide of two parallel tubes
  trombone: [[
".......kkk",
"......kyyk",
"..kkkkyyYk",
"..kyyyyyYk",
"..kkkkyyYk",
"......kyyk",
".kkkkkkkkkkkkkk",
"oyyyyyyyyyyyyyyk",
"kkkkkkkykkkkkkyk",
".kyyyyyyyyyyyyyk",
"..kkkkkykkkkkkk"], 10, 4],
  // euphonium: silver, big bell pointing UP beside the head, valve block, coiled tubing in front of the chest
  euphonium: [[
"...kkkkkkk",
"..kWWWWWWWk",
"..kXXXXXXXk",
"...kxxxxxk",
"....kWxxk",
".....kWxk",
"..W.WkWxk",
".kxkxkWxk",
".kxkxkxxk",
".kxxxxxxxk",
"okxXxXxxxk",
"kxxkkkkxxxk",
"kxkXXXXkxxk",
"kxkXXXXkxxk",
"kWxkkkkxxk",
".kxxxxxxk",
"..kkkkkk"], 10, 1],
};
const NOTE_COLORS = { flute:'#7cc0ff', clarinet:'#b8f35b', sax:'#ffd23f', trumpet:'#ff8c42', trombone:'#ff4f79', euphonium:'#c8b6ff' };

// enemies (16x16-ish, 2 frames each)
const EN = {
  imp: { pal:{}, f:[[
"..k.........k", ".kWk.......kWk", ".kWWk.....kWWk", "..kllkkkkkkllk", "..kllllllllllk", ".kllwkllllwkllk",
".kllwkllllwkllk", ".kllllllllllllk", ".kllkWkWkWkllk", "..kllkkkkkkllk", "...kllllllllk", "..kLllllllllLk",
"..kLLkkkkkkLLk", "..kk.......kk"], null], legs:[["..kk.......kk"],[".kk.........kk"]] },
  chicken: { f:[[
"......rr", ".....rrr", "....kyyyk", "...kyyekyk", "...kyyyyyOO", "....kyyyyk", "....kyyyyyk", "...kyyyyyyyk",
"..kyyyyyyyyyk", "..kyyyyWyyyyk", "..kyyyyyyyyk", "...kyyyyyyk", "....kkkkkk"], null], legs:[[".....O..O", "....OO..OO"],["....O....O", "...OO...OO"]] },
  ginger: { f:[[
".....kkkkk", "....knnnnnk", "...knnnnnnnk", "...knkWnkWnk", "...knnnnnnnk", "...knWWWWWnk", "....knnnnnk",
".kkknnnnnnnkkk", "knnnnnrnnnnnnk", "kWnnnnnnnnnnWk", ".kkknnrnnnnkkk", "...knnnnnnnk", "...knnnnnnnk"], null],
    legs:[["..knnk...knnk", "..kWWk...kWWk", "..kkk.....kkk"],["...knnk.knnk", "...kWWk.kWWk", "...kkk...kkk"]] },
  wisp: { f:[[
".......k", "......kyk", "......kyk", ".....kyyyk", "kkkkkkyyyykkkkk", "kyyyyyyyyyyyyyk", ".kyyykyyykyyyk",
"..kyyykyyykyk", "...kyyyyyyyk", "...kyyyccyyyk", "..kyyyyyyyyyyk", "..kyyk...kyyyk", ".kyk.......kyyk", ".kk.........kk"], null] },
  ghost: { f:[[
".....kkkkkk", "...kkwwwwwwkk", "..kwwwwwwwwwwk", ".kwwwkwwwwkwwwk", ".kwwwkwwwwkwwwk", ".kwwwwwwwwwwwwk",
".kwwwwwkkkwwwwk", ".kwwwwwwrrgwwwk", ".kwwwwwwwwwwwwkk", "kwwwwwwwwwwwwwwk", "kwkwwwwwwwwwwkwk", ".kWwwwwwwwwwwWk",
".kWwwwwwwwwwwWk"], null], legs:[[".kwwkwwwkwwwkwk", "..kk.kkk.kkk.kk"],[".kwkwwwkwwwkwwk", ".kk.kkk.kkk.kk"]] },
  gremlin: { f:[[
".......kkk", ".....kkvvvkk", "....kvvvvvvvk", "...kvvwkvvwkvk", "...kvvwkvvwkvk", "..kvvvvvvvvvvvk",
"..kvvkvvvvvkvvk", "..kvvvkkkkkvvvk", "..kvvvvvvvvvvvk", "..kvvVvvvvvVvvk", "...kvvvvvvvvvk", "....kkkkkkkkk"], null],
    legs:[["....kVk...kVk"],["...kVk.....kVk"]] },
};
// "mix-in" enemies that show up in EVERY world alongside that world's own enemy. Full frames, drawn facing LEFT.
const MIX = {
  // Mr. Dinosaur: big friendly cartoon dino, BROWN with white spots, lighter tan belly and his red bow tie (walks, takes 2 note hits)
  dino: { pal:{ g:'#a5693a', G:'#6b3f1f', t:'#e2b47e', O:'#f0b45a', z:'#ffffff' }, f:[[
"....kkkkkk..........", "...kgggzggk..kk.....", "..kggggzzggkkOOk....", ".kggwwkgggggkOOk....", ".kggwkkggggggkk.....",
"kggggggggggggk.kk...", "kgkgggggggzzggkOOk..", "kggggggggggzgggkk...", ".kcggggggggggggk....", "..kkkkkkgggggggk....",
"...krkkkrkggggzgk...", "...krrkrrkggggzzgk..", "...krkkkrkgggggggzkk", "..kgktttttggzgggggGk", "...kttttttggzzgggkk.",
"....kttttgggggggk...", ".....kkkkkkkkkkk....", ".....kGGk...kGGk....", "....kkkk...kkkk....."
  ],[
"....kkkkkk..........", "...kgggzggk..kk.....", "..kggggzzggkkOOk....", ".kggwwkgggggkOOk....", ".kggwkkggggggkk.....",
"kggggggggggggk.kk...", "kgkgggggggzzggkOOk..", "kggggggggggzgggkk...", ".kcggggggggggggk....", "..kkkkkkgggggggk....",
"...krkkkrkggggzgk...", "...krrkrrkggggzzgkk.", "...krkkkrkgggggggzGk", "..kgktttttggzggggkk.", "...kttttttggzzgggk..",
"....kttttgggggggk...", ".....kkkkkkkkkkk....", "......kGGk.kGGk.....", ".....kkkk.kkkk......"
  ]] },
  // Meep the green alien: one big eye, TWO antennas with yellow ball tips (they droop + spread while hopping), hops around.
  // The antennas sit in the top 3 rows, above the 12x14 hitbox, so collision is unchanged.
  meep: { pal:{ g:'#8ef05a', G:'#3a9a2e', c:'#ffb0c8' }, f:[[
"..kk......kk..", ".kyyk....kyyk.", "..kkG....Gkk..", "....kG..Gk....", "....kkkkkk....", "...kggggggk...",
"..kggwwwwggk..", ".kggwwkkwwggk.", ".kggwwkkwwggk.", ".kgggwwwwgggk.", ".kcggggggggck.", ".kggkggggkggk.",
"..kggkkkkggk..", "...kggggggk...", "....kkkkkk....", "...kGk..kGk...", "..kkkk..kkkk.."
  ],[
"..............", ".kk........kk.", "kyyk......kyyk", ".kkGGk..kGGkk.", "....kkkkkk....", "...kggggggk...",
"..kggwwwwggk..", ".kggwwkkwwggk.", ".kggwwkkwwggk.", ".kgggwwwwgggk.", ".kcggggggggck.", ".kgggkkkkgggk.",
"..kggkwwkggk..", "...kggggggk...", "....kkkkkk....", "....kGkkGk....", "....kk..kk...."
  ]] },
  // Burney, a cute little dragon: flaps along in a wave
  dragon: { pal:{ O:'#ff8c42', t:'#ffe9a0', c:'#ff6fa0', C:'#c23a6a' }, f:[[
"..........kk.kk...", ".........kcckcck..", "...k.k...kccccck..", "..kOkOk...kcccck...", ".kOOOOOk...kcck....",
"kOwkOOOOk..kkk.....", "kOkkOOOOOkkOOk.....", "kOOOOOOOOOOOOOk....", ".kcOOOtttOOOOOOkk..", "..kkkOtttttOOOOOOk.",
"....kOttttOOkkOOOk", ".....kOOOOOk..kkk.", ".....kOk.kOk......", "......k...k......."
  ],[
"..................", "..................", "...k.k............", "..kOkOk...........", ".kOOOOOk..........",
"kOwkOOOOk..kkk.....", "kOkkOOOOOkkOOk.....", "kOOOOOOOOOOOOOk....", ".kcOOOtttOOccccckk.", "..kkkOtttttkcccccck",
"....kOttttOOkkccck", ".....kOOOOOk..kkk.", ".....kOk.kOk......", "......k...k......."
  ]] },
  // Hedgehog archer: frames 0-1 shuffle, 2 = wind-up (quills up, arm back), 3 = throw (arm forward)
  hedgehog: { pal:{ n:'#a8642a', N:'#5a3412', t:'#ffd9a0', c:'#ff9ab0', y:'#ffd23f' }, f:[[
"......k.k.k.k...", ".....knknknknk..", "....knNnNnNnNnk.", "...kttkNnNnNnNnk", "..kttktkNnNnNnNk", ".kktttttkNnNnNnk",
"kkttctttttkNnNnk", ".kttttttttkNnNk.", "..kkttttttkkkk..", "...kk.kk..kk.kk."
  ],[
"......k.k.k.k...", ".....knknknknk..", "....knNnNnNnNnk.", "...kttkNnNnNnNnk", "..kttktkNnNnNnNk", ".kktttttkNnNnNnk",
"kkttctttttkNnNnk", ".kttttttttkNnNk.", "..kkttttttkkkk..", "....kk.kk.kk.kk."
  ],[
"..ky.ky.ky.ky...", "...kykykykykyk..", "....knNnNnNnNnk.", "...kttkNnNnNnNnk", "..kttwtkNnNnNnNk", ".kktttttkNnNnNnk",
"kkttctttttkttkNk", ".kttttttttktkNk.", "..kkttttttkkkk..", "...kk.kk..kk.kk."
  ],[
"......k.k.k.k...", ".....knknknknk..", "....knNnNnNnNnk.", "...kttkNnNnNnNnk", "..kttktkNnNnNnNk", "kkktttttkNnNnNnk",
"ttkkctttttkNnNnk", ".kttttttttkNnNk.", "..kkttttttkkkk..", "...kk.kk..kk.kk."
  ]] },
  // Froppy (World 3 workshop): a cute green frog in a little Santa hat who throws pianos. Frames: 0-1 idle (bob), 2 = wind-up
  // (arms up, the piano is drawn above his head by the game), 3 = throw (arm forward). The hat sits above the 14x13 hitbox.
  frog: { pal:{ g:'#7ed957', G:'#3f9a3a', t:'#e4f7b0', W:'#e8f0ff' }, f:[
    ["...........kk.....", "..........kWWk....", ".........krkk.....", "........krrk......", ".......krrrk......", "...kkkkWWWWkkkk...", "..kwwwwkkkkwwwwk..", ".kwkkwwwkkwkkwwwk.", ".kwkkwwwggwkkwwwk.", ".kgwwwwggggwwwwgk.", ".kggggggggggggggk.", ".kgcggggggggggcgk.", ".kgkggggggggggkgk.", "..kgkkkkkkkkkkgk..", "..kggttttttttggk..", ".kgGgttttttttgGgk.", ".kGGgttttttttgGGk.", "..kkkkkkkkkkkkkk.."],
    ["..................", "...........kk.....", "..........kWWk....", ".........krkk.....", "........krrk......", ".......krrrk......", "...kkkkWWWWkkkk...", "..kwwwwkkkkwwwwk..", ".kwkkwwwkkwkkwwwk.", ".kwkkwwwggwkkwwwk.", ".kgwwwwggggwwwwgk.", ".kggggggggggggggk.", ".kgcggggggggggcgk.", ".kgkggggggggggkgk.", "..kgkkkkkkkkkkgk..", "..kggttttttttggk..", ".kGGgttttttttgGGk.", "..kkkkkkkkkkkkkk.."],
    ["...........kk.....", "kk........kWWk..kk", "kgk......krkk..kgk", "kgk.....krrk...kgk", "kgk....krrrk...kgk", "kgkkkkkWWWWkkkkkgk", "kgkwwwwkkkkwwwwkgk", "kgwkkwwwkkwkkwwwgk", "kgwkkwwwggwkkwwwgk", ".kgwwwwggggwwwwgk.", ".kggggggggggggggk.", ".kgcggggggggggcgk.", ".kgkggggggggggkgk.", "..kgkkkkkkkkkkgk..", "..kggttttttttggk..", ".kgGgttttttttgGgk.", ".kGGgttttttttgGGk.", "..kkkkkkkkkkkkkk.."],
    ["...........kk.....", "..........kWWk....", ".........krkk.....", "........krrk......", ".......krrrk......", "...kkkkWWWWkkkk...", "..kwwwwkkkkwwwwk..", ".kwkkwwwkkwkkwwwk.", ".kwkkwwwggwkkwwwk.", "kkgwwwwggggwwwwgk.", "kgggggggggggggggk.", "kggcggggggggggcgk.", "kkgkggggggggggkgk.", "..kgkkkkkkkkkkgk..", "..kggttttttttggk..", ".kgGgttttttttgGgk.", ".kGGgttttttttgGGk.", "..kkkkkkkkkkkkkk.."]] },
  // Comet the Antler-Tosser (World 3-3 Reindeer Harbor): a red-nosed reindeer in a red scarf with a gold bell who throws his antlers
  // like a boomerang. Frames: 0-1 idle, 2 = wind-up (head down, antlers glowing gold), 3 = antlers out (just little nubs). The antlers sit above the 14x14 hitbox.
  reindeer: { pal:{ A:'#ecd6a4', W:'#ffffff', t:'#f3e2c4' }, f:[
    [".k...k............", "kAk.kAk...........", "kAAkAAk.k.........", ".kAAAk.kAk........", "..kAAAkAAk........", "...kAAAAk.........", "...knnnnk.kk......", "..knnnnnnknnk.....", ".knnWknnnkkk......", "krnnnnnnnkkkkkkk..", "krrnnnnnnnnnnnnnkk", ".kknnnRRRnnnnnnnnk", "...knnRyRnnnnnnnnk", "...knntttnnnnnnnk.", "....kntttnnnnnnnk.", "....knnnnnnnnnnk..", "....kNk.kNk.kNk...", "....kkk.kkk.kkk..."],
    [".k...k............", "kAk.kAk...........", "kAAkAAk.k.........", ".kAAAk.kAk........", "..kAAAkAAk........", "...kAAAAk.........", "...knnnnk.kk......", "..knnnnnnknnk.....", ".knnWknnnkkk......", "krnnnnnnnkkkkkkk..", "krrnnnnnnnnnnnnnkk", ".kknnnRRRnnnnnnnnk", "...knnRyRnnnnnnnnk", "...knntttnnnnnnnk.", "....kntttnnnnnnnk.", "....knnnnnnnnnnk..", ".....kNk.kNk.kNk..", ".....kkk.kkk.kkk.."],
    ["..................", ".k...k............", "kyk.kyk...........", "kyykyyk.k.........", ".kyyyk.kyk........", "..kyyykyyk........", "...kyyyyk.........", "...knnnnk.kk......", "..knnnnnnknnk.....", ".knnWknnnkkk......", "krrnnnnnnnnnnnnnkk", ".kknnnRRRnnnnnnnnk", "...knnRyRnnnnnnnnk", "...knntttnnnnnnnk.", "....kntttnnnnnnnk.", "....knnnnnnnnnnk..", "....kNk.kNk.kNk...", "....kkk.kkk.kkk..."],
    ["..................", "..................", "..................", "..................", "..................", "...kNkNk..........", "...knnnnk.kk......", "..knnnnnnknnk.....", ".knnWknnnkkk......", "krnnnnnnnkkkkkkk..", "krrnnnnnnnnnnnnnkk", ".kknnnRRRnnnnnnnnk", "...knnRyRnnnnnnnnk", "...knntttnnnnnnnk.", "....kntttnnnnnnnk.", "....knnnnnnnnnnk..", "....kNk.kNk.kNk...", "....kkk.kkk.kkk..."]] },
  // Splashbones (World 5-2 Moonlit Moat): a goofy moat skeleton with seaweed on his skull and glowing blue eyes. Frames: 0 stand, 1 rattle (jaw open, arms out), 2 leap/dive (arms up)
  skeleton: { pal:{ w:'#f4f0e0', l:'#7cf0ff', g:'#3a9a3a' }, f:[
    ["....kkkkkk....", "...kwgwwwwk...", "..kwgggwwwwk..", "..kwkgkwkkwk..", "..kwklkwklwk..", "..kwwwwkwwwk..", "...kwkwkwkwk..", "....kwwwwwk...", ".....kkkkk....", "...kkwkwkkk...", "..kwkwwwkwwk..", ".kwkkwkwkkwk..", ".kwk.kwwwk.kwk", ".kk..kwkwk..kk", "....kwk.kwk...", "....kwk.kwk...", "...kwwk.kwwk..", "...kkk..kkk..."],
    ["....kkkkkk....", "...kwgwwwwk...", "..kwgggwwwwk..", "..kwkgkwkkwk..", "..kwklkwklwk..", "..kwwwwkwwwk..", "...kkkkkkkk...", "...kwkwkwkk...", ".....kkkkk....", "..kkkwkwkkkk..", ".kwwkwwwkwwwk.", "kwkkkwkwkkkwk.", "kk...kwwwk..kk", ".....kwkwk....", "....kwk.kwk...", "...kwk...kwk..", "..kwwk...kwwk.", "..kkk.....kkk."],
    ["kk..kkkkkk..kk", "kwkkwgwwwwkkwk", "kwkwgggwwwwkwk", ".kwwkgkwkkwwk.", "..kwklkwklwk..", "..kwwwwkwwwk..", "...kkkkkkkk...", "...kwkwkwkk...", ".....kkkkk....", "....kkwkwk....", "....kwwwwk....", "....kwkwkk....", ".....kwwk.....", "....kwkkwk....", "...kwk..kwk...", "..kwk....kwk..", "..kk......kk..", ".............."]] },
  // Sir Clanks-a-Lot (World 5-3 Knight's Closet): an empty suit of armor (glowing eyes in the visor, red plume, blue shield, sword).
  // Frames: 0-1 clank-walk, 2 wind-up (sword raised), 3 lunge (sword thrust forward)
  armor: { pal:{ y:'#ff5a4a' }, f:[
    ["........krrk......", ".......krrrk......", "......kkkkkkk.....", ".....kxzxxxxxk....", ".....kxzxxxxxk....", ".....kykkykkkk....", ".....kxxxxxxxk....", "......kXXXXXk.....", "....kkxxxxxxxkk...", "..kkkxxzxxxxxkxk..", ".kbbbkxzxxxxxkxk..", "kbbybbkzxxxxxkxkY.", "kbyyybkxxxxxxkkkzk", "kbbybbkXXXXXXk.kzk", ".kbbbkkYYYYYYk.kzk", "..kkk.kxxkkxxk.kzk", "......kxxk.kxxk.k.", ".....kxxk...kxxk..", ".....kXXk...kXXk..", "....kxxxk..kxxxk..", "....kkkkk..kkkkk.."],
    ["........krrk......", ".......krrrk......", "......kkkkkkk.....", ".....kxzxxxxxk....", ".....kxzxxxxxk....", ".....kykkykkkk....", ".....kxxxxxxxk....", "......kXXXXXk.....", "....kkxxxxxxxkk...", "..kkkxxzxxxxxkxk..", ".kbbbkxzxxxxxkxk..", "kbbybbkzxxxxxkxkY.", "kbyyybkxxxxxxkkkzk", "kbbybbkXXXXXXk.kzk", ".kbbbkkYYYYYYk.kzk", "..kkk.kxxkkxxk.kzk", ".......kxkkxk...k.", ".......kxkkxk.....", ".......kXkkXk.....", "......kxxkkxxk....", "......kkkkkkkk...."],
    ["........krrk...kk.", ".......krrrk..kzk.", "......kkkkkkk.kzk.", ".....kxzxxxxxkkzk.", ".....kxzxxxxxkkzk.", ".....kykkykkkkkzk.", ".....kxxxxxxxkkzk.", "......kXXXXXk.kYk.", "....kkxxxxxxxkYYYk", "..kkkxxzxxxxxkxk..", ".kbbbkxzxxxxxkxk..", "kbbybbkzxxxxxkk...", "kbyyybkxxxxxxk....", "kbbybbkXXXXXXk....", ".kbbbkkYYYYYYk....", "..kkk.kxxkkxxk....", "......kxxk.kxxk...", ".....kxxk...kxxk..", ".....kXXk...kXXk..", "....kxxxk..kxxxk..", "....kkkkk..kkkkk.."],
    ["........krrk......", ".......krrrk......", "......kkkkkkk.....", ".....kxzxxxxxk....", ".....kxzxxxxxk....", ".....kykkykkkk....", ".....kxxxxxxxk....", "......kXXXXXk.....", "....kkxxxxxxxkkk..", "kkkkkkxzxxxxxkbbk.", "zzzzzYYkxxxxxkbybk", "kkkkkkkzxxxxxkbbk.", "....kkxxxxxxxkkk..", "......kXXXXXXk....", "......kYYYYYYk....", ".....kxxkkkxxk....", "....kxxk...kxxk...", "...kxxk.....kxxk..", "...kXXk.....kXXk..", "..kxxxk....kxxxk..", "..kkkkk....kkkkk.."]] },
};
// bosses: left halves (16 wide), mirrored to 32 wide
const BOSS = {
  valkyrie: { pal:{ t:'#ffe066' }, half:[
"..............kk", ".kk..........kxx", "kwwk........kxxx", "kwwwk......kxxxx", "kwwwwk....kxyyyy", ".kwwwwk..kxxxxxx",
".kwwwwwkkkkkkkkk", "..kwwwwWkttsssss", "..kwwwwWkttskkss", "...kwwwWkttsssss", "...kwwwWkttssssr", "....kwwWkktkssss",
"....kwwWk.kttkkk", ".....kWWkkxxxxyy", "......kkxxxxxxyy", ".....kxxbbbbbbyy", ".....ksxbbbbbbbb", ".....ksskbbbbbbb",
"......kskbbbbyyy", "......kk.kyyyyyy", ".........krrrbbb", "........krrrbbbb", "........krrbbbbb", ".......krrrbbbbb",
".......krrkxxxxk", "..........kxxxk.", "..........kxxk..", ".........kxxxk..", ".........kkkkk.."] },
  cluckzilla: { half:[
"........kkkkkkkk", "......kkBBBBBBBB", "....kkBBBBBBBBBB", "...kBBBBByyyBBBB", "..kBBBBBBBBBBBBB", "..kkkkkkkkkkkkkk",
"......kyyyyyyyyy", ".....kyyyyyyyyyy", ".....kyyywwkyyyy", ".....kyyywkkyyyy", ".....kyyyyyyyyOO", "......kyyyyyyOOO",
"......kyyyyyykOO", ".......kyyyyyyrr", "......kyyyyyyyrr", "....kkyyyyyyyyyy", "...kyyyyyyyyyyyy", "..kyyyyyyyyyyyyy",
".kyyyyyyyyyyyyyy", ".kyyyyyrrrrrrrrr", "kyyyyyyyyyyyyyyy", "kyyyyWyyyyyyykyk", "kyyyyWWyyyyyyyry", "kyyyyyyyyyyyyyyy",
".kyyyyyyyyyyyyyy", "..kyyyyyyyyyyyyy", "...kkyyyyyyyyyyy", ".....kkkkkkkkkkk", "........kOOk....", ".......kOOOOk..."] },
  santa: { half:[
"..W.............", ".kWk............", ".kWWk.......kkkk", "..kWWk....kkxxxx", "...kWWkkkkxxxxxx", "....kkxxxxxxyxxx",
".....kxxxxxxxxxx", ".....kkkkkkkkkkk", "......ksssssssss", "......ksskkksss", "......ksssssssssc", ".....kwwssssssss",
".....kwwwwwwwwww", "....kwwwwwwkkkww", "....kwwwwwwwwwww", "...krwwwwwwwwwww", "..krrrwwwwwwwwww", ".krrrrrwwwwwwwww",
"kssrrrrrkwwwwwww", "kssrrrrrrkwwwwww", "ksskrrrrrrkkwwww", ".kkkrrrrrrrrrrrr", "....kkkkkkyyykkk", "....kWWWWWWWWWWW",
"....krrrrrrrkrrr", "....krrrrrrk.krr", "....kNNNNNNk..kN", "...kNNNNNNNk..kN", "...kkkkkkkkk..kk"] },
  dragon: { pal:{ t:'#ffd9a0' }, half:[
"......k", ".....kWk", ".....kWWk", "......kvvk...kkk", "k......kvvkkkvvv", "kk.....kvvvvvvvv", "kvk...kvvvvvvvvv",
"kvvk..kvvyykvvvv", "kvvvk.kvvyykvvvv", "kvvvvkkvvvvvvvvv", "kvvvvvkvvvvvvvvv", ".kvvvvkkvvvkvvvv", ".kvvvvvkvvvvvvvv",
"..kvvvvkkWkWkWkW", "..kvvvvvkkkkkkkk", "...kvvvvkvvvvttt", "...kvvvkvvvvtttt", "....kvkvvvvttttt", ".....kvvvvtttttt",
".....kvvvvtttttt", "....kvvvvvtttttt", "...kVvvvvvvttttt", "...kVvvvvvvvtttt", "....kkvvvvvvvvvv", "......kvvvkkkkkk",
"......kvvk", ".....kWkWk"] },
  spectro: { half:[
"........kkkkkkkk", "........kmmmmmmm", "........kmmmmmmm", ".......kkrrrrrrr", "..kkkkkkmmmmmmmm", "..kkkkkkkkkkkkkk",
".......kwwwwwwww", "......kwwwwwwwww", ".....kwwwkkwwwww", ".....kwwwkkwwwww", ".....kwwwwwwwwww", ".....kwwkkkkkwww",
"....kwwkwkkkkkkk", "....kwwwwwwwwkkk", "...kwwwwwwwwwwww", "..kwwwwwwwwwwwww", ".kwwkwwwwwwwwwww", "kwwkkwwwwwwwwwww",
"kwk.kwwwwwwwwwww", "kk..kwwwwwwwwwww", "....kwwwwwwwwwww", "....kWwwwwwwwwww", "...kWwwwwwwwwwww", "...kWwwwwwwwwwww",
"..kwwwwwwkwwwwkw", "..kwwkwwk.kwwk.k", "..kk.kk....kk..."] },
  golem: { half:[
"....kkkkkkkkkkkk", "...kxxxxxxxxxxxx", "..kxxXxxxxxxxxxx", "..kxxxxxxxxxxxxx", "..kxxkkkkxxxxxxx", "..kxxkrrkxxxxxxx",
"..kxxkkkkxxxxxxx", "..kxxxxxxxxxXxxx", "..kxxxkkkkkkkkkk", "..kxxxxxxxxxxxxx", "...kkkkkkkkkkkkk", ".kkxxxxxxxxxxxxx",
"kxxxxXxxxxxxxxxx", "kxxxxxxxxxvvvvvv", "kxxxkxxxxxvxxxxx", "kxxxkxxxxxvxxxxx", "kxxxkxxxxxvvvvvv", "kxxxkxxxxxxxxxxx",
".kkkkxxxxxxxxxxx", "....kxxxxxxxxxxx", "....kkkkkkkkkkkk", "....kxxxxxk", "...kxxxxxxk", "...kkkkkkkk"] },
};
const ITEMS = {
  coin: ["....kk", "....kyk", "....kyyk", "....kykyk", "....kyk.yk", "....kyk..k", "....kyk", "..kkkyk", ".kyyyyk", "kyyyyyk", "kyyyyk", ".kkkk"],
  piano: ["..kkkkkkkkkkkk..", ".knnnnnnnnnnnnk.", ".knNNNNNNNNNNnk.", ".knnnnnnnnnnnnk.", "kkkkkkkkkkkkkkkk", "kwkwkwwkwkwkwwkk", "kwwwwwwwwwwwwwwk",
    "kkkkkkkkkkkkkkkk", ".knnnnnnnnnnnnk.", ".knNnnnnnnnnNnk.", ".knnnnnnnnnnnnk.", ".kNk........kNk.", ".kk..........kk."],   // Froppy's little upright piano
  antler: [".k...k...k..", "kAk.kAk.kAk.", "kAk.kAk.kAk.", ".kAkkAkkAk..", "..kAAAAAAAk.", "...kAAAAAAAk", "....kkkkkkk."],   // Comet's thrown antlers
  heart: [".kk.kk.", "krrkrrk", "krrrrrk", "krrrrrk", ".krrrk.", "..krk..", "...k..."],
  bolt: ["...kkk", "..kyyk", ".kyyk", "kyyyykk", "kkkyyyk", "..kyyk", ".kyk", ".kk"],
  plume: ["..rr", ".rrrr", "rrrrr", ".rrr", "..yy", "..yy"],
  chord: ["..kk...kk", ".kyyk.kyyk", "kyyyykyyyk", "kyyykkyyyk", ".kkk..kkk"],
  // GIANT TUBA (hand-placed): big upright bell, conical gold body, silver valves, mouthpiece on the right
  tuba: ["..kkkkkkkkkk..", ".kttttttttttk.", ".kywyyyyyyyyk.", "..kyyyyyyyyk..", "...kyyyyyyk...", "....kyyyyk....", "....kyyyyk.kk.", "...kyyyyyykWk.",
         "..kyyYkkkyykk.", "..kyYkxkxkyk..", "..kyYkxkxkyk..", "..kyyYkkkyyk..", "..kyyyyyyyyk..", "...kyyyyyyk...", "....kkkkkk...."],
  tubaIcon: ["kkkkkkkk.", "kttttttk.", ".kyyyyk..", "..kyyk.k.", ".kyyyykWk", "kyYxxyykk", "kyYxxyyk.", "kyyyyyyk.", ".kkkkkk.."],
  // bass bomb: an eighth note whose head is a round black bomb
  bassbomb: ["....kkk..", "....kyyk.", "....kykyk", "....kyk.k", "....kyk..", ".kkkkyk..", "kmmmmyk..", "kmwmmmmk.", "kmmmmmmk.", ".kmmmmk..", "..kkkk..."],
  stand: ["kkkkkkkkkk", "kWWWWWWWWk", "kWkkWWkkWk", "kWWWWWWWWk", "kkkkkkkkkk", "....kk", "....kk", "....kk", "....kk", "....kk", "....kk", "..kkkkkk"],
};
// tiny 5x7 bitmap font (hand-made)
const FONT_SRC = {
A:'01110 10001 10001 11111 10001 10001 10001',B:'11110 10001 10001 11110 10001 10001 11110',C:'01110 10001 10000 10000 10000 10001 01110',
D:'11110 10001 10001 10001 10001 10001 11110',E:'11111 10000 10000 11110 10000 10000 11111',F:'11111 10000 10000 11110 10000 10000 10000',
G:'01110 10001 10000 10111 10001 10001 01111',H:'10001 10001 10001 11111 10001 10001 10001',I:'01110 00100 00100 00100 00100 00100 01110',
J:'00111 00010 00010 00010 00010 10010 01100',K:'10001 10010 10100 11000 10100 10010 10001',L:'10000 10000 10000 10000 10000 10000 11111',
M:'10001 11011 10101 10101 10001 10001 10001',N:'10001 10001 11001 10101 10011 10001 10001',O:'01110 10001 10001 10001 10001 10001 01110',
P:'11110 10001 10001 11110 10000 10000 10000',Q:'01110 10001 10001 10001 10101 10010 01101',R:'11110 10001 10001 11110 10100 10010 10001',
S:'01111 10000 10000 01110 00001 00001 11110',T:'11111 00100 00100 00100 00100 00100 00100',U:'10001 10001 10001 10001 10001 10001 01110',
V:'10001 10001 10001 10001 10001 01010 00100',W:'10001 10001 10001 10101 10101 10101 01010',X:'10001 10001 01010 00100 01010 10001 10001',
Y:'10001 10001 01010 00100 00100 00100 00100',Z:'11111 00001 00010 00100 01000 10000 11111',
0:'01110 10001 10011 10101 11001 10001 01110',1:'00100 01100 00100 00100 00100 00100 01110',2:'01110 10001 00001 00010 00100 01000 11111',
3:'11111 00010 00100 00010 00001 10001 01110',4:'00010 00110 01010 10010 11111 00010 00010',5:'11111 10000 11110 00001 00001 10001 01110',
6:'00110 01000 10000 11110 10001 10001 01110',7:'11111 00001 00010 00100 01000 01000 01000',8:'01110 10001 10001 01110 10001 10001 01110',
9:'01110 10001 10001 01111 00001 00010 01100','!':'00100 00100 00100 00100 00100 00000 00100','-':'00000 00000 00000 11111 00000 00000 00000',
':':'00000 01100 01100 00000 01100 01100 00000','.':'00000 00000 00000 00000 00000 01100 01100','x':'00000 00000 10001 01010 00100 01010 10001',
'?':'01110 10001 00001 00010 00100 00000 00100',"'":'00100 00100 01000 00000 00000 00000 00000','/':'00001 00010 00010 00100 01000 01000 10000',
'+':'00000 00100 00100 11111 00100 00100 00000',',':'00000 00000 00000 00000 01100 00100 01000',' ':'00000 00000 00000 00000 00000 00000 00000'
};
const FONT = {}; for (const ch in FONT_SRC) FONT[ch] = FONT_SRC[ch].split(' ').map(r => parseInt(r, 2));

// ---- rendering helpers ----
function grid(rows){ const w = Math.max(...rows.map(r => r.length)); return { w, h:rows.length, rows:rows.map(r => r.padEnd(w, '.')) }; }
function mirrorHalf(half){ return half.map(r => { r = r.padEnd(16, '.').slice(0,16); return r + [...r].reverse().join(''); }); }
function render(rows, pal = {}, scale = 1){
  const g = grid(rows), c = document.createElement('canvas'); c.width = g.w*scale; c.height = g.h*scale;
  const x = c.getContext('2d');
  g.rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '.' || ch === ' ') return; x.fillStyle = pal[ch] || PAL[ch] || '#f0f'; x.fillRect(i*scale, j*scale, scale, scale); }));
  return c;
}
function flip(c){ const f = document.createElement('canvas'); f.width = c.width; f.height = c.height; const x = f.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return f; }
function composite(base, overlay, ox, oy){ const c = document.createElement('canvas'); c.width = Math.max(base.width, ox+overlay.width); c.height = Math.max(base.height, oy+overlay.height); const x = c.getContext('2d'); x.drawImage(base,0,0); x.drawImage(overlay,ox,oy); return c; }
function tint(c, color){ const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const x = t.getContext('2d'); x.drawImage(c,0,0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0,0,c.width,c.height); return t; }

const cache = {};
const GOLD = { y:'#ffe14a', Y:'#b07800', t:'#fff3a0', W:'#fff3a0', w:'#fffbe0', x:'#ffd23f', X:'#b07800', m:'#e0a820', o:'#8a5a00', k:'#8a5a00', n:'#d9a520', r:'#ffd23f' };  // golden-instrument reward
function heroFrames(inst = 'sax', hair = 'short', gold = false){
  if (!INSTR[inst]) inst = 'sax'; if (hair !== 'long') hair = 'short';
  const key = `hero-${inst}-${hair}-${gold ? 'g' : ''}`; if (cache[key]) return cache[key];
  const pal = HERO_PAL;
  const [ir, ix, iy] = INSTR[inst], ic = render(ir, gold ? { ...pal, ...GOLD } : pal);
  const hairImg = hair === 'long' ? render(LONG_HAIR[0], HAIR_PAL) : null;
  const out = {};
  for (const k in HERO){ let body = render(HERO[k], pal);
    if (hairImg){ const c = document.createElement('canvas'); c.width = body.width; c.height = body.height; const x = c.getContext('2d'); x.drawImage(hairImg, LONG_HAIR[1], LONG_HAIR[2]); x.drawImage(body, 0, 0); body = c; }
    const r = composite(body, ic, ix, iy); out[k] = { r, l:flip(r), hurt:tint(r,'#ffffff') }; }
  out.hurt = tint(out.stand.r, '#ffffff');
  return cache[key] = out;
}
function enemyFrames(type){
  const key = 'en-'+type; if (cache[key]) return cache[key];
  const m = MIX[type];
  if (m) return cache[key] = m.f.map(rows => { const c = render(rows, m.pal); return { r:c, l:flip(c) }; });
  const d = EN[type] || EN.gremlin, frames = [];
  for (let i = 0; i < 2; i++){ const body = d.f[0], legs = d.legs ? d.legs[i] : []; const c = render([...body, ...legs], d.pal);
    frames.push({ r:c, l:flip(c) }); }
  if (!d.legs){ // floaters: second frame bobs 1px
    const c0 = frames[0].r, c = document.createElement('canvas'); c.width = c0.width; c.height = c0.height+1; c.getContext('2d').drawImage(c0, 0, 1); frames[1] = { r:c, l:flip(c) }; }
  return cache[key] = frames;
}
function bossFrames(type){
  const key = 'boss-'+type; if (cache[key]) return cache[key];
  if (type === 'kurilla'){ const s0 = wizard('stand'), c0 = wizard('cast'), h0 = wizard('happy'); return cache[key] = { r:s0, l:flip(s0), hit:tint(s0, '#ffffff'), cast:{ r:c0, l:flip(c0) }, happy:{ r:h0, l:flip(h0) } }; }
  const d = BOSS[type] || BOSS.golem, c = render(mirrorHalf(d.half), d.pal);
  const x = c.getContext('2d');
  // asymmetric hand-placed details
  if (type === 'valkyrie'){ x.fillStyle = PAL.N; x.fillRect(28, 2, 2, 27); x.fillStyle = PAL.x; x.fillRect(27, 0, 4, 3); x.fillRect(28, -1, 2, 1); }
  if (type === 'santa'){ x.fillStyle = PAL.N; x.fillRect(29, 6, 2, 18); x.fillStyle = PAL.x; x.fillRect(25, 4, 7, 6); x.fillStyle = PAL.W; x.fillRect(25, 4, 2, 6); }
  if (type === 'spectro'){ x.fillStyle = PAL.r; x.fillRect(19, 13, 3, 2); x.fillStyle = PAL.g; x.fillRect(21, 14, 4, 1); }
  return cache[key] = { r:c, l:flip(c), hit:tint(c, '#ffffff') };
}
function item(name, pal){ const key = 'it-'+name+(pal?JSON.stringify(pal):''); if (cache[key]) return cache[key];
  if (name === 'tubaL') return cache[key] = flip(item('tuba', pal)); return cache[key] = render(ITEMS[name], pal); }
// ---- Mr. Kurilla, the friendly-villain wizard (final boss): purple robe + pointy star hat, glasses, a FULL beard, staff topped with a golden note ----
// frame: 'stand' | 'cast' (staff raised, glowing) | 'happy' (big smile, for the ending). Drawn with rects; 32 x 40, facing right.
function wizard(frame = 'stand'){
  const key = 'wiz-' + frame; if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = 32; c.height = 40; const x = c.getContext('2d');
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const k = '#1a1030', P = '#7b3fc4', Pd = '#4e2386', Pl = '#a874e8', Y = '#ffd23f', Yd = '#c08a10', S = '#f2c29a', Sd = '#d49a70', Hb = '#5a3a22', Wd = '#8a5a2a';
  const cast = frame === 'cast', up = cast ? 4 : 0;
  // staff (behind the hand)
  R(25, 9 - up, 3, 31 + up - (cast ? 4 : 0), k); R(26, 10 - up, 1, 29 + up - (cast ? 4 : 0), Wd);
  // golden eighth note on top of the staff
  R(26, 1 - up, 2, 9, k); R(26, 2 - up, 1, 7, Yd); R(27, 1 - up, 4, 2, k); R(28, 2 - up, 3, 1, Y); R(30, 3 - up, 1, 2, k);
  R(22, 7 - up, 6, 5, k); R(23, 8 - up, 4, 3, Y); R(23, 8 - up, 1, 1, '#fff3a0');
  // robe: widening trapezoid with highlight/shade, gold belt, star dots, gold hem
  for (let r = 0; r < 18; r++){ const y = 21 + r, l = 9 - Math.floor(r*.33), rr = 19 + Math.floor(r*.28); R(l - 1, y, rr - l + 3, 1, k); R(l, y, rr - l + 1, 1, P); R(l, y, 2, 1, Pl); R(rr - 1, y, 2, 1, Pd); }
  R(9, 28, 12, 2, Y); R(14, 28, 2, 2, Yd); R(4, 37, 22, 1, Y); R(4, 38, 22, 1, Yd);
  for (const [a, b] of [[11, 24], [17, 33], [8, 34], [15, 31]]){ R(a, b, 1, 1, Y); }
  R(12, 32, 1, 1, '#fff3a0');
  // shoes
  R(8, 38, 5, 2, k); R(16, 38, 5, 2, k); R(9, 38, 3, 1, '#3a2a4e'); R(17, 38, 3, 1, '#3a2a4e');
  // arms: left sleeve hanging (or raised when casting), right hand on the staff
  if (cast){ R(4, 15, 5, 8, k); R(5, 16, 3, 6, P); R(4, 13, 4, 3, k); R(5, 13, 2, 2, S); }
  else { R(5, 22, 5, 9, k); R(6, 23, 3, 7, P); R(6, 30, 3, 2, S); }
  R(18, 22, 8, 5, k); R(19, 23, 6, 3, P); R(23, 22, 4, 4, k); R(24, 23, 2, 2, S);
  // head: face, glasses, eyebrows, smile (the full beard is drawn just below)
  R(8, 12, 12, 10, k); R(9, 13, 10, 8, S); R(9, 19, 10, 2, Sd);
  R(9, 15, 4, 3, k); R(14, 15, 4, 3, k); R(10, 16, 2, 1, '#ffffff'); R(15, 16, 2, 1, '#ffffff'); R(11, 16, 1, 1, k); R(16, 16, 1, 1, k); R(13, 16, 1, 1, k);
  if (frame === 'happy'){ R(10, 14, 3, 1, Hb); R(14, 14, 3, 1, Hb); } else { R(9, 13, 3, 1, Hb); R(12, 14, 1, 1, Hb); R(15, 14, 1, 1, Hb); R(16, 13, 3, 1, Hb); }   // mischievous brows
  // FULL beard: sideburns down the cheeks, covering the jaw and chin, flowing down over the robe (to the belt), with a mustache
  const Bh = '#7a5234', Bd = '#3e2616', rows = [[17, 8, 9], [17, 18, 19], [18, 8, 19], [19, 8, 19], [20, 8, 19], [21, 8, 19], [22, 8, 19], [23, 9, 18], [24, 9, 18], [25, 10, 17], [26, 10, 17], [27, 11, 16], [28, 12, 15], [29, 13, 14]];
  for (const [y, a0, a1] of rows) R(a0 - 1, y, a1 - a0 + 3, 1, k);
  R(12, 30, 4, 1, k);
  for (const [y, a0, a1] of rows){ R(a0, y, a1 - a0 + 1, 1, Hb); if (y > 18) R(a0, y, 1, 1, Bd); if (y > 18) R(a1, y, 1, 1, Bd); }
  for (const [a, b] of [[10, 21], [13, 23], [16, 22], [11, 25], [15, 26], [13, 28], [9, 20], [18, 20]]) R(a, b, 1, 2, Bh);   // wavy highlight strands
  R(12, 24, 1, 2, Bd); R(15, 23, 1, 2, Bd); R(14, 27, 1, 1, Bd);
  R(10, 18, 8, 1, Bh); R(10, 18, 1, 1, Hb); R(17, 18, 1, 1, Hb);   // mustache
  if (frame === 'happy'){ R(11, 19, 6, 2, k); R(12, 19, 4, 1, '#c0283a'); R(12, 20, 4, 1, '#ff8a8a'); } else { R(12, 19, 4, 1, k); R(11, 19, 1, 1, Bd); R(16, 19, 1, 1, Bd); }   // mouth peeking out of the beard
  // pointy hat leaning back, with a brim and stars
  for (let r = 0; r < 11; r++){ const y = 1 + r, cx = 11 + Math.round(r*.35), hw = Math.round(r*.7); R(cx - hw - 1, y, hw*2 + 3, 1, k); R(cx - hw, y, hw*2 + 1, 1, P); R(cx + hw - 1, y, 2, 1, Pd); }
  R(7, 0, 3, 2, k); R(8, 0, 1, 1, Y);
  R(4, 11, 21, 2, k); R(5, 11, 19, 1, Pd); R(5, 12, 19, 1, P);
  R(12, 6, 1, 1, Y); R(11, 7, 3, 1, Y); R(12, 8, 1, 1, Y); R(16, 9, 1, 1, Y); R(9, 9, 1, 1, '#fff3a0');
  return cache[key] = c;
}
// the GOLDEN SNARE DRUM: gold shell with lugs, white head, red hoops, two drumsticks (24 x 20)
function snare(){
  const key = 'snare'; if (cache[key]) return cache[key];
  const c = document.createElement('canvas'); c.width = 24; c.height = 20; const x = c.getContext('2d'); const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const k = '#1a1030';
  R(1, 6, 22, 12, k); R(2, 7, 20, 10, '#ffd23f'); R(2, 7, 4, 10, '#fff3a0'); R(18, 7, 4, 10, '#c08a10');
  R(1, 5, 22, 3, k); R(2, 5, 20, 2, '#e83a4a'); R(1, 16, 22, 3, k); R(2, 17, 20, 1, '#e83a4a');
  for (let i = 4; i < 21; i += 4){ R(i, 8, 1, 8, '#b07800'); R(i, 8, 1, 1, '#ffffff'); }
  R(2, 3, 20, 3, k); R(3, 3, 18, 2, '#ffffff'); R(5, 3, 8, 1, '#e8e4f0');
  for (let i = 0; i < 9; i++){ R(3 + i, 2 - Math.floor(i/3), 1, 1, '#8a5a2a'); R(20 - i, 2 - Math.floor(i/3), 1, 1, '#8a5a2a'); }
  R(11, 0, 2, 1, '#e8d8b0');
  return cache[key] = c;
}
function noteShot(color){ const key = 'shot-'+color; return cache[key] || (cache[key] = render(["...kkk", "...kwwk", "...kwkwk", "...kw.kk", ".kkkw", "kwwwwk", "kwwwwk", ".kkkk"], { w:color })); }
function text(ctx, str, x, y, color = '#fff', shadow = '#1a1030', scale = 1){
  str = String(str).toUpperCase();
  const draw = (ox, oy, col) => { ctx.fillStyle = col; let cx = x+ox;
    for (const ch of str){ const g = FONT[ch] || FONT['?'];
      for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (g[j] & (16 >> i)) ctx.fillRect(cx + i*scale, y + oy + j*scale, scale, scale);
      cx += 6*scale; } };
  if (shadow) draw(scale, scale, shadow); draw(0, 0, color);
}
const textWidth = (s, scale = 1) => String(s).length * 6 * scale - scale;

window.PQSprites = { PAL, HAIRS, INSTR:Object.keys(INSTR), NOTE_COLORS, ENEMIES:Object.keys(EN), MIX_ENEMIES:Object.keys(MIX), BOSSES:Object.keys(BOSS),
  heroFrames, enemyFrames, bossFrames, item, noteShot, text, textWidth, render, wizard, snare };
})();
