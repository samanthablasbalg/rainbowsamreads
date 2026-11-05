import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { getBooksListBookRecommendationsMockHandler } from '@/api/generated/books/books.msw';
import { getRecommendersListRecommendersMockHandler } from '@/api/generated/recommenders/recommenders.msw';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { BookMetadata } from './book-metadata';

const book = buildBook();

const engagements = [
  buildEngagement({
    id: 'engagement-1',
    started_on: '2026-02-01',
    finished_on: '2026-02-07',
    review: { rating: '5.00', body: 'A house that is the whole world.' },
  }),
  buildEngagement({
    id: 'engagement-2',
    started_on: '2023-08-01',
    finished_on: '2023-08-12',
    review: { rating: '4.50', body: null },
  }),
];

const recommender = { id: 'recommender-1', name: 'Ursula K. Le Guin' };
const recommenders = [
  recommender,
  { id: 'recommender-2', name: 'James Baldwin' },
  { id: 'recommender-3', name: 'Toni Morrison' },
];

async function openCombobox({ canvasElement }: { canvasElement: HTMLElement }) {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole('combobox'));
}

const meta = {
  component: BookMetadata,
  args: { book, engagements },
  decorators: [
    (Story) => (
      <div className="w-60">
        <Story />
      </div>
    ),
  ],
  async beforeEach({ msw }) {
    msw.use(
      getBooksListBookRecommendationsMockHandler([]),
      getRecommendersListRecommendersMockHandler(recommenders)
    );
  },
} satisfies Meta<typeof BookMetadata>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoRecommendation: Story = {};

export const NoStoredRecommenders: Story = {
  async beforeEach({ msw }) {
    msw.use(getRecommendersListRecommendersMockHandler([]));
  },
  play: async (context) => {
    await openCombobox(context);
    expect(await screen.findByText('Type a name')).toBeInTheDocument();
  },
};

export const ExistingRecommenders: Story = {
  play: async (context) => {
    await openCombobox(context);
    expect(await screen.findByRole('option', { name: 'James Baldwin' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Toni Morrison' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ursula K. Le Guin' })).toBeInTheDocument();
  },
};

export const AddNewRecommender: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByRole('combobox'), 'Mary Oliver');
    expect(await screen.findByRole('button', { name: 'Add “Mary Oliver”' })).toBeInTheDocument();
  },
};

export const OneRecommender: Story = {
  async beforeEach({ msw }) {
    msw.use(getBooksListBookRecommendationsMockHandler([{ recommender, note: null }]));
  },
};

export const Untracked: Story = {
  args: { engagements: [] },
};
