import '@testing-library/jest-dom';

// Polyfill for Custom Elements
if (typeof window !== 'undefined' && !window.customElements) {
  window.customElements = {
    define: jest.fn(),
  } as any;
}