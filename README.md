# The Widowed Throne

A text RPG with Bard's Tale rules, set in *The Widowed Throne*: Byzantium a hundred years after the Horn of Anointing vanished.

## Play

Open `index.html` in a browser. Nothing to install. The fonts load from Google Fonts; offline, the game uses system fonts.

The game is a text adventure with a modern dark interface. Every choice is a button with a key shown on it, so you can click or type. In dungeons you press deeper one stage at a time, and each level shows how deep you are. P prays, S sings a psalm, H heals with hands, U uses an item, and Esc opens the menu. Click a party card to see the character sheet.

The game saves itself as you go.

## The chronicle

1. **The Wall.** Theopolis and the Undercroft beneath it: the Crypts of the Emperors and the Drowned Cisterns. Find the Concord's master scribe, his forgers' ledger, and the lame lord's letter.
2. **The Judges.** The ford at Arkadiopolis, then four themes, each with a Hold beneath it: the Waters (the Goldhand's harbour and the Drowned Mint), the Gardens (Thessalonike and the Garden Below), the Heights (Göreme and the Barrow of Gathos) and the Wilderness (the laura and the Well of Azazel). Free the captives, break the idol, and fill the empty house to turn a theme back to God.
3. **The Tower.** The brick fields of Nebrodia, the Roots of the Tower, and Nebrodes the Hunter. Every theme you fully returned weakens him. Every house you left empty sends unclean spirits to his side.
4. **The Anointing.** Down through the Catacombs of the Apostates to the Gate of Sheol for the Horn, then the Great Church, the cherub, and the Question.

## Rules

Classic Bard's Tale: rolled stats (ST, DX, CN, LK, and FA for faith), levels, hit points, armour class that counts down, experience, gold. A party of up to six, and only the first three fight hand to hand. Foes come in groups at a distance. You give every character an order, and then the round plays out. Dungeon levels are descents of six to eight stages, with events at fixed depths and the boss at the bottom.

- **Prayers instead of spell points.** Abba/Amma and Iconographers get a number of prayers per circle, and resting at the hostel renews them. Sometimes the answer is "wait", and then the prayer isn't spent.
- **Callings:** Hornbearer (knight, rebukes demons), Akrites (scout, critical hits, giant-hunter, avoids traps), Deliverer (the Spirit comes upon them once per rest), Abba/Amma of the Desert, Iconographer (Painter of Light), Holy fool (psalms, immune to charm and temptation) and Anargyros (heals with hands).
- **Giants fall to small things.** Slings, goads and clubs do double damage to giants. Demons and shades take half damage from ordinary weapons.
- **Footholds.** Taking a temptation gives an immediate reward and gives the Adversary a foothold in every heart but the fool's. Demons hit harder against people with footholds, accusers can freeze them, the armour of God goes cold, and the cherub bars the sanctuary. Confession at the Great Church clears them. Gold taken has to be paid back.
- **The armour of God:** one piece in each region, from the Belt of Truth to the Sword of the Word.
- **Holds and lords.** Each Hold has an Idol-born lord at the bottom who fights in phases. Most have a weakness a watchful band can use (fasting, a holy fool's mockery, a boy with a sling). When the last form breaks you can offer Christ's mercy, and a lord who repents lives.
- **Vigil lamps.** Relight a Hold's lamp with lamp oil and hold it through the night. After that you can walk the lamp road to it and rest beside it once per visit.
- **Allegiance and the Blight.** Each theme is Bowed, Contested, Wavering or Returned, and its Blight lifts when it is Returned.
- **The Lion of Judah.** He cannot be summoned. When he comes, he clears footholds and restores the band.
- **Relics.** The Sling of Poimen, the Lance-head of Theodore, the Veil of the Myrrh-bearer and the Lamp of Saint Mamas wait in the Holds.
- **Crying out.** Once per dungeon level, when things are desperate, you can cry out to God. Sometimes a stranger answers.

## Files

- `data.js`: races, callings, items, prayers, psalms, monsters
- `levels.js`: the City and the dungeon levels, with their events and atmosphere
- `engine.js`: state, the interface, exploration, prayers outside battle, the character sheet
- `combat.js`: group combat
- `town.js`: the City's buildings
- `story.js`: events, the four acts and the endings
- `style.css`, `index.html`: the page
