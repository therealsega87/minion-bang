# The Minion trait

A minion has hit points, but the rules treat almost any damage as lethal. Minion! applies the trait every time Midi-QOL applies damage to a minion.

## What takes a minion down

| What happened | Result |
|---|---|
| An attack hits it | It drops to 0 hit points, however little damage the attack deals. |
| It fails a saving throw against an effect that deals damage | It drops to 0 hit points. |
| Any other damage: a saving throw it succeeds on, *magic missile*, an aura | It drops only if the damage reaches its **hit point maximum**. Anything less does nothing. |

Minion! tells these apart by the type of activity in dnd5e: an attack activity, a saving throw activity, or anything else.

## Damage that counts

Minion! uses the damage Midi-QOL calculates **after** resistances, vulnerabilities, immunities and the saving throw, rounded down. All of it counts: the weapon's damage, extra damage of other types such as a poisoned blade's, and bonus damage.

It makes no difference whether Midi-QOL applies the damage on its own or you click the apply button on its damage card, or how its **Single Damage Calculation** setting is set.

- If the minion is immune, the damage is 0 and the minion stays up. A hit that deals 0 damage never kills.
- A resistance can push "other" damage below the hit point maximum, and the minion survives. That's the rule doing its job.

Healing and temporary hit points with no damage leave the minion alone.

## After it drops

The minion gets the **Dead** status and, in combat, the defeated mark. If Midi-QOL is set to apply them, Minion! leaves that to Midi-QOL, so nothing happens twice.

Minion! also records who killed it, on the actor in `flags.minion-bang.killedBy`. See [API and flags](../developers/api-and-flags.md#who-killed-a-minion).

## Undoing it

The undo button on Midi-QOL's damage card puts the minion back on its feet, without the Dead status or the defeated mark. If the attack also caused an overkill, the minions it took down stand up too. See [Undoing an overkill](overkill.md#undoing-an-overkill).

## When Minion! stays out of it

Minion! acts only on damage Midi-QOL calculated. If you change a minion's hit points by hand, for example by typing on the sheet, the trait doesn't apply.
