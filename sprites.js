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
  // Mr. Dinosaur: big friendly cartoon dino in a red bow tie (walks, takes 2 note hits)
  dino: { pal:{ g:'#5fd068', G:'#2f8a3e', t:'#fff0b0', O:'#ff9a3c' }, f:[[
"....kkkkkk..........", "...kggggggk..kk.....", "..kggggggggkkOOk....", ".kggwwkgggggkOOk....", ".kggwkkggggggkk.....",
"kggggggggggggk.kk...", "kgkgggggggggggkOOk..", "kggggggggggggggkk...", ".kcggggggggggggk....", "..kkkkkkgggggggk....",
"...krkkkrkggggggk...", "...krrkrrkgggggggk..", "...krkkkrkggggggggkk", "..kgktttttggggggggGk", "...kttttttgggggggkk.",
"....kttttgggggggk...", ".....kkkkkkkkkkk....", ".....kGGk...kGGk....", "....kkkk...kkkk....."
  ],[
"....kkkkkk..........", "...kggggggk..kk.....", "..kggggggggkkOOk....", ".kggwwkgggggkOOk....", ".kggwkkggggggkk.....",
"kggggggggggggk.kk...", "kgkgggggggggggkOOk..", "kggggggggggggggkk...", ".kcggggggggggggk....", "..kkkkkkgggggggk....",
"...krkkkrkggggggk...", "...krrkrrkgggggggkk.", "...krkkkrkggggggggGk", "..kgktttttgggggggkk.", "...kttttttgggggggk..",
"....kttttgggggggk...", ".....kkkkkkkkkkk....", "......kGGk.kGGk.....", ".....kkkk.kkkk......"
  ]] },
  // Meep the green alien: one big eye, antenna, hops around
  meep: { pal:{ g:'#8ef05a', G:'#3a9a2e', c:'#ffb0c8' }, f:[[
"......kk......", ".....kyyk.....", "......kk......", "......kG......", "....kkkkkk....", "...kggggggk...",
"..kggwwwwggk..", ".kggwwkkwwggk.", ".kggwwkkwwggk.", ".kgggwwwwgggk.", ".kcggggggggck.", ".kggkggggkggk.",
"..kggkkkkggk..", "...kggggggk...", "....kkkkkk....", "...kGk..kGk...", "..kkkk..kkkk.."
  ],[
".....kk.......", "....kyyk......", ".....kk.......", "......kG......", "....kkkkkk....", "...kggggggk...",
"..kggwwwwggk..", ".kggwwkkwwggk.", ".kggwwkkwwggk.", ".kgggwwwwgggk.", ".kcggggggggck.", ".kgggkkkkgggk.",
"..kggkwwkggk..", "...kggggggk...", "....kkkkkk....", "....kGkkGk....", "....kk..kk...."
  ]] },
  // Sparky, a cute little dragon: flaps along in a wave
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
'+':'00000 00100 00100 11111 00100 00100 00000',' ':'00000 00000 00000 00000 00000 00000 00000'
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
  heroFrames, enemyFrames, bossFrames, item, noteShot, text, textWidth, render };
})();
