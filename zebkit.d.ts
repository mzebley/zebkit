/**
 * Interface defining the options for the ZbkButton component.
 */
interface ZbkButtonOptions {
    /**
     * Optional list of variant names (space/comma separated in the `variant` attribute)
     * that will be converted into scoped variant classes (zbk-button--{name}).
     */
    variant?: string[];
}
/**
 * ZbkButton is a custom web component that creates an enhanced button element.
 * It provides additional functionality and styling options beyond a standard HTML button.
 */
declare class ZbkButton extends HTMLElement {
    /** The actual button element that this component wraps. */
    private button;
    /** Stores the click handler function if provided. */
    private clickHandler;
    /** Stores the bound handleClick reference for add/remove event listener symmetry. */
    private boundHandleClick;
    /** Accessibility-related attributes that should be synced to the inner button. */
    private static readonly accessibilityAttributes;
    /** Default options for all ZbkButton instances. */
    private static defaultOptions;
    /** Current options for this ZbkButton instance. */
    private options;
    /** Tracks the concrete classes applied for variants to enable removal. */
    private previousVariantClasses;
    /** Normalized class names sourced from the variant attribute. */
    private variantNames;
    /** Indicates if accessibility attributes are currently being migrated. */
    private isMigratingAccessibilityAttributes;
    /**
     * Specifies which attributes should be observed for changes.
     * Changes to these attributes will trigger the attributeChangedCallback.
     */
    static get observedAttributes(): string[];
    /** MutationObserver to watch for class changes */
    private classObserver;
    /**
     * Constructor for the ZbkButton component.
     * Initializes the button element and adds the base class.
     */
    constructor();
    /**
     * Lifecycle callback that runs when the component is added to the DOM.
     * Sets up the button, event listeners, and initial state.
     */
    connectedCallback(): void;
    /**
     * Lifecycle callback that runs when the component is removed from the DOM.
     * Removes the click event listener and class observer
     */
    disconnectedCallback(): void;
    /**
     * Handles class changes on the custom element.
     * @param mutations - MutationRecord objects describing the changes.
     */
    private handleClassChanges;
    /**
     * Mirrors classes from the custom element to the internal button.
     */
    private mirrorClasses;
    /**
     * Lifecycle callback that runs when an observed attribute changes.
     * @param name - The name of the attribute that changed.
     * @param _oldValue - The old value of the attribute.
     * @param newValue - The new value of the attribute.
     */
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void;
    /**
     * Parses and updates the component's options.
     * @param newOptions - Optional object containing new options to apply.
     */
    private parseOptions;
    /**
     * Applies the current options to the button's layout.
     */
    private applyOptions;
    /**
     * Sets up the initial structure of the button.
     */
    private setupButton;
    /**
     * Handles the click event on the button.
     * @param event - The click event object.
     */
    private handleClick;
    /**
     * Updates the click handler based on the (click) attribute.
     */
    private updateClickHandler;
    /**
     * Sets up accessibility attributes and ensures proper ARIA support.
     */
    private setupAccessibility;
    /**
     * Sanitizes text for use in attributes.
     * @param text - The text to sanitize.
     * @returns The sanitized text.
     */
    private sanitizeText;
    /**
     * Updates an accessibility attribute on the button.
     * @param name - The name of the attribute to update.
     * @param value - The new value for the attribute.
     */
    private updateAccessibilityAttribute;
    /**
     * Sets the disabled state of the button.
     * @param isDisabled - Whether the button should be disabled.
     */
    setDisabledState(isDisabled: boolean): void;
    /**
     * Gets the current disabled state of the button.
     * @returns The disabled state of the button.
     */
    getDisabledState(): boolean;
    /**
     * Updates the options for the button.
     * @param newOptions - The new options to apply.
     */
    updateOptions(newOptions: Partial<ZbkButtonOptions>): void;
    /**
     * Sets the text content of the button.
     * @param text - The new text for the button.
     */
    setButtonText(text: string): void;
    /**
     * Gets the current text content of the button.
     * @returns The current text content of the button.
     */
    getButtonText(): string;
    /**
     * Sets the aria-pressed state of the button.
     * @param isPressed - Whether the button is in a pressed state.
     */
    setAriaPressed(isPressed: boolean): void;
    /**
     * Sets the aria-expanded state of the button.
     * @param isExpanded - Whether the button is in an expanded state.
     */
    setAriaExpanded(isExpanded: boolean): void;
    /**
     * Resolve variant names into concrete class names. Uses registered variants
     * when available and also applies legacy classes for compatibility.
     */
    private resolveVariantClasses;
}
/**
 * Helper function to define the custom element.
 * This function checks if the custom element is already defined before defining it.
 */
