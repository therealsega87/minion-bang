# Compatibility

## Required

| Package | Version |
|---|---|
| Foundry VTT | 13 or 14 (verified on 14.368) |
| dnd5e | 5.3.2 to 5.3.x (verified on 5.3.3) |
| [Midi-QOL](https://foundryvtt.com/packages/midi-qol) | 13.0.64 or later on Foundry 13, 14.0.11 or later on Foundry 14 |
| [socketlib](https://foundryvtt.com/packages/socketlib) | any version for your Foundry |

Midi-QOL depends on DAE and libWrapper. Foundry offers to install them along with it.

## Works with

| Module | What it adds |
|---|---|
| *Flee, Mortals!* (MCDM module) | Its minions are recognized with no setup. |
| Combat Stats | Overkill kills are credited. See [Combat Stats](combat-stats.md). Tested with 4.3.0. |
| Dynamic Token Ring (built into Foundry) | Band colors show on the token ring. Without it, Minion! draws a circle. |

## Doesn't work with

| Module | What happens |
|---|---|
| Squad Combat Initiative | It manages the same groups as shared turns and bands. Turn it off before you use bands. While both are active, Minion! keeps its groups off and warns the GM. The Minion trait and overkill still work. |

## Not supported

- Overkill or the Minion trait without Midi-QOL.
- dnd5e 5.4 and later. Minion! will follow once those versions, and the modules it depends on, are out and tested.
- Scenes measured in meters haven't been tested.

## After you update another module

Minion! reads internal values of Midi-QOL, dnd5e and Combat Stats, and a new version can change them. After updating any of them, run a short test fight before the session. See [Updating](../getting-started/updating.md#before-a-session).
