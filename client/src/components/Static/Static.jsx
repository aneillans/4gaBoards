import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import PropTypes from 'prop-types';

import Paths from '../../constants/Paths';
import BoardContainer from '../../containers/BoardContainer';
import NotificationCenterContainer from '../../containers/NotificationCenterContainer';
import ProjectContainer from '../../containers/ProjectContainer';
import ProjectsContainer from '../../containers/ProjectsContainer';
import SettingsContainer from '../../containers/Settings/SettingsContainer';
import SidebarContainer from '../../containers/SidebarContainer';
import { isPublicView } from '../../utils/public-board';
import { Loader, LoaderSize } from '../Utils';

import * as s from './Static.module.scss';

// Public boards are shown on their own, without the projects sidebar of the signed-in app
// eslint-disable-next-line react/prop-types
function PublicFrame({ children }) {
  return <div className={s.publicContent}>{children}</div>;
}

function Static({ path, projectId, cardId, board, hasBackground }) {
  const [t] = useTranslation();
  const Frame = isPublicView() ? PublicFrame : SidebarContainer;
  if (
    [
      Paths.SETTINGS,
      Paths.SETTINGS_PROFILE,
      Paths.SETTINGS_PREFERENCES,
      Paths.SETTINGS_PREFERENCES_THEME,
      Paths.SETTINGS_ACCOUNT,
      Paths.SETTINGS_AUTHENTICATION,
      Paths.SETTINGS_ABOUT,
      Paths.SETTINGS_INSTANCE,
      Paths.SETTINGS_USERS,
      Paths.SETTINGS_PROJECT,
    ].includes(path)
  ) {
    return (
      <div className={s.wrapper}>
        <Frame settingsOnly={path !== Paths.SETTINGS_PROJECT}>
          <SettingsContainer />
        </Frame>
      </div>
    );
  }

  if (path === Paths.NOTIFICATIONS) {
    return (
      <div className={s.wrapper}>
        <Frame>
          <NotificationCenterContainer />
        </Frame>
      </div>
    );
  }

  if (projectId === undefined) {
    return (
      <div className={s.wrapper}>
        <Frame>
          <ProjectsContainer />
        </Frame>
      </div>
    );
  }

  if (cardId === null) {
    return (
      <div className={s.wrapper}>
        <Frame>
          <div className={s.message}>
            <h1>{t('common.cardNotFound', { context: 'title' })}</h1>
          </div>
        </Frame>
      </div>
    );
  }

  if (board === null) {
    return (
      <div className={s.wrapper}>
        <Frame>
          <div className={s.message}>
            <h1>{t('common.boardNotFound', { context: 'title' })}</h1>
          </div>
        </Frame>
      </div>
    );
  }

  if (projectId === null) {
    return (
      <div className={s.wrapper}>
        <Frame>
          <div className={s.message}>
            <h1>{t('common.projectNotFound', { context: 'title' })}</h1>
          </div>
        </Frame>
      </div>
    );
  }

  if (board === undefined) {
    return (
      <div className={s.wrapper}>
        <Frame>
          <ProjectContainer />
        </Frame>
      </div>
    );
  }

  if (board.isFetching) {
    return (
      <div className={s.wrapper}>
        <Frame>
          <Loader size={LoaderSize.Massive} />
        </Frame>
      </div>
    );
  }

  // The project background (drawn by Core behind everything) shows through the board
  return (
    <div className={clsx(s.wrapper, hasBackground && s.wrapperWithBackground)}>
      <Frame>
        <BoardContainer />
      </Frame>
    </div>
  );
}

Static.propTypes = {
  path: PropTypes.string.isRequired,
  projectId: PropTypes.string,
  cardId: PropTypes.string,
  board: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  hasBackground: PropTypes.bool.isRequired,
};

Static.defaultProps = {
  projectId: undefined,
  cardId: undefined,
  board: undefined,
};

export default Static;
