import ActionTypes from '../constants/ActionTypes';

// Task lists that arrived with a board, card or core payload
const receiveTaskLists = (taskLists) => ({
  type: ActionTypes.TASK_LISTS_RECEIVE,
  payload: {
    taskLists,
  },
});

const createTaskList = (taskList) => ({
  type: ActionTypes.TASK_LIST_CREATE,
  payload: {
    taskList,
  },
});

createTaskList.success = (localId, taskList) => ({
  type: ActionTypes.TASK_LIST_CREATE__SUCCESS,
  payload: {
    localId,
    taskList,
  },
});

createTaskList.failure = (localId, error) => ({
  type: ActionTypes.TASK_LIST_CREATE__FAILURE,
  payload: {
    localId,
    error,
  },
});

const updateTaskList = (id, data) => ({
  type: ActionTypes.TASK_LIST_UPDATE,
  payload: {
    id,
    data,
  },
});

updateTaskList.success = (taskList) => ({
  type: ActionTypes.TASK_LIST_UPDATE__SUCCESS,
  payload: {
    taskList,
  },
});

updateTaskList.failure = (id, error, prevData) => ({
  type: ActionTypes.TASK_LIST_UPDATE__FAILURE,
  payload: {
    id,
    error,
    prevData,
  },
});

const deleteTaskList = (id) => ({
  type: ActionTypes.TASK_LIST_DELETE,
  payload: {
    id,
  },
});

deleteTaskList.success = (taskList) => ({
  type: ActionTypes.TASK_LIST_DELETE__SUCCESS,
  payload: {
    taskList,
  },
});

deleteTaskList.failure = (id, error) => ({
  type: ActionTypes.TASK_LIST_DELETE__FAILURE,
  payload: {
    id,
    error,
  },
});

const handleTaskListCreate = (taskList) => ({
  type: ActionTypes.TASK_LIST_CREATE_HANDLE,
  payload: {
    taskList,
  },
});

const handleTaskListUpdate = (taskList) => ({
  type: ActionTypes.TASK_LIST_UPDATE_HANDLE,
  payload: {
    taskList,
  },
});

const handleTaskListDelete = (taskList) => ({
  type: ActionTypes.TASK_LIST_DELETE_HANDLE,
  payload: {
    taskList,
  },
});

export default {
  receiveTaskLists,
  createTaskList,
  updateTaskList,
  deleteTaskList,
  handleTaskListCreate,
  handleTaskListUpdate,
  handleTaskListDelete,
};
