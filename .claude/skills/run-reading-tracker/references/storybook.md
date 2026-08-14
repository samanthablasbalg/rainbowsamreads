# Storybook

Storybook runs at `http://storybook:6006` and is up alongside the rest of the stack. It is often the
faster way to investigate a component: one component in isolation, no login, no seeding, and no
route to navigate to.

Same harness as the app — attach first (see SKILL.md), then:

```bash
npx playwright cli --s=default goto http://storybook:6006/
npx playwright cli --s=default eval "async () => Object.keys((await (await fetch('/index.json')).json()).entries).slice(0,12)"
npx playwright cli --s=default goto "http://storybook:6006/iframe.html?id=components-common-reading-progress--mid&viewMode=story"
```

`/index.json` lists every story id. `iframe.html?id=<story-id>&viewMode=story` renders one story
alone, with no Storybook chrome around it — that is what you want to screenshot.

**Quote the URL.** The `&` will otherwise background the command.

Story ids are derived from the file's title and export name, e.g.
`components-common-reading-progress--mid`. A `--docs` id is the docs page, not the story.

For a human: `http://localhost:6006` on the Mac.
