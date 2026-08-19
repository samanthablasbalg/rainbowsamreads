import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from './button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';

const meta = {
  component: Collapsible,
  render: (args) => (
    <Collapsible {...args} className="flex w-80 flex-col gap-2">
      <CollapsibleTrigger render={<Button variant="outline">Recent reads</Button>} />
      <CollapsibleContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>Piranesi</p>
        <p>Gideon the Ninth</p>
      </CollapsibleContent>
    </Collapsible>
  ),
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  args: { defaultOpen: true },
};

export const Toggling: Story = {
  async play({ canvasElement }) {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Recent reads' }));
    expect(await canvas.findByText('Piranesi')).toBeVisible();
  },
};
