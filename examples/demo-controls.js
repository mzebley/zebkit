const CONTROL_GROUPS = [
  {
    title: "Surface & borders",
    tokens: [
      {
        property: "--zbk-btn-background",
        label: "Background",
        description: "The background color for default buttons.",
        type: "color",
      },
      {
        property: "--zbk-btn-background-hover",
        label: "Background (hover)",
        description: "Surface color applied on hover/active states.",
        type: "color",
      },
      {
        property: "--zbk-btn-border-color",
        label: "Border color",
        description: "Outline color for default buttons.",
        type: "color",
      },
      {
        property: "--zbk-btn-border-radius",
        label: "Border radius",
        description: "Corner radius for medium buttons.",
        type: "range",
        min: 0,
        max: 48,
        step: 1,
        unit: "px",
      },
      {
        property: "--zbk-btn-border-width",
        label: "Border width",
        description: "Outline thickness for medium buttons.",
        type: "range",
        min: 0,
        max: 8,
        step: 0.5,
        unit: "px",
      },
      {
        property: "--zbk-btn-raised-amount",
        label: "Raised amount",
        description: "Vertical translation for raised & hover styles.",
        type: "range",
        min: 0,
        max: 6,
        step: 0.25,
      },
    ],
  },
  {
    title: "Typography",
    tokens: [
      {
        property: "--zbk-btn-font-family",
        label: "Font family",
        description: "Typeface used for default button text.",
        type: "text",
      },
      {
        property: "--zbk-btn-font-size",
        label: "Font size",
        description: "Font size applied to medium buttons.",
        type: "range",
        min: 10,
        max: 48,
        step: 0.5,
        unit: "px",
      },
      {
        property: "--zbk-btn-line-height",
        label: "Line height",
        description: "Line height for the medium size preset.",
        type: "range",
        min: 1,
        max: 3,
        step: 0.05,
      },
    ],
  },
  {
    title: "Spacing",
    tokens: [
      {
        property: "--zbk-btn-padding-x",
        label: "Horizontal padding",
        description: "Space on the left/right of the label.",
        type: "range",
        min: 0,
        max: 64,
        step: 1,
        unit: "px",
      },
      {
        property: "--zbk-btn-padding-y",
        label: "Vertical padding",
        description: "Space above and below the label.",
        type: "range",
        min: 0,
        max: 32,
        step: 0.5,
        unit: "px",
      },
      {
        property: "--zbk-btn-gap",
        label: "Icon gap",
        description: "Gap between the icon slot and label.",
        type: "range",
        min: 0,
        max: 48,
        step: 1,
        unit: "px",
      },
      {
        property: "--zbk-btn-icon-font-size",
        label: "Icon font size",
        description: "Font size used for icons inside buttons.",
        type: "range",
        min: 8,
        max: 48,
        step: 0.5,
        unit: "px",
      },
    ],
  },
  {
    title: "Foreground",
    tokens: [
      {
        property: "--zbk-btn-foreground",
        label: "Label color",
        description: "Foreground color for icons and text.",
        type: "color",
      },
      {
        property: "--zbk-btn-focus-color",
        label: "Focus ring",
        description: "Accent color used for focus-visible outlines.",
        type: "color",
      },
    ],
  },
];

const DEFAULT_VALUES = new Map();

function readInitialValue(property) {
  const computed = getComputedStyle(document.documentElement).getPropertyValue(
    property
  );
  return computed.trim();
}

function extractNumeric(value) {
  if (!value) return NaN;
  const match = value.match(/-?\d*\.?\d+/);
  return match ? Number(match[0]) : NaN;
}

function toHex(color) {
  const value = color.trim();
  if (!value) {
    return "#000000";
  }

  if (value.startsWith("#")) {
    return value;
  }

  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch.slice(1, 4).map(Number);
    return (
      "#" +
      [r, g, b]
        .map((component) => {
          const hex = component.toString(16).padStart(2, "0");
          return hex;
        })
        .join("")
    );
  }

  return "#000000";
}

function formatValue(token, rawValue) {
  if (token.type === "range" && token.unit) {
    return `${rawValue}${token.unit}`;
  }
  return rawValue;
}

function applyTokenValue(property, value) {
  document.documentElement.style.setProperty(property, value);
}

