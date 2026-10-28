<p align="center">
  <a href="https://github.com/therealsega87/minion-bang/releases"><img alt="Total downloads" src="https://img.shields.io/github/downloads/therealsega87/minion-bang/total?style=flat-square&label=downloads"></a>
  <a href="https://github.com/therealsega87/minion-bang/releases/latest"><img alt="Downloads of the latest version" src="https://img.shields.io/github/downloads/therealsega87/minion-bang/latest/module.zip?style=flat-square&label=latest%20version"></a>
  <a href="https://forge-vtt.com/bazaar"><img alt="Forge installs" src="https://img.shields.io/badge/dynamic/json?label=Forge%20installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fminion-bang&style=flat-square&colorB=4aa94a"></a>
  <img alt="Foundry VTT 13 and 14" src="https://img.shields.io/badge/Foundry%20VTT-13%20%7C%2014-orange?style=flat-square">
  <a href="https://ko-fi.com/therealsega"><img alt="Support me on Ko-fi" src="https://img.shields.io/badge/Ko--fi-support%20me-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white"></a>
  <a href="https://discord.com/users/688483231531532323"><img alt="Discord: therealsega87" src="https://img.shields.io/badge/Discord-therealsega87-5865F2?style=flat-square&logo=discord&logoColor=white"></a>
</p>

# Minion!

Minion! brings the minion rules of MCDM's *Flee, Mortals!* to Foundry VTT for D&D 5e. A minion drops the moment an attack hits it, a big hit carries on into the minions around it, and a horde of thirty goblins takes a handful of places in the tracker instead of thirty.

It runs on top of Midi-QOL, so your players attack the way they always do.

