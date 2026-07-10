// Zebkit component registry: import everything, register with one call.
import { ZbkButton, defineZbkButton } from "./button";
import { ZbkTooltip, defineZbkTooltip } from "./tooltip";
import { ZbkCheckbox, defineZbkCheckbox } from "./checkbox";
import { ZbkRadio, defineZbkRadio } from "./radio";
import { ZbkToggle, defineZbkToggle } from "./toggle";
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
  ZbkCheckbox,
  defineZbkCheckbox,
  ZbkRadio,
  defineZbkRadio,
  ZbkToggle,
  defineZbkToggle,
  ZbkHeading,
  defineZbkHeading,
};

/** Register every zebkit component (each define is idempotent). */
export const defineZebkitComponents = () => {
  defineZbkButton();
  defineZbkTooltip();
  defineZbkCheckbox();
  defineZbkRadio();
  defineZbkToggle();
  defineZbkHeading();
};
