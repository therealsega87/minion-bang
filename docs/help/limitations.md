# Known limitations

## Overkill and the Minion trait

- Minion! needs Midi-QOL, because it works from the damage Midi-QOL calculates.
- Overkill reads the attack's action type: only melee and ranged weapon attacks (`mwak`, `rwak`) qualify. Spell attacks (`msak`, `rsak`) still trigger the Minion trait.
- The GM must be viewing the scene of the attack. If not, the minion hit still drops, but no overkill is offered.
- Damage added after the attack by on-demand automations (CPR, GPS and similar modules) doesn't count towards overkill.
- Scenes measured in meters haven't been tested.
- Only the undo button on Midi-QOL's damage card brings back the minions an overkill took down.

## Shared turns and bands

- Bands keep the sizes the Groups and bands window proposes. Bands of any size are on the [roadmap](../project/roadmap.md).
- While the turn moves through a band, the other members' reaction markers stay visible, and each member's start-of-turn effects trigger as the turn reaches it. **Previous turn** skips start and end of turn effects.
- [Automatic groups](../bands/setup.md#automatic-groups) start with no color and no captain.
- When a minion drops or stands up, its ring can show the wrong color for about two seconds before it turns black or back to the band's color. dnd5e flashes the ring whenever hit points change, and Minion! fixes the color once the flash ends.
- In the captain's roll mode, if the captain can't roll, nobody rolls and no warning appears.
- When a member rolls, the band can show the value dnd5e copied for a split second, before Minion! sets the right one.
- In the average, highest, lowest and median modes every member rolls, so the chat gets one roll card per member, plus a summary card for the GM.

## Other modules

- Squad Combat Initiative can't run alongside shared turns and bands.
- With Combat Stats before 4.4.0, the overkill credit relies on internal functions of that module. A later version may need a Minion! update.
