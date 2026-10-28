# Known limitations

## Overkill and the Minion trait

- Minion! needs Midi-QOL: it reads the damage Midi-QOL calculates.
- Attack activities must be set up as melee or ranged weapon or spell attacks (`mwak`, `rwak`, `msak`, `rsak`). Overkill follows weapon attacks only.
- The GM must be viewing the scene of the attack. Otherwise the hit minion still drops, but no overkill is offered.
- Damage added after the attack by on-demand automations (CPR, GPS and similar modules) doesn't count towards overkill.
- Scenes measured in meters haven't been tested.

## Shared turns and bands

- Bands keep the size the Groups and bands window proposes. Bands of any size are planned: see the [roadmap](../project/roadmap.md).
- While the turn steps through a band, the reaction marker of the other members stays visible, and their start-of-turn effects fire as the turn reaches them. **Previous turn** skips start and end of turn effects.
- [Automatic groups](../bands/setup.md#automatic-groups) start with no color and no captain.
- In the captain's roll mode, if the captain can't roll, nobody rolls and no warning appears.
- When a member rolls, the band can show the value copied by dnd5e for a fraction of a second before Minion! sets the right one.
- In the average, highest, lowest and median modes every member rolls, so the chat gets one roll card per member plus a summary card for the GM.

## Other modules

- Squad Combat Initiative cannot run together with shared turns and bands.
- The Combat Stats support uses internal functions of that module. A future version of Combat Stats may need an update of Minion!.
