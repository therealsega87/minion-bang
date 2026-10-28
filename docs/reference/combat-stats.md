# Combat Stats

Combat Stats counts kills from the damage that Midi-QOL reports. The extra minions of an [overkill](../table/overkill.md) drop outside that report, so Combat Stats alone wouldn't know who downed them. Minion! tells it.

## What gets counted

For each minion downed by an overkill, the character who made the overkill gets one **kill**, and the minion counts among the defeated enemies. The minion's hit points are **not** added to the damage dealt: the damage dealt stays equal to the damage rolled.

When a summoned creature makes the overkill, Combat Stats credits the creature's owner, as it does for any other kill.

## Modes

Combat Stats works in one of three modes and fixes the mode when the world loads.

| Combat Stats mode | What Minion! does |
|---|---|
| MidiQOL manual | Credits each extra minion as a kill. |
| MidiQOL auto | Credits each extra minion as a kill. |
| Native | Nothing. Combat Stats counts every minion that reaches 0 hit points by itself. |

Minion! follows the mode Combat Stats is **running in**, which can differ from the saved one. After you change the mode, reload Foundry with ++f5++, as Combat Stats asks. Until you reload, Combat Stats keeps working in the old mode.

## When Combat Stats reads the hook

A statistics module that reads the [`minionKill` hook](../developers/minion-kill-hook.md) sets `game.combatStats.minionKillSchemaVersion`. While that value is a whole number of 1 or more, Minion! stops crediting kills directly and leaves it to the hook. See [Statistics modules](../developers/statistics-modules.md).

## If it stops working

Minion! uses internal functions of Combat Stats. If a future version changes them, Minion! writes a warning in the console and stops crediting the extra kills. The overkill itself keeps working. [Report it](../help/bug-report.md) so Minion! can be updated.

Minion! is tested with Combat Stats 4.3.0.
