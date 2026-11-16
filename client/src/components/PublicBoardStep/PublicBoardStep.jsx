import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

import Paths from '../../constants/Paths';
import { Button, ButtonVariant, Checkbox, Form, Icon, IconSize, IconType, Popup } from '../Utils';

import * as gs from '../../global.module.scss';
import * as s from './PublicBoardStep.module.scss';

const FACETS = [
  ['publicShowMembers', 'common.members'],
  ['publicShowComments', 'common.comments'],
  ['publicShowActivity', 'common.activity'],
  ['publicShowAttachments', 'common.attachments'],
];

// Changes apply immediately, like the other board toggles; the public link comes back from the
// server once the board has been made public
const PublicBoardStep = React.memo(({ defaultData, onUpdate, onBack, onClose }) => {
  const [t] = useTranslation();

  const publicUrl = defaultData.isPublic && defaultData.publicId ? `${window.location.origin}${Paths.PUBLIC_BOARDS.replace(':publicId', defaultData.publicId)}` : null;

  const handleToggle = useCallback(
    (name) => () => {
      onUpdate({ [name]: !defaultData[name] });
    },
    [defaultData, onUpdate],
  );

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(publicUrl);
    onClose();
  }, [onClose, publicUrl]);

  return (
    <>
      <Popup.Header onBack={onBack}>{t('common.publicBoard', { context: 'title' })}</Popup.Header>
      <Popup.Content>
        <Form>
          <div className={s.wrapper}>
            <Checkbox checked={!!defaultData.isPublic} label={t('common.publicBoardEnable')} onChange={handleToggle('isPublic')} wrapperClassName={s.checkboxWrapper} />
            {defaultData.isPublic && (
              <>
                <div className={s.subheader}>{t('common.publicBoardShow')}</div>
                {FACETS.map(([name, labelKey]) => (
                  <Checkbox key={name} checked={!!defaultData[name]} label={t(labelKey)} onChange={handleToggle(name)} wrapperClassName={s.indented} />
                ))}
              </>
            )}
          </div>
          {publicUrl && (
            <div className={gs.controls}>
              <Button variant={ButtonVariant.Submit} title={publicUrl} className={s.copyButton} onClick={handleCopyLink}>
                <Icon type={IconType.Link} size={IconSize.Size13} />
                {t('common.copyPublicLink')}
              </Button>
            </div>
          )}
        </Form>
      </Popup.Content>
    </>
  );
});

PublicBoardStep.propTypes = {
  defaultData: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  onUpdate: PropTypes.func.isRequired,
  onBack: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

PublicBoardStep.defaultProps = {
  onBack: undefined,
};

export default PublicBoardStep;
