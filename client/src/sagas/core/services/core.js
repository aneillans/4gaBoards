import { call, put, select, take } from 'redux-saga/effects';

import actions from '../../../actions';
import api from '../../../api';
import i18n from '../../../i18n';
import selectors from '../../../selectors';
import { removeAccessToken } from '../../../utils/access-token-storage';
import { initializeHyperDX, setHyperDXUserInfo } from '../../../utils/hyperdx-init';
import { PUBLIC_USER_ID } from '../../../utils/public-board';
import request from '../request';
import requests from '../requests';

export function* initializeCore() {
  const {
    user,
    board,
    users,
    projects,
    projectManagers,
    projectMemberships,
    boards,
    boardMemberships,
    labels,
    lists,
    mailTokens,
    cards,
    comments,
    core,
    cardMemberships,
    cardLabels,
    tasks,
    taskMemberships,
    attachments,
    activities,
    notifications,
    userPrefs,
    apiClients,
    boardTemplates,
  } = yield call(requests.fetchCore); // TODO: handle error

  yield call(i18n.changeLanguage, userPrefs.language);
  yield call(i18n.loadCoreLocale);

  setHyperDXUserInfo(user.id, user.email, user.username);

  yield put(
    actions.initializeCore(
      user,
      board,
      users,
      projects,
      projectManagers,
      projectMemberships,
      boards,
      boardMemberships,
      labels,
      lists,
      mailTokens,
      cards,
      comments,
      core,
      cardMemberships,
      cardLabels,
      tasks,
      taskMemberships,
      attachments,
      activities,
      notifications,
      userPrefs,
      apiClients,
      boardTemplates,
    ),
  );
}

export function* changeCoreLanguage(language) {
  if (language === null) {
    yield call(i18n.detectLanguage);
    yield call(i18n.loadCoreLocale);
    yield call(i18n.changeLanguage, i18n.resolvedLanguage);
  } else {
    yield call(i18n.loadCoreLocale, language);
    yield call(i18n.changeLanguage, language);
  }
}

const EMPTY_PUBLIC_BOARD = {
  users: [],
  projects: [],
  boardMemberships: [],
  labels: [],
  lists: [],
  cards: [],
  cardMemberships: [],
  cardLabels: [],
  tasks: [],
  taskMemberships: [],
  attachments: [],
};

// Anonymous visitor of a public board. The snapshot goes through the same CORE_INITIALIZE as the
// signed-in app, so the ordinary board UI renders it. The synthetic viewer has no board membership,
// which closes every edit affordance. A board that fails to load initializes empty, so the app's own
// "board not found" screen is shown.
export function* initializePublicBoard(publicId) {
  let board;
  let included = EMPTY_PUBLIC_BOARD;
  let userPrefs = {};

  try {
    ({ item: board, included, userPrefs } = yield call(api.getPublicBoard, publicId));
  } catch {} // eslint-disable-line no-empty

  let core;
  try {
    core = yield call(api.getCoreSettingsPublic);
  } catch {} // eslint-disable-line no-empty

  yield call(changeCoreLanguage, null);

  const user = { id: PUBLIC_USER_ID, name: '', username: null, isAdmin: false };

  yield put(
    actions.initializeCore(
      user,
      board,
      included.users,
      included.projects,
      [], // projectManagers
      [], // projectMemberships
      [], // boards
      included.boardMemberships,
      included.labels,
      included.lists,
      [], // mailTokens
      included.cards,
      [], // comments
      core,
      included.cardMemberships,
      included.cardLabels,
      included.tasks,
      included.taskMemberships,
      included.attachments,
      [], // activities
      [], // notifications
      { ...userPrefs, id: PUBLIC_USER_ID },
      [], // apiClients
      [], // boardTemplates
    ),
  );
}

export function* logout(invalidateAccessToken = true) {
  yield call(removeAccessToken);

  if (invalidateAccessToken) {
    yield put(actions.logout.invalidateAccessToken());

    try {
      yield call(request, api.deleteCurrentAccessToken);
    } catch {} // eslint-disable-line no-empty
  }

  yield put(actions.logout());
  yield take();
}

export function* fetchCoreSettingsPublic() {
  const { item: coreSettings } = yield call(api.getCoreSettingsPublic);

  const { hyperdxEnabled, hyperdxApiKey, hyperdxInstanceName, hyperdxTracePropagationTargets, otelUrl, otelUrlFormat } = coreSettings;
  initializeHyperDX(hyperdxEnabled, hyperdxApiKey, hyperdxInstanceName, hyperdxTracePropagationTargets, otelUrl, otelUrlFormat);

  yield put(actions.fetchCoreSettingsPublic(coreSettings));
}

export function* updateCoreSettings(data) {
  const currentCoreSettings = yield select(selectors.selectCoreSettings);
  yield put(actions.updateCoreSettings(data));

  let core;
  try {
    ({ item: core } = yield call(request, api.updateCoreSettings, data));
  } catch (error) {
    yield put(actions.updateCoreSettings.failure(error, currentCoreSettings));
    return;
  }

  yield put(actions.updateCoreSettings.success(core));
}

export function* handleCoreSettingsUpdate(data) {
  yield put(actions.handleCoreSettingsUpdate(data));
}

export default {
  initializeCore,
  initializePublicBoard,
  changeCoreLanguage,
  logout,
  fetchCoreSettingsPublic,
  updateCoreSettings,
  handleCoreSettingsUpdate,
};
