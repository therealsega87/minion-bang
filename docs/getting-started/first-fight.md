# Your first fight

About ten minutes, one scene, no bands. You need a character with a weapon and three or more minions of the same kind.

## Prepare

1. Mark the minions ([how](marking-minions.md)) and place at least four tokens of the same kind on a scene, close together.
2. Start a combat with the character and the minions, so the dialog knows whose turn it is.
3. Optional but useful: open the browser console (++f12++) and turn on **Enable Debug** in the module settings. Every minion damage event writes a log you can read afterwards.

## A plain hit

Attack one minion with a weapon. If the attack hits, the minion drops to 0 hit points and gets the Dead status. If the damage is no more than the minion's hit point maximum, that is all that happens.

## An overkill

<figure markdown="span">
  ![A weapon attack drops a minion and the overkill dialog takes down more](../assets/images/overkill.gif){ width="520" loading=lazy }
  <figcaption>What you are about to see: the attack, the dialog and the fall.</figcaption>
</figure>

Attack a minion again with a damage roll above its hit point maximum. For a minion with 6 hit points, an attack dealing 20 damage leaves an excess of 14: enough for three more minions, since each one takes 6 and a fraction counts as a full one.

1. The attacking player sees the overkill dialog. The nearest minions in range are already checked, and their tokens show a red ring on that player's screen only.
2. The dialog never lets you check more minions than the damage allows.
3. Click **Confirm**. The checked minions drop, and the chat shows who made the overkill.

If the attacking player is not connected, the GM gets the dialog. If the player is connected, the GM sees a waiting window with **Decide for them** and **Cancel overkill**.

## An opportunity attack

Attack a minion when it is not your turn. The dialog first asks **Was this an opportunity attack?** Answer **Yes (no overkill)** and the dialog closes with no minion falling besides the one you hit.

## Next

- [How the Minion trait and overkill work](../table/index.md) in full.
- [Bands](../bands/index.md), if you want a horde to take one place in the tracker.
