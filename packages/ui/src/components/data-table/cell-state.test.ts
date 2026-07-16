import { describe, expect, it } from "vitest"

import {
  cellState,
  projectEdit,
  reduceCell,
  unchanged,
  type ContentAddress,
  type EditBehavior,
  type EditSlot,
} from "./cell-state"

// The machine is pure, so these are the real rules — not a rehearsal of them.
// No DOM, no render, no table: if a transition is wrong, it's wrong here.

const HEADROOM: ContentAddress = {
  rowKey: "billing",
  columnKey: "headroom",
  key: "sla_target_sec",
}
const FORECAST: ContentAddress = {
  rowKey: "billing",
  columnKey: "volume",
  key: "volume_forecast_next_15m",
}

/** A number setting: an emptied field is a DRAFT (null), not a zero. */
const seconds: EditBehavior<number, number | null> = {
  draft: (value) => value,
  commit: (draft) => draft,
}

/** A picker: commits on pick, its focus lives in a portal. */
const queues: EditBehavior<string[], string[]> = {
  draft: (value) => value,
  commit: (draft) => draft,
  popup: true,
}

const open = (address: ContentAddress, draft: unknown): EditSlot => ({
  address,
  draft,
})

describe("open", () => {
  it("seeds the draft from the truth at the gesture", () => {
    const { slot, patch } = reduceCell(null, {
      type: "open",
      address: HEADROOM,
      behavior: seconds,
      value: 120,
    })
    expect(slot).toEqual({ address: HEADROOM, draft: 120 })
    expect(patch).toBeNull()
  })

  it("replaces an open edit elsewhere — one slot makes two edits unrepresentable", () => {
    const { slot } = reduceCell(open(HEADROOM, 999), {
      type: "open",
      address: FORECAST,
      behavior: seconds,
      value: 40,
    })
    expect(slot).toEqual({ address: FORECAST, draft: 40 })
  })
})

describe("commit", () => {
  it("patches a changed, committable draft and closes", () => {
    const { slot, patch } = reduceCell(open(HEADROOM, 180), {
      type: "commit",
      address: HEADROOM,
      behavior: seconds,
      value: 120,
      via: "enter",
      draft: 180,
    })
    expect(patch).toEqual({ value: 180 })
    expect(slot).toBeNull()
  })

  it("emits no patch when the value is unchanged — a patch is an intent, not an echo", () => {
    const { slot, patch } = reduceCell(open(HEADROOM, 120), {
      type: "commit",
      address: HEADROOM,
      behavior: seconds,
      value: 120,
      via: "enter",
      draft: 120,
    })
    expect(patch).toBeNull()
    expect(slot).toBeNull()
  })

  it("HOLDS an uncommittable draft on Enter, staying open so the operator sees why", () => {
    const { slot, patch } = reduceCell(open(HEADROOM, null), {
      type: "commit",
      address: HEADROOM,
      behavior: seconds,
      value: 120,
      via: "enter",
      draft: null,
    })
    expect(slot).toEqual({ address: HEADROOM, draft: null })
    expect(patch).toBeNull()
  })

  it("reverts an uncommittable draft on blur rather than inventing a value", () => {
    const { slot, patch } = reduceCell(open(HEADROOM, null), {
      type: "commit",
      address: HEADROOM,
      behavior: seconds,
      value: 120,
      via: "blur",
      draft: null,
    })
    expect(slot).toBeNull()
    expect(patch).toBeNull()
  })

  it("commits a pick and closes", () => {
    const { slot, patch } = reduceCell(open(FORECAST, ["billing", "vip"]), {
      type: "commit",
      address: FORECAST,
      behavior: queues,
      value: ["billing"],
      via: "pick",
      draft: ["billing", "vip"],
    })
    expect(patch).toEqual({ value: ["billing", "vip"] })
    expect(slot).toBeNull()
  })

  it("ignores blur for a popup control — its focus legitimately left into a portal", () => {
    const slotBefore = open(FORECAST, ["billing", "vip"])
    const { slot, patch } = reduceCell(slotBefore, {
      type: "commit",
      address: FORECAST,
      behavior: queues,
      value: ["billing"],
      via: "blur",
      draft: ["billing", "vip"],
    })
    expect(slot).toBe(slotBefore)
    expect(patch).toBeNull()
  })

  it("commits the GESTURE's draft, not the slot's render-old copy", () => {
    // EnumSelect fires onChange(next) then onCommit() in ONE tick, so the slot
    // is still holding the pre-pick draft when the commit arrives. Committing
    // from the slot would land the PREVIOUS value on every single pick.
    const staleSlot = open(HEADROOM, 120)
    const { patch } = reduceCell(staleSlot, {
      type: "commit",
      address: HEADROOM,
      behavior: seconds,
      value: 120,
      via: "pick",
      draft: 300,
    })
    expect(patch).toEqual({ value: 300 })
  })

  it("emits NO phantom patch when a freshly-minted array holds the same members", () => {
    // The multi-select mints a new array every render; reference equality
    // called that a change and patched on every close. Bug 8.
    const { patch } = reduceCell(open(FORECAST, ["billing", "vip"]), {
      type: "commit",
      address: FORECAST,
      behavior: queues,
      value: ["billing", "vip"],
      via: "pick",
      draft: ["billing", "vip"],
    })
    expect(patch).toBeNull()
  })
})

