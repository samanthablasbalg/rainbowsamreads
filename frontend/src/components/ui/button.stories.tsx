import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon } from '@hugeicons/core-free-icons';
import { Button } from './button';

const meta = {
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Button',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: 'default' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Destructive: Story = { args: { variant: 'destructive' } };
export const Link: Story = { args: { variant: 'link' } };

export const SizeDefault: Story = { args: { size: 'default' } };
export const SizeXs: Story = { args: { size: 'xs' } };
export const SizeSm: Story = { args: { size: 'sm' } };
export const SizeLg: Story = { args: { size: 'lg' } };

// Icon sizes render icon-only in real usage (see sheet.tsx's close button, size="icon-sm"),
// so text children would misrender -- and an icon-only button needs an aria-label for axe's
// button-name rule, the same way account-menu.tsx's icon buttons carry one.
//
// render, not args.children: an arg has to be a plain, serializable value for the
// controls/docs machinery to source-print it, and a JSX element isn't (see
// avatar.stories.tsx). aria-label stays a plain arg since it's just a string.
function renderIconOnly(args: ComponentProps<typeof Button>) {
  return (
    <Button {...args}>
      <HugeiconsIcon icon={PlusSignIcon} />
    </Button>
  );
}

export const SizeIcon: Story = {
  args: { size: 'icon', 'aria-label': 'Add' },
  render: renderIconOnly,
};
export const SizeIconXs: Story = {
  args: { size: 'icon-xs', 'aria-label': 'Add' },
  render: renderIconOnly,
};
export const SizeIconSm: Story = {
  args: { size: 'icon-sm', 'aria-label': 'Add' },
  render: renderIconOnly,
};
export const SizeIconLg: Story = {
  args: { size: 'icon-lg', 'aria-label': 'Add' },
  render: renderIconOnly,
};
