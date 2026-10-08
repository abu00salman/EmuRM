// PostCSS plugin: physical-property fallbacks for engines without CSS logical properties.
// Each fallback sits inside `@supports not (<prop>: 0)`, so engines that DO understand
// the logical property never see it and keep their native, direction-aware behaviour.
const LOGICAL = {
  "padding-inline-start": ["padding-left", "padding-right"],
  "padding-inline-end": ["padding-right", "padding-left"],
  "margin-inline-start": ["margin-left", "margin-right"],
  "margin-inline-end": ["margin-right", "margin-left"],
  "inset-inline-start": ["left", "right"],
  "inset-inline-end": ["right", "left"],
  "border-inline-start-width": ["border-left-width", "border-right-width"],
  "border-inline-end-width": ["border-right-width", "border-left-width"],
  "border-inline-start-color": ["border-left-color", "border-right-color"],
  "border-inline-end-color": ["border-right-color", "border-left-color"],
  "border-inline-start": ["border-left", "border-right"],
  "border-inline-end": ["border-right", "border-left"],
  "border-start-start-radius": ["border-top-left-radius", "border-top-right-radius"],
  "border-start-end-radius": ["border-top-right-radius", "border-top-left-radius"],
  "border-end-start-radius": ["border-bottom-left-radius", "border-bottom-right-radius"],
  "border-end-end-radius": ["border-bottom-right-radius", "border-bottom-left-radius"],
};
const PAIRS = {
  "padding-inline": ["padding-left", "padding-right"],
  "margin-inline": ["margin-left", "margin-right"],
  "inset-inline": ["left", "right"],
  "padding-block": ["padding-top", "padding-bottom"],
  "margin-block": ["margin-top", "margin-bottom"],
  "inset-block": ["top", "bottom"],
};

// Split on top-level commas only (":is(.a, .b)" must stay intact).
const rtlSelector = (selector) => {
  const out = [];
  let depth = 0, start = 0, quote = "";
  for (let i = 0; i <= selector.length; i++) {
    const c = selector[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue; }
    if (c === "\\") { i++; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if ((c === "," && depth === 0) || i === selector.length) {
      out.push(`[dir="rtl"] ${selector.slice(start, i).trim()}`);
      start = i + 1;
    }
  }
  return out.join(",");
};

// Split a declaration value on top-level whitespace (calc(max(1rem, x) * -1) stays one token).
const splitTopLevel = (value) => {
  const parts = [];
  let depth = 0, cur = "";
  for (const c of value.trim()) {
    if (c === "(") depth++;
    else if (c === ")") depth--;
    if (/\s/.test(c) && depth === 0) { if (cur) parts.push(cur); cur = ""; }
    else cur += c;
  }
  if (cur) parts.push(cur);
  return parts;
};

const supportsNot = (prop) => `not (${prop}: 0)`;

const logicalFallback = () => ({
  postcssPlugin: "emurm-logical-fallback",
  OnceExit(root, { AtRule }) {
    const wrap = (rule, prop, build) => {
      const at = new AtRule({ name: "supports", params: supportsNot(prop) });
      const ltr = rule.clone();
      ltr.removeAll();
      const rtl = rule.clone({
        selector: rtlSelector(rule.selector),
      });
      rtl.removeAll();
      build(ltr, rtl);
      at.append(ltr);
      if (rtl.nodes.length) at.append(rtl);
      return at;
    };
    root.walkDecls((decl) => {
      const rule = decl.parent;
      if (!rule || rule.type !== "rule" || !rule.selector) return;
      const prop = decl.prop;
      const pair = PAIRS[prop];
      if (pair) {
        const parts = splitTopLevel(decl.value);
        const [a, b = parts[0]] = parts;
        const at = wrap(rule, prop, (ltr, rtl) => {
          ltr.append({ prop: pair[0], value: a }, { prop: pair[1], value: b });
          void rtl;
        });
        // shorthand pairs are symmetric in direction only if a === b; swap in RTL otherwise
        if (a !== b) {
          const rtlRule = at.nodes[0].clone({
            selector: rtlSelector(rule.selector),
          });
          rtlRule.removeAll();
          rtlRule.append({ prop: pair[0], value: b }, { prop: pair[1], value: a });
          at.append(rtlRule);
        }
        rule.after(at);
        return;
      }
      const map = LOGICAL[prop];
      if (!map) return;
      const at = wrap(rule, prop, (ltr, rtl) => {
        ltr.append({ prop: map[0], value: decl.value });
        rtl.append({ prop: map[0], value: /color/.test(prop) ? "currentcolor" : "0" });
        rtl.append({ prop: map[1], value: decl.value });
      });
      rule.after(at);
    });
  },
});
logicalFallback.postcss = true;

module.exports = logicalFallback;
