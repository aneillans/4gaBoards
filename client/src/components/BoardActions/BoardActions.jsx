import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import clsx from 'clsx';
import pick from 'lodash/pick';
import PropTypes from 'prop-types';

import { BoardContexts } from '../../constants/Enums';
import Paths from '../../constants/Paths';
import BoardActionsPopup from '../BoardActionsPopup';
import CardSearch from '../CardSearch';
import ConnectionsPopup from '../ConnectionsPopup';
import DeletePopup from '../DeletePopup';
import MembershipPermissionsSelectStep from '../MembershipPermissionsSelectStep';
import Memberships from '../Memberships';
import TrashAutoEmptyPopup from '../TrashAutoEmptyPopup';
import { Icon, IconType, IconSize, Button, ButtonVariant } from '../Utils';
import Filters from './Filters';

import * as gs from '../../global.module.scss';
import * as s from './BoardActions.module.scss';

const BoardActions = React.memo(
  ({
    projectId,
    cardCount,
    isFiltered,
    filteredCardCount,
    memberships,
    boardTemplates,
    allBoardCardAndTaskMemberships,
    labels,
    filterUsers,
    filterLabels,
    allUsers,
    canEdit,
    isProjectManager,
    isAdmin,
    board,
    boardSearchParams,
    boardMembershipId,
    isSubscribed,
    hideCompletedLists,
    mailTokens,
    mailTokenCount,
    mailServiceAvailable,
    mailServiceInboundEmail,
    viewMode,
    trashListId,
    onViewModeChange,
    onMembershipCreate,
    onBoardTemplateCreate,
    onBoardTemplateUpdate,
    onBoardTemplateDelete,
    onMembershipUpdate,
    onMembershipDelete,
    onUserToFilterAdd,
    onUserFromFilterRemove,
    onUserEmailLookup,
    onLabelToFilterAdd,
    onLabelFromFilterRemove,
    onLabelCreate,
    onLabelUpdate,
    onLabelDelete,
    onBoardUpdate,
    onBoardDelete,
    onBoardExport,
    onBoardSearchParamsUpdate,
    onContextChange,
    onTrashEmpty,
    onActivitiesFetch,
    onMailTokenCreate,
    onMailTokenUpdate,
    onMailTokenDelete,
  }) => {
    const [t] = useTranslation();

    const handleConnectionsUpdate = useCallback(
      (data) => {
        onBoardUpdate(board.id, data);
      },
      [board.id, onBoardUpdate],
    );

    const handleToggleSubscriptionClick = useCallback(() => {
      onMembershipUpdate(boardMembershipId, {
        isSubscribed: !isSubscribed,
      });
    }, [boardMembershipId, isSubscribed, onMembershipUpdate]);

    return (
      <div className={clsx(s.wrapper, gs.scrollableX)}>
        <Button variant={ButtonVariant.Icon} title={isSubscribed ? t('common.unsubscribe') : t('common.subscribe')} onClick={handleToggleSubscriptionClick} className={clsx(s.action, s.subscriptionButton)}>
          <Icon type={isSubscribed ? IconType.Bell : IconType.BellEmpty} size={IconSize.Size14} />
        </Button>
        <div title={board.name} className={clsx(s.title, s.action)}>
          {board.name}
        </div>
        <div className={clsx(s.cardsCount, s.action, s.cardsCountAction)}>
          {isFiltered ? t('common.ofCards', { filteredCount: filteredCardCount, count: cardCount }) : t('common.cards', { count: cardCount })}
        </div>
        <div className={s.githubAction}>
          <ConnectionsPopup defaultData={pick(board, ['isGithubConnected', 'githubRepo'])} onUpdate={handleConnectionsUpdate} offset={16}>
            <Icon
              type={IconType.GitHub}
              size={IconSize.Size14}
              className={clsx(board.isGithubConnected ? s.githubGreen : s.githubGrey)}
              title={board.isGithubConnected ? t('common.connectedToGithub', { repo: board.githubRepo }) : t('common.notConnectedToGithub')}
            />
          </ConnectionsPopup>
        </div>
        <div className={s.action}>
          <Memberships
            items={memberships}
            allUsers={allUsers}
            permissionsSelectStep={MembershipPermissionsSelectStep}
            canEdit={isProjectManager}
            canDrag={canEdit}
            onCreate={onMembershipCreate}
            onUpdate={onMembershipUpdate}
            onDelete={onMembershipDelete}
            onUserEmailLookup={onUserEmailLookup}
          />
        </div>
        <div className={clsx(s.action, s.actionFlex)}>
          <CardSearch defaultValue={boardSearchParams?.query} matchCase={boardSearchParams?.matchCase} anyMatch={boardSearchParams?.anyMatch} onBoardSearchParamsUpdate={onBoardSearchParamsUpdate} />
          <Filters
            users={filterUsers}
            labels={filterLabels}
            allBoardMemberships={allBoardCardAndTaskMemberships}
            boardMemberships={memberships}
            boardLabels={labels}
            canEdit={canEdit}
            dueDate={boardSearchParams?.dueDate}
            justSelectedDay={boardSearchParams?.justSelectedDay}
            includeTaskDueDates={boardSearchParams?.includeTaskDueDates}
            onlyWithNotifications={boardSearchParams?.onlyWithNotifications}
            onUserAdd={onUserToFilterAdd}
            onUserRemove={onUserFromFilterRemove}
            onUserEmailLookup={onUserEmailLookup}
            onLabelAdd={onLabelToFilterAdd}
            onLabelRemove={onLabelFromFilterRemove}
            onLabelCreate={onLabelCreate}
            onLabelUpdate={onLabelUpdate}
            onLabelDelete={onLabelDelete}
            onBoardSearchParamsUpdate={onBoardSearchParamsUpdate}
          />
        </div>
        <div className={s.action}>
          <Button variant={ButtonVariant.IconBase} title={t('common.switchToBoardView')} onClick={() => onViewModeChange('board')} className={clsx(s.switchViewButton, viewMode === 'board' && s.active)}>
            <Icon type={IconType.Board} size={IconSize.Size18} />
          </Button>
          <Button variant={ButtonVariant.IconBase} title={t('common.switchToListView')} onClick={() => onViewModeChange('list')} className={clsx(s.switchViewButton, viewMode === 'list' && s.active)}>
            <Icon type={IconType.List} size={IconSize.Size18} />
          </Button>
        </div>
        <div className={s.action}>
          {[
            [BoardContexts.BOARD, IconType.Board, 'common.showBoard'],
            [BoardContexts.ARCHIVE, IconType.Archive, 'common.showArchive'],
            [BoardContexts.TRASH, IconType.Trash, 'common.showTrash'],
          ].map(([context, iconType, titleKey]) => (
            <Button key={context} variant={ButtonVariant.IconBase} title={t(titleKey)} onClick={() => onContextChange(context)} className={clsx(s.switchViewButton, board.context === context && s.active)}>
              <Icon type={iconType} size={IconSize.Size16} />
            </Button>
          ))}
        </div>
        {board.context === BoardContexts.TRASH && canEdit && trashListId && cardCount > 0 && (
          <div className={s.action}>
            <DeletePopup title={t('common.emptyTrash')} content={t('common.areYouSureYouWantToEmptyTrash')} buttonContent={t('common.emptyTrash')} onConfirm={() => onTrashEmpty(trashListId)} position="bottom">
              <Button variant={ButtonVariant.Icon} title={t('common.emptyTrash')} className={s.emptyTrashButton}>
                {t('common.emptyTrash')}
              </Button>
            </DeletePopup>
          </div>
        )}
        {board.context === BoardContexts.TRASH && isProjectManager && (
          <div className={s.action}>
            <TrashAutoEmptyPopup defaultDays={board.trashAutoEmptyDays ?? null} onUpdate={(data) => onBoardUpdate(board.id, data)} position="bottom">
              <Button
                variant={ButtonVariant.Icon}
                title={board.trashAutoEmptyDays ? t('common.trashEmptiesAfterDays', { days: board.trashAutoEmptyDays }) : t('common.emptyTrashAutomatically')}
                className={s.trashAutoEmptyButton}
              >
                <Icon type={IconType.Settings} size={IconSize.Size16} />
                {board.trashAutoEmptyDays ? <span className={s.trashAutoEmptyDays}>{t('common.trashEmptiesAfterDays', { days: board.trashAutoEmptyDays })}</span> : null}
              </Button>
            </TrashAutoEmptyPopup>
          </div>
        )}
        {isProjectManager && (
          <div className={clsx(s.action, s.actionRightFirst)}>
            <Link to={Paths.SETTINGS_PROJECT.replace(':id', projectId)}>
              <Button variant={ButtonVariant.Icon} title={t('common.projectSettings')}>
                <Icon type={IconType.ProjectSettings} size={IconSize.Size18} />
              </Button>
            </Link>
          </div>
        )}

        <div className={clsx(s.action, !isProjectManager && s.actionRightFirst)}>
          <BoardActionsPopup
            activities={board.activities}
            isActivitiesFetching={board.isActivitiesFetching}
            isAllActivitiesFetched={board.isAllActivitiesFetched}
            lastActivityId={board.lastActivityId}
            defaultDataRename={pick(board, 'name')}
            defaultDataGithub={pick(board, ['isGithubConnected', 'githubRepo'])}
            createdAt={board.createdAt}
            createdBy={board.createdBy}
            updatedAt={board.updatedAt}
            updatedBy={board.updatedBy}
            memberships={board.memberships}
            templates={boardTemplates}
            isProjectManager={isProjectManager}
            canEdit={canEdit}
            mailTokens={mailTokens}
            mailTokenCount={mailTokenCount}
            mailServiceAvailable={mailServiceAvailable}
            mailServiceInboundEmail={mailServiceInboundEmail}
            boardName={board.name}
            isAdmin={isAdmin}
            boardMembershipId={boardMembershipId}
            hideCompletedLists={hideCompletedLists}
            onMembershipUpdate={onMembershipUpdate}
            onUpdate={(data) => onBoardUpdate(board.id, data)}
            onExport={(data) => onBoardExport(board.id, data)}
            onDelete={() => onBoardDelete(board.id)}
            onActivitiesFetch={onActivitiesFetch}
            onMailTokenCreate={onMailTokenCreate}
            onMailTokenUpdate={onMailTokenUpdate}
            onMailTokenDelete={onMailTokenDelete}
            onTemplateCreate={(data) => onBoardTemplateCreate(board.id, data)}
            onTemplateUpdate={onBoardTemplateUpdate}
            onTemplateDelete={onBoardTemplateDelete}
            position="right-start"
            offset={10}
            hideCloseButton
          >
            <Button variant={ButtonVariant.Icon} title={t('common.editBoard', { context: 'title' })}>
              <Icon type={IconType.EllipsisVertical} size={IconSize.Size18} />
            </Button>
          </BoardActionsPopup>
        </div>
        <div className={clsx(s.action, s.actionRightLast)}>
          <Link to={Paths.PROJECTS.replace(':id', projectId)}>
            <Button variant={ButtonVariant.Icon} title={t('common.backToProject')}>
              <Icon type={IconType.ArrowLeftBig} size={IconSize.Size18} />
            </Button>
          </Link>
        </div>
      </div>
    );
  },
);

