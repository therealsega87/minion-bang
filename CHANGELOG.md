# Changelog

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
