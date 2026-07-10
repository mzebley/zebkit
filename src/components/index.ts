// Zebkit component registry: import everything, register with one call.
import { ZbkButton, defineZbkButton } from "./button";
import { ZbkTooltip, defineZbkTooltip } from "./tooltip";
import { ZCheckbox, defineZCheckbox } from "./checkbox";
import { ZRadio, defineZRadio } from "./radio";
import { ZbkHeading, defineZbkHeading } from "./heading";
import { ZebkitElement } from "./base/zebkit-element";
import { announce, resetAnnouncer } from "./base/announce";

export {
  ZebkitElement,
  announce,
  resetAnnouncer,
  ZbkButton,
  defineZbkButton,
  ZbkTooltip,
  defineZbkTooltip,
  ZCheckbox,
  defineZCheckbox,
  ZRadio,
  defineZRadio,
  ZbkHeading,
  defineZbkHeading,
};

/** Register every zebkit component (each define is idempotent). */
export const defineZebkitComponents = () => {
  defineZbkButton();
  defineZbkTooltip();
  defineZCheckbox();
  defineZRadio();
  defineZbkHeading();
};