BoardActions.propTypes = {
  projectId: PropTypes.string.isRequired,
  cardCount: PropTypes.number.isRequired,
  isFiltered: PropTypes.bool.isRequired,
  filteredCardCount: PropTypes.number.isRequired,
  memberships: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  boardTemplates: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  allBoardCardAndTaskMemberships: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  labels: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  filterUsers: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  filterLabels: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  allUsers: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  canEdit: PropTypes.bool.isRequired,
  isProjectManager: PropTypes.bool.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  board: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  boardSearchParams: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  boardMembershipId: PropTypes.string.isRequired,
  isSubscribed: PropTypes.bool.isRequired,
  hideCompletedLists: PropTypes.bool.isRequired,
  mailTokens: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  mailTokenCount: PropTypes.number.isRequired,
  mailServiceAvailable: PropTypes.bool.isRequired,
  mailServiceInboundEmail: PropTypes.string.isRequired,
  viewMode: PropTypes.string.isRequired,
  trashListId: PropTypes.string,
  onContextChange: PropTypes.func.isRequired,
  onTrashEmpty: PropTypes.func.isRequired,
  onViewModeChange: PropTypes.func.isRequired,
  onMembershipCreate: PropTypes.func.isRequired,
  onBoardTemplateCreate: PropTypes.func.isRequired,
  onBoardTemplateUpdate: PropTypes.func.isRequired,
  onBoardTemplateDelete: PropTypes.func.isRequired,
  onMembershipUpdate: PropTypes.func.isRequired,
  onMembershipDelete: PropTypes.func.isRequired,
  onUserToFilterAdd: PropTypes.func.isRequired,
  onUserFromFilterRemove: PropTypes.func.isRequired,
  onUserEmailLookup: PropTypes.func.isRequired,
  onLabelToFilterAdd: PropTypes.func.isRequired,
  onLabelFromFilterRemove: PropTypes.func.isRequired,
  onLabelCreate: PropTypes.func.isRequired,
  onLabelUpdate: PropTypes.func.isRequired,
  onLabelDelete: PropTypes.func.isRequired,
  onBoardUpdate: PropTypes.func.isRequired,
  onBoardDelete: PropTypes.func.isRequired,
  onBoardExport: PropTypes.func.isRequired,
  onBoardSearchParamsUpdate: PropTypes.func.isRequired,
  onActivitiesFetch: PropTypes.func.isRequired,
  onMailTokenCreate: PropTypes.func.isRequired,
  onMailTokenUpdate: PropTypes.func.isRequired,
  onMailTokenDelete: PropTypes.func.isRequired,
};

BoardActions.defaultProps = {
  trashListId: null,
};

export default BoardActions;
