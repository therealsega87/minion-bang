# For developers

Minion! exposes three things to other modules and macros:

| What | Where |
|---|---|
| A hook called once for every minion that dies | [The `minionKill` hook](minion-kill-hook.md) |
| `api.isMinion(actor)` and the schema version | [API and flags](api-and-flags.md) |
| Flags on actors, groups, combatants and tokens | [API and flags](api-and-flags.md#flags) |

If you write a statistics module, read [Statistics modules](statistics-modules.md) as well: it explains how to avoid counting a kill twice.

The hook reports kills, not damage. If you want to compute damage, use the Midi-QOL hooks.

## Stability

The event carries a version number (`schemaVersion`, now `1`), and `api.minionKillSchemaVersion` gives the same number. Check it before you read the event. The format of `flags.minion-bang.killedBy` does not change.
