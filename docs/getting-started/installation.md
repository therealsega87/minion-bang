# Installation

## Requirements

| Package | Version |
|---|---|
| Foundry VTT | 13 or 14 |
| dnd5e | 5.3.2 to 5.3.x |
| [Midi-QOL](https://foundryvtt.com/packages/midi-qol) | 13.0.64 or later on Foundry 13, 14.0.11 or later on Foundry 14 |
| [socketlib](https://foundryvtt.com/packages/socketlib) | any version for your Foundry |

Midi-QOL depends on DAE and libWrapper. Foundry offers to install them along with it.

Minion! reads the damage Midi-QOL calculates, so Midi-QOL is required. [Compatibility](../reference/compatibility.md) covers the other modules.

## Install

1. In Foundry, open **Add-on Modules** and click **Install Module**.
2. Search for **Minion!**, or paste this manifest URL at the bottom of the window:

    ```
    https://github.com/therealsega87/minion-bang/releases/latest/download/module.json
    ```

3. Click **Install**.
4. Open your world and enable **Minion!**, **Midi-QOL** and **socketlib** in **Manage Modules**.

## Optional modules

- ***Flee, Mortals!*** (MCDM): Minion! recognizes its minions with no setup.
- **Combat Stats**: from version 4.4.0 it counts minion kills apart from ordinary kills, overkill included. See [Combat Stats](../reference/combat-stats.md).

!!! warning "Squad Combat Initiative"
    Squad Combat Initiative manages the same combatant groups that Minion! uses for [shared turns and bands](../bands/index.md), so the two can't run together. Turn it off before you turn bands on. While both are active, Minion! keeps its groups off and warns the GM. The Minion trait and overkill work either way.

## Next

[Mark your first minions](marking-minions.md).
