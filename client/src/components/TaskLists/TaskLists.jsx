import React, { useCallback, useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

import RenameStep from '../RenameStep';
import Tasks from '../Tasks';
import { Button, ButtonVariant, Icon, IconSize, IconType, withPopup } from '../Utils';
import TaskListActionsPopup from './TaskListActionsPopup';

import * as s from './TaskLists.module.scss';

const TaskListAddPopup = withPopup(RenameStep);

// Planka-style task lists in the card modal: each named list with its own tasks and options
const TaskLists = React.forwardRef(({ cardId, cardName, taskLists, canEdit, onTaskCreate, onTaskMove, onTaskListCreate, onTaskListUpdate, onTaskListDelete, ...tasksProps }, ref) => {
  const [t] = useTranslation();
  const firstTasksRef = useRef(null);
  const addTaskListRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      // The modal's "add task" button adds to the first list, or starts a list when there is none
      openTaskAdd: () => {
        if (firstTasksRef.current) {
          firstTasksRef.current.openTaskAdd();
        } else {
          addTaskListRef.current?.click();
        }
      },
    }),
    [],
  );

  const getName = useCallback((name) => (name.startsWith('common.') ? t(name) : name), [t]);

  return (
    <div>
      {taskLists.map((taskList, index) => {
        const completedCount = taskList.tasks.filter((task) => task.isCompleted).length;
        const visibleTasks = taskList.hideCompletedTasks ? taskList.tasks.filter((task) => !task.isCompleted) : taskList.tasks;
        const hiddenCount = taskList.tasks.length - visibleTasks.length;

        return (
          <div key={taskList.id} className={s.taskList}>
            <div className={s.taskListHeader}>
              <span className={s.taskListName} title={getName(taskList.name)}>
                {getName(taskList.name)}
              </span>
              {taskList.tasks.length > 0 && (
                <span className={s.taskListCount}>
                  ({completedCount}/{taskList.tasks.length})
                </span>
              )}
              {hiddenCount > 0 && <span className={s.hiddenCount}>{t('common.completedTasksHidden', { hidden: hiddenCount })}</span>}
              {canEdit && taskList.isPersisted && (
                <TaskListActionsPopup
                  name={getName(taskList.name)}
                  showOnFrontOfCard={taskList.showOnFrontOfCard}
                  hideCompletedTasks={taskList.hideCompletedTasks}
                  onUpdate={(data) => onTaskListUpdate(taskList.id, data)}
                  onDelete={() => onTaskListDelete(taskList.id)}
                  position="left-start"
                  hideCloseButton
                >
                  <Button variant={ButtonVariant.Icon} title={t('common.editTaskList')}>
                    <Icon type={IconType.EllipsisVertical} size={IconSize.Size13} />
                  </Button>
                </TaskListActionsPopup>
              )}
            </div>
            <Tasks
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...tasksProps}
              ref={index === 0 ? firstTasksRef : undefined}
              variant="cardModal"
              cardId={cardId}
              dndScopeId={taskList.id}
              cardName={cardName}
              items={visibleTasks}
              canEdit={canEdit && taskList.isPersisted}
              onCreate={(data) => onTaskCreate({ ...data, taskListId: taskList.id })}
              onMove={(taskId, taskIndex) => onTaskMove(taskId, taskIndex, taskList.id)}
            />
          </div>
        );
      })}
      {canEdit && (
        <TaskListAddPopup title={t('common.addTaskList')} defaultData={{ name: '' }} placeholder={t('common.enterTaskListName')} onUpdate={(data) => onTaskListCreate(cardId, data)}>
          <Button ref={addTaskListRef} variant={ButtonVariant.Default} title={t('common.addTaskList')} className={s.addTaskList}>
            <Icon type={IconType.Plus} size={IconSize.Size10} className={s.icon} />
            {t('common.addTaskList')}
          </Button>
        </TaskListAddPopup>
      )}
    </div>
  );
});

TaskLists.propTypes = {
  cardId: PropTypes.string.isRequired,
  cardName: PropTypes.string.isRequired,
  taskLists: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  canEdit: PropTypes.bool.isRequired,
  onTaskCreate: PropTypes.func.isRequired,
  onTaskMove: PropTypes.func.isRequired,
  onTaskListCreate: PropTypes.func.isRequired,
  onTaskListUpdate: PropTypes.func.isRequired,
  onTaskListDelete: PropTypes.func.isRequired,
};

export default TaskLists;
