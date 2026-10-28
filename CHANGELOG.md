# Changelog

## 1.5.4

- The minions downed by an overkill are passed as kills to Combat Stats only.

## 1.5.3

- Foundry VTT 13 is supported again, alongside 14. On Foundry 13 Minion! needs Midi-QOL 13.0.64 or later.
- Fix: with Combat Stats, Minion! follows the mode Combat Stats is running in, not the one saved in its settings. Combat Stats applies a new mode only after a reload: until then, the minions downed by an overkill were counted twice.

## 1.5.2

- Fix: with Combat Stats, the minions downed by an overkill now count as kills only. They no longer add their hit points to the damage dealt, so the damage dealt matches the roll.

## 1.5.1

- Fix: wrong module id in the statistics support added in 1.5.0.

## 1.5.0

The versions 1.3.x were test builds that were never published, and 1.4 was skipped: this release follows 1.2.0 and gathers everything.

### Added: shared turns and bands

- World setting **Shared turns and bands** (off by default). It uses Foundry's native combatant groups, so it is not compatible with Squad Combat Initiative: if that module is active the GM gets a warning and the groups stay off.
- **Automatic groups.** Minions of the same stat block added to a combat before initiative is rolled are grouped in blocks of the size given by the Minion Encounter Building table (5, 8 or 10 by challenge rating). A lone minion makes no group, minions without a challenge rating and creatures that are not minions are never grouped, groups made by hand are left alone, and after initiative is rolled nothing is grouped.
- **Maximum band size table**, editable from the settings (GM only), with a button to restore the rules. A band has from 2 creatures up to the maximum of its challenge rating. Changing the table affects game balance and the editor says so.
- **Initiative of the groups** (world setting): the captain's roll (default), or, with every member rolling, the average, the highest, the lowest or the median (averages round up). In the modes where every member rolls, the module rolls for the members that have not rolled yet and posts a summary card to the GMs.
- **Shared turns.** A band takes one step in the tracker: the turn stops on its first member, and when the GM passes the turn the module walks through the other members one by one, each with its own start and end of turn. "Previous turn" goes back to the first member of the band. The order is rebuilt on every client after a change to the groups.
- **"Groups and bands" window**, opened by a button in the combat tracker header (GM only):
  - one tab per minion type found among the tokens of the scene that are not in the combat yet (with selected tokens you are asked whether to use only those);
  - the proposal follows the maximum of the table, you can move creatures between bands or leave them alone, and rename the bands; the window checks everything while you work;
  - every band has a color (colors already used in the combat are skipped), a captain (the first member by default) and an initiative mode (as in the settings, or its own);
  - the color shows as a ring on the tokens of the GM's map while choosing; hovering a row highlights that token;
  - **Apply** creates the combat if there is none, or adds the new groups and creatures to the existing one, without rolling initiative and without touching what is already there. With more than one type it asks for a confirmation. It checks that every token still exists and is not in the combat, and says so if something changes while the window is open;
  - the tab **Existing bands** lists the bands already in the combat: the color can always be changed, the mode and the captain only until the band has rolled initiative (a lock marks the bands that have). A band without a captain shows "No captain" until you choose one.
- **Band color on the map**, for everyone, once the creatures are in the combat: with the Dynamic Token Ring enabled the ring color is set to the band color (the original is saved and restored when the creature leaves the band or the combat ends), otherwise a circle is drawn around the token. Creatures alone are not touched.
- **Captain.** In the captain's roll mode the group takes the captain's initiative, and only the captain rolls: when Foundry asks to roll for another member, the module rolls the captain instead, and the value is then locked. If the captain is defeated or leaves the combat, the first member standing becomes the captain and the group's value does not change.
- **Reset Initiative** now also clears the groups and releases the captain's locked roll.
- In the modes Average, Highest, Lowest and Median, when a member dies the group keeps its value.
- The diagnostics report lists the new settings, Squad Combat Initiative and the status of the groups.

### Added: other

