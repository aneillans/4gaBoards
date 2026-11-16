import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dequal } from 'dequal';
import pickBy from 'lodash/pickBy';
import PropTypes from 'prop-types';

import { useForm } from '../../../hooks';
import { Button, ButtonVariant, Form, Input, InputVariant, TextArea, TextAreaVariant } from '../../Utils';

import * as gs from '../../../global.module.scss';
import * as s from './InformationEdit.module.scss';

const InformationEdit = React.memo(({ defaultData, onUpdate }) => {
  const [t] = useTranslation();
  const [isError, setIsError] = useState(false);

  const [data, handleFieldChange, setData] = useForm(() => ({
    name: '',
    description: '',
    ...pickBy(defaultData),
  }));

  const cleanData = useMemo(
    () => ({
      ...data,
      name: data.name.trim(),
      description: data.description.trim(),
    }),
    [data],
  );

  const nameField = useRef(null);

  const handleSubmit = useCallback(() => {
    if (!cleanData.name) {
      nameField.current?.focus();
      setIsError(true);
      return;
    }

    onUpdate(cleanData);
  }, [onUpdate, cleanData]);

  const handleFieldKeyDown = useCallback(() => {
    setIsError(false);
  }, []);

  useEffect(() => {
    setData({
      name: '',
      description: '',
      ...pickBy(defaultData),
    });
  }, [defaultData, setData]);

  return (
    <Form>
      <div className={s.text}>{t('common.name')}</div>
      <Input
        ref={nameField}
        variant={InputVariant.Default}
        name="name"
        placeholder={t('common.enterProjectName')}
        value={data.name}
        onKeyDown={handleFieldKeyDown}
        onChange={handleFieldChange}
        isError={isError}
      />
      <div className={s.text}>{t('common.description')}</div>
      <TextArea
        variant={TextAreaVariant.FullWidth}
        name="description"
        placeholder={t('common.enterProjectDescription')}
        value={data.description}
        minRows={2}
        maxRows={8}
        maxLength={4096}
        onChange={handleFieldChange}
      />
      <div className={gs.controls}>
        <Button variant={ButtonVariant.Submit} content={t('common.save')} disabled={dequal(cleanData, defaultData)} onClick={handleSubmit} />
      </div>
    </Form>
  );
});

InformationEdit.propTypes = {
  defaultData: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  onUpdate: PropTypes.func.isRequired,
};

export default InformationEdit;
