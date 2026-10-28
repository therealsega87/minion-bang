# Troubleshooting

Start with the first item. It solves more problems than the rest together.

## Everyone reloads with Ctrl+F5

After an update, a normal reload can keep the old files in the browser cache. Windows then behave like the previous version. Have every player press ++ctrl+f5++. To check which version a browser runs, read the line Minion! writes in the console (++f12++) when the world loads.

## A minion doesn't drop

1. **Is the actor a minion?** Open the sheet, **Special Traits**, and look for the **Minion** box, or look for the red skull in the Token HUD. See [Marking minions](../getting-started/marking-minions.md).
2. **Is the token unlinked?** An unlinked token carries its own copy of the actor. Mark the token with the Token HUD button.
3. **Is Midi-QOL on and applying the damage?** Minion! acts on the damage Midi-QOL calculates. Hit points edited by hand don't trigger the trait.
4. **Was it "other" damage?** A saving throw the minion passed, *magic missile* or an aura only kills when the damage reaches the minion's hit point maximum. See [The Minion trait](../table/minion-trait.md).
5. **Is it immune?** An immune minion takes no damage and stays up.

## There is no overkill dialog

All of these must be true:

- the attacker is a **player character**;
- the attack is a **weapon attack**;
- the damage is above the minion's hit point maximum;
- there are other minions of the same kind in range;
- the attack is not an opportunity attack;
- the **GM is viewing the scene** where the attack happened. Otherwise the minion hit drops, no overkill is offered, and the GM is told.

Also check the attack itself. The activity must be set up as a melee or ranged attack. Damage added after the attack by on-demand automations such as CPR or GPS doesn't count.

## The dialog shows fewer minions than I expected

These are never listed: the minion already hit, the other targets of the same attack, minions at 0 hit points or defeated, hidden tokens, and creatures with the Invisible or Ethereal status. Minions out of reach (melee) or off the line (ranged) are not listed either.

## The Groups and bands button doesn't work

- *"Groups and bands needs 'Shared turns and bands' to be on"*: turn the setting on in **Configure Settings → Minion!**.
- *"No minion available"*: minions already in the combat are not shown, and neither are minions without a challenge rating. Check the actor's challenge rating.

## A warning about Squad Combat Initiative

Squad Combat Initiative manages the same groups. Turn it off in **Manage Modules**. While it stays active, Minion! keeps its groups off. See [Compatibility](../reference/compatibility.md).

## The band didn't step through all its members

The GM gets a notification when the turn can't move through every member. Open the console (++f12++) for the details and [report it](bug-report.md).

## Combat Stats counts a minion twice

Combat Stats applies a new mode only after a reload. If you changed its mode, reload Foundry with ++f5++. See [Combat Stats](../reference/combat-stats.md#modes).

## A console warning about Combat Stats

Minion! uses internal functions of Combat Stats. If a new version changes them, Minion! writes a warning and stops crediting the extra kills. The overkill keeps working. [Report it](bug-report.md).

## Nothing here helps

[Report a bug](bug-report.md). Turn on **Enable Debug** first: the log makes the report much more useful.
