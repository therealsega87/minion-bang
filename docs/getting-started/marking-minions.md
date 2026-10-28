# Marking minions

Minion! treats an actor as a minion in either of two cases:

- the actor comes from the *Flee, Mortals!* module with the minion role: nothing to set up;
- the actor is marked in Minion!, in either of the two ways below. They always stay in sync.

## The Minion checkbox

Open the actor sheet, go to **Special Traits** and check **Minion**.

## The Token HUD button

Right-click a token on the scene. The skull button in the Token HUD (GM only) toggles the mark, and it is red while the actor is a minion.

## Unlinked tokens

An unlinked token carries its own copy of the actor. Check the box on the actor **before** you place its tokens. For tokens already on the scene, use the Token HUD button on each one.

## From a macro

```js
await actor.setFlag("dnd5e", "minionBangMinion", true);   // mark
await actor.setFlag("dnd5e", "minionBangMinion", false);  // unmark
```

To ask whether an actor counts as a minion, use the [API](../developers/api-and-flags.md#isminion).

## Same kind of minion

For overkill, bands and groups, "the same kind" means the same stat block: the same compendium entry the actor came from, or the same actor name when it has no compendium source. Goblin tokens made from one stat block are one kind. A hand-made actor called "Goblin" and a compendium goblin are two.

## Challenge rating

Bands need the actor's challenge rating to know how large a band can be. A minion without one is never grouped. See [Setting up bands](../bands/setup.md).
