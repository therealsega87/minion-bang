# Shared turns and bands

Thirty goblins don't need thirty turns. With this feature, minions of the same kind share an initiative and a turn, split into **bands**. A band takes one place in the initiative order, and when its turn comes the module steps through each member and then moves on.

The feature is optional and **off by default**. It follows the *Shared Turns* and *Minion Bands* rules of *Flee, Mortals!*, plus a few table choices of its own that this section points out.

## How it fits together

1. **Before the fight:** the minions on the scene are split into bands, by hand or automatically. See [Setting up bands](setup.md).
2. **At the initiative roll:** each band rolls once, usually through its captain. See [Initiative and captains](initiative.md).
3. **During the fight:** each band takes one place in the tracker, and the turn steps through its members. See [Turns](turns.md).
4. **On the map:** each band has a color that every player sees. See [Colors on the map](colors.md).
5. **If something changes:** [bands already in combat](existing.md) can be recolored, and their captain and mode changed until they roll.

## Turning it on

Open **Configure Settings → Minion!** and check **Shared turns and bands**. The setting is per world, and only the GM can change it.

Minion! builds on the combatant groups that Foundry has built in since version 13, so the tracker, the initiative rolls and other modules see ordinary Foundry groups.

!!! warning "Squad Combat Initiative"
    Squad Combat Initiative manages the same groups and cannot run together with this feature. Turn it off first. While both are active, Minion! keeps its groups off and the GM sees a warning.

## Two ways to make bands

**Automatic groups.** With no setup, minions of the same kind that join a combat **before** initiative is rolled are grouped on their own, in blocks of the maximum band size for their challenge rating. Seven goblins with a maximum of 5 become a band of 5 and a band of 2.

**The Groups and bands window.** A button in the combat tracker opens a window that proposes bands, then lets the GM rename them, recolor them and choose each band's captain and initiative mode. Use it when you want control. See [Setting up bands](setup.md).

## Rules the bands follow

- A band is never larger than the [maximum for its challenge rating](../reference/band-size.md). The table is editable.
- A minion without a challenge rating is never grouped.
- Bands are made **before** the roll. They don't change after it: a minion added later is a normal combatant.
- One minion left alone stays alone, and it joins the next minion of its kind that comes.
