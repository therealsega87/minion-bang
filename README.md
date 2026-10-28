<p align="center">
  <a href="https://github.com/therealsega87/minion-bang/releases"><img alt="Total downloads" src="https://img.shields.io/github/downloads/therealsega87/minion-bang/total?style=flat-square&label=downloads"></a>
  <a href="https://github.com/therealsega87/minion-bang/releases/latest"><img alt="Downloads of the latest version" src="https://img.shields.io/github/downloads/therealsega87/minion-bang/latest/module.zip?style=flat-square&label=latest%20version"></a>
  <a href="https://forge-vtt.com/bazaar"><img alt="Forge installs" src="https://img.shields.io/badge/dynamic/json?label=Forge%20installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fminion-bang&style=flat-square&colorB=4aa94a"></a>
  <a href="https://github.com/therealsega87/minion-bang/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/therealsega87/minion-bang?style=flat-square&label=release"></a>
  <img alt="Foundry VTT 13 and 14" src="https://img.shields.io/badge/Foundry%20VTT-13%20%7C%2014-orange?style=flat-square">
  <img alt="D&D 5e" src="https://img.shields.io/badge/D%26D-5e-red?style=flat-square">
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square"></a>
  <br>
  <a href="https://therealsega87.github.io/minion-bang/"><img alt="Read the guide" src="https://img.shields.io/badge/guide-read%20the%20docs-ff7043?style=flat-square&logo=materialformkdocs&logoColor=white"></a>
  <a href="https://ko-fi.com/therealsega"><img alt="Support me on Ko-fi" src="https://img.shields.io/badge/Ko--fi-support%20me-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white"></a>
  <a href="https://discord.com/users/688483231531532323"><img alt="Discord: therealsega87" src="https://img.shields.io/badge/Discord-therealsega87-5865F2?style=flat-square&logo=discord&logoColor=white"></a>
</p>

# 💀 Minion!

> Minions should die like minions. Minion! drops them on the first hit, lets a big swing carry on through the crowd, and turns a horde of thirty goblins into a handful of turns.

Minion! brings the minion rules of MCDM's *Flee, Mortals!* to Foundry VTT for D&D 5e. It runs on top of Midi-QOL, so your players attack the way they always do.

