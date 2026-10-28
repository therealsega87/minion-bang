# Compatibility

## Required

| Package | Version |
|---|---|
| Foundry VTT | 13 or 14 (verified on 14.368) |
| dnd5e | 5.3.2 to 5.3.x (verified on 5.3.3) |
| [Midi-QOL](https://foundryvtt.com/packages/midi-qol) | 13.0.64 or later on Foundry 13, 14.0.11 or later on Foundry 14 |
| [socketlib](https://foundryvtt.com/packages/socketlib) | any version for your Foundry |

Midi-QOL needs DAE and libWrapper, so Foundry installs those too.

## Works with

| Module | What changes |
|---|---|
| *Flee, Mortals!* (MCDM module) | Its minions are recognized with no setup. |
| Combat Stats | Overkill kills are credited. See [Combat Stats](combat-stats.md). Tested with 4.3.0. |
| Dynamic Token Ring (a Foundry core feature) | Band colors use the token ring. Without it, a circle is drawn. |

## Does not work with

| Module | What happens |
|---|---|
| Squad Combat Initiative | It manages the same groups as shared turns and bands. Turn it off before you use bands. While both are active, Minion! keeps its groups off and warns the GM. The Minion trait and overkill still work. |

## Not supported

- Overkill without Midi-QOL.
- dnd5e 6 and later. Minion! will be updated when those versions and the modules it depends on are out.
- Scenes measured in meters: untested.

## After you update another module

Minion! reads internal values of Midi-QOL, dnd5e and Combat Stats. A new version can change them. After updating any of those, play a short test fight before the session. See [Updating](../getting-started/updating.md#before-a-session).
