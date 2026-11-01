export const paths = {
  login: '/login',
  simulation: '/simulation',
  users: '/users',
  documents: '/documents',
  chat: '/chat',
} as const;

/** Where to land after login when no other page was requested. */
export const HOME = paths.simulation;