function createControl(token) {
  const wrapper = document.createElement("div");
  wrapper.className = "token-control";

  const defaultValue = DEFAULT_VALUES.get(token.property);

  const label = document.createElement("label");
  label.setAttribute("for", token.property);
  label.textContent = token.label;

  const controlRow = document.createElement("div");
  controlRow.className = "control-input";

  let input;
  let output;

  if (token.type === "color") {
    input = document.createElement("input");
    input.type = "color";
    input.id = token.property;
    input.value = toHex(defaultValue || "#000000");
  } else if (token.type === "range") {
    input = document.createElement("input");
    input.type = "range";
    input.id = token.property;
    input.min = token.min;
    input.max = token.max;
    input.step = token.step;

    const numeric = extractNumeric(defaultValue);
    const fallback = isNaN(numeric) ? token.min : numeric;
    input.value = fallback;

    output = document.createElement("output");
    output.textContent = formatValue(token, input.value);
    controlRow.appendChild(output);
  } else {
    input = document.createElement("input");
    input.type = "text";
    input.id = token.property;
    input.value = defaultValue;
  }

  controlRow.prepend(input);
  wrapper.appendChild(label);
  wrapper.appendChild(controlRow);

  if (token.description) {
    const description = document.createElement("small");
    description.textContent = token.description;
    wrapper.appendChild(description);
  }

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "Reset";
  wrapper.appendChild(resetButton);

  const update = () => {
    if (token.type === "range") {
      const numericValue = extractNumeric(input.value);
      const finalValue = token.unit
        ? `${numericValue}${token.unit}`
        : `${numericValue}`;
      applyTokenValue(token.property, finalValue);
      if (output) {
        output.textContent = formatValue(token, numericValue);
      }
    } else if (token.type === "color") {
      applyTokenValue(token.property, input.value);
    } else {
      applyTokenValue(token.property, input.value);
    }
  };

  input.addEventListener("input", update);
  input.addEventListener("change", update);

  resetButton.addEventListener("click", () => {
    const stored = DEFAULT_VALUES.get(token.property);
    if (token.type === "range") {
      const numeric = extractNumeric(stored);
      input.value = isNaN(numeric) ? token.min : numeric;
    } else if (token.type === "color") {
      input.value = toHex(stored);
    } else {
      input.value = stored;
    }
    update();
  });

  return wrapper;
}

export function initTokenControls({ container } = {}) {
  const host = container ?? document.querySelector("[data-token-controls]");
  if (!host) {
    return;
  }

  CONTROL_GROUPS.forEach((group) => {
    group.tokens.forEach((token) => {
      if (!DEFAULT_VALUES.has(token.property)) {
        DEFAULT_VALUES.set(token.property, readInitialValue(token.property));
      }
    });
  });

  CONTROL_GROUPS.forEach((group) => {
    const groupWrapper = document.createElement("section");
    groupWrapper.className = "control-group";

    const heading = document.createElement("h3");
    heading.textContent = group.title;
    groupWrapper.appendChild(heading);

    group.tokens.forEach((token) => {
      groupWrapper.appendChild(createControl(token));
    });

    host.appendChild(groupWrapper);
  });

  const actions = document.createElement("div");
  actions.className = "control-actions";

  const resetAll = document.createElement("button");
  resetAll.type = "button";
  resetAll.textContent = "Reset all";

  const copyCss = document.createElement("button");
  copyCss.type = "button";
  copyCss.textContent = "Copy overrides";
  copyCss.className = "secondary";

  actions.appendChild(resetAll);
  actions.appendChild(copyCss);
  host.appendChild(actions);

  resetAll.addEventListener("click", () => {
    CONTROL_GROUPS.forEach((group) => {
      group.tokens.forEach((token) => {
        const stored = DEFAULT_VALUES.get(token.property);
        applyTokenValue(token.property, stored);
        const input = host.querySelector(`#${CSS.escape(token.property)}`);
        if (!input) return;

        if (token.type === "range") {
          const numeric = extractNumeric(stored);
          input.value = isNaN(numeric) ? token.min : numeric;
          const output = input.parentElement?.querySelector("output");
          if (output) {
            output.textContent = formatValue(token, extractNumeric(input.value));
          }
        } else if (token.type === "color") {
          input.value = toHex(stored);
        } else {
          input.value = stored;
        }
      });
    });
  });

  copyCss.addEventListener("click", async () => {
    const overrides = [];
    CONTROL_GROUPS.forEach((group) => {
      group.tokens.forEach((token) => {
        const current = getComputedStyle(
          document.documentElement
        ).getPropertyValue(token.property);
        const stored = DEFAULT_VALUES.get(token.property);
        if (!stored || current.trim() !== stored.trim()) {
          overrides.push(
            `  ${token.property}: ${current.trim() || token.min || ""};`
          );
        }
      });
    });

    const css = overrides.length
      ? `:root {\n${overrides.join("\n")}\n}`
      : ":root {\n  /* No overrides applied */\n}";

    try {
      await navigator.clipboard.writeText(css);
      copyCss.textContent = "Copied!";
      setTimeout(() => {
        copyCss.textContent = "Copy overrides";
      }, 2000);
    } catch (error) {
      console.error("Clipboard copy failed", error);
      copyCss.textContent = "Copy failed";
      setTimeout(() => {
        copyCss.textContent = "Copy overrides";
      }, 2000);
    }
  });
}
