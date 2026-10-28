# Combat Stats

Combat Stats counts kills from the damage Midi-QOL reports. The extra minions of an [overkill](../table/overkill.md) drop outside that report, so Combat Stats can't tell who downed them. Minion! tells it.

## What gets counted

For each minion downed by an overkill, the character who made the overkill gets one **kill**, and the minion is added to the defeated enemies. The minion's hit points aren't added to the damage dealt, which stays equal to the damage rolled.

Minion! only passes kills on while Combat Stats is recording a fight.

## Modes

Combat Stats runs in one of three modes and picks it when the world loads.

| Combat Stats mode | What Minion! does |
|---|---|
| MidiQOL manual | Credits each extra minion as a kill. |
| MidiQOL auto | Credits each extra minion as a kill. |
| Native | Nothing. Combat Stats counts every minion that reaches 0 hit points by itself. |

Minion! follows the mode Combat Stats is **running**, which can differ from the saved one. After you change the mode, reload Foundry with ++f5++ as Combat Stats asks. Until then, Combat Stats keeps running the old mode.

## When Combat Stats reads the hook

A statistics module that reads the [`minionKill` hook](../developers/minion-kill-hook.md) sets `game.combatStats.minionKillSchemaVersion`. While that value is a whole number of 1 or more, Minion! stops crediting kills itself and leaves them to the hook. See [Statistics modules](../developers/statistics-modules.md).

## If it stops working

Minion! relies on internal functions of Combat Stats. If a new version changes them, Minion! writes a warning in the console and stops crediting the extra kills. Overkill itself keeps working. Please [report it](../help/bug-report.md) so Minion! can catch up.

Minion! is tested with Combat Stats 4.3.0.
