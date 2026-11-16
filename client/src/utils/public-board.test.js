/**
 * @jest-environment node
 */

/* global jest */

// Config reads window.BASE_URL, which the test environment does not provide
jest.mock('../constants/Config', () => ({ __esModule: true, default: { BASE_PATH: '' } }));

const { getBoardPath, getCardPath, initPublicBoardId, isPublicView } = require('./public-board');

describe('public-board', () => {
  test('stays in the signed-in routes outside a public board', () => {
    expect(initPublicBoardId('/boards/1')).toBeNull();
    expect(isPublicView()).toBe(false);
    expect(getBoardPath('1')).toBe('/boards/1');
    expect(getCardPath('2')).toBe('/cards/2');
  });

  test.each(['/public-boards/abc', '/public-boards/abc/list-view', '/public-boards/abc/cards/2', '/public-boards/abc/cards/2/board-view'])('keeps navigation inside the public routes for %s', (pathname) => {
    expect(initPublicBoardId(pathname)).toBe('abc');
    expect(isPublicView()).toBe(true);
    expect(getBoardPath('1')).toBe('/public-boards/abc');
    expect(getCardPath('2')).toBe('/public-boards/abc/cards/2');

    initPublicBoardId('/');
  });
});
