# Troubleshooting

Start at the top. The first item fixes more problems than all the others combined.

## Everyone reloads with Ctrl+F5

After an update, a normal reload can keep the old files in the browser cache, and the windows behave like the previous version. Ask every player to press ++ctrl+f5++. To see which version a browser runs, look for the line Minion! writes in the console (++f12++) when the world loads.

## A minion doesn't drop

1. **Is the actor a minion?** Open the sheet, go to **Special Traits** and look at the **Minion** box. Minions from the *Flee, Mortals!* module count even with the box unchecked. See [Marking minions](../getting-started/marking-minions.md).
2. **Is the token unlinked?** An unlinked token has its own copy of the actor. Mark it with the skull button in its Token HUD.
3. **Did Midi-QOL apply the damage?** Minion! only acts on damage Midi-QOL calculates. Typing new hit points on the sheet doesn't trigger the trait.
4. **Was it "other" damage?** A saving throw the minion succeeded on, *magic missile* or an aura only kills when the damage reaches the minion's hit point maximum. See [The Minion trait](../table/minion-trait.md).
5. **Is it immune?** An immune minion takes no damage and stays up.

## No overkill dialog

All of these must be true:

- the attacker is a **player character**, and its token is on the scene;
- the attack is a **weapon attack**;
- the damage is higher than the minion's hit point maximum;
- another minion of the same kind is in range;
- it isn't an opportunity attack;
- the **GM is viewing the scene** where the attack happened. If not, the minion hit still drops, no overkill is offered, and the GM gets a notification.

Then check the item. Its activity must be a melee or ranged weapon attack. Damage added after the attack by on-demand automations, such as CPR or GPS, doesn't count.

## The dialog lists fewer minions than expected

The dialog never lists the minion you hit, the other targets of the same attack, minions at 0 hit points or marked defeated, hidden tokens, or creatures with the Invisible or Ethereal status. Minions out of reach (melee) or off the line (ranged) aren't listed either.

## No Groups and bands button {#no-groups-and-bands-button}

The button only appears for the GM, while **Shared turns and bands** is on and Squad Combat Initiative is off. Check both in **Configure Settings → Minion!** and **Manage Modules**.

If the window doesn't open and you see *"No minion available"*, the scene has no minion that can join a band. Minions already in the combat aren't listed, and neither are minions with no challenge rating.

## A warning about Squad Combat Initiative

Squad Combat Initiative manages the same groups. Turn it off in **Manage Modules**. While it stays on, Minion! keeps its groups off. See [Compatibility](../reference/compatibility.md).

## A band didn't move through all its members

The GM gets a notification when the turn can't reach every member. Open the console (++f12++) for the details, and [report it](bug-report.md).

## Combat Stats counts a minion twice

Combat Stats only switches mode after a reload. If you changed its mode, reload Foundry with ++f5++. See [Combat Stats](../reference/combat-stats.md#modes).

## A console warning about Combat Stats

Minion! relies on internal functions of Combat Stats. If a new version changes them, Minion! writes a warning and stops crediting the extra kills. Overkill keeps working. Please [report it](bug-report.md).

## Still stuck

[Report a bug](bug-report.md). Turn on **Enable Debug** first: the log makes the report far more useful.
