import Paths from '../constants/Paths';
import matchPaths from './match-paths';
import { stripPathView } from './path-view';

// Synthetic viewer used for anonymous visitors. Holds no membership, so the board is read-only.
export const PUBLIC_USER_ID = '_public';

// Public id of the board an anonymous visitor is viewing, or null in the normal signed-in app.
// Fixed for the lifetime of the page: it is taken from the URL the app was loaded with.
let publicBoardId = null;

export const initPublicBoardId = (pathname) => {
  const match = matchPaths(stripPathView(pathname), [Paths.PUBLIC_BOARDS, Paths.PUBLIC_CARDS]);
  publicBoardId = match ? match.params.publicId : null;

  return publicBoardId;
};

export const getPublicBoardId = () => publicBoardId;

export const isPublicView = () => publicBoardId !== null;

export const getBoardPath = (boardId) => (publicBoardId ? Paths.PUBLIC_BOARDS.replace(':publicId', publicBoardId) : Paths.BOARDS.replace(':id', boardId));

export const getCardPath = (cardId) => (publicBoardId ? Paths.PUBLIC_CARDS.replace(':publicId', publicBoardId) : Paths.CARDS).replace(':id', cardId);
