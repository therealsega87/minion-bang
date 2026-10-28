# API and flags

## API

`isMinion` and `minionKillSchemaVersion` are available on every client from the `init` hook. `openBandsWindow` is added at `ready` and only for the GM.

```js
const api = game.modules.get("minion-bang").api;
```

### isMinion

```js
api.isMinion(actor);
```

Returns `true` for minions of *Flee, Mortals!* and for actors marked in Minion!. Use it to tell minions from other creatures, for example to leave them out of your normal kill count.

### minionKillSchemaVersion

```js
api.minionKillSchemaVersion;  // 1
```

The version of the [`minionKill` event](minion-kill-hook.md#the-event).

### openBandsWindow

```js
api.openBandsWindow();
```

Opens the Groups and bands window. GM only, with [shared turns and bands](../bands/index.md) on.

## Flags

### Marking a minion {#marking}

```js
await actor.setFlag("dnd5e", "minionBangMinion", true);
```

The name of this flag will not change.

### Who killed a minion {#who-killed-a-minion}

Every minion that drops, from a hit or from an overkill, gets this record:

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

Each death also gets its own id, the same as the `eventId` of the [hook](minion-kill-hook.md):

```js
actor.getFlag("minion-bang", "deathId");
```

### Bands {#band-flags}

The data of a band lives on its combat group, under the `minion-bang` scope.

| Flag | On | Content |
|---|---|---|
| `color` | group | The band's color, `#rrggbb` |
| `captain` | group | The token id of the captain |
| `mode` | group | `captain`, `average`, `highest`, `lowest` or `median`. Missing means "as in the settings". |
| `lockedInitiative` | group | The captain's roll, locked |
| `alone` | combatant | `true` for a creature added alone by the Groups and bands window |
| `ringOriginal` | token | The original ring color, saved while the token wears a band color |

```js
const group = game.combat.groups.getName("Goblin Lackey 1");
group.getFlag("minion-bang", "captain");
```
