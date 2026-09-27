import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Instrument, DataPoint, CalibrationSession } from '../types/schema';
import { 
  calculateSpan, 
  calculateStandardInput, 
  calculateError, 
  calculateErrorPercent, 
  calculateDrift, 
  calculateDriftPercent 
} from '../utils/metrology';
import { executeRcmDecisionEngine } from '../utils/rcmEngine';
import { CustomSelect, SelectOption } from './ui/CustomSelect';
import { CustomToggle } from './ui/CustomToggle';
import { 
  X, 
  Save, 
  Gauge
} from 'lucide-react';

interface CalibrationSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCalibration: (updatedInstrument: Instrument, newSession: CalibrationSession) => void;
  instrument: Instrument;
}

export const CalibrationSessionModal: React.FC<CalibrationSessionModalProps> = ({
  isOpen,
  onClose,
  onSaveCalibration,
  instrument
}) => {
  const [calibrationDate, setCalibrationDate] = useState('');
  const [calibrationTime, setCalibrationTime] = useState('');
  const [technicianName, setTechnicianName] = useState('Teknisi Kalibrasi');
  const [calibratorStandardId, setCalibratorStandardId] = useState('CAL-STD-REF-01');
  const [calibrationType, setCalibrationType] = useState<'Field' | 'Workshop' | 'Bench'>('Field');
  const [envTemperature, setEnvTemperature] = useState<number>(24.0);
  const [envTemperatureUnit, setEnvTemperatureUnit] = useState<'°C' | '°F'>('°C');
  const [envHumidity, setEnvHumidity] = useState<number>(55.0);
  const [notes, setNotes] = useState('');
  const [pointPreset, setPointPreset] = useState<3 | 5 | 10>(5);

  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [needsAdjustment, setNeedsAdjustment] = useState<boolean>(false);
  const [show17Steps, setShow17Steps] = useState<boolean>(false);

  const span = calculateSpan(instrument.range_min, instrument.range_max);
  const latestHistoricalSession = instrument.calibration_history[instrument.calibration_history.length - 1];

  const isWeightInstrument = Boolean(
    instrument.process_variable?.toLowerCase() === 'weight' ||
    ['kg', 'ton', 'g', 'gram', 'lbs', 't'].includes(instrument.engineering_unit?.toLowerCase().trim() || '') ||
    instrument.tag_number.toLowerCase().startsWith('wt') ||
    instrument.description?.toLowerCase().includes('load cell') ||
    instrument.description?.toLowerCase().includes('hopper') ||
    instrument.description?.toLowerCase().includes('timbangan') ||
    instrument.description?.toLowerCase().includes('scale')
  );

  const envUnitOptions: SelectOption[] = [
    { value: '°C', label: '°C' },
    { value: '°F', label: '°F' }
  ];

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setCalibrationDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
      setCalibrationTime(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
      setTechnicianName('Teknisi Kalibrasi');
      setCalibratorStandardId('CAL-STD-REF-01');
      setCalibrationType('Field');
      setEnvTemperature(24.0);
      setEnvTemperatureUnit('°C');
      setEnvHumidity(55.0);
      setNotes('');
      setNeedsAdjustment(false);
      setShow17Steps(false);
      const defaultPreset: 3 | 5 | 10 = isWeightInstrument ? 10 : 5;
      generateInitialDataPoints(defaultPreset);
    }
  }, [isOpen, instrument]);

  const generateInitialDataPoints = (count: 3 | 5 | 10) => {
    const actualCount = (!isWeightInstrument && count === 10) ? 5 : count;
    setPointPreset(actualCount);
    const percentages = actualCount === 3 
      ? [0, 50, 100] 
      : actualCount === 10
      ? [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      : [0, 25, 50, 75, 100];
    
    const initialPoints: DataPoint[] = percentages.map(pct => {
      const standardInput = calculateStandardInput(instrument.range_min, instrument.range_max, pct);
      const prevSessionPoint = latestHistoricalSession?.data_points.find(p => Math.abs(p.percent_span - pct) < 1);
      const prevError = prevSessionPoint ? prevSessionPoint.as_found_error : null;

      const initialReading = standardInput;
      const asFoundError = calculateError(initialReading, standardInput);
      const asFoundErrorPct = calculateErrorPercent(asFoundError, span);
      const drift = calculateDrift(asFoundError, prevError);
      const driftPct = calculateDriftPercent(drift, span);

      return {
        percent_span: pct,
        standard_input: standardInput,
        as_found_reading: initialReading,
        as_found_error: asFoundError,
        as_found_error_percent: asFoundErrorPct,
        as_left_reading: null,
        as_left_error: null,
        as_left_error_percent: null,
        previous_error: prevError,
        calculated_drift: drift,
        calculated_drift_percent: driftPct
      };
    });

    setDataPoints(initialPoints);
  };

  const handleReadingChange = (index: number, newReading: number) => {
    const updated = [...dataPoints];
    const pt = updated[index];
    pt.as_found_reading = newReading;
    pt.as_found_error = calculateError(newReading, pt.standard_input);
    pt.as_found_error_percent = calculateErrorPercent(pt.as_found_error, span);
    pt.calculated_drift = calculateDrift(pt.as_found_error, pt.previous_error);
    pt.calculated_drift_percent = calculateDriftPercent(pt.calculated_drift, span);

    if (needsAdjustment && pt.as_left_reading === null) {
      pt.as_left_reading = pt.standard_input;
      pt.as_left_error = 0;
      pt.as_left_error_percent = 0;
    }

    setDataPoints(updated);
  };

  const handleAsLeftChange = (index: number, newReading: number) => {
    const updated = [...dataPoints];
    const pt = updated[index];
    pt.as_left_reading = newReading;
    pt.as_left_error = calculateError(newReading, pt.standard_input);
    pt.as_left_error_percent = calculateErrorPercent(pt.as_left_error, span);
    setDataPoints(updated);
  };

  if (!isOpen) return null;

  const isOutOfTolerance = dataPoints.some(
    p => Math.abs(p.as_found_error_percent) > instrument.vendor_tolerance_percent
  );

  const asFoundStatus = isOutOfTolerance ? 'Fail' : 'Pass';
  const asLeftStatus = (needsAdjustment || isOutOfTolerance) ? 'Adjusted' : 'Not Adjusted';
  const fullCalibrationDate = calibrationTime ? `${calibrationDate} ${calibrationTime}` : calibrationDate;

  const currentSessionCandidate: CalibrationSession = {
    calibration_id: Date.now(),
    calibration_date: fullCalibrationDate,
    technician_name: technicianName,
    calibrator_standard_id: calibratorStandardId,
    calibration_type: calibrationType,
    environment_temperature: envTemperature,
    environment_humidity: envHumidity,
    as_found_status: asFoundStatus,
    as_left_status: asLeftStatus,
    decision_action: 'MAINTAIN',
    previous_interval_months: instrument.current_interval_months,
    recommended_interval_months: instrument.current_interval_months,
    notes: notes,
    data_points: dataPoints
  };

  const rcmDecision = executeRcmDecisionEngine(
    instrument,
    currentSessionCandidate,
    instrument.calibration_history
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Automatically record real-time calibration timestamp
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const autoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const autoTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const finalCalibrationDate = `${autoDate} ${autoTime}`;

    const finalizedSession: CalibrationSession = {
      ...currentSessionCandidate,
      calibration_date: finalCalibrationDate,
      decision_action: rcmDecision.decision,
      recommended_interval_months: rcmDecision.recommendedIntervalMonths,
      notes: notes || rcmDecision.justification
    };

    const updatedInstrument: Instrument = {
      ...instrument,
      current_interval_months: rcmDecision.recommendedIntervalMonths,
      next_due_date: rcmDecision.nextDueDate,
      calibration_history: [...instrument.calibration_history, finalizedSession]
    };

    onSaveCalibration(updatedInstrument, finalizedSession);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} />
      <div className="relative rounded-3xl bg-white border border-[#E4EFEA] w-full max-w-5xl shadow-2xl overflow-hidden my-auto animate-slide-up z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#192E27] to-[#264D41] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
              <Gauge className="h-5 w-5 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm font-mono tracking-tight">
                  INPUT KALIBRASI: {instrument.tag_number}
                </span>
                <span className="text-[11px] text-white/80">
                  (Span: {span} {instrument.engineering_unit} &bull; Tol: &plusmn;{instrument.vendor_tolerance_percent}%)
                </span>
              </div>
              <p className="text-[11px] text-white/80 mt-0.5">
                Formulir pengujian titik ukur dan evaluasi jadwal kalibrasi alat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Metadata Grid: 4 parameter tanpa menu tanggal & waktu manual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Teknisi Kalibrasi</label>
              <input
                type="text"
                required
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Nama teknisi pelaksana"
                className="w-full bg-[#F4F7F6] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2 text-xs text-[#192E27] font-medium focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">ID Standar Kalibrator</label>
              <input
                type="text"
                required
                value={calibratorStandardId}
                onChange={(e) => setCalibratorStandardId(e.target.value)}
                placeholder="Misal CAL-STD-REF-01"
                className="w-full bg-[#F4F7F6] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Suhu Lingkungan</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={envTemperature}
                  onChange={(e) => setEnvTemperature(Number(e.target.value))}
                  className="w-full bg-[#F4F7F6] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-2.5 py-2 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition"
                />
                <div className="w-16 shrink-0">
                  <CustomSelect
                    value={envTemperatureUnit}
                    onChange={(val) => setEnvTemperatureUnit(val as '°C' | '°F')}
                    options={envUnitOptions}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Kelembaban (%)</label>
              <input
                type="number"
                step="0.1"
                value={envHumidity}
                onChange={(e) => setEnvHumidity(Number(e.target.value))}
                className="w-full bg-[#F4F7F6] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#192E27] focus:outline-none transition"
              />
            </div>
          </div>

          {/* Point Table Section */}
          <div className="space-y-3 pt-2 border-t border-[#E4EFEA]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-[#192E27] uppercase tracking-wide">
                Tabel Titik Uji (% Span)
              </span>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[#769188] font-semibold uppercase text-[10px]">Preset:</span>
                  <div className="inline-flex p-1 rounded-2xl bg-[#E8F4F0] border border-[#E4EFEA] text-[11px]">
                    <button
                      type="button"
                      onClick={() => generateInitialDataPoints(3)}
                      className={`px-3 py-1 rounded-xl transition font-medium cursor-pointer ${pointPreset === 3 ? 'bg-[#357F6B] text-white font-bold shadow-soft' : 'text-[#769188] hover:text-[#192E27]'}`}
                    >
                      3 Titik
                    </button>
                    <button
                      type="button"
                      onClick={() => generateInitialDataPoints(5)}
                      className={`px-3 py-1 rounded-xl transition font-medium cursor-pointer ${pointPreset === 5 ? 'bg-[#357F6B] text-white font-bold shadow-soft' : 'text-[#769188] hover:text-[#192E27]'}`}
                    >
                      5 Titik
                    </button>
                    {isWeightInstrument && (
                      <button
                        type="button"
                        onClick={() => generateInitialDataPoints(10)}
                        className={`px-3 py-1 rounded-xl transition font-medium cursor-pointer ${pointPreset === 10 ? 'bg-[#357F6B] text-white font-bold shadow-soft' : 'text-[#769188] hover:text-[#192E27]'}`}
                      >
                        10 Titik
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 border-l border-[#E4EFEA] pl-4">
                  <span className="text-[#192E27] font-semibold uppercase text-[10px] whitespace-nowrap">As-Left:</span>
                  <CustomToggle
                    checked={needsAdjustment || isOutOfTolerance}
                    onChange={setNeedsAdjustment}
                    trueLabel="Adjusted"
                    falseLabel="No Adjustment"
                    variant="teal"
                    className="w-48 sm:w-52"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E4EFEA] overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#E8F4F0] text-[#192E27] uppercase tracking-wider font-bold text-[10px] border-b border-[#E4EFEA]">
                  <tr>
                    <th className="py-3 px-3.5">% Span</th>
                    <th className="py-3 px-3.5">Standard Input</th>
                    <th className="py-3 px-3.5">As-Found Reading</th>
                    <th className="py-3 px-3.5">Error</th>
                    <th className="py-3 px-3.5">Error (% Span)</th>
                    <th className="py-3 px-3.5">Error Lalu</th>
                    <th className="py-3 px-3.5">Drift (% Span)</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    {(needsAdjustment || isOutOfTolerance) && (
                      <th className="py-3 px-3.5 bg-[#DDF0E9] border-l border-[#E4EFEA] text-[#357F6B]">
                        As-Left Reading
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4EFEA] font-mono text-xs">
                  {dataPoints.map((pt, idx) => {
                    const isPass = Math.abs(pt.as_found_error_percent) <= instrument.vendor_tolerance_percent;

                    return (
                      <tr key={idx} className="hover:bg-[#E8F4F0]/40 transition">
                        <td className="py-2.5 px-3.5 font-bold text-[#192E27]">{pt.percent_span}%</td>
                        <td className="py-2.5 px-3.5 text-[#769188]">{pt.standard_input}</td>
                        <td className="py-2.5 px-3.5">
                          <input
                            type="number"
                            step="any"
                            value={pt.as_found_reading}
                            onChange={(e) => handleReadingChange(idx, Number(e.target.value))}
                            className="w-24 bg-white border border-[#E4EFEA] focus:border-[#357F6B] rounded-xl px-2.5 py-1 text-xs text-[#192E27] font-mono font-bold focus:outline-none transition"
                          />
                        </td>
                        <td className={`py-2.5 px-3.5 font-semibold ${pt.as_found_error >= 0 ? 'text-[#192E27]' : 'text-rose-600'}`}>
                          {pt.as_found_error > 0 ? `+${pt.as_found_error}` : pt.as_found_error}
                        </td>
                        <td className={`py-2.5 px-3.5 font-bold ${isPass ? 'text-[#357F6B]' : 'text-rose-600'}`}>
                          {pt.as_found_error_percent > 0 ? `+${pt.as_found_error_percent}` : pt.as_found_error_percent}%
                        </td>
                        <td className="py-2.5 px-3.5 text-[#769188]">
                          {pt.previous_error !== null ? pt.previous_error : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-[#357F6B] font-bold">
                          {pt.calculated_drift_percent !== null 
                            ? `${pt.calculated_drift_percent > 0 ? '+' : ''}${pt.calculated_drift_percent}%` 
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-sans">
                          {isPass ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F4F0] text-[#357F6B] border border-[#357F6B]/30">
                              PASS
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              FAIL
                            </span>
                          )}
                        </td>

                        {(needsAdjustment || isOutOfTolerance) && (
                          <td className="py-2.5 px-3.5 bg-[#E8F4F0]/50 border-l border-[#E4EFEA]">
                            <input
                              type="number"
                              step="any"
                              value={pt.as_left_reading !== null ? pt.as_left_reading : pt.standard_input}
                              onChange={(e) => handleAsLeftChange(idx, Number(e.target.value))}
                              className="w-24 bg-white border border-[#357F6B]/40 rounded-xl px-2.5 py-1 text-xs text-[#192E27] font-mono font-bold focus:outline-none"
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RCM Decision Preview */}
          <div className="p-5 rounded-2xl bg-[#192E27] text-white border border-[#357F6B]/30 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase font-mono font-bold text-[#769188]">Rekomendasi Jadwal Baru:</span>
                <span className="text-xs font-bold px-3 py-1 rounded-full font-mono bg-[#357F6B] text-white shadow-soft">
                  {rcmDecision.decision === 'EXTEND' ? 'DIPERPANJANG' : rcmDecision.decision === 'SHORTEN' ? 'DIPERSINGKAT' : rcmDecision.decision === 'RUN-TO-FAILURE' ? 'KONDISIONAL' : 'DIPERTAHANKAN'} ({instrument.current_interval_months} Bln &rarr; {rcmDecision.recommendedIntervalMonths} Bln)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShow17Steps(!show17Steps)}
                className="text-xs text-[#F6B738] hover:underline font-bold"
              >
                {show17Steps ? 'Tutup Rincian' : 'Lihat Alasan Lengkap'}
              </button>
            </div>

            <p className="text-xs text-white/80 leading-relaxed font-normal bg-white/5 p-3.5 rounded-xl border border-white/10">
              {rcmDecision.justification}
            </p>

            {show17Steps && (
              <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {rcmDecision.stepLogs.map(s => (
                  <div key={s.stepNumber} className="text-[11px] p-2.5 rounded-xl bg-white/5 border border-white/10 font-mono flex justify-between">
                    <span className="text-white/70">#{s.stepNumber}. {s.title}</span>
                    <span className="text-[#F6B738] font-bold">{s.result}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#769188] uppercase font-mono block mb-1">Catatan / Tindakan Kalibrasi</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan kondisi sensor, penyetelan zero/span, dll..."
              className="w-full bg-[#F4F7F6] border border-[#E4EFEA] focus:border-[#357F6B] focus:bg-white rounded-xl p-3 text-xs text-[#192E27] focus:outline-none transition"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-[#E4EFEA] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl bg-[#E8F4F0] hover:bg-[#DDF0E9] text-[#192E27] text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-2xl btn-teal text-xs font-semibold flex items-center gap-2 shadow-soft"
            >
              <Save className="h-4 w-4" />
              <span>Simpan & Eksekusi RCM</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
