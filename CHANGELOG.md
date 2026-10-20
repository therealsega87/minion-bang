# Changelog

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
