# API and flags

## API

`isMinion` and `minionKillSchemaVersion` are available on every client from the `init` hook. `openBandsWindow` is added at `ready`, for the GM only.

```js
const api = game.modules.get("minion-bang").api;
```

### isMinion

```js
api.isMinion(actor);
```

Returns `true` for minions from *Flee, Mortals!* and for actors marked in Minion!. Use it to tell minions apart from other creatures, for example to keep them out of your regular kill count.

### minionKillSchemaVersion

```js
api.minionKillSchemaVersion;  // 1
```

The version of the [`minionKill` event](minion-kill-hook.md#the-event).

### openBandsWindow

```js
api.openBandsWindow();
```

Opens the Groups and bands window. GM only, and only while [shared turns and bands](../bands/index.md) is on.

## Flags

### Marking a minion {#marking}

```js
await actor.setFlag("dnd5e", "minionBangMinion", true);
```

This flag's name won't change.

### Who killed a minion {#who-killed-a-minion}

Every minion that Minion! drops, from a hit or from an overkill, gets this record:

```js
const record = actor.getFlag("minion-bang", "killedBy");
// {
//   attackerTokenUuid: "Scene.xxxx.Token.yyyy",
//   attackerName: "Akra",
//   combatId: "zzzz",   // null outside combat
//   round: 2,           // null outside combat
//   turn: 0             // null outside combat
// }
```

Each death also gets its own id, the same as the hook's `eventId`:

```js
actor.getFlag("minion-bang", "deathId");
```

### Bands {#band-flags}

A band's data lives on its combatant group, in the `minion-bang` scope.

| Flag | On | Content |
|---|---|---|
| `color` | group | The band's color, `#rrggbb` |
| `captain` | group | The captain's token id |
| `mode` | group | `captain`, `average`, `highest`, `lowest` or `median`. Missing means the world setting. |
| `lockedInitiative` | group | The captain's roll, locked in |
| `alone` | combatant | `true` for a minion the Groups and bands window added alone |
| `ringOriginal` | token | `{ value }`: the ring color the token had before it took a band color |

```js
const group = game.combat.groups.getName("Goblin Lackey 1");
group.getFlag("minion-bang", "captain");
```
