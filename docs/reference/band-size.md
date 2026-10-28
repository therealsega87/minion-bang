# Band size table

The table holds the **largest band** allowed for each challenge rating. A band never has more members than its row says.

## Where the defaults come from

The default values are the **Minions per Standard** column of the *Minion Encounter Building* table in *Flee, Mortals!*. The book uses that column to plan encounters: it says to think of that many minions as one standard creature. The book does not use it to cap bands. Minion! borrows it as a sensible default size for a band, and that choice is Minion!'s own.

| Challenge rating | Maximum band size |
|---|---|
| 0 to 4 | 5 |
| 5 to 8 | 8 |
| 9 and above | 10 |

Values from *Flee, Mortals!* by MCDM Productions. See the book for the full table.

## Editing the table

1. Open **Configure Settings → Minion!**.
2. Next to **Maximum band size**, click **Edit the table**. It is GM only.
3. Change the **Maximum** of any row. The **Default** column shows the original value.
4. Click **Save**. **Restore default** puts the whole table back.

<figure markdown="span">
  ![The Maximum band size window with one row per challenge rating](../assets/images/band-size-table.png){ width="300" loading=lazy }
  <figcaption>The table window. <strong>Default</strong> shows the original value of each row.</figcaption>
</figure>

Every maximum must be a whole number of at least 2, or the table is not saved. A creature above CR 21 uses the last row.

!!! warning "Balance"
    The window warns you: changing these values from the default table changes the balance of your encounters. The table applies to the whole world.

If the stored table is damaged, Minion! uses the default and tells the GM. Open the table from the settings to fix it.

## Where the table is used

- [Automatic groups](../bands/setup.md#automatic-groups) split minions into blocks of the maximum.
- The [Groups and bands window](../bands/setup.md) proposes bands of the maximum.
- The [`minionKill` hook](../developers/minion-kill-hook.md) reports the maximum for the dead minion's challenge rating as `minionsPerStandard`.
