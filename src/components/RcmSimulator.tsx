import React, { useState } from 'react';
import { Instrument, DataPoint, CalibrationSession } from '../types/schema';
import { executeRcmDecisionEngine } from '../utils/rcmEngine';
import { calculateSpan, calculateError, calculateErrorPercent, calculateDrift, calculateDriftPercent } from '../utils/metrology';
import { CustomSelect, SelectOption } from './ui/CustomSelect';
import { CustomToggle } from './ui/CustomToggle';
import { useLanguage } from '../context/LanguageContext';
import { 
  ArrowRight,
  GitBranch
} from 'lucide-react';

interface RcmSimulatorProps {
  instruments: Instrument[];
}

export const RcmSimulator: React.FC<RcmSimulatorProps> = React.memo(({ instruments }) => {
  const { language, t } = useLanguage();
  const [selectedInstIndex, setSelectedInstIndex] = useState<number>(0);
  const currentInst = instruments[selectedInstIndex] || instruments[0];

  const [isFunctional, setIsFunctional] = useState<boolean>(currentInst?.rcm_profile.is_functional ?? false);
  const [triggersOperatorAction, setTriggersOperatorAction] = useState<boolean>(currentInst?.rcm_profile.triggers_operator_action ?? true);
  const [isRedundant, setIsRedundant] = useState<boolean>(currentInst?.rcm_profile.is_redundant ?? false);
  const [indicationComparison, setIndicationComparison] = useState<boolean>(currentInst?.rcm_profile.indication_comparison_possible ?? false);
  const [acceptableDrift, setAcceptableDrift] = useState<boolean>(currentInst?.rcm_profile.acceptable_drift_consequence ?? false);
  const [currentInterval, setCurrentInterval] = useState<number>(currentInst?.current_interval_months ?? 12);
  const [asLeftAdjusted, setAsLeftAdjusted] = useState<boolean>(false);
  const [driftScenario, setDriftScenario] = useState<'stable' | 'moderate' | 'out_of_tolerance' | 'repeat_fail'>('stable');

  const instrumentOptions: SelectOption[] = instruments.map((inst, idx) => ({
    value: String(idx),
    label: `${inst.tag_number} - ${inst.description.slice(0, 25)}`,
    sublabel: `${inst.process_variable} (${inst.range_min}~${inst.range_max} ${inst.engineering_unit})`
  }));

  const handleInstrumentChange = (val: string) => {
    const index = Number(val);
    setSelectedInstIndex(index);
    const inst = instruments[index];
    if (inst) {
      setIsFunctional(inst.rcm_profile.is_functional);
      setTriggersOperatorAction(inst.rcm_profile.triggers_operator_action);
      setIsRedundant(inst.rcm_profile.is_redundant);
      setIndicationComparison(inst.rcm_profile.indication_comparison_possible);
      setAcceptableDrift(inst.rcm_profile.acceptable_drift_consequence);
      setCurrentInterval(inst.current_interval_months);
    }
  };

  const span = calculateSpan(currentInst.range_min, currentInst.range_max);
  const generateSimulatedPoints = (): DataPoint[] => {
    const percentages = [0, 25, 50, 75, 100];
    return percentages.map(pct => {
      const standardInput = currentInst.range_min + (span * (pct / 100));
      let errorOffset = 0;
      let prevErrorOffset = 0;

      if (driftScenario === 'stable') {
        errorOffset = span * 0.0008;
        prevErrorOffset = span * 0.0006;
      } else if (driftScenario === 'moderate') {
        errorOffset = span * 0.0022;
        prevErrorOffset = span * 0.0010;
      } else if (driftScenario === 'out_of_tolerance') {
        errorOffset = span * 0.008;
        prevErrorOffset = span * 0.001;
      } else if (driftScenario === 'repeat_fail') {
        errorOffset = span * 0.015;
        prevErrorOffset = span * 0.012;
      }

      const reading = standardInput + errorOffset;
      const error = calculateError(reading, standardInput);
      const errorPct = calculateErrorPercent(error, span);
      const drift = calculateDrift(error, prevErrorOffset);
      const driftPct = calculateDriftPercent(drift, span);

      return {
        percent_span: pct,
        standard_input: Number(standardInput.toFixed(3)),
        as_found_reading: Number(reading.toFixed(3)),
        as_found_error: error,
        as_found_error_percent: errorPct,
        as_left_reading: asLeftAdjusted ? standardInput : null,
        as_left_error: asLeftAdjusted ? 0 : null,
        as_left_error_percent: asLeftAdjusted ? 0 : null,
        previous_error: prevErrorOffset,
        calculated_drift: drift,
        calculated_drift_percent: driftPct
      };
    });
  };

  const simulatedPoints = generateSimulatedPoints();

  const simulatedInstrument: Instrument = {
    ...currentInst,
    current_interval_months: currentInterval,
    rcm_profile: {
      is_functional: isFunctional,
      triggers_operator_action: triggersOperatorAction,
      is_redundant: isRedundant,
      indication_comparison_possible: indicationComparison,
      acceptable_drift_consequence: acceptableDrift,
      final_classification: 'Critical'
    }
  };

  const simulatedSession: CalibrationSession = {
    calibration_id: 999,
    calibration_date: new Date().toISOString().split('T')[0],
    technician_name: 'Simulasi Metrologi',
    calibrator_standard_id: 'CAL-STD-SIM',
    calibration_type: 'Field',
    environment_temperature: 24.0,
    environment_humidity: 55.0,
    as_found_status: driftScenario === 'out_of_tolerance' || driftScenario === 'repeat_fail' ? 'Fail' : 'Pass',
    as_left_status: asLeftAdjusted ? 'Adjusted' : 'Not Adjusted',
    decision_action: 'MAINTAIN',
    previous_interval_months: currentInterval,
    recommended_interval_months: currentInterval,
    notes: 'Sesi simulasi',
    data_points: simulatedPoints
  };

  const historicalSessions: CalibrationSession[] = driftScenario === 'repeat_fail' 
    ? [{ ...simulatedSession, calibration_id: 998, as_found_status: 'Fail' }] 
    : [];

  const decisionResult = executeRcmDecisionEngine(simulatedInstrument, simulatedSession, historicalSessions);

  const getDecisionBadgeStyle = (dec: string) => {
    switch (dec) {
      case 'EXTEND':
        return 'bg-[#E8F4F0] text-[#357F6B] border border-[#357F6B]/30';
      case 'SHORTEN':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'RUN-TO-FAILURE':
        return 'bg-[#F6B738]/20 text-[#B87A0B] border border-[#F6B738]/40';
      case 'MAINTAIN':
      default:
        return 'bg-[#357F6B] text-white';
    }
  };

  return (
    <div className="space-y-4 animate-fade-in w-full">
      {/* Header Bar */}
      <div className="ref-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8F4F0] flex items-center justify-center text-[#357F6B] shrink-0">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#192E27] uppercase tracking-wide">
                {t.rcmSimulator.title}
              </h2>
              <span className="text-[10px] font-mono font-bold bg-[#E8F4F0] text-[#357F6B] px-2.5 py-0.5 rounded-full border border-[#357F6B]/20">
                Neil Bloom RCM Logic
              </span>
            </div>
            <p className="text-xs text-[#769188] font-normal">
              {t.rcmSimulator.subtitle}
            </p>
          </div>
        </div>

        <div className="w-72">
          <CustomSelect
            value={String(selectedInstIndex)}
            onChange={handleInstrumentChange}
            options={instrumentOptions}
          />
        </div>
      </div>

      {/* Main Grid: Left Controls (5 cols) & Right Output (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Skenario Drift */}
          <div className="ref-card p-5 space-y-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#769188] block">
              {language === 'en' ? 'Field Drift Scenario' : 'Skenario Kondisi Lapangan'}
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDriftScenario('stable')}
                className={`p-3 rounded-2xl text-left text-xs border transition ${
                  driftScenario === 'stable'
                    ? 'bg-[#357F6B] border-[#357F6B] text-white shadow-soft'
                    : 'bg-[#E8F4F0]/50 border-[#E4EFEA] text-[#192E27] hover:bg-[#E8F4F0]'
                }`}
              >
                <div className={`font-bold text-xs ${driftScenario === 'stable' ? 'text-white' : 'text-[#357F6B]'}`}>
                  {t.rcmSimulator.stableTitle}
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${driftScenario === 'stable' ? 'text-[#E8F4F0]' : 'text-[#769188]'}`}>
                  {t.rcmSimulator.stableSub}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDriftScenario('moderate')}
                className={`p-3 rounded-2xl text-left text-xs border transition ${
                  driftScenario === 'moderate'
                    ? 'bg-[#357F6B] border-[#357F6B] text-white shadow-soft'
                    : 'bg-[#E8F4F0]/50 border-[#E4EFEA] text-[#192E27] hover:bg-[#E8F4F0]'
                }`}
              >
                <div className={`font-bold text-xs ${driftScenario === 'moderate' ? 'text-[#F6B738]' : 'text-[#B87A0B]'}`}>
                  {t.rcmSimulator.moderateTitle}
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${driftScenario === 'moderate' ? 'text-[#E8F4F0]' : 'text-[#769188]'}`}>
                  {t.rcmSimulator.moderateSub}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDriftScenario('out_of_tolerance')}
                className={`p-3 rounded-2xl text-left text-xs border transition ${
                  driftScenario === 'out_of_tolerance'
                    ? 'bg-[#357F6B] border-[#357F6B] text-white shadow-soft'
                    : 'bg-[#E8F4F0]/50 border-[#E4EFEA] text-[#192E27] hover:bg-[#E8F4F0]'
                }`}
              >
                <div className={`font-bold text-xs ${driftScenario === 'out_of_tolerance' ? 'text-rose-200' : 'text-rose-600'}`}>
                  {t.rcmSimulator.ootTitle}
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${driftScenario === 'out_of_tolerance' ? 'text-[#E8F4F0]' : 'text-[#769188]'}`}>
                  {t.rcmSimulator.ootSub}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDriftScenario('repeat_fail')}
                className={`p-3 rounded-2xl text-left text-xs border transition ${
                  driftScenario === 'repeat_fail'
                    ? 'bg-[#357F6B] border-[#357F6B] text-white shadow-soft'
                    : 'bg-[#E8F4F0]/50 border-[#E4EFEA] text-[#192E27] hover:bg-[#E8F4F0]'
                }`}
              >
                <div className={`font-bold text-xs ${driftScenario === 'repeat_fail' ? 'text-rose-200' : 'text-rose-600'}`}>
                  {t.rcmSimulator.repeatFailTitle}
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${driftScenario === 'repeat_fail' ? 'text-[#E8F4F0]' : 'text-[#769188]'}`}>
                  {t.rcmSimulator.repeatFailSub}
                </div>
              </button>
            </div>

            {/* As-Left Toggle */}
            <div className="pt-3 border-t border-[#E4EFEA] flex items-center justify-between text-xs">
              <span className="text-[#192E27] font-semibold text-[11px] uppercase">{t.rcmSimulator.asLeftAdjustLabel}</span>
              <CustomToggle
                checked={asLeftAdjusted}
                onChange={setAsLeftAdjusted}
                trueLabel={t.rcmSimulator.adjusted}
                falseLabel={t.rcmSimulator.noAdjustment}
                variant="teal"
                className="w-48"
              />
            </div>

            {/* Interval Slider */}
            <div className="pt-3 border-t border-[#E4EFEA] space-y-2">
              <div className="flex justify-between text-xs font-semibold text-[#192E27]">
                <span className="uppercase text-[11px] text-[#769188]">{t.rcmSimulator.activeInterval}</span>
                <span className="font-mono text-[#357F6B] font-bold">{currentInterval} {t.rcmSimulator.months}</span>
              </div>
              <input
                type="range"
                min={3}
                max={36}
                step={3}
                value={currentInterval}
                onChange={(e) => setCurrentInterval(Number(e.target.value))}
                className="w-full accent-[#357F6B]"
              />
            </div>
          </div>

          {/* 5 RCM Questions */}
          <div className="ref-card p-5 space-y-3 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#769188] block">
              {t.rcmSimulator.evalHeader}
            </span>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA]">
                <span className="text-[#192E27] font-semibold text-[11px]">{t.rcmSimulator.q1}</span>
                <CustomToggle
                  checked={isFunctional}
                  onChange={setIsFunctional}
                  trueLabel={t.rcmSimulator.yes}
                  falseLabel={t.rcmSimulator.no}
                  variant="teal"
                  className="w-40"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA]">
                <span className="text-[#192E27] font-semibold text-[11px]">{t.rcmSimulator.q2}</span>
                <CustomToggle
                  checked={triggersOperatorAction}
                  onChange={setTriggersOperatorAction}
                  trueLabel={t.rcmSimulator.yes}
                  falseLabel={t.rcmSimulator.no}
                  variant="teal"
                  className="w-40"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA]">
                <span className="text-[#192E27] font-semibold text-[11px]">{t.rcmSimulator.q3}</span>
                <CustomToggle
                  checked={isRedundant}
                  onChange={setIsRedundant}
                  trueLabel={t.rcmSimulator.available}
                  falseLabel={t.rcmSimulator.no}
                  variant="amber"
                  className="w-40"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA]">
                <span className="text-[#192E27] font-semibold text-[11px]">{t.rcmSimulator.q4}</span>
                <CustomToggle
                  checked={indicationComparison}
                  onChange={setIndicationComparison}
                  trueLabel={t.rcmSimulator.possible}
                  falseLabel={t.rcmSimulator.no}
                  variant="amber"
                  className="w-40"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA]">
                <span className="text-[#192E27] font-semibold text-[11px]">{t.rcmSimulator.q5}</span>
                <CustomToggle
                  checked={acceptableDrift}
                  onChange={setAcceptableDrift}
                  trueLabel={t.rcmSimulator.acceptable}
                  falseLabel={t.rcmSimulator.notAcceptable}
                  variant={acceptableDrift ? 'teal' : 'rose'}
                  className="w-40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Output (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Decision Summary Card */}
          <div className="ref-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4EFEA] pb-4">
              <div>
                <span className="text-[10px] text-[#769188] uppercase font-mono font-bold block">
                  {language === 'en' ? 'Schedule Evaluation Outcome:' : 'Hasil Evaluasi Jadwal:'}
                </span>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <span className={`text-lg font-bold font-mono tracking-tight px-4 py-1 rounded-2xl ${getDecisionBadgeStyle(decisionResult.decision)}`}>
                    {decisionResult.decision === 'EXTEND' 
                      ? (language === 'en' ? 'EXTEND' : 'DIPERPANJANG')
                      : decisionResult.decision === 'SHORTEN' 
                      ? (language === 'en' ? 'SHORTEN' : 'DIPERSINGKAT')
                      : decisionResult.decision === 'RUN-TO-FAILURE' 
                      ? (language === 'en' ? 'RUN-TO-FAILURE' : 'KONDISIONAL')
                      : (language === 'en' ? 'MAINTAIN' : 'DIPERTAHANKAN')}
                  </span>
                  <span className="text-xs px-3 py-1 rounded-2xl bg-[#E8F4F0] text-[#192E27] font-bold uppercase font-mono border border-[#E4EFEA]">
                    {decisionResult.classification}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs bg-[#E8F4F0] px-4 py-2 rounded-2xl border border-[#E4EFEA]">
                <span className="text-[#769188] font-semibold">{currentInterval} {language === 'en' ? 'Mo' : 'Bln'}</span>
                <ArrowRight className="h-4 w-4 text-[#357F6B]" />
                <span className="text-[#192E27] font-bold text-sm">{decisionResult.recommendedIntervalMonths} {language === 'en' ? 'Mo' : 'Bln'}</span>
              </div>
            </div>

            <p className="text-xs text-[#192E27] leading-relaxed font-normal bg-[#F4F7F6] p-4 rounded-2xl border border-[#E4EFEA]">
              {decisionResult.justification}
            </p>

            <div className="text-[11px] font-mono text-[#769188] pt-2 border-t border-[#E4EFEA] flex justify-between">
              <span>{language === 'en' ? 'Next Due:' : 'Jatuh Tempo:'} <strong className="text-[#192E27]">{decisionResult.nextDueDate}</strong></span>
              <span>Span: {span} {currentInst.engineering_unit} &bull; Tol: &plusmn;{currentInst.vendor_tolerance_percent}%</span>
            </div>
          </div>

          {/* 17 Steps Audit Trail */}
          <div className="ref-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E4EFEA] pb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#769188] block">
                {language === 'en' ? '17-Step RCM Logic Evaluation Trail' : 'Rincian Tahap Evaluasi RCM'}
              </span>
              <span className="text-[10px] font-mono text-[#357F6B] font-bold">{language === 'en' ? '17 Sequential Steps' : '17 Tahap Berurutan'}</span>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {decisionResult.stepLogs.map((step) => {
                const isPositive = step.result.includes('PASS') || step.result.includes('EXTEND') || step.result.includes('Aman');
                const isNegative = step.result.includes('FAIL') || step.result.includes('SHORTEN') || step.result.includes('Kritis') || step.result.includes('Tinggi');

                return (
                  <div
                    key={step.stepNumber}
                    className="p-3 rounded-2xl bg-[#F4F7F6] border border-[#E4EFEA] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-[#192E27] font-bold text-xs">
                        #{step.stepNumber}. {step.title}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isPositive
                          ? 'bg-[#E8F4F0] text-[#357F6B] border border-[#357F6B]/30'
                          : isNegative
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-white text-[#192E27] border border-[#E4EFEA]'
                      }`}>
                        {step.result}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#769188] font-sans font-normal leading-normal">
                      {step.details}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
