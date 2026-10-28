# Setting up bands

You need **Shared turns and bands** turned on in the [settings](../reference/settings.md), and minions on the scene that are not in the combat yet.

## Automatic groups

If you add minions to a combat and roll initiative without opening any window, Minion! groups them for you.

- Minions of the same kind that join **before** the roll are grouped in blocks of the maximum band size for their challenge rating. Seven goblins with a maximum of 5 become 5 + 2.
- A single minion left over stays alone. It joins the next minion of its kind that you add.
- Minions with no challenge rating are never grouped.
- Groups you made by hand are left alone.
- After the roll, nothing changes.

Automatic groups have no color and no captain. Give them one from the [Existing bands](existing.md) tab, or the captain's roll mode has nobody to roll.

## The Groups and bands window

Use this when you want the bands, their names, their colors and their captains to be your choice.

1. Place the minions on the scene. To use only some of them, select them first.
2. Click **Groups and bands** in the header of the combat tracker. It is GM only.
3. If tokens are selected, the window asks **Do you want to use only the selected monsters?** Answer **Yes, only the selected ones** or **No, all the ones in the scene**.
4. The window shows one tab per kind of minion. Minions already in the combat, and minions without a challenge rating, are not listed.
5. Each tab starts with a header: how many minions there are, their challenge rating and the maximum per band. Below it, the plan: the bands proposed and how many minions stay alone.
6. Adjust the bands. See below.
7. Click **Apply**. A confirmation lists the kinds and the number of bands and singles. Confirm, and Minion! adds everything to the combat, creating one if there is none. **Apply never rolls initiative.**
8. Roll initiative as usual.

<figure markdown="span">
  ![The Groups and bands button in the combat tracker](../assets/images/bands-button.png){ width="300" loading=lazy }
  <figcaption>The <strong>Groups and bands</strong> button, under <strong>Create Combat</strong>.</figcaption>
</figure>

<figure markdown="span">
  ![The Groups and bands window with two bands of Goblin Lackeys](../assets/images/bands-window.png){ width="640" loading=lazy }
  <figcaption>Nine goblin lackeys, a maximum of 5: the window proposes two bands, 5 and 4.</figcaption>
</figure>

### What you can change

| Control | What it does |
|---|---|
| **Name** | The band's name in the tracker. It can't be empty. |
| **Color** | The band's color on the map. New bands get colors no other band in the combat uses. |
| **Initiative** | How the band's initiative is decided. The default is the world [setting](../reference/settings.md). See [Initiative and captains](initiative.md). |
| **Captain** | The member whose roll counts for the band. |
| Member grid | Under the bands, each minion has one box per band and one for **Alone**. Check a box to move the minion there. |

Each band row shows how many members it has against how many it needs, for example *5 / 5*. The sizes follow the [band size table](../reference/band-size.md): bands of the maximum size, a remainder of two or more as a band, and a remainder of one alone. When a band has the wrong number of members, the window says *"Band 2: it needs 5 members, it has 4."* and *"Fix the errors to be able to apply."*

!!! note "Bands of any size"
    Free band sizes and an **Add band** button are planned for a later version. See the [roadmap](../project/roadmap.md).

### The preview on the map

While the window is open, rings in each band's color mark its members on the scene. Hover over a band's row and its rings get thicker. A minion that stays alone gets a thin grey ring.

<figure markdown="span">
  ![Rings in each band's color around the minions on the map](../assets/images/bands-preview.png){ width="440" loading=lazy }
  <figcaption>Rings in each band's color mark the members while the window is open.</figcaption>
</figure>

### If creatures changed under you

If a token disappears while the window is open, Minion! says which one is no longer available. Close the window and open it again.
