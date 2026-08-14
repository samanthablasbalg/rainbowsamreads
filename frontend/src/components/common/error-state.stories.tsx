import type { Meta, StoryObj } from '@storybook/react-vite';
import { AxiosError, type AxiosResponse } from 'axios';
import { Button } from '@/components/ui/button';
import { ErrorState } from './error-state';

const axiosFailure = (status?: number) =>
  new AxiosError(
    status ? `Request failed with status code ${status}` : 'Network Error',
    undefined,
    undefined,
    undefined,
    status ? ({ status } as AxiosResponse) : undefined
  );

const meta = {
  component: ErrorState,
  args: { error: new Error('boom') },
} satisfies Meta<typeof ErrorState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unknown: Story = {};

export const ChunkFailed: Story = {
  args: { error: new TypeError('Failed to fetch dynamically imported module: /src/routes/home') },
};

export const Offline: Story = {
  args: { error: axiosFailure() },
};

export const NotFound: Story = {
  args: { error: axiosFailure(404) },
};

export const Forbidden: Story = {
  args: { error: axiosFailure(403) },
};

export const ServerError: Story = {
  args: { error: axiosFailure(500) },
};

export const WithAction: Story = {
  args: {
    error: axiosFailure(500),
    action: <Button variant="outline">Try again</Button>,
  },
};