📖 **Everything in detail: [the Minion! guide](https://therealsega87.github.io/minion-bang/)**

---

## 🎬 See it in action

<p align="center">
  <img alt="A weapon attack drops a minion and the overkill dialog takes down three more" src="https://therealsega87.github.io/minion-bang/assets/images/overkill.gif" width="528">
</p>

| The overkill dialog | The Groups and bands window |
|:---:|:---:|
| <img alt="The overkill dialog with three goblins checked" src="https://therealsega87.github.io/minion-bang/assets/images/overkill-dialog.png" width="360"> | <img alt="The Groups and bands window splitting nine goblins into two bands" src="https://therealsega87.github.io/minion-bang/assets/images/bands-window.png" width="420"> |
| **Rings on the map** | **Band colors** |
| <img alt="Red rings around the minions the overkill will drop" src="https://therealsega87.github.io/minion-bang/assets/images/overkill-map.png" width="300"> | <img alt="Goblin tokens with rings in two band colors" src="https://therealsega87.github.io/minion-bang/assets/images/bands-colors.png" width="420"> |

## ✨ Features

### 💀 The Minion trait

- An attack that hits a minion, or a saving throw it fails, drops it to 0 hit points, however little damage it takes.
- Any other damage, like *magic missile* or a saving throw it succeeds on, kills it only if the damage reaches its hit point maximum.
- Resistances and immunities apply first, so an immune minion shrugs the hit off.
- Fallen minions get the Dead status and, in combat, the defeated mark, unless Midi-QOL already handles them.

### ⚔️ Overkill

- Akra swings her mace at a goblin with 6 hit points and deals 20 damage. The goblin dies, and the 14 points left over take down three more goblins within her reach.
- Her player picks which three fall, in a dialog that checks the nearest ones for her and rings them in red on the map.
- Melee attacks reach as far as the weapon does. Ranged attacks carry on along a line, up to the weapon's short range.
- Opportunity attacks never cause overkill: when an attack comes outside the attacker's turn, the dialog asks.
- While the player decides, the GM can wait, decide for them or cancel. Every overkill ends with a message in the chat.

### 👥 Shared turns and bands (optional)

- Minions of the same kind share one initiative and one turn, split into bands of up to 5, 8 or 10 by challenge rating.
- Drop eleven goblins on the map, click **Groups and bands**, and Minion! proposes two bands of five and one goblin alone. Rename them, recolor them, pick a captain, and one click adds them all to the combat.
- Each band takes one place in the initiative order. Pass the turn, and Minion! moves it through every member, then on to the next creature.
- Every player sees each band's color on the map.
- Even with no setup, minions of the same kind that join a combat before anyone rolls initiative are grouped on their own.

## 🤝 Better together: Combat Stats

[Combat Stats](https://foundryvtt.com/packages/combat-stats), by [Smantella](https://github.com/Smantella), remembers who carried every fight: damage dealt and taken, healing, kills, times downed, with a recap card at the end of each combat and charts you can export to Excel.

Since version 4.4.0 it listens to Minion!'s `minion-bang.minionKill` hook, so a goblin horde no longer inflates your kill count. Minions get a tally of their own: the chat shows **2 (5)** for two ordinary kills and five minions, and the charts and Excel exports gain a **Minion kills** column. Every minion a player character drops counts once, whether it took the hit or fell to the overkill, and summons and Wild Shape forms credit their character.

One switch in Combat Stats controls it all: **Track Minion! kills**. It appears only while Minion! is active, starts on, and needs a reload when you change it. Only the combat Combat Stats is recording counts, once it has started.

On an older Combat Stats, or with the switch off, Minion! still credits overkill kills as ordinary kills while Combat Stats runs in a MidiQOL mode. Only one of the two ever runs, so nothing is counted twice.

Grab Combat Stats from its [Foundry package page](https://foundryvtt.com/packages/combat-stats), and find the code and the issue tracker in its [GitHub repository](https://github.com/Smantella/combat-stats).

## 📦 Installation

In Foundry, open **Add-on Modules**, click **Install Module**, search for **Minion!** or paste this manifest URL:

```
https://github.com/therealsega87/minion-bang/releases/latest/download/module.json
```

After every update, everyone at the table reloads with **Ctrl+F5**. A plain reload can keep the old files in the browser cache.

## 🚀 Quick start

1. Enable **Minion!**, **Midi-QOL** and **socketlib** in your world.
2. Mark your minions: check **Minion** in the actor sheet's **Special Traits**. Minions from the *Flee, Mortals!* module work right away.
3. Put a character and a few minions of the same kind in a combat, and start it.
4. Hit a minion hard with a weapon attack and watch the overkill dialog.
5. For bands, turn on **Shared turns and bands** in the module settings and click **Groups and bands** in the combat tracker.

The [first fight walkthrough](https://therealsega87.github.io/minion-bang/getting-started/first-fight/) takes ten minutes.

## 🧩 Requirements

| Package | Version |
|---|---|
| Foundry VTT | 13 or 14 |
| dnd5e | 5.3.2 to 5.3.x |
| [Midi-QOL](https://foundryvtt.com/packages/midi-qol) | 13.0.64 or later on Foundry 13, 14.0.11 or later on Foundry 14 |
| [socketlib](https://foundryvtt.com/packages/socketlib) | any version for your Foundry |

You don't need the *Flee, Mortals!* module. If it's installed, Minion! recognizes its minions automatically.

Squad Combat Initiative manages the same combatant groups as the bands, so turn it off before you use them. The [known limitations](https://therealsega87.github.io/minion-bang/help/limitations/) are in the guide.

## 🛠️ For module developers

Minion! calls `minion-bang.minionKill` once for every minion that dies, with its attacker, its challenge rating and the cause: the hit, the overkill or anything else. `game.modules.get("minion-bang").api.isMinion(actor)` tells minions apart from other creatures. The [developer pages](https://therealsega87.github.io/minion-bang/developers/) describe the event, the API and the flags.

## 🐛 Bugs and ideas

Turn on **Enable Debug**, make the problem happen again, then save a report with **Run Diagnostics** in the module settings. Open an [issue on GitHub](https://github.com/therealsega87/minion-bang/issues) with the report attached, or write to me on [Discord](https://discord.com/users/688483231531532323): **therealsega87**. The [roadmap](https://therealsega87.github.io/minion-bang/project/roadmap/) shows what's coming.

## ☕ Support

Minion! is free. If it saves you time at the table, you can [buy me a coffee on Ko-fi](https://ko-fi.com/therealsega).

## 📄 Credits and license

*Flee, Mortals!* is published by MCDM Productions. This module contains no content from the book. It automates the rules and works with minions you create or import yourself.

Released under the [MIT License](LICENSE). The code of every version is on GitHub, and the 1.2.0 code lives in the `release-1.2.0` branch.
