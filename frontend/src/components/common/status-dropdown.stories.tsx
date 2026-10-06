import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { StatusDropdown } from './status-dropdown';

const book = buildBook();
const toRead = buildEngagement({
  status: ReadingStatus.tbr,
  started_on: null,
  finished_on: null,
  resume_from_page: 0,
  frontier_page: 0,
  completion_pct: 0,
});
const reading = buildEngagement({
  status: ReadingStatus.reading,
  finished_on: null,
  resume_from_page: 100,
  frontier_page: 100,
  completion_pct: 37,
});

async function openMenu(canvasElement: HTMLElement, status: string) {
  await userEvent.click(within(canvasElement).getByRole('button', { name: `Status: ${status}` }));
  expect(await screen.findByRole('menu')).toBeInTheDocument();
}

const meta = {
  component: StatusDropdown,
  args: { book, engagement: null },
} satisfies Meta<typeof StatusDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotTracked: Story = {};

export const ToRead: Story = {
  args: { engagement: toRead },
};

export const Reading: Story = {
  args: { engagement: reading },
};

export const Finished: Story = {
  args: { engagement: buildEngagement({ status: ReadingStatus.finished }) },
};

export const DNF: Story = {
  args: {
    engagement: buildEngagement({
      status: ReadingStatus.dnf,
      finished_on: null,
      abandoned_on: '2025-03-12',
    }),
  },
};

export const MenuOpen: Story = {
  play: async ({ canvasElement }) => {
    await openMenu(canvasElement, 'Not tracked');
    expect(screen.getByRole('menuitem', { name: 'To read' })).toBeInTheDocument();
  },
};
