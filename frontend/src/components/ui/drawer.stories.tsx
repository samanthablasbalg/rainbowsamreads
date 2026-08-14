import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Button } from './button';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from './drawer';

const meta = {
  component: Drawer,
  argTypes: {
    swipeDirection: {
      control: 'select',
      options: ['down', 'up', 'left', 'right'],
    },
  },
  async play({ canvasElement }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  },
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger render={<Button variant="outline">Open</Button>} />
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Drawer title</DrawerTitle>
          <DrawerDescription>A one-line description of what this drawer does.</DrawerDescription>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  ),
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Down: Story = {};
export const Up: Story = { args: { swipeDirection: 'up' } };
export const Left: Story = { args: { swipeDirection: 'left' } };
export const Right: Story = { args: { swipeDirection: 'right' } };

export const WithSwipeHandle: Story = { args: { showSwipeHandle: true } };

export const SnapPoints: Story = { args: { snapPoints: [0.4, 1], showSwipeHandle: true } };
