import { call, fork } from 'redux-saga/effects';

import { getAccessToken } from '../utils/access-token-storage';
import { initPublicBoardId } from '../utils/public-board';
import coreSaga from './core';
import coreServices from './core/services';
import loginSaga from './login';
import publicBoardSaga from './public-board';

export default function* rootSaga() {
  yield fork(coreServices.fetchCoreSettingsPublic);

  // Public boards are anonymous by design and must never fall through to the login flow
  const publicBoardId = initPublicBoardId(window.location.pathname);

  if (publicBoardId) {
    yield call(publicBoardSaga, publicBoardId);
    return;
  }

  const accessToken = yield call(getAccessToken);

  if (!accessToken) {
    yield call(loginSaga);
  }

  yield call(coreSaga);
}
