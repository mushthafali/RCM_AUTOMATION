import React from 'react';
import { Instrument, CalibrationSession } from '../types/schema';
import { calculateSpan } from '../utils/metrology';
import { useLanguage } from '../context/LanguageContext';
import { 
  Printer, 
  ArrowLeft, 
  CheckCircle2, 
  Award
} from 'lucide-react';

interface CalibrationReportViewProps {
  instrument: Instrument;
  sessionIndex?: number;
  onBack: () => void;
}

export const CalibrationReportView: React.FC<CalibrationReportViewProps> = ({
  instrument,
  sessionIndex,
  onBack
}) => {
  const { language, t } = useLanguage();
  const history = instrument.calibration_history || [];
  const initialIndex = sessionIndex !== undefined && sessionIndex < history.length 
    ? sessionIndex 
    : Math.max(0, history.length - 1);
  
  const [activeSessionIndex, setActiveSessionIndex] = React.useState<number>(initialIndex);
  const session: CalibrationSession | undefined = history[activeSessionIndex];

  if (!session) {
    return (
      <div className="p-12 text-center space-y-4 ref-card">
        <p className="text-[#769188] font-semibold">
          {language === 'en' 
            ? `Instrument ${instrument.tag_number} does not have any calibration records.` 
            : `Instrumen ${instrument.tag_number} belum memiliki catatan kalibrasi.`}
        </p>
        <button onClick={onBack} className="btn-amber">
          {t.report.backToList}
        </button>
      </div>
    );
  }

  const span = calculateSpan(instrument.range_min, instrument.range_max);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto print:max-w-none print:m-0 print:p-0 print:w-full animate-fade-in">
      {/* Top Action Toolbar (Hidden during print / save PDF) */}
      <div className="p-4 rounded-3xl bg-white border border-[#E4EFEA] shadow-soft flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="btn-mint"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.report.backToList}</span>
          </button>
        </div>

        {/* Historical Session Switcher Bar (If > 1 sessions) */}
        {history.length > 1 && (
          <div className="flex items-center gap-1.5 bg-[#F4F7F6] border border-[#E4EFEA] p-1 rounded-2xl overflow-x-auto">
            <span className="text-[10px] font-bold text-[#769188] uppercase px-2 tracking-wider shrink-0">
              {t.report.selectSession}
            </span>
            {history.map((s, idx) => {
              const isSelected = idx === activeSessionIndex;
              const isLatest = idx === history.length - 1;
              return (
                <button
                  key={s.calibration_id || idx}
                  type="button"
                  onClick={() => setActiveSessionIndex(idx)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-[#357F6B] text-white shadow-xs'
                      : 'bg-white text-[#192E27] hover:bg-[#E8F4F0] border border-[#E4EFEA]'
                  }`}
                  title={`Lihat sertifikat sesi ${idx + 1} (${s.calibration_date})`}
                >
                  <span>{t.report.sessionNum} #{idx + 1} ({s.calibration_date})</span>
                  {isLatest && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-sans uppercase ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#E8F4F0] text-[#357F6B]'
                    }`}>
                      {t.report.latestBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={handlePrint}
          className="btn-amber"
        >
          <Printer className="h-4 w-4 stroke-[2.5]" />
          <span>{t.report.printPdf}</span>
        </button>
      </div>

      {/* Official Certificate Sheet (Full 100% on Print / PDF) */}
      <div className="certificate-print-sheet bg-white text-slate-900 rounded-3xl shadow-xl p-8 sm:p-12 border border-sage-200 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full font-sans space-y-6">
        {/* Certificate Header */}
        <div className="border-b-2 border-slate-900 pb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-pine-800 font-bold text-xs tracking-wider uppercase">
              <Award className="h-4 w-4 text-gold-600" />
              <span>Plant Metrology & Reliability Maintenance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 uppercase tracking-tight">
              {t.report.certTitle}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {t.report.certSubtitle}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">{t.report.certNumberLabel}</span>
            <span className="text-sm font-bold font-mono text-slate-900">
              CAL-{instrument.tag_number}-{session.calibration_date.replace(/-/g, '')}
            </span>
            <div className="text-xs text-emerald-700 font-semibold mt-1 flex items-center justify-end gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {t.report.asFoundStatusLabel} {session.as_found_status.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-xs border-b border-slate-200 pb-5">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">{t.report.instDataHeader}</span>
            <div className="font-bold text-slate-900 font-mono text-sm">{instrument.tag_number}</div>
            <div className="text-slate-800">{instrument.description}</div>
            <div className="text-slate-500 mt-0.5">{t.report.locationLabel} {instrument.location}</div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">{t.report.metrologySpecHeader}</span>
            <div className="text-slate-800 font-medium">{t.report.parameterLabel} <strong>{instrument.process_variable}</strong></div>
            <div className="text-slate-800 font-mono">{t.report.rangeLabel} {instrument.range_min} ~ {instrument.range_max} {instrument.engineering_unit}</div>
            <div className="text-slate-800 font-mono">{t.report.spanLabel} {span} {instrument.engineering_unit}</div>
            <div className="text-slate-800 font-mono">{t.report.vendorTolLabel} &plusmn;{instrument.vendor_tolerance_percent}%</div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">{t.report.testDataHeader}</span>
            <div className="text-slate-800">{t.report.dateLabel} <strong className="font-mono">{session.calibration_date}</strong></div>
            <div className="text-slate-800">{t.report.technicianLabel} {session.technician_name}</div>
            <div className="text-slate-800">{t.report.standardLabel} <span className="font-mono">{session.calibrator_standard_id}</span></div>
            <div className="text-slate-800">{t.report.envConditionLabel} {session.environment_temperature}°C / {session.environment_humidity}% RH</div>
          </div>
        </div>

        {/* Calibration Test Data Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            {t.report.testPointTableHeader}
          </h3>

          <div className="overflow-x-auto border border-slate-300 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300 text-[10px]">
                <tr>
                  <th className="py-2 px-3">% Span</th>
                  <th className="py-2 px-3">Standard Input</th>
                  <th className="py-2 px-3">As-Found Reading</th>
                  <th className="py-2 px-3">As-Found Error</th>
                  <th className="py-2 px-3">Error (% Span)</th>
                  <th className="py-2 px-3">Drift (% Span)</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {session.data_points.map((pt, idx) => {
                  const isPass = Math.abs(pt.as_found_error_percent) <= instrument.vendor_tolerance_percent;

                  return (
                    <tr key={idx}>
                      <td className="py-1.5 px-3 font-bold">{pt.percent_span}%</td>
                      <td className="py-1.5 px-3">{pt.standard_input} {instrument.engineering_unit}</td>
                      <td className="py-1.5 px-3 font-bold">{pt.as_found_reading} {instrument.engineering_unit}</td>
                      <td className="py-1.5 px-3">{pt.as_found_error > 0 ? `+${pt.as_found_error}` : pt.as_found_error}</td>
                      <td className="py-1.5 px-3 font-bold">{pt.as_found_error_percent}%</td>
                      <td className="py-1.5 px-3">{pt.calculated_drift_percent !== null ? `${pt.calculated_drift_percent}%` : '-'}</td>
                      <td className="py-1.5 px-3 text-center font-sans">
                        <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                          isPass ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {isPass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RCM Decision & Interval Optimization Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-300 space-y-3 page-break-avoid">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2.5">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                {t.report.rcmDecisionHeader}
              </span>
              <div className="flex items-center gap-2.5 mt-0.5">
                <span className="text-lg font-black text-slate-900 font-mono">{session.decision_action}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-200 font-semibold text-slate-700 font-mono">
                  {t.report.classificationLabel} {instrument.rcm_profile.final_classification}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">{t.report.newRecommendedInterval}</span>
              <span className="text-base font-black text-emerald-700 font-mono">
                {session.recommended_interval_months} {t.report.months}
              </span>
              <span className="text-[11px] text-slate-600 block">
                {t.report.nextDueDateLabel} <strong className="font-mono">{instrument.next_due_date}</strong>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed italic">
            &ldquo;{session.notes}&rdquo;
          </p>
        </div>

        {/* Traceability Statement & Signatures */}
        <div className="pt-4 border-t border-slate-300 space-y-6 page-break-avoid">
          <p className="text-[10px] text-slate-500 leading-tight">
            {t.report.traceabilityStatement}
          </p>

          <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4">
            <div className="space-y-12">
              <span className="text-slate-500 block">{t.report.calibratedBy}</span>
              <div>
                <div className="font-bold text-slate-900 underline">{session.technician_name}</div>
                <span className="text-[10px] text-slate-500">{language === 'en' ? 'Standard ID:' : 'ID Standar:'} {session.calibrator_standard_id}</span>
              </div>
            </div>

            <div className="space-y-12">
              <span className="text-slate-500 block">{t.report.reviewedBy}</span>
              <div>
                <div className="font-bold text-slate-900 underline">Reliability & Metrology Engineer</div>
                <span className="text-[10px] text-slate-500">{t.report.authDate} {session.calibration_date}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
