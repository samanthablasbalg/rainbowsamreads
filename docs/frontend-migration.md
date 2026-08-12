# Why I rebuilt the frontend

I decided to completely rebuild my frontend only two months into this project, which on its face is
a pretty wild decision. I want to explain the path I took to get here and the framing that changed
for me along the way. The formal record is
[ADR-0032](decisions/0032-migrate-the-frontend-to-react.md), and this doc aims to give broader
context.

## Where I started

I picked the stack for this app based on what I thought would help me in my current role. All of the
apps my team uses are built with Angular, which is a framework I have never tested before. The
syntax was unfamiliar to me, and the tech debt struggles that I was trying to help the team get out
of depended on me having a solid grounding in how Angular works before I could make reasonable
assertions about what should change. My partner also has been building Angular apps for over a
decade, and I knew it would be very helpful to be able to ask questions when I inevitably ran into
challenges.

## How it was going

This decision worked quite well for its original intended goals. I built an MVP app that I have
genuinely switched to as my daily reading tracker, and I have been able to move the needle at work
with the tools I've put into practice here like using Orval to keep the backend and frontend APIs
and types in sync. But as I continued building and learning, I started to hit roadblocks that became
more and more difficult to overcome.

## The decision point

I had been struggling to get Claude to build components and pages that were internally consistent. I
kept trying to order the chaos by using Material as a component library, and adding in Tailwind
instead of having custom CSS flying around everywhere, but I still somehow ended up with five
individually implemented and entirely bespoke buttons. I tried to add Storybook to the mix so that I
could have a consistent component library of atoms for Claude Code to pull from, and that seemed to
only make things worse. All three tools were strongly in tension and the tech debt throughout the
app was becoming extremely apparent.

I began to consider migrating the app to React. It seemed like a silly and also enormous thing to do
so soon into starting the project, but the mounting problems with the still-new implementation were
feeling a bit insurmountable. One thing that made the decision feel easier, though, was the
suspicion that everything might just go easier simply because React is likely better represented in
AI training data than Angular is. I lean heavily on AI assistants to help me build this; I've tested
web apps for years but have never built them myself. It wasn't something I would know for sure until
the migration was completed or, at the very least, well in progress, but it seemed like I might have
a better time the second time around just by virtue of Claude Code "knowing" React better than
Angular.

## Why React, and why all at once

As I have been building this app, I have shifted my mindset from "this is going to help me in my
current role" to "actually, I think I want this project to help me in my _next_ role." The more I
built, the more I realized that the skills and instincts I've honed over the past 12+ years building
test architecture are much more transferrable than I previously realized. It started to feel like my
"go with Angular so it will be applicable to your work" rationale didn't sit well with my new
burgeoning aspirations. I wanted a project that I could show to a potential hiring manager and not
be immediately dismissed because I built in a framework very few people use. Combining these
thoughts with my growing tech debt problem, and it just seemed like the right thing to do and the
right time.

## How it's going now

I am categorically opposed, in general, to big bang migration efforts and releases. I've been burned
by them at nearly every stage of my career. And this one was not entirely without its costs: it, as
these things always do, took considerably longer than I expected, and delayed any new feature work
being built in the meantime because I'm doing this by myself.

But, at the same time, it went even better than I expected. It was much easier to keep Claude on the
rails when there was an established component library to be importing, and I could ask "is this best
practices?" and feel much more confident that I was getting a real answer with resources for it to
point to.

My Playwright suite was invaluable during this process, acting like its own punch list to make sure
no functionality was forgotten. It needed barely any updates, excepting where I intentionally made
changes to the user flows, and I was really proud of how well I had built accessibility into the app
the first time around so that the locators could stay exactly the same.

The unit tests were also invaluable, even though they had to be rewritten. They encapsulated many
pieces of functionality that rightfully were not captured at the Playwright level but still needed
to be tested, so I was able to point Claude at the tests after we finished building a piece to make
sure that everything covered in the specs was still covered. A decent number of things would have
been missed, if not for the thorough tests.

Is there still tech debt hanging around for me to clean up? Yeah. I need to do a full abstraction
pass because I already know that some of the _components_ like the various book rows on different
pages have duplication in them. But it feels SO much better to be able to identify those pieces and
ask for components themselves to be abstracted into smaller reusable pieces, rather than staring
down a morass CSS duplication and not even knowing where to begin to untangle.

All in all, a great success, and I'm so excited to keep building on this new foundation. Onward to
new features!

---

The decision in its formal shape — the alternatives I turned down, and the thing that would tell me
I got it wrong — is in [ADR-0032](decisions/0032-migrate-the-frontend-to-react.md). The structure I
put in place so that tech debt can't quietly rebuild itself is
[ADR-0033](decisions/0033-frontend-layering-and-import-direction.md).
