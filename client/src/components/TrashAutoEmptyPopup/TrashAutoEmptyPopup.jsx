import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

import { Button, ButtonVariant, Checkbox, Form, Input, InputVariant, Popup, withPopup } from '../Utils';

import * as gs from '../../global.module.scss';
import * as s from './TrashAutoEmptyPopup.module.scss';

const DEFAULT_DAYS = 30;
const MAX_DAYS = 3650;

const TrashAutoEmptyStep = React.memo(({ defaultDays, onUpdate, onClose }) => {
  const [t] = useTranslation();
  const [isEnabled, setIsEnabled] = useState(defaultDays !== null);
  const [days, setDays] = useState(String(defaultDays ?? DEFAULT_DAYS));
  const [isError, setIsError] = useState(false);

  const handleSubmit = useCallback(() => {
    const parsedDays = Number(days);
    const nextDays = isEnabled ? parsedDays : null;

    if (isEnabled && (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > MAX_DAYS)) {
      setIsError(true);
      return;
    }

    if (nextDays !== defaultDays) {
      onUpdate({ trashAutoEmptyDays: nextDays });
    }
    onClose();
  }, [days, defaultDays, isEnabled, onClose, onUpdate]);

  const handleDaysChange = useCallback((e) => {
    setIsError(false);
    setDays(e.target.value);
  }, []);

  return (
    <>
      <Popup.Header>{t('common.emptyTrashAutomatically')}</Popup.Header>
      <Popup.Content>
        <Form>
          <div className={s.wrapper}>
            <Checkbox checked={isEnabled} label={t('common.emptyTrashAutomatically')} onChange={() => setIsEnabled(!isEnabled)} />
            {isEnabled && (
              <div className={s.days}>
                <Input variant={InputVariant.Default} type="number" min={1} max={MAX_DAYS} name="days" value={days} className={s.daysInput} isError={isError} onChange={handleDaysChange} />
                <span>{t('common.daysInTrash')}</span>
              </div>
            )}
          </div>
          <div className={gs.controls}>
            <Button variant={ButtonVariant.Submit} content={t('common.save')} onClick={handleSubmit} />
          </div>
        </Form>
      </Popup.Content>
    </>
  );
});

TrashAutoEmptyStep.propTypes = {
  defaultDays: PropTypes.number,
  onUpdate: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

TrashAutoEmptyStep.defaultProps = {
  defaultDays: null,
};

export default withPopup(TrashAutoEmptyStep);
