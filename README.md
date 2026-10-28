<p align="center">
  <a href="https://github.com/therealsega87/minion-bang/releases"><img alt="Total downloads" src="https://img.shields.io/github/downloads/therealsega87/minion-bang/total?style=flat-square&label=downloads"></a>
  <a href="https://github.com/therealsega87/minion-bang/releases/latest"><img alt="Downloads of the latest version" src="https://img.shields.io/github/downloads/therealsega87/minion-bang/latest/module.zip?style=flat-square&label=latest%20version"></a>
  <a href="https://forge-vtt.com/bazaar"><img alt="Forge installs" src="https://img.shields.io/badge/dynamic/json?label=Forge%20installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fminion-bang&style=flat-square&colorB=4aa94a"></a>
  <img alt="Foundry VTT 13 and 14" src="https://img.shields.io/badge/Foundry%20VTT-13%20%7C%2014-orange?style=flat-square">
  <a href="https://ko-fi.com/therealsega"><img alt="Support me on Ko-fi" src="https://img.shields.io/badge/Ko--fi-support%20me-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white"></a>
  <a href="https://discord.com/users/688483231531532323"><img alt="Discord: therealsega87" src="https://img.shields.io/badge/Discord-therealsega87-5865F2?style=flat-square&logo=discord&logoColor=white"></a>
</p>

# Minion!

Minion! runs the minion rules from MCDM's *Flee, Mortals!* in Foundry VTT for D&D 5e. A minion drops the moment an attack hits it, a big hit cuts through the minions standing next to it, and a horde of thirty goblins takes a handful of turns in the tracker instead of thirty.

It works on top of Midi-QOL. You keep attacking the way you always do.

## At the table

- Akra swings her mace at a goblin with 6 hit points and deals 19 damage. The goblin dies, and the 13 extra points are enough for three more goblins within reach. Akra's player picks which three fall, watching the rings on the map.
- The GM drops eleven goblins on the map and clicks **Groups and bands**. Minion! proposes two bands of five and one goblin on its own, each band with its own color and captain. One click adds them to the combat.
- Each band takes one place in the initiative order. When its turn comes, the GM passes the turn and the module steps through every goblin of the band, then stops on the next creature.

## Features

### The Minion trait

- A minion drops to 0 hit points from any damage dealt by an attack that hits or by a saving throw it fails.
- Damage from anything else (a saving throw it passes, *magic missile*, an aura) kills it only when the damage reaches its hit point maximum. Lower damage does nothing.
- Resistances, vulnerabilities and immunities apply first, so a minion immune to the damage survives the hit.
- Defeated minions get the Dead status and, in combat, the defeated mark. When Midi-QOL already applies them, Minion! leaves the job to Midi-QOL.

### Overkill

- When a player character's weapon attack deals more damage than the minion's hit point maximum, the excess takes down more minions of the same kind: one more for each full or partial hit point maximum of excess.
- Melee attacks reach the minions within the weapon's reach. Ranged attacks follow a line one square wide, up to the weapon's short range.
- The attacking player sees a dialog with the minions in range. The nearest ones are already checked, and their tokens light up on the map; only the player deciding sees those rings.
- The dialog never offers more minions than the damage allows. Checking one more drops the oldest choice.
- Opportunity attacks cause no overkill. When an attack happens outside the attacker's turn, or outside combat, the dialog asks whether it was one.
- While a player decides, the GM sees a waiting window and can decide for them or cancel the overkill. When the player isn't connected, the GM decides.
- Every overkill ends with a message in the chat.
- Each minion keeps a record of who killed it, in which round and turn, in `flags.minion-bang.killedBy`, for statistics modules and macros.

### Shared turns and bands (optional)

Minions of the same kind share one initiative and one turn, split into bands of the size the rules give for their challenge rating: up to 5, 8 or 10. The feature uses the combatant groups built into Foundry.

- **Automatic groups.** Minions of the same stat block that join a combat before initiative is rolled form groups on their own. A lone minion stays alone.
- **The "Groups and bands" window.** A button in the header of the combat tracker opens it (GM only). It reads the minions on the scene that aren't in combat yet, one tab per type, and proposes the bands. You can move creatures from one band to another, leave some alone, rename the bands and pick for each band a color, a captain and an initiative mode. **Apply** adds everything to the combat, creating one if needed, without rolling initiative.
- **Bands already in combat.** The **Existing bands** tab changes the color of any band in the combat, and its mode and captain until the band rolls initiative.
- **Initiative.** By default the captain rolls for the whole band and the value stays locked: later rolls by other members don't change it. You can choose the average, highest, lowest or median of all the members' rolls instead, for every band or for one band at a time. **Reset Initiative** clears the bands too.
- **Captains.** If the captain falls or leaves the combat, the first member still standing takes over and the band keeps its initiative.
- **One step in the tracker.** When the GM passes the turn from the first member of a band, the module steps through each member, with its own start and end of turn, then stops after the band. **Previous turn** goes back to the first member.
- **Colors on the map.** Each band shows its color to every player: on the token ring when the Dynamic Token Ring is on, as a circle around the token otherwise. The original ring color comes back when the creature leaves the band or the combat ends. New bands get colors that no band in the combat is using.
- **Band size table.** You can edit the maximum band size for each challenge rating in the settings. The rules' table is the default, and changing it changes the balance of your encounters.