describe("cancel", () => {
  it("closes without a patch", () => {
    const { slot, patch } = reduceCell(open(HEADROOM, 999), {
      type: "cancel",
      address: HEADROOM,
    })
    expect(slot).toBeNull()
    expect(patch).toBeNull()
  })
})

describe("change", () => {
  it("keeps the address and takes the new draft", () => {
    const { slot } = reduceCell(open(HEADROOM, 120), {
      type: "change",
      address: HEADROOM,
      draft: 180,
    })
    expect(slot).toEqual({ address: HEADROOM, draft: 180 })
  })
})

describe("events for a cell that isn't open", () => {
  it("no-ops a stray blur from a control being torn down", () => {
    const slotBefore = open(HEADROOM, 180)
    const { slot, patch } = reduceCell(slotBefore, {
      type: "commit",
      address: FORECAST,
      behavior: seconds,
      value: 40,
      via: "blur",
      draft: 40,
    })
    expect(slot).toBe(slotBefore)
    expect(patch).toBeNull()
  })

  it("no-ops every event against a closed machine", () => {
    expect(
      reduceCell(null, { type: "cancel", address: HEADROOM }).slot
    ).toBeNull()
    expect(
      reduceCell(null, { type: "change", address: HEADROOM, draft: 1 }).slot
    ).toBeNull()
  })
})

describe("projectEdit", () => {
  it("survives a poll tick that keeps the row", () => {
    const slot = open(HEADROOM, 180)
    expect(projectEdit(slot, new Set(["billing", "chat"]))).toBe(slot)
  })

  it("drops an edit whose row left the feed", () => {
    expect(projectEdit(open(HEADROOM, 180), new Set(["chat"]))).toBeNull()
  })
})

describe("cellState", () => {
  it("reads when the table isn't in edit mode — capability without mode is still reading", () => {
    expect(
      cellState({
        edit: seconds,
        mode: false,
        value: 120,
        address: HEADROOM,
        slot: open(HEADROOM, 180),
      })
    ).toEqual({ state: "reading" })
  })

  it("is editable when the mode is on and this cell isn't the open one", () => {
    expect(
      cellState({
        edit: seconds,
        mode: true,
        value: 120,
        address: HEADROOM,
        slot: null,
      })
    ).toEqual({ state: "editable", edit: seconds })
  })

  it("is editing, with the draft, when this cell holds the slot", () => {
    expect(
      cellState({
        edit: seconds,
        mode: true,
        value: 120,
        address: HEADROOM,
        slot: open(HEADROOM, 180),
      })
    ).toEqual({
      state: "editing",
      edit: seconds,
      draft: 180,
      committable: true,
    })
  })

  it("reports an uncommittable draft so the control can paint aria-invalid", () => {
    const state = cellState({
      edit: seconds,
      mode: true,
      value: 120,
      address: HEADROOM,
      slot: open(HEADROOM, null),
    })
    expect(state).toMatchObject({ state: "editing", committable: false })
  })

  it("stays editable while a SIBLING cell is editing", () => {
    expect(
      cellState({
        edit: seconds,
        mode: true,
        value: 120,
        address: HEADROOM,
        slot: open(FORECAST, 40),
      })
    ).toEqual({ state: "editable", edit: seconds })
  })
})

describe("unchanged", () => {
  it("compares arrays by members, not by reference", () => {
    expect(unchanged(["a", "b"], ["a", "b"])).toBe(true)
    expect(unchanged(["a", "b"], ["b", "a"])).toBe(false)
    expect(unchanged(["a"], ["a", "b"])).toBe(false)
  })

  it("compares scalars by value", () => {
    expect(unchanged(120, 120)).toBe(true)
    expect(unchanged(120, 180)).toBe(false)
    expect(unchanged("Billing", "Billing")).toBe(true)
  })
})
