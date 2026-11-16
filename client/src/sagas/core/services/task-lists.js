import { call, put, select } from 'redux-saga/effects';

import actions from '../../../actions';
import api from '../../../api';
import selectors from '../../../selectors';
import { createLocalId } from '../../../utils/local-id';
import request from '../request';

export function* receiveTaskLists(taskLists) {
  if (taskLists && taskLists.length > 0) {
    yield put(actions.receiveTaskLists(taskLists));
  }
}

export function* createTaskList(cardId, data) {
  const localId = yield call(createLocalId);

  yield put(actions.createTaskList({ ...data, cardId, id: localId }));

  let taskList;
  try {
    ({ item: taskList } = yield call(request, api.createTaskList, cardId, data));
  } catch (error) {
    yield put(actions.createTaskList.failure(localId, error));
    return;
  }

  yield put(actions.createTaskList.success(localId, taskList));
}

export function* updateTaskList(id, data) {
  const prevTaskList = yield select(selectors.selectTaskListById, id);

  yield put(actions.updateTaskList(id, data));

  let taskList;
  try {
    ({ item: taskList } = yield call(request, api.updateTaskList, id, data));
  } catch (error) {
    yield put(actions.updateTaskList.failure(id, error, prevTaskList));
    return;
  }

  yield put(actions.updateTaskList.success(taskList));
}

export function* deleteTaskList(id) {
  yield put(actions.deleteTaskList(id));

  let taskList;
  try {
    ({ item: taskList } = yield call(request, api.deleteTaskList, id));
  } catch (error) {
    yield put(actions.deleteTaskList.failure(id, error));
    return;
  }

  yield put(actions.deleteTaskList.success(taskList));
}

export function* handleTaskListCreate(taskList) {
  yield put(actions.handleTaskListCreate(taskList));
}

export function* handleTaskListUpdate(taskList) {
  yield put(actions.handleTaskListUpdate(taskList));
}

export function* handleTaskListDelete(taskList) {
  yield put(actions.handleTaskListDelete(taskList));
}

export default {
  receiveTaskLists,
  createTaskList,
  updateTaskList,
  deleteTaskList,
  handleTaskListCreate,
  handleTaskListUpdate,
  handleTaskListDelete,
};