### Statistics modules

With **Combat Stats** in one of its Midi-QOL modes, the minions downed by an overkill count as kills for the character who made it. After changing the Combat Stats mode, reload Foundry (F5), as Combat Stats asks.

## Requirements

| Package | Version |
|---|---|
| Foundry VTT | 13 or 14 |
| dnd5e | 5.3.2 to 5.3.x |
| [Midi-QOL](https://foundryvtt.com/packages/midi-qol) | 13.0.64 or later on Foundry 13, 14.0.11 or later on Foundry 14 |
| [socketlib](https://foundryvtt.com/packages/socketlib) | any version for your Foundry |

Midi-QOL needs DAE and libWrapper, so Foundry installs those too.

You don't need the *Flee, Mortals!* module. If you have it, Minion! recognizes its minions on its own.

For shared turns and bands, turn off **Squad Combat Initiative**: it manages the same groups. While it stays active, Minion! keeps its groups off and tells the GM.

## Installation

In Foundry, open **Add-on Modules**, choose **Install Module** and paste this manifest URL:

```
https://github.com/therealsega87/minion-bang/releases/latest/download/module.json
```

After every update, everyone at the table should reload the page with **Ctrl+F5**. A normal reload can keep the old files in the browser cache, and the windows then behave like the previous version.

## Usage

### Marking a minion

Minions from the *Flee, Mortals!* module work right away. You can mark any other actor as a minion in two ways, and they always stay in sync:

- the **Minion** checkbox in the **Special Traits** of the actor sheet;
- the skull button in the **Token HUD** (GM only), red while the actor is a minion.

Unlinked tokens carry their own copy of the actor. Check the box on the actor before you place its tokens, or use the Token HUD button on tokens already on the scene.

From a macro:

```js
await actor.setFlag("dnd5e", "minionBangMinion", true);
```

### During play

Attack minions as usual. Hidden minions, and minions with the Invisible or Ethereal status, never appear in the overkill dialog. The dialog lists the others with their token names.

### Setting up bands

1. Turn on **Shared turns and bands** in the module settings.
2. Place the minions on the scene. To use only some of them, select them first.
3. Click **Groups and bands** in the combat tracker, check the bands and click **Apply**.
4. Roll initiative as usual.

## Settings

| Setting | Scope | Default | What it does |
|---|---|---|---|
| Preselect the proposed minions | world | on | The overkill dialog opens with the nearest minions checked. When off, the player checks them; the limit still applies. |
| Shared turns and bands | world | off | Turns on groups, bands, shared turns and the band colors. |
| Initiative of the groups | world | captain's roll | How a group's initiative is decided. Each band can override it. |
| Maximum band size | world | rules' table | The largest band for each challenge rating. |
| Enable Debug | per user | off | Detailed logs in the browser console. |
| Run Diagnostics | | | Runs the rules engine self-test and saves a report with versions, settings and recent activity. |

The interface is in English and Italian. Foundry uses the language of each user.

## Known limitations

- Overkill needs Midi-QOL: Minion! reads its damage calculation.
- Attack activities must be melee or ranged weapon or spell attacks (`mwak`, `rwak`, `msak`, `rsak`). Overkill follows weapon attacks only.
- The GM must be viewing the scene of the attack. Otherwise the hit minion still dies, but no overkill is offered.
- Damage added after the attack by on-demand automations (CPR, GPS and similar) doesn't count towards overkill.
- Scenes measured in meters haven't been tested.
- While the turn steps through a band, the reaction marker of the other members stays visible, and their start-of-turn effects trigger as the turn reaches each of them. **Previous turn** skips start and end of turn effects.
- Groups made automatically have no color and no captain. Give them one from the **Existing bands** tab.
- In the captain's roll mode, if the captain can't roll, nobody rolls and no warning appears.
- When a member rolls, the band can show the value copied by dnd5e for a fraction of a second before Minion! sets the right one.
- In the average, highest, lowest and median modes every member rolls, so the chat gets one roll card per member plus a summary card for the GM.
- The Combat Stats support uses internal functions of that module. A future version of Combat Stats may need an update of Minion!.

## Reporting a bug

1. Turn on **Enable Debug**.
2. Make the problem happen again.
3. Open **Run Diagnostics** and save the report.
4. Open an [issue on GitHub](https://github.com/therealsega87/minion-bang/issues) with the report attached and a few lines on what happened.

You can also write to me on [Discord](https://discord.com/users/688483231531532323): **therealsega87**.

## Support

Minion! is free. If it saves you time at the table, you can [buy me a coffee on Ko-fi](https://ko-fi.com/therealsega).

## Credits and license

*Flee, Mortals!* is published by MCDM Productions. This module contains no content from the book: it automates the rules and works with the minions you create or import yourself.

Released under the [MIT License](LICENSE). The code of every version is on GitHub; the 1.2.0 code lives in the `release-1.2.0` branch.
