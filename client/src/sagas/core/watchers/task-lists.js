import { all, takeEvery } from 'redux-saga/effects';

import EntryActionTypes from '../../../constants/EntryActionTypes';
import services from '../services';

export default function* taskListsWatchers() {
  yield all([
    takeEvery(EntryActionTypes.TASK_LIST_CREATE, ({ payload: { cardId, data } }) => services.createTaskList(cardId, data)),
    takeEvery(EntryActionTypes.TASK_LIST_UPDATE, ({ payload: { id, data } }) => services.updateTaskList(id, data)),
    takeEvery(EntryActionTypes.TASK_LIST_DELETE, ({ payload: { id } }) => services.deleteTaskList(id)),
    takeEvery(EntryActionTypes.TASK_LIST_CREATE_HANDLE, ({ payload: { taskList } }) => services.handleTaskListCreate(taskList)),
    takeEvery(EntryActionTypes.TASK_LIST_UPDATE_HANDLE, ({ payload: { taskList } }) => services.handleTaskListUpdate(taskList)),
    takeEvery(EntryActionTypes.TASK_LIST_DELETE_HANDLE, ({ payload: { taskList } }) => services.handleTaskListDelete(taskList)),
  ]);
}
