/**
 * Neil Bloom Reliability Centered Maintenance (RCM) 17-Step Decision Logic Engine
 * Designed for Industrial Instrument Calibration Optimization
 */

import { Instrument, CalibrationSession, RCMDecisionAction, RCMClassification } from '../types/schema';
import { evaluateCalibrationData } from './metrology';

export interface RCMStepLog {
  stepNumber: number;
  title: string;
  questionOrCheck: string;
  result: string;
  status: 'passed' | 'warning' | 'failed' | 'info';
  details: string;
}

export interface RCMDecisionResult {
  decision: RCMDecisionAction;
  classification: RCMClassification;
  recommendedIntervalMonths: number;
  nextDueDate: string;
  justification: string;
  stepLogs: RCMStepLog[];
  isExtensionEligible: boolean;
  isRedesignRecommended: boolean;
}

/**
 * Calculate next due date given a calibration date and interval in months
 */
export const calculateNextDueDate = (calibrationDateStr: string, intervalMonths: number): string => {
  const date = new Date(calibrationDateStr);
  if (isNaN(date.getTime())) {
    const today = new Date();
    today.setMonth(today.getMonth() + intervalMonths);
    return today.toISOString().split('T')[0];
  }
  
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + intervalMonths);
  return nextDate.toISOString().split('T')[0];
};

/**
 * Classify instrument criticality based on Neil Bloom's operational questions
 */
export const determineRcmClassification = (
  isFunctional: boolean,
  triggersOperatorAction: boolean,
  isRedundant: boolean,
  indicationComparisonPossible: boolean,
  acceptableDriftConsequence: boolean
): { classification: RCMClassification; reasoning: string } => {
  // If acceptable drift consequence is false AND triggers operator action without redundancy -> Critical
  if (!acceptableDriftConsequence && triggersOperatorAction && !isRedundant) {
    return {
      classification: 'Critical',
      reasoning: 'Instrumen Kritis: Penyimpangan pengukuran memicu tindakan operator tanpa ada sensor redundan, dan konsekuensi penyimpangan tidak dapat diterima oleh keselamatan/proses.'
    };
  }

  // If functional safety/interlock
  if (isFunctional && !acceptableDriftConsequence) {
    return {
      classification: 'Critical',
      reasoning: 'Instrumen Kritis: Berfungsi langsung dalam loop proteksi/interlock keselamatan pabrik.'
    };
  }

  // If redundant and indication comparison possible -> Non-Critical or Run-To-Failure
  if (isRedundant && indicationComparisonPossible && acceptableDriftConsequence) {
    return {
      classification: 'Run-To-Failure',
      reasoning: 'Instrumen Run-To-Failure / Kalibrasi Kondisional: Memiliki sensor ganda/backup dan pemantauan cross-check rutin; kegagalan tidak menimbulkan bahaya langsung.'
    };
  }

  return {
    classification: 'Non-Critical',
    reasoning: 'Instrumen Non-Kritis: Berfungsi sebagai indikator pemantauan proses umum dengan dampak operasional terkendali.'
  };
};

/**
 * Execute Neil Bloom's 17-Step Decision Logic for a Calibration Session
 */
