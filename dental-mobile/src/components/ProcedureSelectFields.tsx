import React, { useState } from 'react';
import Input from './Input';
import SelectSheet from './SelectSheet';
import { SelectField } from './FormSection';
import { formInputWrap } from './FormScreenLayout';
import {
  getProcedureOptionsForPicker,
  OTHER_PROCEDURE,
} from '../constants/treatmentProcedures';

type Props = {
  procedureChoice: string;
  procedureCustom: string;
  onProcedureChoiceChange: (value: string) => void;
  onProcedureCustomChange: (value: string) => void;
  procedureError?: string;
  customError?: string;
};

export default function ProcedureSelectFields({
  procedureChoice,
  procedureCustom,
  onProcedureChoiceChange,
  onProcedureCustomChange,
  procedureError,
  customError,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const showCustom = procedureChoice === OTHER_PROCEDURE;

  const selectLabel =
    procedureChoice === OTHER_PROCEDURE && procedureCustom.trim()
      ? `Other — ${procedureCustom.trim()}`
      : procedureChoice;

  return (
    <>
      <SelectField
        label="Procedure *"
        value={selectLabel}
        placeholder="Select procedure"
        error={procedureError}
        onPress={() => setSheetOpen(true)}
      />
      {showCustom ? (
        <Input
          label="Procedure name *"
          value={procedureCustom}
          onChangeText={onProcedureCustomChange}
          placeholder="e.g. Sinus lift, Bone graft"
          error={customError}
          containerStyle={formInputWrap.tight}
        />
      ) : null}
      <SelectSheet
        visible={sheetOpen}
        title="Procedure"
        options={getProcedureOptionsForPicker().map((p) => ({ value: p, label: p }))}
        selectedValue={procedureChoice}
        onSelect={(v) => {
          onProcedureChoiceChange(v);
          if (v !== OTHER_PROCEDURE) onProcedureCustomChange('');
        }}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
