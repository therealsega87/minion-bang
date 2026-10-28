# Overkill

When a player character's weapon attack deals more damage than a minion has hit points, the excess takes down more minions of the same kind. Akra swings at a goblin with 6 hit points and deals 20 damage. The goblin dies, and the 14 extra points are enough for three more goblins in reach.

<figure markdown="span">
  ![A weapon attack drops a minion and the overkill dialog takes down more](../assets/images/overkill.gif){ width="520" loading=lazy }
  <figcaption>An attack, the overkill dialog and the minions that fall.</figcaption>
</figure>

## When overkill happens

All of these must be true:

- the attacker is a **player character**;
- the attack is a **weapon attack**, melee or ranged;
- the damage, after resistances, is above the minion's hit point maximum;
- there are other minions of the same kind in range;
- it is not an [opportunity attack](#opportunity-attacks).

Spell attacks and creatures attacking from the GM's side never cause overkill.

## How many fall

One more minion for each full or partial hit point maximum of excess. The excess is the damage minus the minion's hit point maximum.

| Damage | Minion's maximum | Excess | Extra minions |
|---|---|---|---|
| 20 | 6 | 14 | 3 |
| 14 | 6 | 8 | 2 |
| 7 | 6 | 1 | 1 |

The resistances of the extra minions don't reduce the excess.

## Which minions are in range

- **Melee:** the minions within the weapon's reach, measured edge to edge like Midi-QOL does.
- **Ranged:** a line one square wide, starting at the attacker, passing through the minion hit and as long as the weapon's short range.

These never appear in the dialog: the minion already hit, the other targets of the same attack, minions at 0 hit points or already defeated, hidden tokens and creatures with the Invisible or Ethereal status.

## The overkill dialog

The player who owns the attacker sees the dialog, if that player is online. Otherwise the GM does.

- The minions nearest to the one hit are already checked, and their tokens show a red ring on the map. Only the person deciding sees those rings. A setting turns the preselection off: see [Settings](../reference/settings.md).
- The dialog never lets you check more minions than the damage allows. Checking one more removes the oldest choice.
- Tokens are listed by their token name.
- **Confirm** drops the checked minions. **Cancel** drops none.

If the excess would be enough for more minions than are in range, the dialog says so and offers the ones that are.

<figure markdown="span">
  ![The overkill dialog with three minions checked](../assets/images/overkill-dialog.png){ width="400" loading=lazy }
  <figcaption>The dialog: three minions checked, which is the most this damage allows.</figcaption>
</figure>

<figure markdown="span">
  ![Red rings around the proposed minions on the map](../assets/images/overkill-map.png){ width="340" loading=lazy }
  <figcaption>The same choice on the map: red rings mark the checked minions.</figcaption>
</figure>

### While a player decides

The GM sees a waiting window: **Waiting for *player* to resolve *character*'s overkill.** It has two buttons: **Decide for them** opens the dialog for the GM, and **Cancel overkill** ends it. The first answer wins.

<figure markdown="span">
  ![The GM waiting window with Decide for them and Cancel overkill](../assets/images/gm-waiting.png){ width="360" loading=lazy }
  <figcaption>What the GM sees while the player decides.</figcaption>
</figure>

## Opportunity attacks

Opportunity attacks cause no overkill. When an attack happens outside the attacker's turn, or outside combat, the dialog starts by asking **Was this an opportunity attack?** The default answer is **No**. Answer **Yes (no overkill)** and the minion list closes at once: the boxes go grey and the rings disappear. Answer **No** and the list comes back.

<figure markdown="span">
  ![The overkill dialog with the opportunity attack question](../assets/images/opportunity-question.png){ width="400" loading=lazy }
  <figcaption>The question appears when the attack is outside the attacker's turn.</figcaption>
</figure>

## In the chat

Every overkill that happens ends with a message: *"Akra lands an overkill! Besides Goblin 3, 3 more enemies fall."*

When it doesn't happen, the chat says so, so the table knows it was a decision and not a bug:

- the player cancelled or the GM cancelled it;
- the player pressed **Confirm** with no minion checked.

An opportunity attack leaves no message.

<figure markdown="span">
  ![The chat message announcing an overkill](../assets/images/overkill-chat.png){ width="300" loading=lazy }
  <figcaption>The message in the chat.</figcaption>
</figure>

## Who killed whom

Each minion that drops from an overkill carries the same [record](../developers/api-and-flags.md#who-killed-a-minion) as the one hit: the attacker, the round and the turn. Statistics modules use it, and so does [Combat Stats](../reference/combat-stats.md).

## If an extra minion can't be downed

The others still fall. The GM gets a notification that names the ones that failed, and the console has the details.
