# Combat Stats

[Combat Stats](https://foundryvtt.com/packages/combat-stats), by [Smantella](https://github.com/Smantella), records each character's damage, healing, kills and times downed across a campaign. Minion! works with it in two ways, depending on the Combat Stats version.

## Combat Stats 4.4.0 and later

Combat Stats reads the [`minionKill` hook](../developers/minion-kill-hook.md) and counts minions apart from ordinary kills.

- In the chat recap, a character's kills read **ordinary (minion)**, for example **2 (5)**.
- The charts and the Excel exports get a **Minion kills** column.
- Each minion a player character kills counts once, whether it was the target of the attack or fell to an overkill. Summons and Wild Shape forms credit their character.
- A minion whose hit points were set to 0 by hand has no attacker, so it counts for nobody.
- A minion's death adds nothing to the damage totals.

The integration is the **Track Minion! kills** setting in Combat Stats. It only appears while Minion! is active, it's on by default, and changing it needs a reload. Combat Stats only counts kills in the combat it's recording, once that combat has started.

While this setting is on, Minion! stops crediting kills itself, so nothing is counted twice.

## Older versions, or the setting off

Combat Stats counts kills from the damage Midi-QOL reports. The extra minions of an [overkill](../table/overkill.md) drop outside that report, so Minion! credits them itself.

For each minion downed by an overkill, the character who made the overkill gets one ordinary **kill**, and the minion joins the defeated enemies. Its hit points aren't added to the damage dealt. Minion! only passes these kills on while Combat Stats is recording a fight.

### Modes {#modes}

| Combat Stats mode | What Minion! does |
|---|---|
| MidiQOL manual | Credits each extra minion as a kill. |
| MidiQOL auto | Credits each extra minion as a kill. |
| Native | Nothing. Combat Stats counts every minion that reaches 0 hit points by itself. |

Combat Stats picks its mode when the world loads, and Minion! follows the mode it's **running**, which can differ from the saved one. After you change the mode, reload Foundry with ++f5++ as Combat Stats asks.

### If it stops working

This older path relies on internal functions of Combat Stats. If a version changes them, Minion! writes a warning in the console and stops crediting the extra kills. Overkill itself keeps working. Please [report it](../help/bug-report.md).

## Versions

Minion! was tested in Foundry with Combat Stats 4.3.0. The 4.4.0 integration is checked against the Combat Stats code, not yet in a live game.
