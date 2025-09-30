import { defineZButton } from './index';
import { fireEvent, waitFor } from '@testing-library/dom';

declare global {
  interface Window {
    testClick?: () => void;
  }
}

describe('ZButton', () => {
  beforeAll(() => {
    defineZButton();
  });

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders with the correct text', async () => {
    document.body.innerHTML = '<z-button>Click me</z-button>';
    const button = document.querySelector('z-button');
    const lightDomButton = await waitFor(() => {
      const innerButton = button?.querySelector('button.z-button');
      if (!innerButton) {
        throw new Error('Button not rendered');
      }
      return innerButton;
    }, { timeout: 2000 });

    expect(lightDomButton.textContent?.trim()).toBe('Click me');
  });

  it('fires a custom event when clicked', async () => {
    document.body.innerHTML = '<z-button>Click me</z-button>';
    const button = document.querySelector('z-button');
    const mockHandler = jest.fn();
    button?.addEventListener('z-click', mockHandler);

    const lightDomButton = await waitFor(() => {
      const innerButton = button?.querySelector('button.z-button');
      if (!innerButton) {
        throw new Error('Button not rendered');
      }
      return innerButton;
    });

    fireEvent.click(lightDomButton);

    expect(mockHandler).toHaveBeenCalled();
  });

  it('does not fire z-click after being disconnected', async () => {
    document.body.innerHTML = '<div id="wrapper"></div>';
    const wrapper = document.getElementById('wrapper');
    const button = document.createElement('z-button');
    button.textContent = 'Click me';
    wrapper?.appendChild(button);

    const mockHandler = jest.fn();
    button.addEventListener('z-click', mockHandler);

    const lightDomButton = await waitFor(() => {
      const innerButton = button.querySelector('button.z-button');
      if (!innerButton) {
        throw new Error('Button not rendered');
      }
      return innerButton;
    });

    wrapper?.removeChild(button);

    fireEvent.click(lightDomButton);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('executes the (click) attribute when clicked', async () => {
    const mockFn = jest.fn();
    window.testClick = mockFn;

    document.body.innerHTML = '<z-button (click)="testClick()">Click me</z-button>';
    const button = document.querySelector('z-button');

    const lightDomButton = await waitFor(() => {
      const innerButton = button?.querySelector('button.z-button');
      if (!innerButton) {
        throw new Error('Button not rendered');
      }
      return innerButton;
    });

    fireEvent.click(lightDomButton);

    expect(mockFn).toHaveBeenCalled();
    delete (window as any).testClick;
  });

  it('retains migrated aria attributes on the inner button', async () => {
    document.body.innerHTML = '<z-button aria-label="Label">Content</z-button>';
    const button = document.querySelector('z-button');

    const lightDomButton = await waitFor(() => {
      const innerButton = button?.querySelector('button.z-button');
      if (!innerButton) {
        throw new Error('Button not rendered');
      }
      return innerButton;
    });

    expect(lightDomButton?.getAttribute('aria-label')).toBe('Label');
  });
});
