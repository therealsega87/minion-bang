# The minionKill hook

```js
Hooks.on("minion-bang.minionKill", event => { /* ... */ });
```

Minion! calls `Hooks.callAll("minion-bang.minionKill", event)` **once for each minion** that really goes from positive hit points to 0, after the hit points are written. An attack that downs the hit minion and three more by overkill makes four calls.

## When it is called

- Only on the client of the **active GM**. When another GM applies the damage, Minion! passes the event to the active GM through socketlib.
- After the update that sets the hit points to 0 has arrived, however long that takes. A death that Minion! expects and that never arrives is forgotten after ten minutes.
- Never twice for the same death: the active GM remembers the last 500 `eventId` values.

It is **not** called when:

- a minion was already at 0 hit points;
- Dead or the defeated mark is set by hand;
- a token is deleted or added to the combat, or the world reloads;
- an overkill is cancelled;
- the update fails.

A minion revived and killed again gets a new `eventId`. There is no replay: a listener that starts late doesn't receive past deaths.

## The event

Every field is always present. A value Minion! doesn't know is `null`.

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
    minionsPerStandard: 5   // the maximum band size for that CR in the Minion! table
  },
  itemUuid: "…",       // the weapon or spell; null if unknown
  cause: "direct"      // "direct", "overkill" or "other"
}
```

| Field | Notes |
|---|---|
| `eventId` | Unique for each death. The same value is written to `flags.minion-bang.deathId` on the minion, in the same update that sets the hit points. |
| `workflowId` | The same for every victim of one attack. It is the uuid of the chat card, so it is unique for each use of an item. |
| `round`, `turn` | `null` out of combat. Filter on these yourself if you only want kills in combat. |
| `victim.cr` | `null` when the actor has no challenge rating. Never 0 as a placeholder. |
| `victim.minionsPerStandard` | The maximum band size for that challenge rating in the [band size table](../reference/band-size.md). It follows the table the GM has edited. `null` when `cr` is `null`. |

## The three causes

| `cause` | Meaning | `attacker` |
|---|---|---|
| `direct` | The minion hit by the attack, or reached by a spell or effect, and dropped by the [Minion trait](../table/minion-trait.md). | Known when Midi-QOL gives the attacker |
| `overkill` | A minion taken down by the [overkill](../table/overkill.md) of another attack. | The player character who made it |
| `other` | Hit points went to 0 outside the rules above: edited by hand, or damage without Midi-QOL data. | `null` |

For `other`, Minion! needs the previous hit points to be sure of the transition. If it can't tell, it sends nothing.

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

This counts a kill for each call. Because `eventId` is unique, a module that saves kills should store it too, and ignore an `eventId` it has already stored.
