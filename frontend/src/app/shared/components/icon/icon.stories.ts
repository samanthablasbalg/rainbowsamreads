import { componentWrapperDecorator, type Meta, type StoryObj } from '@storybook/angular-vite';

import { IconComponent } from './icon';

const meta: Meta<IconComponent> = {
  title: 'Atoms/Icon',
  component: IconComponent,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['inherit', 'standard'] },
  },
  // `standard` here, though the component defaults to `inherit`: on a bare canvas there is
  // no surrounding text to track, so `inherit` renders at the 14px body size.
  args: { name: 'menu_book', size: 'standard' },
};

export default meta;
type Story = StoryObj<IconComponent>;

export const Default: Story = {};

/** Tracks the font size of the text it sits in. */
export const Inherit: Story = {
  args: { size: 'inherit' },
  decorators: [
    componentWrapperDecorator((story) => `<p class="text-xs">Reading ${story} right now</p>`),
  ],
};

/** 24px, for icons with no text to track. */
export const Standard: Story = { args: { size: 'standard' } };

/** The filled cut of the glyph — M3 uses it to mark an active or selected state. */
export const Filled: Story = { args: { size: 'standard', fill: true } };

/** With `label` set, the host becomes `role="img"` and carries an accessible name. */
export const Labelled: Story = { args: { name: 'headphones', label: 'Audiobook' } };

/** No color is passed — the icon takes the foreground color of whatever wraps it. */
export const OnFilledSurface: Story = {
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<span class="bg-primary text-on-primary inline-block rounded-lg p-3">${story}</span>`,
    ),
  ],
};
