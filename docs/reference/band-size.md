# Band size table

The table holds the **largest band** allowed for each challenge rating. A band never has more members than its row says.

The default values are the table in *Flee, Mortals!*, from the section on minion bands. Minion! doesn't print them here: check the book for the table itself.

## Editing the table

1. Open **Configure Settings → Minion!**.
2. Next to **Maximum band size**, click **Edit the table**. It is GM only.
3. Change the **Maximum** of any row. The **Default** column shows the original value.
4. Click **Save**. **Restore default** puts the whole table back.

Every maximum must be a whole number of at least 2, or the table is not saved. A creature above CR 21 uses the last row.

!!! warning "Balance"
    The window warns you: changing these values from the rules' table changes the balance of your encounters. The table applies to the whole world.

If the stored table is damaged, Minion! uses the default and tells the GM. Open the table from the settings to fix it.

## Where the table is used

- [Automatic groups](../bands/setup.md#automatic-groups) split minions into blocks of the maximum.
- The [Groups and bands window](../bands/setup.md) proposes bands of the maximum.
- The [`minionKill` hook](../developers/minion-kill-hook.md) reports the maximum for the dead minion's challenge rating as `minionsPerStandard`.
