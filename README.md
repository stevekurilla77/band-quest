# Band Quest 🎺🎮

This is a phone-first web game (a PWA) for 5th–8th grade band students. It's a **16-bit-style side-scrolling platformer** where every concert piece is a **world** with 3 stages and a boss castle. The hero is a band student who picks an instrument, shoots music notes, stomps enemies and collects note coins. Each world has a big **🎧 HEAR THE PIECE** button that plays the piece's official recording. Listening for about a minute unlocks a golden instrument for that world.

- Plain static HTML/CSS/JS. No backend, no accounts, no tracking, no personal data. Students type only a nickname; only the first word is kept.
- Game progress lives in `localStorage` on the student's phone. Settings ⚙️ → *Copy backup code* moves it to a new phone.
- Works offline once it has been opened (service worker + manifest). Only the YouTube recordings need internet.
- **All art and sound are original.** Every sprite, tile, background and the pixel font are hand-placed pixel data in `sprites.js` / `game.js`, drawn on a canvas. Sound effects and music loops are synthesized with Web Audio from short original note patterns. No Nintendo (or other) characters, names, sprites, sounds or music. No AI-generated art.
- The app hosts no sheet music or recordings. Recordings play from the publishers' YouTube channels in the privacy-enhanced `youtube-nocookie.com` player, only after the student taps 🎧.

## Files
| File | What it is |
|---|---|
| `pieces.json` | **All world data** (the only file you edit to add a piece/world) + the teacher PIN |
| `index.html`, `styles.css`, `app.js` | Map screen, world screens, hero picker, lives/continues, badges, settings, saving |
| `game.js` | The platformer engine: level generator, physics, enemies, bosses, touch/keyboard controls, chiptune audio, overworld map |
| `sprites.js` | Original pixel-art sprites (hero, 6 instruments + golden versions, enemies, bosses, items incl. the GIANT TUBA + bass bomb) + pixel font |
| `teacher.js` | Hidden teacher screen (loads only for `?teacher`) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support + home-screen install |
| `fonts/LilitaOne-Regular.ttf`, `fonts/OFL.txt` | Heading font "Lilita One" by Juan Montoreano, SIL Open Font License 1.1 (full license text in `fonts/OFL.txt`) |

## 🎮 How the game works
- **Map:** a 90s island-hopping overworld, one island per piece in `pieces.json` order. Tap an island to open that world's screen: boss info, **🎧 HEAR THE PIECE**, and the stage list.
- **Progression (classic 90s):** World 1, Stage 1 is open. Clearing a stage opens the next one. Clearing Stage 3 opens the **🏰 Boss Castle**. Beating the boss opens the next world. Cleared stages and beaten bosses can be replayed anytime.
- **Worlds:** Valkyrie = snowy Norse mountains (frost imps, winged Valkyrie boss). Attack of the Rubber Chickens = farm (waddling rubber chickens, Admiral Cluckzilla). Son of Santa the Barbarian = candy-cane North Pole fortress (gingerbread grunts, barbarian Santa). Infinite Quest = fantasy castle under the stars (star wisps, the Déjà Vu Dragon). Ghosts: A Midnight Tango = haunted ballroom (tango ghosts, Señor Spectro).
- **Stages:** short runs, about 1–2 minutes, with a music-stand checkpoint halfway and a giant metronome at the goal. Layouts are generated from the piece `id`, so every student gets the same stages.
- **Hero:** pick sax, trumpet, flute, clarinet, trombone or drums (🎒 Hero) and a skin tone. Run, jump (hold for higher), stomp enemies, shoot notes, bump ♪ blocks for coins, a heart, or a 🎸 **Power Chord** (triple notes until you lose a life).
- **💥 GIANT TUBA (rare power-up):** every stage hides exactly one sparkly golden ♪ block, usually floating high above a pillar (climb the pillar and jump), otherwise in a block row or up in the air. Its spot comes from the piece `id`, so it's the same for every student. Bump it and a glowing GIANT TUBA floats out and drifts down to the ground. Grab it for a brass fanfare and a **GIANT TUBA!** banner. The hero carries it on their back and gets **5 bass bombs** (tuba icon + count under the hearts, and a glowing **T** button). A bass bomb is a music-note bomb that arcs forward and goes off when it hits the ground, a wall, an enemy or the boss, with a low brass **BWAAMP!** and a screen shake. The blast destroys regular enemies, breaks wooden **crates** (each one drops a 🪙) and floating bricks, pops nearby ♪ blocks, and does **3 damage to a boss** (a boss has 24 HP, so 5 bombs can't win the fight alone). It never breaks the ground, pillars, platforms or the goal stairs. There's a 0.8 s cooldown between bombs. The tuba goes away when the bombs run out or when you lose a life. **Carry-over:** if you clear (or quit) a stage while you still have bombs, the tuba comes with you to your next stage *in the same world*, including the Boss Castle. Switching worlds, a game over, or closing the game drops it (it isn't saved). Every stage also has one or two small crate piles (1-2-1). You can jump over them without the tuba.
- **Lives, arcade style:** 3 hearts per life and 5 lives per credit. Lives carry from stage to stage. **Every 100 🪙 note coins = 1-UP.** Falling in a pit costs a life. Quitting a stage from the pause menu costs nothing.
- **Game over → CONTINUE? 9…0:** tap YES for 5 fresh lives and retry the same stage (the score resets). In a boss fight, the boss keeps the damage you already did. If the countdown runs out you go back to the map with 5 lives. **Cleared stages are never lost.**
- **🎧 Listening reward (optional, never blocks play):** tap HEAR THE PIECE on a world's screen. The recording plays right there with a listening meter. After **about 60 seconds of playing**, you unlock the **✨ golden instrument** for that world: golden triple notes in every stage of that world, which come back after each lost life. You also get **+1 life** and the 🎧 *Good Listener* badge (🌟 *Super Fan* for all of them). Time only counts while the video is actually playing, using the YouTube player's own state messages. Listening time adds up across visits.
- **Controls:** on phones, ◀ ▶ plus A (jump) and B (note), and the glowing **T** button (fire a bass bomb) that shows up only while you hold the GIANT TUBA. Keyboard: arrows/WASD move, Space/Z/↑/K jump, X/J shoot, **C or L tuba bomb**, Esc/P pause. The game pauses itself if the phone locks or you switch apps.
- **Badges** (🏆): first stage, no-life-lost clear, each world's boss badge, Grand Tour (all bosses), note-coin totals, Never Give Up (use a continue), 💥 Tuba Hero (blast an enemy, crate or block with the GIANT TUBA), Good Listener, Super Fan.

