import { createScreenRouteTable, type RouteMotionEntry } from "../../src/integrations/react-router-screens";

/** A small demo app with the shapes real apps have: tab bars, a dashboard, sign-in, tasks, spaces, aliases, splats. */
const TASK = { presentation: "task", skeleton: "task" } as const;
const e = (pattern: string, screen: string, family: string, depth: number, extra: Partial<RouteMotionEntry> = {}): RouteMotionEntry => ({
  pattern,
  screen,
  family,
  depth,
  ...extra,
});

export const DEMO_ROUTES: RouteMotionEntry[] = [
  // Standalone tools crossfade in and out.
  e("/onboarding", "tools:onboarding", "tools", 0),
  // Sign-in: entered with a push; sign-in and sign-up are peers.
  e("/sign-in", "auth:sign-in", "auth", 0),
  e("/sign-up", "auth:sign-up", "auth", 0),
  e("/forgot", "auth:forgot", "auth", 1, { parent: "/sign-in", skeleton: "form" }),
  e("/reset", "auth:reset", "auth", 2, { parent: "/forgot", skeleton: "form" }),
  e("/waitlist", "waitlist:home", "waitlist", 0),
  // A separate space.
  e("/rooms", "rooms:app", "rooms", 0, { parent: "/account" }),
  // Dashboard: the home sits in the middle of its tab bar.
  e("/studio", "studio:index", "studio", 0, { skeleton: "dashboard" }),
  e("/studio/listings", "studio:listings", "studio", 0, { skeleton: "list" }),
  e("/studio/inbox", "studio:inbox", "studio", 0),
  e("/studio/messages", "studio:messages", "studio", 0, { skeleton: "inbox" }),
  e("/studio/repairs", "studio:repairs", "studio", 0),
  e("/studio/repairs/orders", "studio:repairs", "studio", 0),
  e("/studio/earnings", "studio:earnings", "studio", 1, { parent: "/studio" }),
  e("/studio/insights", "studio:insights", "studio", 1, { parent: "/studio" }),
  e("/studio/automation", "studio:automation", "studio", 1, { parent: "/studio" }),
  e("/studio/setup", "studio:automation", "studio", 1, { parent: "/studio" }),
  e("/studio/notifications", "studio:notifications", "studio", 1, { ...TASK, parent: "/studio" }),
  // Main app.
  e("/", "app:home", "app", 0),
  e("/explore", "app:explore", "app", 0, { skeleton: "list" }),
  e("/trips", "app:trips", "app", 0),
  e("/saved", "app:saved", "app", 0),
  e("/account", "app:account", "app", 0),
  e("/account/edit", "app:account-edit", "app", 1, { parent: "/account", skeleton: "form" }),
  e("/help", "app:help", "app", 1, { parent: "/account" }),
  e("/places/:id", "app:place", "app", 1, { parent: "/explore", skeleton: "detail" }),
  e("/groups", "app:groups", "app", 1, { parent: "/account" }),
  e("/groups/:groupId/*", "app:group", "app", 2, { parent: "/groups" }),
  e("/leases/:leaseId/*", "app:lease", "app", 1, { parent: "/account" }),
  e("/checkout", "app:checkout", "app", 1, { ...TASK, backDisabled: true }),
  e("/notifications", "app:notifications", "app", 1, TASK),
  e("/trips/:id/lobby", "app:lobby", "app", 1, TASK),
  e("/trips/:id/live", "app:live", "app", 2, { presentation: "excluded", backDisabled: true }),
];

const TABS: Record<string, readonly string[]> = {
  guest: ["app:home", "app:explore", "app:account"],
  member: ["app:explore", "app:trips", "app:saved"],
  studio: ["studio:listings", "studio:inbox", "studio:index", "studio:messages", "studio:repairs"],
};

export const demoTable = createScreenRouteTable({
  entries: DEMO_ROUTES,
  familyRoots: { app: "/", auth: "/sign-in", studio: "/studio", rooms: "/rooms", waitlist: "/waitlist", tools: "/" },
  tabOrder: (family, role) => (family === "app" ? TABS[role ?? "member"] : family === "studio" ? TABS.studio : null),
  peers: [
    ["auth:sign-in", "auth:sign-up"],
    ["app:home", "waitlist:*"],
  ],
  pushFamilies: ["auth"],
  crossfadeFamilies: ["tools"],
  fallback: { family: "app" },
});
