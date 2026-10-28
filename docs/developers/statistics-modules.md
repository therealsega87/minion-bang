# Statistics modules

A module that counts kills has to count the minions an overkill takes down, and count each of them once.

## The problem

The extra minions of an [overkill](../table/overkill.md) drop outside the damage report Midi-QOL produces. A statistics module that only reads Midi-QOL misses them.

## Read the hook

Listen to [`minion-bang.minionKill`](minion-kill-hook.md). It reports every minion that dies, overkill included, with its attacker and cause. [Combat Stats](../reference/combat-stats.md) does this from version 4.4.0.

## Telling Minion! you read the hook

Older versions of Combat Stats don't read the hook, so Minion! credits overkill kills to them directly. To switch that off, a tracker that reads the hook sets this value on `game.combatStats`, the object Minion! looks for:

```js
game.combatStats.minionKillSchemaVersion = 1;
```

While the value is a whole number of 1 or more, Minion! stops crediting kills directly, so nothing is counted twice. Combat Stats 4.4.0 sets it while its **Track Minion! kills** setting is on.

The direct credit only exists for Combat Stats. Any other module should read the hook.

## Keeping minions out of the regular count

A minion that dies is also a creature that dropped to 0 hit points. If your module counts those, skip minions with [`api.isMinion(actor)`](api-and-flags.md#isminion) and count them through the hook only.