## ➕ How to add a piece (a new world)

### Option A: Teacher screen (on your phone)
1. Open the game link with `?teacher` added to the end, e.g. `https://YOUR-SITE/?teacher`.
2. Enter the PIN (default **1234**).
3. Fill in the title, composer, publisher, boss name + emoji, theme color, boss story, and YouTube link (this powers HEAR THE PIECE). Pick the **world theme, enemy and boss sprite** (and optionally a sky color) and the boss badge. Tap **Add piece**. You can also ✏️ edit, 🗑 remove, or ↑ reorder pieces. List order = world order.
4. Optional: **🧪 Preview these pieces on this phone** shows the new list only on your phone. Tap *Stop preview* afterward.
5. Tap **⬇️ Download pieces.json** (or **📤 Share** to email/AirDrop it to yourself), replace `pieces.json` in the site folder, and publish again. Students get the new world the next time they open the game online.

There's no server, so the teacher screen can't change anything for students by itself. It only builds the new file.

### Option B: Edit `pieces.json` directly
```json
{
  "id": "dragon-fire",                 // short, unique, lowercase; NEVER change it later (game progress is saved under it)
  "title": "Dragon Fire",
  "composer": "Jane Composer",
  "publisher": "Some Publisher",
  "boss": "Ember the Volcano Dragon",
  "bossEmoji": "🌋",
  "color": "#ffb36b",                  // card/label color
  "blurb": "One or two fun sentences about the boss.",
  "youtube": "https://www.youtube.com/watch?v=VIDEOID",   // official/publisher recording, or "" for none
  "channel": "Publisher Name (official)",
  "badge": { "name": "Lava Lord", "emoji": "🔥" },         // earned by beating the boss
  "world": {                           // optional: how the world looks
    "theme": "meadow",                 // snow | farm | candy | castle | haunted | meadow
    "enemy": "gremlin",                // imp | chicken | ginger | wisp | ghost | gremlin
    "boss": "golem",                   // valkyrie | cluckzilla | santa | dragon | spectro | golem
    "colors": { "sky": "#5fb4ff" }     // optional sky color override
  }
}
```
If you leave out `world`, the new piece gets the generic green **meadow** world (gremlins + a stone golem boss), so new pieces always work. The `//` comments are only for explanation; real JSON can't have them. Paste the file into a JSON checker such as jsonlint.com before deploying. A new world is added at the end of the map and opens after the boss of the world before it.

**Teacher PIN:** change `"settings": { "teacherPin": "1234" }` in `pieces.json` (or use the field on the teacher screen). Anyone who opens `pieces.json` can read it. It keeps the screen out of the way, nothing more.

**Saved games:** progress from earlier versions carries over (same storage key): hero, cleared stages and beaten bosses. Old practice-log data is simply ignored.

## Recordings used (official/publisher YouTube channels)
| Piece | Composer · Publisher | Video | Channel |
|---|---|---|---|
| Valkyrie | Matt Neufeld · Randall Standridge Music | https://www.youtube.com/watch?v=I06QpzDI4GI | Randall Standridge |
| Attack of the Rubber Chickens | Randall D. Standridge · Randall Standridge Music | https://www.youtube.com/watch?v=Nte9s-HGh6A | Randall Standridge |
| Son of Santa the Barbarian | Randall D. Standridge · Randall Standridge Music (2024, Gr. 2.5) | https://www.youtube.com/watch?v=iFRhBzkUYz0 | Randall Standridge (live recording) |
| Infinite Quest | Todd Stalter · Alfred Music | https://www.youtube.com/watch?v=0dL4TGaJf7o | Alfred Music Concert Band |
| Ghosts: A Midnight Tango | Gene Milford · Wingert-Jones Publications | https://www.youtube.com/watch?v=PxVQvyM2VtQ | Wingert-Jones Publications |

## Running locally
```
cd band-quest && python3 -m http.server 8000   # then open http://localhost:8000
```
