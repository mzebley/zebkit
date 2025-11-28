
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Import all components
import { ZbkButton, defineZbkButton } from "./button";
import { ZCheckbox, defineZCheckbox } from "./checkbox";
import { ZRadio, defineZRadio } from "./radio";
// Import future components here, e.g.:
// import { ZInput, defineZInput } from "./input";
// import { ZCheckbox, defineZCheckbox } from "./checkbox";

// Export all components
export {
  ZbkButton,
  defineZbkButton,
  ZCheckbox,
  defineZCheckbox,
  ZRadio,
  defineZRadio,
  // Add future components here, e.g.:
  // ZInput,
  // defineZInput,
};

export const defineCoreComponents = () => {
  defineZbkButton();
  defineZCheckbox();
  defineZRadio();
  // Add future component definitions here, e.g.:
  // defineZInput();
};
