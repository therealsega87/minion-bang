import { MODULE_ID, errorLog, escapeHtml } from "../log.js";
import { formatChallengeRating } from "../engine/band-maximums.js";
import { assignMember, bandMembers, createTypeModel, effectiveCaptain, evaluateModel, memberColors, renameBand, setBandCaptain, setBandColor, setBandMode } from "../engine/band-window-model.js";
import { INITIATIVE_MODES } from "../engine/group-initiative.js";
import { createExistingModel, hasPendingChanges, pendingChanges, setExistingCaptain, setExistingColor, setExistingMode, shownCaptain, syncExistingModel } from "../engine/existing-bands.js";
import { applyExistingChanges, readLiveGroups } from "../adapters/existing-bands.js";
import { currentInitiativeMode } from "../adapters/group-initiative.js";
import { buildApplyPlan, modelsAreValid, needsConfirmation, summarizeModels } from "../engine/band-apply.js";
import { applyBandPlan, checkPlan } from "../adapters/band-apply.js";
import { clearBandRings, showBandRings } from "./band-rings.js";
import { collectBandTypes } from "../adapters/band-source.js";
import { groupsActive } from "../groups-status.js";

const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/bands-window.hbs`;
let openWindow = null;

export function buildModels(types, takenNames = [], usedColors = []) {
  const taken = [...takenNames];
  const used = [...usedColors];
  return types.map(type => {
    const model = createTypeModel({ ...type, takenNames: [...taken], usedColors: [...used] });
    taken.push(...model.names);
    used.push(...model.colors);
    return model;
  });
}

function planText(model) {
  if (model.expected.length === 0) return game.i18n.localize("MINIONBANG.Bands.PlanNone");
  let text = game.i18n.format("MINIONBANG.Bands.Plan", { sizes: model.expected.join(" + ") });
  if (model.singles > 0) text += ` ${game.i18n.format("MINIONBANG.Bands.PlanSingles", { count: model.singles })}`;
  return text;
}

export function statusText(model) {
  const evaluation = evaluateModel(model);
  if (evaluation.ok) return { ok: true, text: game.i18n.localize("MINIONBANG.Bands.Ok") };
  const lines = evaluation.errors.map(error => (error.code === "count"
    ? game.i18n.format("MINIONBANG.Bands.Error.Count", { band: error.band + 1, expected: error.expected, actual: error.actual })
    : game.i18n.format("MINIONBANG.Bands.Error.Name", { band: error.band + 1 })));
  return { ok: false, text: lines.join(" ") };
}

const MODE_ORDER = [INITIATIVE_MODES.CAPTAIN, INITIATIVE_MODES.AVERAGE, INITIATIVE_MODES.HIGHEST, INITIATIVE_MODES.LOWEST, INITIATIVE_MODES.MEDIAN];

function effectiveMode(model, bandIndex) {
  return model.modes[bandIndex] ?? currentInitiativeMode();
}

function modeChoices(chosenMode) {
  const defaultLabel = game.i18n.format("MINIONBANG.Bands.ModeDefault", { mode: game.i18n.localize(`MINIONBANG.Bands.ModeShort.${currentInitiativeMode()}`) });
  return [
    { value: "", label: defaultLabel, selected: chosenMode === null },
    ...MODE_ORDER.map(mode => ({ value: mode, label: game.i18n.localize(`MINIONBANG.Bands.ModeShort.${mode}`), selected: chosenMode === mode }))
  ];
}

function modeOptions(model, bandIndex) {
  return modeChoices(model.modes[bandIndex]);
}

const NO_COLOR = "#808080";

function existingCaptainOptions(group) {
  const shown = shownCaptain(group);
  const options = group.members.map(member => ({ value: member.id, label: member.name, selected: member.id === shown }));
  if (shown !== null) return options;
  return [{ value: "", label: game.i18n.localize("MINIONBANG.Bands.NoCaptain"), selected: true }, ...options];
}

function existingCaptainDisabled(group) {
  return group.rolled || (group.mode ?? currentInitiativeMode()) !== INITIATIVE_MODES.CAPTAIN;
}

function existingContext(existing, index, activeIndex) {
  if (!existing || existing.groups.length === 0) return null;
  return {
    index,
    active: index === activeIndex,
    header: game.i18n.localize("MINIONBANG.Bands.ExistingHeader"),
    lockedTitle: game.i18n.localize("MINIONBANG.Bands.ExistingLocked"),
    groups: existing.groups.map(group => ({
      id: group.id,
      name: group.name,
      color: group.color ?? NO_COLOR,
      rolled: group.rolled,
      modeOptions: modeChoices(group.mode),
      captainOptions: existingCaptainOptions(group),
      captainDisabled: existingCaptainDisabled(group),
      count: group.members.length
    }))
  };
}

function captainOptions(model, bandIndex) {
  const chosen = effectiveCaptain(model, bandIndex);
  return bandMembers(model, bandIndex).map(member => ({ value: member.id, label: member.name, selected: member.id === chosen }));
}

export function buildContext(models, activeIndex, existing = null) {
  return {
    existing: existingContext(existing, models.length, activeIndex),
    labels: {
      existingTab: game.i18n.localize("MINIONBANG.Bands.ExistingTab"),
      member: game.i18n.localize("MINIONBANG.Bands.Member"),
      single: game.i18n.localize("MINIONBANG.Bands.Single"),
      apply: game.i18n.localize("MINIONBANG.Bands.Apply"),
      close: game.i18n.localize("MINIONBANG.Bands.Close"),
      color: game.i18n.localize("MINIONBANG.Bands.Color"),
      captain: game.i18n.localize("MINIONBANG.Bands.Captain"),
      mode: game.i18n.localize("MINIONBANG.Bands.Mode"),
      bandName: game.i18n.localize("MINIONBANG.Bands.BandName")
    },
    types: models.map((model, typeIndex) => {
      const evaluation = evaluateModel(model);
      return {
        index: typeIndex,
        name: model.name,
        active: typeIndex === activeIndex,
        header: game.i18n.format("MINIONBANG.Bands.Header", { count: model.members.length, cr: formatChallengeRating(model.cr), maximum: model.maximum }),
        plan: planText(model),
        columns: model.expected.length + 1,
        bands: evaluation.bands.map(band => ({
          index: band.index,
          typeIndex,
          label: game.i18n.format("MINIONBANG.Bands.Band", { number: band.index + 1 }),
          name: model.names[band.index],
          color: model.colors[band.index],
          captainOptions: captainOptions(model, band.index),
          captainDisabled: effectiveMode(model, band.index) !== INITIATIVE_MODES.CAPTAIN,
          modeOptions: modeOptions(model, band.index),
          actual: band.actual,
          expected: band.expected
        })),
        rows: model.members.map(member => ({
          id: member.id,
          name: member.name,
          img: member.img,
          cells: [
            ...model.expected.map((_, bandIndex) => ({ typeIndex, memberId: member.id, radio: `assign-${typeIndex}-${member.id}`, value: String(bandIndex), checked: model.assignment[member.id] === bandIndex })),
            { typeIndex, memberId: member.id, radio: `assign-${typeIndex}-${member.id}`, value: "single", checked: model.assignment[member.id] === null }
          ]
        }))
      };
    })
  };
}

export function showTab(root, index) {
  for (const panel of root.querySelectorAll("[data-panel]")) panel.hidden = Number(panel.dataset.panel) !== index;
  for (const tab of root.querySelectorAll("[data-tab]")) tab.classList.toggle("active", Number(tab.dataset.tab) === index);
}

function fillSelect(select, options) {
  select.replaceChildren(...options.map(option => {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    element.selected = option.selected;
    return element;
  }));
}

export function refreshWindow(root, models, blockedText = "", existing = null) {
  const evaluations = models.map(model => evaluateModel(model));
  for (const span of root.querySelectorAll("[data-count]")) {
    const band = evaluations[Number(span.dataset.type)]?.bands[Number(span.dataset.band)];
    if (!band) continue;
    span.textContent = `${band.actual} / ${band.expected}`;
    span.classList.toggle("minion-bang-bad", !band.countOk);
  }
  for (const input of root.querySelectorAll("[data-band-name]")) {
    const band = evaluations[Number(input.dataset.type)]?.bands[Number(input.dataset.band)];
    if (band) input.classList.toggle("minion-bang-bad", !band.nameOk);
  }
  for (const select of root.querySelectorAll("[data-band-captain]")) {
    const typeIndex = Number(select.dataset.type);
    const model = models[typeIndex];
    const bandIndex = Number(select.dataset.band);
    if (!model) continue;
    fillSelect(select, captainOptions(model, bandIndex));
    const chosen = effectiveCaptain(model, bandIndex);
    if (chosen !== null) select.value = chosen;
    select.disabled = effectiveMode(model, bandIndex) !== INITIATIVE_MODES.CAPTAIN;
  }
  models.forEach((model, index) => {
    const status = statusText(model);
    for (const line of root.querySelectorAll("[data-status]")) {
      if (Number(line.dataset.status) !== index) continue;
      line.textContent = status.text;
      line.classList.toggle("minion-bang-bad", !status.ok);
    }
    for (const tab of root.querySelectorAll("[data-tab]")) {
      if (Number(tab.dataset.tab) === index) tab.classList.toggle("minion-bang-bad", !status.ok);
    }
  });
  if (existing) {
    const find = id => existing.groups.find(group => group.id === id);
    for (const icon of root.querySelectorAll("[data-existing-lock]")) {
      const group = find(icon.dataset.group);
      if (group) icon.hidden = !group.rolled;
    }
    for (const select of root.querySelectorAll("[data-existing-mode]")) {
      const group = find(select.dataset.group);
      if (!group) continue;
      select.value = group.mode ?? "";
      select.disabled = group.rolled;
    }
    for (const select of root.querySelectorAll("[data-existing-captain]")) {
      const group = find(select.dataset.group);
      if (!group) continue;
      fillSelect(select, existingCaptainOptions(group));
      select.value = shownCaptain(group) ?? "";
      select.disabled = existingCaptainDisabled(group);
    }
  }
  const hasNew = models.length > 0;
  const hasEdits = existing ? hasPendingChanges(existing) : false;
  const allOk = evaluations.every(evaluation => evaluation.ok);
  const blocked = blockedText !== "";
  for (const line of root.querySelectorAll("[data-global-status]")) {
    if (blocked) line.textContent = blockedText;
    else line.textContent = allOk ? "" : game.i18n.localize("MINIONBANG.Bands.FixErrors");
    line.classList.toggle("minion-bang-bad", blocked);
  }
  for (const button of root.querySelectorAll("[data-apply]")) button.disabled = !allOk || blocked || !(hasNew || hasEdits);
  return allOk && !blocked;
}

export function ringEntries(models, hoveredId = null, existing = null, hoveredGroup = null) {
  const entries = [];
  for (const model of models) {
    const colors = memberColors(model);
    for (const member of model.members) {
      entries.push({
        id: member.id,
        color: colors[member.id],
        single: model.assignment[member.id] === null,
        emphasis: member.id === hoveredId
      });
    }
  }
  for (const group of existing?.groups ?? []) {
    const edited = group.color !== null && group.color !== group.original.color;
    const hovered = group.id === hoveredGroup;
    if (!edited && !hovered) continue;
    for (const member of group.members) entries.push({ id: member.id, color: group.color ?? NO_COLOR, single: false, emphasis: hovered });
  }
  return entries;
}

function redrawRings(state) {
  try {
    showBandRings(ringEntries(state.models, state.hovered ?? null, state.existing, state.hoveredGroup ?? null));
  } catch (error) {
    errorLog("The rings on the map could not be drawn:", error);
  }
}

export function wireWindow(root, state) {
  state.hovered = null;
  for (const radio of root.querySelectorAll("[data-assign]")) {
    radio.addEventListener("change", () => {
      const type = Number(radio.dataset.type);
      const band = radio.value === "single" ? null : Number(radio.value);
      state.models[type] = assignMember(state.models[type], radio.dataset.member, band);
      refreshWindow(root, state.models, state.blockedText ?? "", state.existing);
      redrawRings(state);
    });
  }
  for (const input of root.querySelectorAll("[data-band-name]")) {
    input.addEventListener("input", () => {
      const type = Number(input.dataset.type);
      state.models[type] = renameBand(state.models[type], Number(input.dataset.band), input.value);
      refreshWindow(root, state.models, state.blockedText ?? "", state.existing);
    });
  }
  for (const input of root.querySelectorAll("[data-band-color]")) {
    input.addEventListener("input", () => {
      const type = Number(input.dataset.type);
      state.models[type] = setBandColor(state.models[type], Number(input.dataset.band), input.value);
      redrawRings(state);
    });
  }
  for (const select of root.querySelectorAll("[data-band-mode]")) {
    select.addEventListener("change", () => {
      const type = Number(select.dataset.type);
      state.models[type] = setBandMode(state.models[type], Number(select.dataset.band), select.value === "" ? null : select.value);
      refreshWindow(root, state.models, state.blockedText ?? "", state.existing);
    });
  }
  for (const select of root.querySelectorAll("[data-band-captain]")) {
    select.addEventListener("change", () => {
      const type = Number(select.dataset.type);
      state.models[type] = setBandCaptain(state.models[type], Number(select.dataset.band), select.value);
      refreshWindow(root, state.models, state.blockedText ?? "", state.existing);
    });
  }
  for (const input of root.querySelectorAll("[data-existing-color]")) {
    input.addEventListener("input", () => {
      state.existing = setExistingColor(state.existing, input.dataset.group, input.value);
      refreshWindow(root, state.models, state.blockedText ?? "", state.existing);
      redrawRings(state);
    });
  }
  for (const row of root.querySelectorAll("[data-existing-row]")) {
    row.addEventListener("mouseenter", () => {
      state.hoveredGroup = row.dataset.existingRow;
      redrawRings(state);
    });
    row.addEventListener("mouseleave", () => {
      state.hoveredGroup = null;
      redrawRings(state);
    });
  }
  for (const select of root.querySelectorAll("[data-existing-mode]")) {
    select.addEventListener("change", () => {
      state.existing = setExistingMode(state.existing, select.dataset.group, select.value === "" ? null : select.value);
      refreshWindow(root, state.models, state.blockedText ?? "", state.existing);
    });
  }
  for (const select of root.querySelectorAll("[data-existing-captain]")) {
    select.addEventListener("change", () => {
      state.existing = setExistingCaptain(state.existing, select.dataset.group, select.value === "" ? null : select.value);
      refreshWindow(root, state.models, state.blockedText ?? "", state.existing);
    });
  }
  for (const row of root.querySelectorAll("[data-member-row]")) {
    row.addEventListener("mouseenter", () => {
      state.hovered = row.dataset.member;
      redrawRings(state);
    });
    row.addEventListener("mouseleave", () => {
      state.hovered = null;
      redrawRings(state);
    });
  }
  for (const tab of root.querySelectorAll("[data-tab]")) {
    tab.addEventListener("click", event => {
      event?.preventDefault?.();
      state.activeTab = Number(tab.dataset.tab);
      showTab(root, state.activeTab);
    });
  }
  showTab(root, state.activeTab);
  refreshWindow(root, state.models, state.blockedText ?? "", state.existing);
  redrawRings(state);
}

function checkModels(models) {
  const ids = models.flatMap(model => model.members.map(member => member.id));
  return checkPlan({ groups: [{ memberIds: ids }], singles: [] });
}

function unavailableText(models, check) {
  const names = new Map(models.flatMap(model => model.members.map(member => [member.id, member.name])));
  const list = [...check.missing, ...check.inCombat].map(id => names.get(id) ?? id);
  return game.i18n.format("MINIONBANG.Bands.Stale", { names: list.join(", ") });
}

export function recheckWindow(state) {
  if (state.applying || !state.element) return false;
  const check = checkModels(state.models);
  state.blockedText = check.ok ? "" : unavailableText(state.models, check);
  refreshWindow(state.element, state.models, state.blockedText, state.existing);
  return check.ok;
}

export function syncExisting(state) {
  if (state.applying || !state.element || !state.existing) return false;
  const idsOf = model => model.groups.map(group => group.id).join("|");
  const before = idsOf(state.existing);
  state.existing = syncExistingModel(state.existing, readLiveGroups());
  if (idsOf(state.existing) !== before) {
    state.render?.();
    return true;
  }
  refreshWindow(state.element, state.models, state.blockedText ?? "", state.existing);
  redrawRings(state);
  return false;
}

function watchWorld(state) {
  if (state.hookIds) return;
  const handler = () => {
    recheckWindow(state);
    syncExisting(state);
  };
  state.hookIds = ["deleteToken", "createCombatant", "deleteCombatant", "updateCombatant", "createCombatantGroup", "updateCombatantGroup", "deleteCombatantGroup"]
    .map(name => [name, Hooks.on(name, handler)]);
}

function unwatchWorld(state) {
  for (const [name, id] of state.hookIds ?? []) Hooks.off(name, id);
  state.hookIds = null;
}

async function confirmApply(models) {
  const lines = summarizeModels(models).map(entry => `<li>${escapeHtml(game.i18n.format("MINIONBANG.Bands.Confirm.Line", entry))}</li>`).join("");
  return foundry.applications.api.DialogV2.confirm({
    window: { title: "MINIONBANG.Bands.Confirm.Title" },
    content: `<p>${escapeHtml(game.i18n.format("MINIONBANG.Bands.Confirm.Content", { count: models.length }))}</p><ul>${lines}</ul>`,
    yes: { label: "MINIONBANG.Bands.Confirm.Yes", icon: "fa-solid fa-check" },
    no: { label: "MINIONBANG.Bands.Confirm.No", icon: "fa-solid fa-arrow-left" },
    rejectClose: false
  });
}

export async function applyBands(state) {
  if (state.applying) return false;
  const hasNew = state.models.length > 0;
  const pending = state.existing ? pendingChanges(state.existing) : [];
  if (!hasNew && pending.length === 0) return false;
  if (hasNew) {
    if (!modelsAreValid(state.models)) {
      ui.notifications.warn(game.i18n.localize("MINIONBANG.Bands.FixErrors"));
      return false;
    }
    if (!recheckWindow(state)) {
      ui.notifications.warn(state.blockedText);
      return false;
    }
    if (needsConfirmation(state.models)) {
      const answer = await confirmApply(state.models);
      if (answer !== true) return false;
      if (!recheckWindow(state)) {
        ui.notifications.warn(state.blockedText);
        return false;
      }
    }
  }
  state.applying = true;
  if (pending.length > 0) {
    try {
      const done = await applyExistingChanges(pending);
      ui.notifications.info(game.i18n.format("MINIONBANG.Bands.ExistingApplied", { count: done.updated }));
    } catch (error) {
      state.applying = false;
      errorLog("The existing bands could not be updated:", error);
      ui.notifications.error(game.i18n.localize("MINIONBANG.Bands.ExistingFailed"));
      return false;
    }
  }
  if (hasNew) {
    const plan = buildApplyPlan(state.models);
    try {
      const result = await applyBandPlan(plan);
      ui.notifications.info(game.i18n.format("MINIONBANG.Bands.Applied", { groups: result.groups, singles: plan.singles.length }));
    } catch (error) {
      state.applying = false;
      errorLog("The bands could not be applied:", error);
      ui.notifications.error(game.i18n.format("MINIONBANG.Bands.ApplyFailed", {
        groups: error.partial?.groups ?? 0,
        combatants: error.partial?.combatants ?? 0
      }));
      return false;
    }
  }
  await state.close();
  return true;
}

function createWindowClass() {
  const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
  return class BandsWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: "minion-bang-bands",
      classes: ["minion-bang-bands-window"],
      window: { title: "MINIONBANG.Bands.Title", icon: "fa-solid fa-people-group", resizable: true },
      position: { width: 760, height: "auto", top: 30 },
      actions: {
        apply() {
          applyBands(this).catch(error => errorLog("The apply button failed:", error));
        }
      }
    };

    static PARTS = { body: { template: TEMPLATE_PATH } };

    constructor(models, existing = null, options = {}) {
      super(options);
      this.models = models;
      this.existing = existing ?? createExistingModel([]);
      this.activeTab = 0;
    }

    async _prepareContext() {
      const context = buildContext(this.models, this.activeTab, this.existing);
      if (!context.existing && this.activeTab >= this.models.length) {
        this.activeTab = 0;
        return buildContext(this.models, this.activeTab, this.existing);
      }
      return context;
    }

    _onRender() {
      wireWindow(this.element, this);
      watchWorld(this);
      recheckWindow(this);
    }

    _onClose(options) {
      clearBandRings();
      unwatchWorld(this);
      if (openWindow === this) openWindow = null;
      return super._onClose?.(options);
    }
  };
}

export async function openBandsWindow() {
  if (!game.user?.isGM) return false;
  if (!groupsActive()) {
    ui.notifications.warn(game.i18n.localize("MINIONBANG.Bands.GroupsOff"));
    return false;
  }
  try {
    const types = await collectBandTypes();
    if (types === null) return false;
    const live = readLiveGroups();
    if (types.length === 0 && live.length === 0) {
      ui.notifications.info(game.i18n.localize("MINIONBANG.Bands.NoCandidates"));
      return false;
    }
    const taken = Array.from(game.combat?.groups ?? []).map(group => group.name);
    const models = buildModels(types, taken, live.map(group => group.color));
    if (openWindow) await openWindow.close();
    const BandsWindow = createWindowClass();
    openWindow = new BandsWindow(models, createExistingModel(live));
    await openWindow.render({ force: true });
    return true;
  } catch (error) {
    errorLog("The bands window could not be opened:", error);
    ui.notifications.error(game.i18n.localize("MINIONBANG.Bands.OpenFailed"));
    return false;
  }
}
