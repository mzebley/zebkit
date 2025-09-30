
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Import all components
import { ZButton, defineZButton } from "./button";
import { ZCheckbox, defineZCheckbox } from "./checkbox";
// Import future components here, e.g.:
// import { ZInput, defineZInput } from "./input";
// import { ZCheckbox, defineZCheckbox } from "./checkbox";

// Export all components
export {
  ZButton,
  defineZButton,
  ZCheckbox,
  defineZCheckbox,
  // Add future components here, e.g.:
  // ZInput,
  // defineZInput,
};

export const defineCoreComponents = () => {
  defineZButton();
  defineZCheckbox();
  // Add future component definitions here, e.g.:
  // defineZInput();
};
