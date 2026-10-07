# Rainbow Sam Reads 🌈📚

I'm a career SDET with over twelve years of experience, and in my spare time I am an avid reader. I
read 100+ books a year, several going at once, across print, ebook, and audiobook. I spend a huge
amount of time in multiple reading tracking apps, logging progress every day across my various reads
and meticulously curating tags for my stats. I use different trackers for different features, but no
matter which one I use, it never quite fits how I actually read. As an example, I'll start a book on
audio with my partner, lose the thread, re-read a chunk with my eyes to catch up, then switch back
to audio. I've never used a tracker that lets me both accurately track this as one single read _and_
lets me log all of the pages and minutes into my yearly totals.

For years that was just a fact of life, but a few things have been changing recently. In my latest
position at work, I have rapidly expanded my responsibilities from writing and maintaining automated
tests to building CI pipelines, automations between Playwright, Jira and Slack, and whole Docker
stacks from scratch. It was slowly dawning on me that I'd actually been "building" all along. As
part of this new role, I have become a serious Claude Code user, which stretched what I could
realistically take on by myself and has allowed me to step into new arenas that I hadn't previously
explored. All of this came together in one fateful moment where a years-old, tiny, quality-of-life
issue in one of my trackers made my brain go: _wait a minute, what if I just... try to build the
reading tracker of my dreams myself?!_

So I am! It's the first app I've ever built for real users, starting with me. Curious? It's live at
**[rainbowsamreads.fun](https://rainbowsamreads.fun)**. The app is invite-only while it's early, so
if you want to poke around inside, email me at **rainbowsamreads@gmail.com** and I'll add you.

## What it does

Today you can sign in with Google; build a catalog and TBR; open a book page; start, finish, or DNF
a read; log and correct daily progress; and rate and review. One read can move between print, ebook,
and audio, and re-reading ground already covered is recorded without inflating completion. It is
still a work in progress, but I am adding new improvements and features nearly every day.

It's built mobile-friendly first. A phone is where I do most of my reading-tracking, so that's the
experience I design around, with the desktop layout built just as deliberately. I even run a
separate staging environment so I can test in-progress work on my real phone before it ships.

What's next is continuing the part I built this for: tracking the reading no app has ever fit right.
Named segments for anthologies and omnibuses, richer lifecycle controls, ownership, author pages,
and stats are all in the [roadmap](docs/roadmap.md).

## How it's tested

Testing is the discipline I bring to building, so it's not an afterthought:

- **Backend:** pytest against a
  [dedicated test database](docs/decisions/0014-dedicated-test-database.md) that resets the schema,
  runs migrations, and truncates between tests so every run starts from a known state.
- **Frontend:** Vitest in two projects — component specs in jsdom with React Testing Library and MSW
  standing in for the API, and every Storybook story rendered in a real browser, where an
  accessibility violation fails the run.
- **End-to-end:** Playwright with page objects and fixtures, driving real browsers against
  [the same containerized stack as development](docs/decisions/0030-e2e-runs-against-the-compose-dev-stack.md),
  with a test-auth path so runs don't depend on live Google login.
- **Static analysis:** mypy (strict), Ruff, ESLint, Prettier, and backend dependency checks run in
  pre-commit; pull-request CI reruns the lint, type, test, build, and generated-code checks.

## How I build with an AI assistant

A decade-plus in testing has given me strong instincts for what good software looks like, but I have
pretty big holes in my knowledge about how to actually build something. I started off by having the
AI explain everything to me before it implemented what I designed, but I found that this wasn't
helping me actually internalize the concepts the way I hoped.

Now, I write the code _and_ retain ownership of the decisions. The assistant teaches unfamiliar
Python and React concepts, asks focused questions, and reviews my reasoning and changes. It
implements only when I explicitly delegate a particular task; help with one exercise does not grant
permission to implement later work. Since 9/18/26, I have been more conscientious about using the
co-author by-line when the AI does most of the coding and using bare commits to indicate my own
work, and using `teach` and `diy` labels to indicate the transition from mostly AI-driven PRs to
work I am now doing mostly myself.

## The stack

Python · FastAPI · SQLAlchemy · Alembic · PostgreSQL 18 · React 19 · Vite · React Router · TanStack
Query · shadcn/ui on Base UI · Tailwind CSS · Storybook

## Dig in

- **[Architecture](docs/architecture.md)** — the system and data model as one story
- **[Development guide](docs/development.md)** — how to run the whole stack locally
- **[Decision records](docs/decisions/README.md)** — the _why_ behind every significant choice
- **[Learning records](learning-records/README.md)** — how durable technical insights emerged
- **[Reference guides](reference/)** — current explanations I return to while working
- **[Project journal](journal/README.md)** — dated accounts of major changes in the project
- **[Roadmap](docs/roadmap.md)** — where it's going
