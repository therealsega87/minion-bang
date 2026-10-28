# The minionKill hook

```js
Hooks.on("minion-bang.minionKill", event => { /* ... */ });
```

Minion! calls `Hooks.callAll("minion-bang.minionKill", event)` **once for each minion** whose hit points go from above 0 to 0, after the new hit points are saved. An attack that drops its target and three more minions by overkill makes four calls.

## When it's called

- Only on the **active GM**'s client. When another GM applies the damage, Minion! sends the event to the active GM through socketlib.
- Once the update that sets the hit points to 0 has gone through, however long that takes. If Minion! expects a death and the update never arrives, it gives up after ten minutes.
- Never twice for the same death. The active GM remembers the last 500 `eventId` values.

It's **not** called when:

- the minion was already at 0 hit points;
- someone sets the Dead status or the defeated mark by hand;
- a token is deleted or added to a combat, or the world reloads;
- an overkill is cancelled;
- the update fails.

A minion that's revived and killed again gets a new `eventId`. Past deaths aren't replayed, so a listener registered late misses them.

## The event

Every field is always present. When Minion! doesn't know a value, it's `null`.

```js
{
  schemaVersion: 1,
  eventId: "…",        // this death; also saved in flags.minion-bang.deathId
  workflowId: "…",     // uuid of the attack's chat card; null if unknown
  combatId: "…",       // null outside combat
  sceneId: "…",
  round: 2,            // null outside combat
  turn: 0,             // Foundry's turn index, can be 0; null outside combat
  attacker: {          // null if unknown
    actorId: "…", actorUuid: "…", tokenUuid: "…", name: "Akra"
  },
  victim: {
    actorId: "…", actorUuid: "…", tokenUuid: "…", name: "Goblin Lackey 3",
    cr: 0.25,          // null if the actor has none
    minionsPerStandard: 5   // the maximum band size for that CR in Minion!'s table
  },
  itemUuid: "…",       // the weapon or spell; null if unknown
  cause: "direct"      // "direct", "overkill" or "other"
}
```

| Field | Notes |
|---|---|
| `eventId` | Unique for each death. The same value is saved in `flags.minion-bang.deathId` on the minion, in the same update as the hit points. |
| `workflowId` | Shared by every victim of one attack. It's the uuid of the chat card, so each use of an item has its own. |
| `combatId`, `round`, `turn` | `null` when no combat has started. Filter on them if you only want kills made in combat. |
| `victim.cr` | `null` when the actor has no challenge rating. Never 0 as a stand-in. |
| `victim.minionsPerStandard` | The maximum band size for that challenge rating in the [band size table](../reference/band-size.md), including the GM's edits. `null` when `cr` is `null`. |

## The three causes

| `cause` | Meaning | `attacker` |
|---|---|---|
| `direct` | The minion an attack, spell or effect hit, dropped by the [Minion trait](../table/minion-trait.md). | Present when Midi-QOL reports the attacker. |
| `overkill` | A minion taken down by another minion's [overkill](../table/overkill.md). | The player character who made it. |
| `other` | Hit points reached 0 some other way: typed by hand, or damage with no Midi-QOL data. | `null` |

For `other`, Minion! needs the hit points from before the change to be sure the minion just died. If it can't tell, it sends nothing.

## Example

```js
const kills = new Map();

Hooks.on("minion-bang.minionKill", event => {
  if (!event.attacker) return;
  const total = (kills.get(event.attacker.name) ?? 0) + 1;
  kills.set(event.attacker.name, total);
  console.log(`${event.attacker.name}: ${total} minion kills (${event.cause})`);
});
```

This counts one kill per call. If your module saves kills, save each `eventId` as well and skip any `eventId` you already have.
