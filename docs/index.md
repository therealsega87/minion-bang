# Minion!

Minion! brings the minion rules of MCDM's *Flee, Mortals!* to Foundry VTT for D&D 5e. A minion drops the moment an attack hits it, a big hit carries on into the minions around it, and a horde of thirty goblins takes a handful of places in the tracker instead of thirty.

It runs on top of Midi-QOL, so your players attack the way they always do.

[Install it](getting-started/installation.md){ .md-button .md-button--primary }
[Your first fight](getting-started/first-fight.md){ .md-button }

## Where to start

<div class="grid cards" markdown>

-   **I run the game**

    ---

    Install the module, mark your minions and run a test fight. Then read how the Minion trait, overkill and bands play out at the table.

    [Getting started](getting-started/index.md) · [At the table](table/index.md)

-   **I write modules or macros**

    ---

    Minion! calls a hook every time a minion dies and offers a small API. Statistics modules can use both.

    [For developers](developers/index.md)

-   **Something went wrong**

    ---

    Start with the troubleshooting checklist. If that doesn't fix it, the bug report page lists what to send.

    [Troubleshooting](help/troubleshooting.md) · [Reporting a bug](help/bug-report.md)

</div>

## What it does

**The Minion trait.** An attack that hits a minion, or a saving throw it fails, drops it to 0 hit points. Any other damage kills it only if the damage reaches its hit point maximum. [Read more](table/minion-trait.md).

**Overkill.** When a player character's weapon attack deals more damage than a minion's hit point maximum, the extra damage takes down more minions of the same kind within reach. The attacking player chooses which ones fall. [Read more](table/overkill.md).

**Shared turns and bands.** Minions of the same kind share one initiative and one turn, split into bands. The GM sets up the bands in one window, and the turn moves through each band on its own. This part is optional and off by default. [Read more](bands/index.md).

## Requirements

| Package | Version |
|---|---|
| Foundry VTT | 13 or 14 |
| dnd5e | 5.3.2 to 5.3.x |
| [Midi-QOL](https://foundryvtt.com/packages/midi-qol) | 13.0.64 or later on Foundry 13, 14.0.11 or later on Foundry 14 |
| [socketlib](https://foundryvtt.com/packages/socketlib) | any version for your Foundry |

You don't need the *Flee, Mortals!* module. If it's installed, Minion! recognizes its minions automatically. See the [installation steps](getting-started/installation.md).
