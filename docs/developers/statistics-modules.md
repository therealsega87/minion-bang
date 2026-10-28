# Statistics modules

A module that counts kills has to count the minions that overkill takes down, and not count them twice.

## The problem

The extra minions of an [overkill](../table/overkill.md) drop outside the damage report that Midi-QOL gives. A statistics module that reads only Midi-QOL doesn't see them.

## The two ways

**Read the hook.** Listen to [`minion-bang.minionKill`](minion-kill-hook.md). It reports every minion that dies, with its attacker and cause, including the minions of an overkill.

**Let Minion! credit them.** Today Minion! credits the overkill kills to Combat Stats directly, through internal functions of that module. See [Combat Stats](../reference/combat-stats.md).

## Telling Minion! you read the hook

A module that reads the hook sets this value on `game.combatStats` (the tracker object that Minion! looks for) while it does:

```js
game.combatStats.minionKillSchemaVersion = 1;
```

While the value is a whole number of 1 or more, Minion! stops crediting kills directly. Nothing is counted twice, and you only read the hook.

If your module is not Combat Stats, the direct credit does not apply to you. Read the hook.

## Leaving minions out of the normal count

A minion that dies is also a creature that dropped to 0 hit points. If your module counts those, use [`api.isMinion(actor)`](api-and-flags.md#isminion) to skip them and count minions through the hook alone.
