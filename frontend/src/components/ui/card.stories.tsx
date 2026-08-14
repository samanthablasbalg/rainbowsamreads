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

const meta = {
  component: Card,
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

export const Default: Story = {};
export const Sm: Story = { args: { size: 'sm' } };
