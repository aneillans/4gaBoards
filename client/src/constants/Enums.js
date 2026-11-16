export const ProjectBackgroundTypes = {
  GRADIENT: 'gradient',
  IMAGE: 'image',
};

export const BoardMembershipRoles = {
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

export const ResizeObserverSizeTypes = {
  OFFSET_HEIGHT: 'offsetHeight',
  OFFSET_WIDTH: 'offsetWidth',
  CLIENT_HEIGHT: 'clientHeight',
  CLIENT_WIDTH: 'clientWidth',
  SCROLL_HEIGHT: 'scrollHeight',
  SCROLL_WIDTH: 'scrollWidth',
  SCROLLABLE: 'scrollable',
};

export const SsoTypes = {
  GOOGLE: 'google',
  GITHUB: 'github',
  MICROSOFT: 'microsoft',
  OIDC: 'oidc',
};

export const PreferredFonts = {
  DEFAULT: 'default',
  MONOSPACE: 'monospace',
};

export const Themes = {
  DEFAULT: 'default',
  GITHUB_DARK: 'github-dark',
  LIGHT: 'light',
  CUSTOM: 'custom',
};

export const ThemeShapes = {
  DEFAULT: 'default',
  ROUNDED: 'rounded',
};

export const NotificationsDeliveryModes = {
  INSTANT: 'instant',
  BATCHED: 'batched',
  INSTANT_THEN_BATCHED: 'instant_then_batched',
};

// Mirrors List.Types on the server. Every board has exactly one archive and one trash list, which the
// normal board views leave out.
export const ListTypes = {
  ACTIVE: 'active',
  ARCHIVE: 'archive',
  TRASH: 'trash',
};

export const BoardContexts = {
  BOARD: 'board',
  ARCHIVE: 'archive',
  TRASH: 'trash',
};
