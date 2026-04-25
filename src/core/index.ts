// Import all components
import { ZbkButton, defineZbkButton } from "./button";
import { ZCheckbox, defineZCheckbox } from "./checkbox";
import { ZRadio, defineZRadio } from "./radio";
import { ZbkHeading, defineZbkHeading } from "./prose/heading";

export {
  ZbkButton,
  defineZbkButton,
  ZCheckbox,
  defineZCheckbox,
  ZRadio,
  defineZRadio,
  ZbkHeading,
  defineZbkHeading,
};

export const defineCoreComponents = () => {
  defineZbkButton();
  defineZCheckbox();
  defineZRadio();
  defineZbkHeading();
};