- Overkill: if one of the extra minions cannot be downed, the others still fall, the chat still reports them and the GM is told which one failed.
- **Combat Stats** (modes "MidiQOL auto" and "MidiQOL manual"): the extra minions downed by an overkill are counted as kills, and as damage dealt, for the character who triggered the overkill. Nothing changes without Combat Stats or in its native mode.
- Italian and English texts for everything above.

## 1.2.0

### Added
- World setting "Preselect the proposed minions" (on by default). When it is off, the overkill dialog opens with no minion checked, every candidate is listed from the nearest to the farthest, and all the map rings are faint. The limit on how many minions can be chosen and the replacement of the oldest choice work as before. If Confirm is pressed with no minion chosen, the chat says so.
- The diagnostics report lists the new setting.

## 1.1.1

### Fixed
- Pressing Cancel in the overkill dialog was treated as "Confirm pressed with no minion chosen". It now counts as a cancellation, and the chat message and the notification say that the character decided not to overkill.

## 1.1.0

### Added
- When the overkill is not carried out, a public chat message and a notification for the GM say so: "[Character] decided not to overkill." This happens with Cancel, with the close button of the dialog and with the GM's "Cancel overkill".
- If Confirm is pressed without choosing any minion, the message says exactly that.
- Italian translation (`lang/it.json`). Foundry uses it when the user's language is Italian and falls back to English for anything missing.

### Notes
- Answering "Yes" to the opportunity attack question does not produce the message: no overkill is the rule there, not a decision.

## 1.0.4

### Changed
- Minions whose actor has the Ethereal status are never offered as overkill candidates, like hidden and invisible ones.

## 1.0.3

### Changed
- The overkill dialog lists minions by their token names instead of the actor names, so a renamed token no longer reveals what it is.
- Hidden tokens and tokens whose actor has the Invisible condition are never offered as overkill candidates, whoever is deciding.
- The module version is written to the browser console on every client when the world starts, which makes it easy to check which files a player is running.

## 1.0.2

### Changed
- In the overkill dialog, answering "Yes" to the opportunity attack question now greys out the list of minions at once: the boxes are disabled and unchecked, the map rings disappear and the limit line explains that opportunity attacks cause no overkill. Answering "No" again restores the previous selection and rings.

## 1.0.1

### Fixed
- The overkill dialog now limits the selection to the number of extra minions the damage can take down (for example 10 damage on a 6 HP minion allows 1). Checking a new box when the limit is reached unchecks the oldest checked one, and the map rings follow.
- The dialog shows the maximum and the current number of selected minions.
- The GM side also enforces the limit: if an answer carries more minions than allowed, only the nearest ones are defeated and a warning is logged.

### Changed
- New automated tests for the selection limit and for the whole GM flow (damage capture, Minion trait, overkill dialog, defeated minions).

## 1.0.0

First public release.

### Added
- Minion trait: a minion dies from any damage dealt by an attack or a failed saving throw. Damage from other effects (a successful save, magic missile, auras) kills it only if it reaches its hit point maximum.
- Damage is taken after resistances, vulnerabilities, immunities and saving throws, as calculated by Midi-QOL, bonus damage included.
- Healing and temporary hit points on a minion are left untouched.
- Overkill for weapon attacks made by player characters: melee within reach, ranged along a line one square wide up to the weapon's short range. Distances account for token size.
- Overkill confirmation dialog for the attacking player, with the nearest minions preselected and a preview on the map visible only to whoever decides.
- Opportunity attack question when the attack happens outside the attacker's turn or outside combat.
- GM waiting window while a player decides, with "Decide for them" and "Cancel overkill".
- Defeated minions get the Dead status and, in combat, the defeated mark, unless Midi-QOL already applies them. The killer, round and turn are stored in `flags.minion-bang.killedBy`.
- Minions are recognized from the Flee, Mortals! module role, or from a "Minion" checkbox in Special Traits, also available as a Token HUD button.
- "Enable Debug" setting and "Run Diagnostics" tool.
- English localization file.
