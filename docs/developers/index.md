# For developers

Minion! offers three things to other modules and macros:

| What | Where |
|---|---|
| A hook called once for every minion that dies | [The `minionKill` hook](minion-kill-hook.md) |
| `api.isMinion(actor)` and the schema version | [API and flags](api-and-flags.md) |
| Flags on actors, groups, combatants and tokens | [API and flags](api-and-flags.md#flags) |

If you write a statistics module, also read [Statistics modules](statistics-modules.md). It explains how to avoid counting a kill twice.

The hook reports deaths only. For damage, use the Midi-QOL hooks.

## Versioning

Each event carries a version number, `schemaVersion`, currently `1`. `api.minionKillSchemaVersion` holds the same number. Check it before you read the event. The format of `flags.minion-bang.killedBy` stays the same.
