/**
 * Interface defining the options for the ZbkButton component.
 */
interface ZbkButtonOptions {
    /**
     * Optional list of variant names (space/comma separated in the `variant` attribute)
     * that will be converted into scoped variant classes (zbk-button--{name}).
     */
    variant?: string | string[];
    /**
     * Optional icon class used to render the fallback icon when no icon slot is provided.
     * Intended for icon font systems like Tabler.
     */
    iconClass?: string;
}
/**
 * ZbkButton is a custom web component that creates an enhanced button element.
 * It provides additional functionality and styling options beyond a standard HTML button.
 */
declare class ZbkButton extends HTMLElement {
    /** Shadow root that owns the internal button markup. */
    private shadowRootRef;
    /** The actual button element that this component wraps. */
    private button;
    /** Named slot for icons so consumers can project custom SVGs. */
    private iconSlot;
    /** Default slot for label content. */
    private labelSlot;
    /** Fallback icon element when no icon slot is provided. */
    private fallbackIcon;
    /** Fallback label element when the default slot is empty. */
    private fallbackLabel;
    /** Tracks when a named icon slot is populated. */
    private hasIconSlot;
    /** Tracks when the default slot is populated. */
    private hasLabelSlot;
    /** Stores the click handler function if provided. */
    private clickHandler;
    /** Stores the bound handleClick reference for add/remove event listener symmetry. */
    private boundHandleClick;
    /** Stores the bound slot change handlers for add/remove symmetry. */
    private boundHandleIconSlotChange;
    private boundHandleLabelSlotChange;
    /** Accessibility-related attributes that should be synced to the inner button. */
    private static readonly accessibilityAttributes;
    /** Default options for all ZbkButton instances. */
    static defaultOptions: ZbkButtonOptions;
    /** Current options for this ZbkButton instance. */
    private options;
    /** Tracks the concrete classes applied for variants to enable removal. */
    private previousVariantClasses;
    /** Normalized class names sourced from the variant attribute. */
    private variantNames;
    /** Indicates if accessibility attributes are currently being migrated. */
    private isMigratingAccessibilityAttributes;
    /** Indicates when disabled changes are being synced from internal APIs. */
    private isSyncingDisabledAttribute;
    /**
     * Specifies which attributes should be observed for changes.
     * Changes to these attributes will trigger the attributeChangedCallback.
     */
    static get observedAttributes(): string[];
    /**
     * Constructor for the ZbkButton component.
     * Initializes the shadow DOM structure, slots, and event handlers.
     */
    constructor();
    /**
     * Lifecycle callback that runs when the component is added to the DOM.
     * Sets up the button, event listeners, and initial state.
     */
    connectedCallback(): void;
    /**
     * Lifecycle callback that runs when the component is removed from the DOM.
     * Removes the click event listener and slot observers.
     */
    disconnectedCallback(): void;
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
     * Normalizes different variant inputs to a trimmed string array.
     */
    private normalizeVariantInput;
    /**
     * Applies the current options to the button's layout.
     */
    private applyOptions;
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
     * Syncs slotted icon nodes and flags when an icon is provided.
     */
    private handleIconSlotChange;
    /**
     * Updates label slot state so accessible naming can use visible content.
     */
    private handleLabelSlotChange;
    /**
     * Updates the fallback icon element based on icon-class and slot presence.
     */
    private renderIconFallback;
    /**
     * Sets a host attribute so CSS can avoid layout gaps when no icon exists.
     */
    private updateIconState;
    /**
     * Sets up accessibility attributes and ensures proper ARIA support.
     */
    private setupAccessibility;
    /**
     * Computes a fallback accessible label from slotted or fallback text.
     */
    private getAccessibleLabelText;
    /**
     * Returns only light DOM nodes assigned to a slot, excluding fallback content.
     */
    private getAssignedLightNodes;
    /**
     * Updates the aria-label when no explicit name is provided.
     */
    private updateAccessibleName;
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
     * Syncs the disabled state onto the internal button and aria-disabled state.
     */
    private updateDisabledState;
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
declare const defineZbkButton: () => void;

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
