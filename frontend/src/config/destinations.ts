import { Analytics01Icon, Book02Icon, ChampionIcon, Home01Icon } from '@hugeicons/core-free-icons';

// The four top-level destinations. One list, read by all three nav layouts, so a
// destination cannot end up in one nav and missing from another.
//
// Every one of these must stay reachable in a single tap from anywhere in the app --
// that is why the list is short and why nothing here gets folded into a menu.
export const destinations = [
  { to: '/home', label: 'Home', icon: Home01Icon },
  { to: '/library', label: 'Library', icon: Book02Icon },
  { to: '/insights', label: 'Insights', icon: Analytics01Icon },
  { to: '/challenges', label: 'Challenges', icon: ChampionIcon },
];