export const executeRcmDecisionEngine = (
  instrument: Instrument,
  currentSession: CalibrationSession,
  historicalSessions: CalibrationSession[] = []
): RCMDecisionResult => {
  const stepLogs: RCMStepLog[] = [];
  const rcm = instrument.rcm_profile;
  const currentInterval = instrument.current_interval_months || 12;

  // Step 1: Functional Loop Check
  stepLogs.push({
    stepNumber: 1,
    title: 'Evaluasi Fungsi Loop Kontrol & Proteksi',
    questionOrCheck: 'Apakah instrumen aktif dalam loop kontrol otomatis atau interlock proteksi?',
    result: rcm.is_functional ? 'Aktif Proteksi/Kontrol' : 'Monitoring/Indikasi Standar',
    status: rcm.is_functional ? 'warning' : 'passed',
    details: rcm.is_functional 
      ? 'Instrumen mengendalikan katup/pompa atau pemicu trip keselamatan.' 
      : 'Instrumen hanya menyajikan data pembacaan visual ke operator.'
  });

  // Step 2: Operator Action Trigger
  stepLogs.push({
    stepNumber: 2,
    title: 'Evaluasi Tindakan Operator',
    questionOrCheck: 'Apakah penyimpangan pembacaan akan memicu tindakan manual operator yang keliru?',
    result: rcm.triggers_operator_action ? 'Memicu Tindakan Operator' : 'Tidak Memicu Tindakan Langsung',
    status: rcm.triggers_operator_action ? 'warning' : 'passed',
    details: rcm.triggers_operator_action 
      ? 'Operator mengambil keputusan proses berdasarkan angka yang ditunjukkan instrumen ini.' 
      : 'Data sekadar dicatat dalam logbook tanpa intervensi operasional langsung.'
  });

  // Step 3: Redundancy Verification
  stepLogs.push({
    stepNumber: 3,
    title: 'Pemeriksaan Redundansi Sensor',
    questionOrCheck: 'Apakah terdapat sensor ganda (redundant backup) pada jalur proses ini?',
    result: rcm.is_redundant ? 'Tersedia Sensor Redundan' : 'Single Point of Measurement',
    status: rcm.is_redundant ? 'passed' : 'warning',
    details: rcm.is_redundant 
      ? 'Jika terjadi kegagalan sensor, terdapat sensor pendamping sebagai cadangan.' 
      : 'Tidak ada sensor cadangan (kegagalan tidak terdeteksi otomatis).'
  });

  // Step 4: Indication Cross-Check Comparison
  stepLogs.push({
    stepNumber: 4,
    title: 'Kemungkinan Perbandingan Indikasi',
    questionOrCheck: 'Dapatkah operator membandingkan nilai ini dengan parameter proses lain secara berkala?',
    result: rcm.indication_comparison_possible ? 'Bisa Dibandingkan (Cross-Check)' : 'Tidak Ada Pembanding',
    status: rcm.indication_comparison_possible ? 'passed' : 'warning',
    details: rcm.indication_comparison_possible 
      ? 'Penyimpangan kasar dapat terdeteksi dari ketidaksesuaian neraca massa/energi/suhu.' 
      : 'Penyimpangan tidak dapat divalidasi silang secara kasat mata.'
  });

  // Step 5: Drift Consequence Acceptability
  stepLogs.push({
    stepNumber: 5,
    title: 'Toleransi Konsekuensi Drift',
    questionOrCheck: 'Apakah konsekuensi pergeseran nilai ukur dapat diterima keselamatan & kualitas?',
    result: rcm.acceptable_drift_consequence ? 'Dapat Diterima' : 'Tidak Dapat Diterima (Kritis)',
    status: rcm.acceptable_drift_consequence ? 'passed' : 'failed',
    details: rcm.acceptable_drift_consequence 
      ? 'Penyimpangan tidak membahayakan personal, lingkungan, atau kualitas produk.' 
      : 'Penyimpangan berisiko merusak batch produk, melanggar regulasi, atau bahaya proses.'
  });

  // Step 6: Final RCM Criticality Classification
  const { classification, reasoning: classReasoning } = determineRcmClassification(
    rcm.is_functional,
    rcm.triggers_operator_action,
    rcm.is_redundant,
    rcm.indication_comparison_possible,
    rcm.acceptable_drift_consequence
  );

  stepLogs.push({
    stepNumber: 6,
    title: 'Penetapan Klasifikasi RCM',
    questionOrCheck: 'Hasil klasifikasi tingkat kekritisan instrumen berdasarkan 5 parameter operasional.',
    result: `Klasifikasi: ${classification.toUpperCase()}`,
    status: classification === 'Critical' ? 'failed' : 'passed',
    details: classReasoning
  });

  // Step 7: Current As-Found Metrology Evaluation
  const evalResult = evaluateCalibrationData(currentSession.data_points, instrument);
  stepLogs.push({
    stepNumber: 7,
    title: 'Evaluasi Data As-Found Sesi Terkini',
    questionOrCheck: 'Apakah seluruh titik uji As-Found berada di dalam toleransi vendor & proses?',
    result: `Status As-Found: ${evalResult.status.toUpperCase()} (Max Error: ${evalResult.maxErrorPercent}%)`,
    status: evalResult.status === 'Pass' ? 'passed' : evalResult.status === 'Marginal' ? 'warning' : 'failed',
    details: evalResult.isWithinVendorTolerance 
      ? `Error maksimum (${evalResult.maxErrorPercent}%) memenuhi toleransi vendor (±${instrument.vendor_tolerance_percent}%).`
      : `Ditemukan ${evalResult.outOfTolerancePoints.length} titik uji melampaui batas toleransi vendor!`
  });

  // Step 8: Historical Repeat-Failure Analysis
  const failHistoryCount = historicalSessions.filter(s => s.as_found_status === 'Fail').length;
  const isRepeatFailure = evalResult.status === 'Fail' && failHistoryCount >= 1;
  stepLogs.push({
    stepNumber: 8,
    title: 'Analisis Riwayat Kegagalan Berulang (Repeat Failure)',
    questionOrCheck: 'Apakah instrumen mengalami kegagalan Out-of-Tolerance berulang pada riwayat kalibrasi?',
    result: isRepeatFailure ? 'Terjadi Kegagalan Berulang' : 'Tidak Ada Kegagalan Berulang',
    status: isRepeatFailure ? 'failed' : 'passed',
    details: `Tercatat ${failHistoryCount} kegagalan As-Found pada sesi-sesi sebelumnya.`
  });

  // Step 9: Maximum Drift Rate Calculation
  const maxDrift = evalResult.maxDriftPercent;
  const vendorTol = instrument.vendor_tolerance_percent;
  const driftRatio = vendorTol > 0 ? (maxDrift / vendorTol) : 1;
  
  stepLogs.push({
    stepNumber: 9,
    title: 'Analisis Pergeseran Nilai Ukur (Drift Rate)',
    questionOrCheck: 'Berapa laju pergeseran nilai ukur (drift) dibanding batas toleransi pabrikan?',
    result: `Max Drift: ${maxDrift}% (${(driftRatio * 100).toFixed(1)}% dari Vendor Tol)`,
    status: driftRatio < 0.5 ? 'passed' : driftRatio <= 0.8 ? 'warning' : 'failed',
    details: driftRatio < 0.5 
      ? 'Drift sangat stabil (< 50% dari toleransi vendor).' 
      : driftRatio <= 0.8 
        ? 'Drift moderat namun masih dalam rentang aman.' 
        : 'Drift tinggi, mendekati atau melampaui batas toleransi vendor.'
  });

  // Step 10: Process Margin Analysis
  stepLogs.push({
    stepNumber: 10,
    title: 'Evaluasi Margin Toleransi Proses',
    questionOrCheck: 'Apakah pembacaan masih memiliki margin keamanan yang memadai terhadap toleransi proses?',
    result: evalResult.isWithinProcessTolerance ? 'Margin Proses Aman' : 'Melanggar Batas Proses',
    status: evalResult.isWithinProcessTolerance ? 'passed' : 'failed',
    details: `Toleransi proses: ±${instrument.process_tolerance} ${instrument.engineering_unit}.`
  });

  // Step 11 to 15: Decision Logic Branching
  let decision: RCMDecisionAction = 'MAINTAIN';
  let recommendedInterval = currentInterval;
  let justification = '';
  let isExtensionEligible = false;
  let isRedesignRecommended = false;

  // Step 11: Check Redesign Trigger
  if (isRepeatFailure || (evalResult.status === 'Fail' && driftRatio > 1.5)) {
    decision = 'REDESIGN';
    isRedesignRecommended = true;
    recommendedInterval = Math.max(3, Math.round(currentInterval * 0.5));
    justification = 'INSTRUMEN PERLU DIMODIFIKASI / DI-REDESIGN: Mengalami kegagalan akurasi berulang atau instabilitas drift ekstrem. Pertimbangkan penggantian spesifikasi instrumen atau isolasi lingkungan pemasangan.';
    
    stepLogs.push({
      stepNumber: 11,
      title: 'Uji Kelayakan Redesign / Modifikasi',
      questionOrCheck: 'Apakah instrumen memerlukan perbaikan desain/tipe alat?',
      result: 'REKOMENDASI: REDESIGN',
      status: 'failed',
      details: justification
    });
  }
  // Step 12: Check Run-To-Failure / Optional Trigger
  else if (classification === 'Run-To-Failure') {
    decision = 'RUN-TO-FAILURE';
    recommendedInterval = 36; // Kalibrasi kondisional / interval panjang
    justification = 'Alat ini tergolong non-kritis dan memiliki sensor cadangan. Kalibrasi berkala dapat dijadikan kondisional (run-to-failure) untuk efisiensi biaya pemeliharaan.';

    stepLogs.push({
      stepNumber: 12,
      title: 'Uji Kelayakan Run-To-Failure / On-Condition',
      questionOrCheck: 'Apakah instrumen memenuhi kriteria pemeliharaan berbasis kondisi?',
      result: 'RUN-TO-FAILURE (OPSIONAL)',
      status: 'passed',
      details: justification
    });
  }
  // Step 13: Check Shorten Interval Trigger
  else if (evalResult.status === 'Fail' || evalResult.status === 'Marginal' || driftRatio > 0.8) {
    decision = 'SHORTEN';
    recommendedInterval = Math.max(3, Math.round(currentInterval * 0.5)); // Kurangi 50%
    justification = `Penyimpangan alat terdeteksi cukup tinggi (${maxDrift}%) dan mendekati batas toleransi pabrikan. Jadwal kalibrasi dipersingkat dari ${currentInterval} bulan menjadi ${recommendedInterval} bulan agar performa alat tetap terjaga.`;

    stepLogs.push({
      stepNumber: 13,
      title: 'Uji Kelayakan Pemendekan Interval (Shorten)',
      questionOrCheck: 'Apakah interval kalibrasi harus dipersingkat?',
      result: 'JADWAL DIPERSINGKAT',
      status: 'warning',
      details: justification
    });
  }
  // Step 14: Check Extend Interval Trigger (Stabil, Pass, Drift < 50-75% batas vendor)
  else if (evalResult.status === 'Pass' && driftRatio < 0.6 && currentSession.as_left_status !== 'Adjusted') {
    decision = 'EXTEND';
    isExtensionEligible = true;
    
    // Perpanjang 50% dari interval saat ini (maksimal 36 bulan)
    const extended = Math.min(36, Math.round(currentInterval * 1.5));
    recommendedInterval = extended > currentInterval ? extended : currentInterval + 6;
    justification = `Kondisi alat sangat stabil dengan penyimpangan (${maxDrift}%) jauh di bawah batas toleransi (±${vendorTol}%). Jadwal kalibrasi aman untuk diperpanjang dari ${currentInterval} bulan menjadi ${recommendedInterval} bulan.`;

    stepLogs.push({
      stepNumber: 14,
      title: 'Uji Kelayakan Perpanjangan Interval (Extend)',
      questionOrCheck: 'Apakah instrumen memenuhi syarat perpanjangan interval dinamis?',
      result: 'JADWAL DIPERPANJANG',
      status: 'passed',
      details: justification
    });
  }
  // Step 15: Maintain Current Interval
  else {
    decision = 'MAINTAIN';
    recommendedInterval = currentInterval;
    justification = `Alat berfungsi normal dan hasil kalibrasi lulus dalam batas toleransi. Jadwal kalibrasi ${currentInterval} bulan tetap dipertahankan.`;

    stepLogs.push({
      stepNumber: 15,
      title: 'Uji Kelayakan Pemeliharaan Interval (Maintain)',
      questionOrCheck: 'Apakah interval saat ini sudah optimal?',
      result: 'JADWAL DIPERTAHANKAN',
      status: 'passed',
      details: justification
    });
  }

  // Step 16: Next Due Date Calculation
  const nextDueDate = calculateNextDueDate(currentSession.calibration_date, recommendedInterval);
  stepLogs.push({
    stepNumber: 16,
    title: 'Penetapan Tanggal Jatuh Tempo Kalibrasi Baru',
    questionOrCheck: 'Kalkulasi tanggal jatuh tempo berdasarkan interval yang direkomendasikan.',
    result: `Jatuh Tempo: ${nextDueDate} (${recommendedInterval} Bulan)`,
    status: 'passed',
    details: `Dihitung dari tanggal kalibrasi ${currentSession.calibration_date} + ${recommendedInterval} bulan.`
  });

  // Step 17: Final Technical Audit Summary
  stepLogs.push({
    stepNumber: 17,
    title: 'Penerbitan Ringkasan Rekomendasi RCM',
    questionOrCheck: 'Finalisasi rekomendasi tindakan untuk lembar kerja kalibrasi dan audit teknis.',
    result: `KEPUTUSAN AKHIR: ${decision}`,
    status: decision === 'EXTEND' ? 'passed' : decision === 'MAINTAIN' ? 'passed' : 'warning',
    details: justification
  });

  return {
    decision,
    classification,
    recommendedIntervalMonths: recommendedInterval,
    nextDueDate,
    justification,
    stepLogs,
    isExtensionEligible,
    isRedesignRecommended
  };
};
