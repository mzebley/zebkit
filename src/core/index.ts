
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Import all components
import { ZButton, defineZButton } from "./button";
// Import future components here, e.g.:
// import { ZInput, defineZInput } from "./input";
// import { ZCheckbox, defineZCheckbox } from "./checkbox";

// Export all components
export {
  ZButton,
  defineZButton,
  // Add future components here, e.g.:
  // ZInput,
  // defineZInput,
  // ZCheckbox,
  // defineZCheckbox
};

export const defineCoreComponents = () => {
  defineZButton();
  // Add future component definitions here, e.g.:
  // defineZInput();
  // defineZCheckbox();
};