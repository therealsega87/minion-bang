# Statistics modules

A module that counts kills has to count the minions an overkill takes down, and count each of them once.

## The problem

The extra minions of an [overkill](../table/overkill.md) drop outside the damage report Midi-QOL produces. A statistics module that only reads Midi-QOL misses them.

## Two ways to handle it

**Read the hook.** Listen to [`minion-bang.minionKill`](minion-kill-hook.md). It reports every minion that dies, overkill included, with its attacker and cause.

**Let Minion! credit them.** For now, Minion! credits overkill kills to Combat Stats directly, through internal functions of that module. See [Combat Stats](../reference/combat-stats.md).

## Telling Minion! you read the hook

While your module reads the hook, set this value on `game.combatStats`, the tracker object Minion! looks for:

```js
game.combatStats.minionKillSchemaVersion = 1;
```

While the value is a whole number of 1 or more, Minion! stops crediting kills directly, so nothing is counted twice.

The direct credit only exists for Combat Stats. Any other module should read the hook.

## Keeping minions out of the regular count

A minion that dies is also a creature that dropped to 0 hit points. If your module counts those, skip minions with [`api.isMinion(actor)`](api-and-flags.md#isminion) and count them through the hook only.
