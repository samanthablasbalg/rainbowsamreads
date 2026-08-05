import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from './card';

// children is supplied by `render`, not `args` -- see avatar.stories.tsx for why.
const meta = {
  component: Card,
  tags: ['autodocs'],
  args: {
    size: 'default',
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['default', 'sm'],
    },
  },
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Card title</CardTitle>
        <CardDescription>A one-line description of what this card shows.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            Action
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Body content goes here, wrapping onto as many lines as it needs.</p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Confirm</Button>
      </CardFooter>
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { size: 'default' } };
export const Sm: Story = { args: { size: 'sm' } };
