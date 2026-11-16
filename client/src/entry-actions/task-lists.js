import EntryActionTypes from '../constants/EntryActionTypes';

const createTaskList = (cardId, data) => ({
  type: EntryActionTypes.TASK_LIST_CREATE,
  payload: {
    cardId,
    data,
  },
});

const updateTaskList = (id, data) => ({
  type: EntryActionTypes.TASK_LIST_UPDATE,
  payload: {
    id,
    data,
  },
});

const deleteTaskList = (id) => ({
  type: EntryActionTypes.TASK_LIST_DELETE,
  payload: {
    id,
  },
});

const handleTaskListCreate = (taskList) => ({
  type: EntryActionTypes.TASK_LIST_CREATE_HANDLE,
  payload: {
    taskList,
  },
});

const handleTaskListUpdate = (taskList) => ({
  type: EntryActionTypes.TASK_LIST_UPDATE_HANDLE,
  payload: {
    taskList,
  },
});

const handleTaskListDelete = (taskList) => ({
  type: EntryActionTypes.TASK_LIST_DELETE_HANDLE,
  payload: {
    taskList,
  },
});

export default {
  createTaskList,
  updateTaskList,
  deleteTaskList,
  handleTaskListCreate,
  handleTaskListUpdate,
  handleTaskListDelete,
};