**Full guide: [therealsega87.github.io/minion-bang](https://therealsega87.github.io/minion-bang/)**

## At the table

- Akra swings her mace at a goblin with 6 hit points and deals 20 damage. The goblin dies, and the 14 points left over are enough for three more goblins within her reach. Akra's player picks which three fall, watching the rings on the map.
- The GM drops eleven goblins on the map and clicks **Groups and bands**. Minion! proposes two bands of five and one goblin on its own, each band with its own color and captain. One click adds them all to the combat.
- Each band takes one place in the initiative order. When its turn comes, the GM passes the turn and Minion! moves it through every goblin in the band, then stops on the next creature.

## Features

### The Minion trait

- A minion drops to 0 hit points from any damage dealt by an attack that hits it or by a saving throw it fails.
- Any other damage (a saving throw it succeeds on, *magic missile*, an aura) kills it only if the damage reaches its hit point maximum. Anything less does nothing.
- Resistances, vulnerabilities and immunities apply first, so a minion immune to the damage survives the hit.
- A minion that drops gets the Dead status and, in combat, the defeated mark. If Midi-QOL is set to apply them, Minion! leaves that to Midi-QOL.

### Overkill

- When a player character's weapon attack deals more damage than the minion's hit point maximum, the extra damage takes down more minions of the same kind: one more for every hit point maximum of extra damage, rounding up.
- Melee attacks reach the minions within the weapon's reach. Ranged attacks follow a line one square wide, as long as the weapon's short range.
- The attacking player gets a dialog listing the minions in range. The nearest ones are already checked and marked with red rings on the map. Only the player deciding sees the rings.
- The dialog never allows more minions than the damage pays for. Check one more and the oldest choice is unchecked.
- Opportunity attacks cause no overkill. When an attack happens outside the attacker's turn, or with no combat running, the dialog asks whether it was one.
- While a player decides, the GM gets a waiting window and can decide for them or cancel the overkill. If the player isn't connected, the GM decides.
- Every overkill ends with a chat message.
- Each minion records who killed it, and in which round and turn, in `flags.minion-bang.killedBy`, for statistics modules and macros.

### Shared turns and bands (optional)

Minions of the same kind share one initiative and one turn, split into bands of the size the rules give for their challenge rating: up to 5, 8 or 10. Bands are the combatant groups built into Foundry.

- **Automatic groups.** Minions of the same stat block that join a combat before anyone rolls initiative are grouped on their own. A lone minion stays alone until another of its kind joins.
- **The "Groups and bands" window.** A button in the combat tracker opens it (GM only). It lists the minions on the scene that aren't in the combat yet, one tab per kind, and proposes the bands. You can move minions between bands, leave some alone, rename the bands and pick each band's color, captain and initiative mode. **Apply** adds everyone to the combat, creating one if needed, without rolling initiative. It also works in the middle of a fight.
- **Bands already in combat.** The **Existing bands** tab changes any band's color, and its mode and captain until the band rolls initiative.
- **Initiative.** By default the captain rolls for the whole band, and the result stays locked: later rolls by other members don't change it. You can use the average, highest, lowest or median of every member's roll instead, for all bands or band by band. **Reset Initiative** clears the bands' initiative too.
- **Captains.** If the captain drops or leaves the combat, the first member still standing takes over, and the band keeps its initiative.
- **One place in the tracker.** When the GM passes the turn from a band's first member, Minion! moves it through each member, each with its own start and end of turn, then stops after the band. **Previous turn** goes back to the first member.
- **Colors on the map.** Every player sees each band's color: on the token ring with the Dynamic Token Ring on, as a circle around the token otherwise. A minion gets its original ring color back when it leaves the band or the combat ends. New bands get colors no other band in the combat is using.
- **Band size table.** You can edit the maximum band size for each challenge rating in the settings. The table of the rules is the default, and changing it changes the balance of your encounters.

### Combat Stats

With **Combat Stats** in one of its Midi-QOL modes, the minions downed by an overkill count as kills for the character who made it. After changing the Combat Stats mode, reload Foundry (F5) as Combat Stats asks.

## Requirements

| Package | Version |
|---|---|
| Foundry VTT | 13 or 14 |
| dnd5e | 5.3.2 to 5.3.x |
| [Midi-QOL](https://foundryvtt.com/packages/midi-qol) | 13.0.64 or later on Foundry 13, 14.0.11 or later on Foundry 14 |
| [socketlib](https://foundryvtt.com/packages/socketlib) | any version for your Foundry |

Midi-QOL depends on DAE and libWrapper. Foundry offers to install them along with it.

You don't need the *Flee, Mortals!* module. If it's installed, Minion! recognizes its minions automatically.

For shared turns and bands, turn off **Squad Combat Initiative**: it manages the same groups. While it stays active, Minion! keeps its groups off and warns the GM.

## Installation

In Foundry, open **Add-on Modules**, click **Install Module** and paste this manifest URL:

```
https://github.com/therealsega87/minion-bang/releases/latest/download/module.json
```

After every update, everyone at the table should reload with **Ctrl+F5**. A normal reload can keep the old files in the browser cache, and the windows then behave like the previous version.

## Usage

### Marking a minion

Minions from the *Flee, Mortals!* module work right away. You can mark any other actor as a minion in two ways, and both stay in sync:

- the **Minion** checkbox in the actor sheet's **Special Traits**;
- the skull button in the **Token HUD** (GM only), red while the actor is marked.

An unlinked token has its own copy of the actor. Check the box on the actor before you place its tokens, or use the Token HUD button on tokens already on the scene.

From a macro:

```js
await actor.setFlag("dnd5e", "minionBangMinion", true);
```

### During play

Attack minions as usual. Hidden minions, and minions with the Invisible or Ethereal status, never appear in the overkill dialog. The dialog lists the others by token name.

### Setting up bands

1. Turn on **Shared turns and bands** in the module settings.
2. Place the minions on the scene. To use only some of them, select them first.
3. Click **Groups and bands** in the combat tracker, check the bands and click **Apply**.
4. Roll initiative as usual.

## Settings

| Setting | Applies to | Default | What it does |
|---|---|---|---|
| Preselect the proposed minions | the world | on | The overkill dialog opens with the nearest minions checked. When off, the player checks them, and the limit still applies. |
| Shared turns and bands | the world | off | Turns on automatic groups, the bands window, shared turns and band colors. |
| Initiative of the groups | the world | captain's roll | How a group's initiative is decided. Each band can use its own mode. |
| Maximum band size | the world | the table of the rules | The largest band for each challenge rating. |
| Enable Debug | this browser | off | Detailed logs in the browser console. |
| Run Diagnostics | | | Runs the rules engine self-test and saves a report with versions, settings and recent activity. |

The interface is in English and Italian. Foundry shows each user the language they picked.

## Known limitations

- Minion! needs Midi-QOL, because it works from the damage Midi-QOL calculates.
- Overkill only follows melee and ranged weapon attacks (`mwak`, `rwak`). Spell attacks still trigger the Minion trait.
- The GM must be viewing the scene of the attack. If not, the minion hit still dies, but no overkill is offered.
- Damage added after the attack by on-demand automations (CPR, GPS and similar) doesn't count towards overkill.
- Scenes measured in meters haven't been tested.
- While the turn moves through a band, the other members' reaction markers stay visible, and each member's start-of-turn effects trigger as the turn reaches it. **Previous turn** skips start and end of turn effects.
- Automatic groups have no color and no captain. Give them both in the **Existing bands** tab.
- In the captain's roll mode, if the captain can't roll, nobody rolls and no warning appears.
- When a member rolls, the band can show the value dnd5e copied for a split second, before Minion! sets the right one.
- In the average, highest, lowest and median modes every member rolls, so the chat gets one roll card per member, plus a summary card for the GM.
- The Combat Stats support relies on internal functions of that module. A future version of Combat Stats may need a Minion! update.

## For module developers

### Minion kills: `minion-bang.minionKill`

Minion! calls `Hooks.callAll("minion-bang.minionKill", event)` once for each minion whose hit points go from above 0 to 0, after the new hit points are saved. An attack that drops its target and three more minions by overkill makes four calls. The hook runs only on the active GM's client: when another GM applies the damage, the event reaches the active GM through socketlib.

```js
Hooks.on("minion-bang.minionKill", event => {
  // event.schemaVersion  1
  // event.eventId        id of this death, also saved on the minion in flags.minion-bang.deathId
  // event.workflowId     uuid of the attack's chat card, shared by every victim of one attack; null if unknown
  // event.combatId, event.round, event.turn   null outside combat; turn is Foundry's index and can be 0
  // event.sceneId
  // event.attacker       { actorId, actorUuid, tokenUuid, name } or null if unknown
  // event.victim         { actorId, actorUuid, tokenUuid, name, cr, minionsPerStandard }
  //                      cr is null when unknown; minionsPerStandard is the maximum band
  //                      size for that CR in Minion!'s table (5, 8 or 10 by default)
  // event.itemUuid       the weapon or spell, or null
  // event.cause          "direct": the minion the attack, spell or effect hit
  //                      "overkill": a minion taken down by the overkill
  //                      "other": hit points set to 0 outside Minion!'s rules (by hand,
  //                      damage without Midi-QOL data); attacker is null
});
```

The event reports deaths only. A minion already at 0 hit points, a deleted token, a reload or a Dead status set by hand produce no event. A minion that's revived and killed again gets a new `eventId`.

### API

```js
const api = game.modules.get("minion-bang").api;
api.isMinion(actor);          // true for Flee, Mortals! minions and minions marked in Minion!
api.minionKillSchemaVersion;  // 1
```

Both are available on every client from the `init` hook. The format of `flags.minion-bang.killedBy` stays the same.

### Statistics modules that read the hook

Minion! credits overkill kills to Combat Stats directly, because Combat Stats doesn't read the hook yet. A statistics tracker that reads `minion-bang.minionKill` sets `game.combatStats.minionKillSchemaVersion = 1` while it does. Minion! then stops the direct credit, so no minion is counted twice.

## Reporting a bug

1. Turn on **Enable Debug**.
2. Make the problem happen again.
3. Open **Run Diagnostics** and save the report.
4. Open an [issue on GitHub](https://github.com/therealsega87/minion-bang/issues), attach the report and add a few lines on what happened.

You can also write to me on [Discord](https://discord.com/users/688483231531532323): **therealsega87**.

## Support

Minion! is free. If it saves you time at the table, you can [buy me a coffee on Ko-fi](https://ko-fi.com/therealsega).

## Credits and license

*Flee, Mortals!* is published by MCDM Productions. This module contains no content from the book. It automates the rules and works with minions you create or import yourself.

Released under the [MIT License](LICENSE). The code of every version is on GitHub, and the 1.2.0 code lives in the `release-1.2.0` branch.