declare function defineZbkButton(): void;

declare class ZCheckbox extends HTMLElement {
    private input;
    private label;
    private mutationObserver?;
    private static readonly mirroredBooleanAttributes;
    private static readonly mirroredStringAttributes;
    private static readonly accessibilityAttributes;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void;
    get checked(): boolean;
    set checked(value: boolean);
    get indeterminate(): boolean;
    set indeterminate(value: boolean);
    get disabled(): boolean;
    set disabled(value: boolean);
    get name(): string;
    set name(value: string);
    get value(): string;
    set value(value: string);
    get required(): boolean;
    set required(value: boolean);
    focus(options?: FocusOptions): void;
    private handleClick;
    private handleInputChange;
    private syncFromAttributes;
    private reflectClassToLabel;
    private reflectAllClasses;
}
declare function defineZCheckbox(): void;

declare class ZRadio extends HTMLElement {
    private input;
    private label;
    private mutationObserver?;
    private static readonly mirroredBooleanAttributes;
    private static readonly mirroredStringAttributes;
    private static readonly accessibilityAttributes;
    static get observedAttributes(): string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void;
    get checked(): boolean;
    set checked(value: boolean);
    get disabled(): boolean;
    set disabled(value: boolean);
    get required(): boolean;
    set required(value: boolean);
    get name(): string;
    set name(value: string);
    get value(): string;
    set value(value: string);
    focus(options?: FocusOptions): void;
    private handleClick;
    private handleInputChange;
    private uncheckOtherRadiosInGroup;
    private getRadioGroupRoot;
    private syncFromAttributes;
    private reflectClassToLabel;
    private reflectAllClasses;
}
declare function defineZRadio(): void;

declare const defineCoreComponents: () => void;

type core_ZCheckbox = ZCheckbox;
declare const core_ZCheckbox: typeof ZCheckbox;
type core_ZRadio = ZRadio;
declare const core_ZRadio: typeof ZRadio;
type core_ZbkButton = ZbkButton;
declare const core_ZbkButton: typeof ZbkButton;
declare const core_defineCoreComponents: typeof defineCoreComponents;
declare const core_defineZCheckbox: typeof defineZCheckbox;
declare const core_defineZRadio: typeof defineZRadio;
declare const core_defineZbkButton: typeof defineZbkButton;
declare namespace core {
  export { core_ZCheckbox as ZCheckbox, core_ZRadio as ZRadio, core_ZbkButton as ZbkButton, core_defineCoreComponents as defineCoreComponents, core_defineZCheckbox as defineZCheckbox, core_defineZRadio as defineZRadio, core_defineZbkButton as defineZbkButton };
}

const __SETTINGS = {};
const __MODULE_MAP = { core };


function applySettings(target, component) {
  const componentSettings = __SETTINGS[component];
  if (!componentSettings || !target) return;
  Object.values(target).forEach((ctor) => {
    if (ctor && typeof ctor === 'function' && 'defaultOptions' in ctor) {
      const defaults = ctor.defaultOptions || {};
      ctor.defaultOptions = { ...defaults, ...componentSettings };
    }
  });
}

Object.keys(__SETTINGS).forEach((component) => {
  const target = __MODULE_MAP[component] || core;
  applySettings(target, component);
});

export { core };
