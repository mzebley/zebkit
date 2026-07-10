/**
 * @jest-environment jsdom
 */
import { announce, resetAnnouncer } from './announce';

describe('announce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    resetAnnouncer();
    jest.useRealTimers();
  });

  function politeRegion(): HTMLElement | null {
    return document.querySelector('[aria-live="polite"]');
  }

  it('mounts a single polite live region and speaks the message', () => {
    announce('Saved');
    const region = politeRegion();
    expect(region).not.toBeNull();
    expect(region!.getAttribute('role')).toBe('status');
    expect(region!.getAttribute('aria-atomic')).toBe('true');

    jest.advanceTimersByTime(60);
    expect(region!.textContent).toBe('Saved');
  });

  it('reuses the same region across calls', () => {
    announce('One');
    announce('Two');
    expect(document.querySelectorAll('[aria-live="polite"]').length).toBe(1);
  });

  it('uses an alert region for assertive urgency', () => {
    announce('Upload failed', { urgency: 'assertive' });
    const region = document.querySelector('[aria-live="assertive"]');
    expect(region).not.toBeNull();
    expect(region!.getAttribute('role')).toBe('alert');
  });

  it('clears the message after clearAfter', () => {
    announce('Ephemeral', { clearAfter: 500 });
    jest.advanceTimersByTime(60);
    expect(politeRegion()!.textContent).toBe('Ephemeral');
    jest.advanceTimersByTime(500);
    expect(politeRegion()!.textContent).toBe('');
  });

  it('empties the region before re-announcing an identical message', () => {
    announce('Same');
    jest.advanceTimersByTime(60);
    expect(politeRegion()!.textContent).toBe('Same');

    announce('Same');
    expect(politeRegion()!.textContent).toBe('');
    jest.advanceTimersByTime(60);
    expect(politeRegion()!.textContent).toBe('Same');
  });

  it('is visually hidden but not aria-hidden', () => {
    announce('Hidden');
    const region = politeRegion()!;
    expect(region.style.position).toBe('absolute');
    expect(region.style.width).toBe('1px');
    expect(region.hasAttribute('aria-hidden')).toBe(false);
  });
});
