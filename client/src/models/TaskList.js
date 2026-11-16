import { attr, fk } from 'redux-orm';

import ActionTypes from '../constants/ActionTypes';
import BaseModel from './BaseModel';

export default class extends BaseModel {
  static modelName = 'TaskList';

  static fields = {
    id: attr(),
    position: attr(),
    name: attr(),
    showOnFrontOfCard: attr({
      getDefault: () => true,
    }),
    hideCompletedTasks: attr({
      getDefault: () => false,
    }),
    cardId: fk({
      to: 'Card',
      as: 'card',
      relatedName: 'taskLists',
    }),
  };

  static reducer({ type, payload }, TaskList) {
    switch (type) {
      case ActionTypes.TASK_LISTS_RECEIVE:
        payload.taskLists.forEach((taskList) => {
          TaskList.upsert(taskList);
        });

        break;
      case ActionTypes.TASK_LIST_CREATE:
      case ActionTypes.TASK_LIST_CREATE_HANDLE:
      case ActionTypes.TASK_LIST_UPDATE__SUCCESS:
      case ActionTypes.TASK_LIST_UPDATE_HANDLE:
        TaskList.upsert(payload.taskList);

        break;
      case ActionTypes.TASK_LIST_CREATE__SUCCESS:
        TaskList.withId(payload.localId)?.delete();
        TaskList.upsert(payload.taskList);

        break;
      case ActionTypes.TASK_LIST_CREATE__FAILURE:
        TaskList.withId(payload.localId)?.delete();

        break;
      case ActionTypes.TASK_LIST_UPDATE:
        TaskList.withId(payload.id)?.update(payload.data);

        break;
      case ActionTypes.TASK_LIST_UPDATE__FAILURE:
        if (payload.prevData) {
          TaskList.withId(payload.id)?.update(payload.prevData);
        }

        break;
      case ActionTypes.TASK_LIST_DELETE:
        TaskList.withId(payload.id)?.deleteWithRelated();

        break;
      case ActionTypes.TASK_LIST_DELETE__SUCCESS:
      case ActionTypes.TASK_LIST_DELETE_HANDLE:
        TaskList.withId(payload.taskList.id)?.deleteWithRelated();

        break;
      default:
    }
  }

  getOrderedTasksQuerySet() {
    return this.tasks.orderBy('position');
  }

  deleteWithRelated() {
    this.getOrderedTasksQuerySet()
      .toModelArray()
      .forEach((taskModel) => taskModel.deleteWithRelated());

    this.delete();
  }
}
