# The Minion trait

A minion has hit points, but the rules treat any real damage as lethal. Minion! applies that when Midi-QOL applies damage to a minion.

## What takes a minion down

| What happened | Result |
|---|---|
| An attack hits it | It drops to 0 hit points, whatever the damage. |
| It fails a saving throw against an effect that deals damage | It drops to 0 hit points. |
| Anything else deals damage: a saving throw it passes, *magic missile*, an aura | It drops only if the damage reaches its **hit point maximum**. Less than that does nothing at all. |

Minion! decides by the kind of activity in dnd5e: an attack activity, a saving throw activity or anything else.

## Damage that counts

The damage that counts is the damage Midi-QOL calculates **after** resistances, vulnerabilities and immunities and after the saving throw, with bonus damage included. The result is rounded down.

- A minion immune to the damage takes none and stays up. A hit that deals 0 damage doesn't kill.
- A minion resistant to the damage may end up below the line for "anything else". That is the rules working as intended.

Healing and temporary hit points that deal no damage don't trigger the trait.

## After it drops

A minion that drops gets the **Dead** status and, in combat, the defeated mark. If Midi-QOL already applies them, Minion! leaves that to Midi-QOL, so nothing is applied twice.

Minion! also writes who killed it on the actor, in `flags.minion-bang.killedBy`. See [API and flags](../developers/api-and-flags.md#who-killed-a-minion).

## When Minion! doesn't step in

If the hit points are changed by hand, for example by typing a number on the sheet, the trait does not apply. Minion! only acts on damage that Midi-QOL calculated.
