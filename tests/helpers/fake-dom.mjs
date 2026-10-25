export class FakeElement {
  constructor({ tag = "div", dataset = {}, className = "", attrs = {} } = {}) {
    this.tag = tag;
    this.dataset = dataset;
    this.attrs = attrs;
    this.textContent = "";
    this.innerHTML = "";
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.checked = false;
    this.children = [];
    this.removed = false;
    this.listeners = {};
    const classes = new Set(className.split(/\s+/).filter(Boolean));
    this.classes = classes;
    Object.defineProperty(this, "className", {
      get: () => [...classes].join(" "),
      set: value => { classes.clear(); for (const name of String(value).split(/\s+/).filter(Boolean)) classes.add(name); }
    });
    this.classList = {
      toggle: (name, force) => {
        const on = force === undefined ? !classes.has(name) : Boolean(force);
        if (on) classes.add(name);
        else classes.delete(name);
        return on;
      },
      contains: name => classes.has(name),
      add: name => classes.add(name)
    };
  }

  addEventListener(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }

  fire(type) {
    for (const fn of this.listeners[type] ?? []) fn({ target: this });
  }

  append(child) {
    this.children.push(child);
    child.parent = this;
  }

  replaceChildren(...nodes) {
    for (const child of this.children) child.parent = null;
    this.children = [];
    for (const node of nodes) this.append(node);
  }

  remove() {
    this.removed = true;
    if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this);
  }

  matches(selector) {
    if (selector.startsWith(".")) return this.classes.has(selector.slice(1));
    const attr = selector.match(/^\[data-([a-z-]+)(?:="([^"]*)")?\]$/);
    if (attr) {
      const key = attr[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (!(key in this.dataset)) return false;
      return attr[2] === undefined || String(this.dataset[key]) === attr[2];
    }
    return this.tag === selector;
  }

  all() {
    return this.children.flatMap(child => [child, ...child.all()]);
  }

  querySelectorAll(selector) {
    return this.all().filter(element => !element.removed && element.matches(selector));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

export function makeDocument() {
  return { createElement: tag => new FakeElement({ tag }) };
}
