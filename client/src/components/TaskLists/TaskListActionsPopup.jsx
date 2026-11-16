import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

import { useSteps } from '../../hooks';
import DeleteStep from '../DeleteStep';
import RenameStep from '../RenameStep';
import { Button, ButtonVariant, Icon, IconSize, IconType, Popup, withPopup } from '../Utils';

import * as s from './TaskLists.module.scss';

const StepTypes = {
  RENAME: 'RENAME',
  DELETE: 'DELETE',
};

const TaskListActionsStep = React.memo(({ name, showOnFrontOfCard, hideCompletedTasks, onUpdate, onDelete, onClose }) => {
  const [t] = useTranslation();
  const [step, openStep, handleBack] = useSteps();

  const handleToggle = useCallback(
    (field, value) => () => {
      onUpdate({ [field]: !value });
      onClose();
    },
    [onClose, onUpdate],
  );

  if (step) {
    switch (step.type) {
      case StepTypes.RENAME:
        return <RenameStep title={t('common.renameTaskList')} defaultData={{ name }} placeholder={t('common.enterTaskListName')} onUpdate={onUpdate} onBack={handleBack} onClose={onClose} />;
      case StepTypes.DELETE:
        return (
          <DeleteStep
            title={t('common.deleteTaskList')}
            content={t('common.areYouSureYouWantToDeleteThisTaskList')}
            buttonContent={t('common.deleteTaskList')}
            onConfirm={() => {
              onDelete();
              onClose();
            }}
            onBack={handleBack}
          />
        );
      default:
    }
  }

  return (
    <>
      <Button variant={ButtonVariant.PopupContext} title={t('common.renameTaskList')} onClick={() => openStep(StepTypes.RENAME)}>
        <Icon type={IconType.Pencil} size={IconSize.Size13} className={s.icon} />
        {t('common.renameTaskList')}
      </Button>
      <Button variant={ButtonVariant.PopupContext} title={t('common.showOnFrontOfCard')} onClick={handleToggle('showOnFrontOfCard', showOnFrontOfCard)}>
        <Icon type={showOnFrontOfCard ? IconType.Check : IconType.Minus} size={IconSize.Size13} className={s.icon} />
        {t('common.showOnFrontOfCard')}
      </Button>
      <Button variant={ButtonVariant.PopupContext} title={t('common.hideCompletedTasks')} onClick={handleToggle('hideCompletedTasks', hideCompletedTasks)}>
        <Icon type={hideCompletedTasks ? IconType.Check : IconType.Minus} size={IconSize.Size13} className={s.icon} />
        {t('common.hideCompletedTasks')}
      </Button>
      <Popup.Separator />
      <Button variant={ButtonVariant.PopupContext} title={t('common.deleteTaskList')} onClick={() => openStep(StepTypes.DELETE)}>
        <Icon type={IconType.Trash} size={IconSize.Size13} className={s.icon} />
        {t('common.deleteTaskList')}
      </Button>
    </>
  );
});

TaskListActionsStep.propTypes = {
  name: PropTypes.string.isRequired,
  showOnFrontOfCard: PropTypes.bool.isRequired,
  hideCompletedTasks: PropTypes.bool.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default withPopup(TaskListActionsStep);
