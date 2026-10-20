# Changelog

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
