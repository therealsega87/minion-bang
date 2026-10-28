# Shared turns and bands

With this feature, minions of the same kind share an initiative and a turn, split into **bands**. Each band takes one place in the initiative order. When its turn comes, the turn moves through every member and then on to the next creature.

The feature is optional and **off by default**. In *Flee, Mortals!*, minions of the same stat block act on the same turn, and the GM can split them into bands that act on different initiative counts. Minion! automates both. The size limit on bands is Minion!'s own choice: see the [band size table](../reference/band-size.md).

## How it fits together

1. **Before the fight:** the minions are split into bands, automatically or by you. See [Setting up bands](setup.md).
2. **At the initiative roll:** each band rolls once, usually through its captain. See [Initiative and captains](initiative.md).
3. **During the fight:** each band holds one place in the tracker, and the turn moves through its members. See [Turns](turns.md).
4. **On the map:** each band has a color that every player sees. See [Colors on the map](colors.md).
5. **Changes:** you can recolor [bands already in combat](existing.md), and change their captain and initiative mode until they roll.

## Turning it on

Open **Configure Settings → Minion!** and check **Shared turns and bands**. It's a world setting, so only the GM can change it.

Bands are ordinary Foundry combatant groups, built into Foundry since version 13. The tracker, the initiative rolls and other modules see them as normal groups.

!!! warning "Squad Combat Initiative"
    Squad Combat Initiative manages the same groups, so it can't run alongside this feature. Turn it off first. While both are active, Minion! keeps its groups off and warns the GM.

## Two ways to make bands

**Automatic groups.** With no setup at all, minions of the same kind that join a combat before anyone rolls initiative are grouped for you, in blocks of the maximum band size for their challenge rating. Seven goblins with a maximum of 5 become a band of 5 and a band of 2.

**The Groups and bands window.** A button in the combat tracker opens a window that proposes the bands. You can then move minions between bands, rename and recolor the bands, and pick each band's captain and initiative mode. See [Setting up bands](setup.md).

## Rules the bands follow

- A band never has more members than the [maximum for its challenge rating](../reference/band-size.md). You can edit the table.
- A minion with no challenge rating is never put in a band.
- Automatic groups form only until someone in the combat rolls initiative. After that, a minion that joins on its own is an ordinary combatant. The Groups and bands window can still add new bands.
- A minion left over on its own stays alone. Automatic groups add it to a band when another minion of its kind joins.
