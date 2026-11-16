import socket from './socket';

/* Actions */

const createTaskList = (cardId, data, headers) => socket.post(`/cards/${cardId}/task-lists`, data, headers);

const updateTaskList = (id, data, headers) => socket.patch(`/task-lists/${id}`, data, headers);

const deleteTaskList = (id, headers) => socket.delete(`/task-lists/${id}`, undefined, headers);

/* Event handlers */

const makeHandleTaskListCreate = (next) => (body) => {
  next(body);
};

const makeHandleTaskListUpdate = makeHandleTaskListCreate;

const makeHandleTaskListDelete = makeHandleTaskListCreate;

export default {
  createTaskList,
  updateTaskList,
  deleteTaskList,
  makeHandleTaskListCreate,
  makeHandleTaskListUpdate,
  makeHandleTaskListDelete,
};
