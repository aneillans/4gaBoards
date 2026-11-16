import { all, fork } from 'redux-saga/effects';

import services from '../core/services';
import watchers from '../core/watchers';
import socketWatchers from '../core/watchers/socket';

// A public board is a read-only snapshot: no login and no socket, so no realtime updates. All other
// watchers run so filtering, search, views and the card modal behave as usual; anything that would
// write fails locally in `request`.
export default function* publicBoardSaga(publicId) {
  yield all(watchers.filter((watcher) => watcher !== socketWatchers).map((watcher) => fork(watcher)));

  yield fork(services.initializePublicBoard, publicId);
}
