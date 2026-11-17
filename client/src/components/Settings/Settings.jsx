import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

import Paths from '../../constants/Paths';
import AboutSettingsContainer from '../../containers/Settings/AboutSettingsContainer';
import AccountSettingsContainer from '../../containers/Settings/AccountSettingsContainer';
import AuthenticationSettingsContainer from '../../containers/Settings/AuthenticationSettingsContainer';
import InstanceSettingsContainer from '../../containers/Settings/InstanceSettingsContainer';
import PreferencesSettingsContainer from '../../containers/Settings/PreferencesSettingsContainer';
import PreferencesSettingsThemeContainer from '../../containers/Settings/PreferencesSettingsThemeContainer';
import ProfileSettingsContainer from '../../containers/Settings/ProfileSettingsContainer';
import ProjectSettingsContainer from '../../containers/Settings/ProjectSettingsContainer';
import UsersSettingsContainer from '../../containers/Settings/UsersSettingsContainer';

import * as s from './Settings.module.scss';

const Settings = React.memo(({ appName, path, isAdmin, isManager }) => {
  const [t] = useTranslation();

  const getPageTitle = useCallback(() => {
    switch (path) {
      case Paths.SETTINGS:
        return `${t('common.settings')} | ${appName}`;
      case Paths.SETTINGS_PROFILE:
        return `${t('common.settingsProfile')} | ${appName}`;
      case Paths.SETTINGS_PREFERENCES:
        return `${t('common.settingsPreferences')} | ${appName}`;
      case Paths.SETTINGS_PREFERENCES_THEME:
        return `${t('common.settingsPreferencesTheme')} | ${appName}`;
      case Paths.SETTINGS_ACCOUNT:
        return `${t('common.settingsAccount')} | ${appName}`;
      case Paths.SETTINGS_AUTHENTICATION:
        return `${t('common.settingsAuthentication')} | ${appName}`;
      case Paths.SETTINGS_ABOUT:
        return `${t('common.settingsAbout')} | ${appName}`;
      case Paths.SETTINGS_INSTANCE:
        return `${t('common.settingsInstance')} | ${appName}`;
      case Paths.SETTINGS_USERS:
        return `${t('common.settingsUsers')} | ${appName}`;
      case Paths.SETTINGS_PROJECT:
        return `${t('common.settingsProject')} | ${appName}`;
      default:
        return appName;
    }
  }, [appName, path, t]);

  useEffect(() => {
    document.title = getPageTitle();
  }, [getPageTitle, path, t]);

  switch (path) {
    case Paths.SETTINGS_PROFILE:
      return <ProfileSettingsContainer />;
    case Paths.SETTINGS_PREFERENCES:
      return <PreferencesSettingsContainer />;
    case Paths.SETTINGS_PREFERENCES_THEME:
      return <PreferencesSettingsThemeContainer />;
    case Paths.SETTINGS_ACCOUNT:
      return <AccountSettingsContainer />;
    case Paths.SETTINGS_AUTHENTICATION:
      return <AuthenticationSettingsContainer />;
    case Paths.SETTINGS_ABOUT:
      return <AboutSettingsContainer />;
    case Paths.SETTINGS_INSTANCE:
      if (!isAdmin) {
        return <h1 className={s.text}>{t('common.cannotEditInstanceSettings')}</h1>;
      }
      return <InstanceSettingsContainer />;
    case Paths.SETTINGS_USERS:
      if (!isAdmin) {
        return <h1 className={s.text}>{t('common.cannotEditUsersSettings')}</h1>;
      }
      return <UsersSettingsContainer />;
    case Paths.SETTINGS_PROJECT:
      if (!isManager) {
        return <h1 className={s.text}>{t('common.projectNotFound', { context: 'title' })}</h1>;
      }
      return <ProjectSettingsContainer />;
    default:
      return null;
  }
});

Settings.propTypes = {
  appName: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  isAdmin: PropTypes.bool.isRequired,
  isManager: PropTypes.bool.isRequired,
};

export default Settings;
