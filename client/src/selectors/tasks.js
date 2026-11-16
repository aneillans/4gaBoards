import { createSelector } from 'redux-orm';

import orm from '../orm';
import getMeta from '../utils/get-meta';
import { selectCurrentUserId } from './users';

export const makeSelectTaskListById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ TaskList }, id) => {
      const taskListModel = TaskList.withId(id);

      return taskListModel ? taskListModel.ref : taskListModel;
    },
  );

export const selectTaskListById = makeSelectTaskListById();

export const selectFirstTaskListIdByCardId = createSelector(
  orm,
  (_, cardId) => cardId,
  ({ Card }, cardId) => {
    const cardModel = Card.withId(cardId);
    const taskListModel = cardModel && cardModel.getOrderedTaskListsQuerySet().first();

    return taskListModel ? taskListModel.id : null;
  },
);

export const makeSelectTaskById = () =>
  createSelector(
    orm,
    (_, id) => id,
    ({ Task }, id) => {
      const taskModel = Task.withId(id);

      if (!taskModel) {
        return taskModel;
      }

      return {
        ...taskModel.ref,
        ...getMeta(taskModel),
      };
    },
  );

export const selectTaskById = makeSelectTaskById();

export const makeSelectUsersForTaskById = () =>
  createSelector(
    orm,
    (_, id) => id,
    (state) => selectCurrentUserId(state),
    ({ Task }, id, currentUserId) => {
      const taskModel = Task.withId(id);

      if (!taskModel) {
        return taskModel;
      }

      return taskModel.users.toRefArray().sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return a.name.localeCompare(b.name);
      });
    },
  );

export const selectUsersForTaskById = makeSelectUsersForTaskById();

export default {
  selectFirstTaskListIdByCardId,
  makeSelectTaskListById,
  selectTaskListById,
  makeSelectTaskById,
  selectTaskById,
  makeSelectUsersForTaskById,
  selectUsersForTaskById,
};
