# Minion!

Minion! runs the minion rules from MCDM's *Flee, Mortals!* in Foundry VTT for D&D 5e. A minion drops the moment an attack hits it, a big hit cuts through the minions standing next to it, and a horde of thirty goblins takes a handful of turns in the tracker instead of thirty.

It works on top of Midi-QOL. You keep attacking the way you always do.

[Install it](getting-started/installation.md){ .md-button .md-button--primary }
[Your first fight](getting-started/first-fight.md){ .md-button }

## Where to start

<div class="grid cards" markdown>

-   **I run the game**

    ---

    Install the module, mark your minions and play the first fight. Then read how the Minion trait, overkill and bands behave at the table.

    [Getting started](getting-started/index.md) · [At the table](table/index.md)

-   **I write modules or macros**

    ---

    Minion! calls a hook for every minion that dies and exposes a small API. Statistics modules can read both.

    [For developers](developers/index.md)

-   **Something went wrong**

    ---

    Start with the checklist. If it doesn't solve it, the page on reporting a bug says what to send.

    [Troubleshooting](help/troubleshooting.md) · [Reporting a bug](help/bug-report.md)

</div>

## What it does

**The Minion trait.** Any attack that hits, or any saving throw a minion fails, takes it to 0 hit points. Damage from anything else only kills it when it reaches the minion's hit point maximum. [Read more](table/minion-trait.md).

**Overkill.** When a player character's weapon attack deals more damage than a minion has hit points, the excess takes down more minions of the same kind within reach. The attacking player picks which ones fall. [Read more](table/overkill.md).

**Shared turns and bands.** Minions of the same kind share one initiative and one turn, split into bands. The GM sets the bands up in one window, and the turn steps through the band by itself. This part is optional and off by default. [Read more](bands/index.md).

## Requirements

| Package | Version |
|---|---|
| Foundry VTT | 13 or 14 |
| dnd5e | 5.3.2 to 5.3.x |
| [Midi-QOL](https://foundryvtt.com/packages/midi-qol) | 13.0.64 or later on Foundry 13, 14.0.11 or later on Foundry 14 |
| [socketlib](https://foundryvtt.com/packages/socketlib) | any version for your Foundry |

You don't need the *Flee, Mortals!* module. If you have it, Minion! recognizes its minions on its own. [Full installation steps](getting-started/installation.md).
