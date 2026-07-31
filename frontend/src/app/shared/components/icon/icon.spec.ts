import { render } from '@testing-library/angular';
import { IconComponent } from './icon';

interface IconInputs {
  name: string;
  size: 'inherit' | 'standard';
  label: string;
  fill: boolean;
  weight: number;
  grade: number;
}

async function renderIcon(inputs: Partial<IconInputs> = {}): Promise<HTMLElement> {
  const { fixture } = await render(IconComponent, {
    inputs: { name: 'menu_book', ...inputs },
  });

  return fixture.nativeElement as HTMLElement;
}

/** Browsers normalise the quote style inside font-variation-settings, so compare unquoted. */
function axes(host: HTMLElement): string {
  return host.style.fontVariationSettings.replace(/["']/g, '');
}

describe('IconComponent', () => {
  describe('accessibility', () => {
    it('hides a decorative icon from assistive technology', async () => {
      const host = await renderIcon();

      expect(host.getAttribute('aria-hidden')).toBe('true');
      expect(host.getAttribute('role')).toBeNull();
      expect(host.getAttribute('aria-label')).toBeNull();
    });

    it('exposes a labelled icon as a named image', async () => {
      const host = await renderIcon({ label: 'Audiobook' });

      expect(host.getAttribute('role')).toBe('img');
      expect(host.getAttribute('aria-label')).toBe('Audiobook');
      expect(host.getAttribute('aria-hidden')).toBeNull();
    });
  });

  describe('font-variation-settings', () => {
    // font-variation-settings resets every axis it does not name, so a partial string
    // silently reverts the others. All three have to be present on every render.
    it('names every axis when none are set', async () => {
      const host = await renderIcon();

      expect(axes(host)).toContain('FILL 0');
      expect(axes(host)).toContain('wght 400');
      expect(axes(host)).toContain('GRAD 0');
    });

    it('names every axis when only one is set', async () => {
      const host = await renderIcon({ fill: true });

      expect(axes(host)).toContain('FILL 1');
      expect(axes(host)).toContain('wght 400');
      expect(axes(host)).toContain('GRAD 0');
    });

    it('carries through weight and grade', async () => {
      const host = await renderIcon({ weight: 600, grade: -25 });

      expect(axes(host)).toContain('wght 600');
      expect(axes(host)).toContain('GRAD -25');
    });
  });
});
