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
    await waitFor(() => {
      const shadowButton = button?.shadowRoot?.querySelector('button');
      expect(shadowButton).not.toBeNull();
      expect(shadowButton?.textContent).toBe('Click me');
    }, { timeout: 2000 });
  });

  it('fires a custom event when clicked', async () => {
    document.body.innerHTML = '<z-button>Click me</z-button>';
    const button = document.querySelector('z-button');
    const mockHandler = jest.fn();
    button?.addEventListener('z-click', mockHandler);

    await waitFor(() => {
      fireEvent.click(button?.shadowRoot?.querySelector('button') as Element);
    });

    expect(mockHandler).toHaveBeenCalled();
  });

  it('executes the (click) attribute when clicked', async () => {
    const mockFn = jest.fn();
    window.testClick = mockFn;
    
    document.body.innerHTML = '<z-button (click)="testClick()">Click me</z-button>';
    const button = document.querySelector('z-button');

    await waitFor(() => {
      fireEvent.click(button?.shadowRoot?.querySelector('button') as Element);
    });

    expect(mockFn).toHaveBeenCalled();
    delete (window as any).testClick;
  });
});