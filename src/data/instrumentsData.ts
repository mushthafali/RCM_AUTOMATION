import { CalibrationDatabase, Instrument, CalibrationSession, DataPoint, IntermediateCheck, RcmProfile } from '../types/schema';

// Helper to generate realistic data points
function genPoints(
  min: number,
  max: number,
  steps: number[],
  asFoundErrPercent: (span: number) => number,
  prevErrPercent: (span: number) => number = () => 0
): DataPoint[] {
  const spanRange = max - min;
  return steps.map(pct => {
    const stdInput = Number((min + (spanRange * pct) / 100).toFixed(4));
    const curErrPct = Number(asFoundErrPercent(pct).toFixed(4));
    const pErrPct = Number(prevErrPercent(pct).toFixed(4));
    const curErr = Number(((spanRange * curErrPct) / 100).toFixed(4));
    const asFoundReading = Number((stdInput + curErr).toFixed(4));
    const driftPct = Number((curErrPct - pErrPct).toFixed(4));
    const drift = Number(((spanRange * driftPct) / 100).toFixed(4));

    return {
      percent_span: pct,
      standard_input: stdInput,
      as_found_reading: asFoundReading,
      as_found_error: curErr,
      as_found_error_percent: curErrPct,
      as_left_reading: null,
      as_left_error: null,
      as_left_error_percent: null,
      previous_error: Number(((spanRange * pErrPct) / 100).toFixed(4)),
      calculated_drift: drift,
      calculated_drift_percent: driftPct
    };
  });
}

const FIVE_PTS = [0, 25, 50, 75, 100];
const TEN_PTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

interface InstrumentConfig {
  id: number;
  tag: string;
  desc: string;
  loc: string;
  pv: string;
  min: number;
  max: number;
  unit: string;
  procTol: number;
  vendorTol: number;
  interval: number;
  nextDue: string;
  created: string;
  rcm: RcmProfile;
  standard: string;
  technician: string;
  pattern: 'stable' | 'zero_shift' | 'span_shift' | 'tighten' | 'maintain' | 'run_to_failure';
}

function build5Sessions(cfg: InstrumentConfig): CalibrationSession[] {
  const steps = cfg.pv === 'Weight' ? TEN_PTS : FIVE_PTS;
  const sessions: CalibrationSession[] = [];
  const baseYear = 2022;

  // Track previous error percent function for calculating drift
  let prevErrFunc: (span: number) => number = () => 0;

  for (let s = 0; s < 5; s++) {
    const year = baseYear + s;
    const month = String(((cfg.id % 9) + 1)).padStart(2, '0');
    const day = String(((cfg.id % 20) + 5)).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    let curErrFunc: (span: number) => number;
    let status: 'Pass' | 'Marginal' | 'Fail' = 'Pass';
    let action: 'EXTEND' | 'MAINTAIN' | 'SHORTEN' | 'RUN-TO-FAILURE' = 'MAINTAIN';
    let recInterval = cfg.interval;
    let notes = '';

    const vt = cfg.vendorTol;

    switch (cfg.pattern) {
      case 'stable':
        curErrFunc = (p) => Number((0.02 * vt + (p / 100) * 0.05 * vt + (s * 0.005 * vt)).toFixed(4));
        action = s >= 1 ? 'EXTEND' : 'MAINTAIN';
        recInterval = Math.min(36, cfg.interval + (s >= 1 ? 6 : 0));
        notes = s === 4 
          ? `Kondisi alat sangat stabil selama 5 sesi kalibrasi (error < 30% toleransi vendor ±${vt}%). Interval direkomendasikan diperpanjang.`
          : `Kalibrasi berkala tahun ke-${s + 1}, performa linier dan drift minimal.`;
        break;

      case 'zero_shift':
        // Zero point shifts upward progressively while span stays relatively parallel
        const zeroShift = (0.08 + s * 0.12) * vt;
        curErrFunc = (p) => Number((zeroShift + (p / 100) * 0.04 * vt).toFixed(4));
        action = 'MAINTAIN';
        recInterval = cfg.interval;
        notes = s === 4
          ? `Terdeteksi pergeseran titik nol (Zero Shift ±${(zeroShift).toFixed(3)}%). Cukup atur ulang sekrup zero atau tare.`
          : `Kalibrasi sesi #${s + 1}, sedikit deviasi pada titik awal.`;
        break;

      case 'span_shift':
        // Zero stays low, high span error increases
        const spanShift = (0.05 + s * 0.15) * vt;
        curErrFunc = (p) => Number((0.02 * vt + (p / 100) * spanShift).toFixed(4));
        if (s === 4) {
          status = 'Marginal';
          action = 'SHORTEN';
          recInterval = Math.max(3, Math.round(cfg.interval * 0.5));
          notes = `Penyimpangan membesar di rentang atas span (±${(spanShift).toFixed(3)}%). Jadwal kalibrasi dipersingkat ke ${recInterval} bulan.`;
        } else {
          action = 'MAINTAIN';
          notes = `Kalibrasi sesi #${s + 1}, deviasi span atas mulai terlihat meningkat.`;
        }
        break;

      case 'tighten':
        // Accelerating drift towards vendor limit
        const accRatio = 0.15 + s * 0.19; // 0.15, 0.34, 0.53, 0.72, 0.91
        curErrFunc = (p) => Number((accRatio * vt * (0.8 + (p / 100) * 0.3)).toFixed(4));
        if (s === 4) {
          status = 'Marginal';
          action = 'SHORTEN';
          recInterval = Math.max(3, Math.round(cfg.interval * 0.5));
          notes = `Penyimpangan alat mendekati batas toleransi vendor (${(accRatio * 100).toFixed(0)}%). Interval kalibrasi dipangkas 50% menjadi ${recInterval} bulan.`;
        } else {
          action = 'MAINTAIN';
          notes = `Kalibrasi sesi #${s + 1}, kondisi dalam batas wajar.`;
        }
        break;

      case 'run_to_failure':
        curErrFunc = (p) => Number((0.15 * vt + (p / 100) * 0.1 * vt).toFixed(4));
        action = 'RUN-TO-FAILURE';
        recInterval = 36;
        notes = `Komponen non-kritis dan memiliki redundansi. Kalibrasi kondisional (run-to-failure).`;
        break;

      case 'maintain':
      default:
        curErrFunc = (p) => Number((0.12 * vt + (p / 100) * 0.1 * vt + (s % 2 === 0 ? 0.03 : -0.02) * vt).toFixed(4));
        action = 'MAINTAIN';
        recInterval = cfg.interval;
        notes = `Hasil kalibrasi sesi #${s + 1} lulus dalam batas toleransi normal. Interval ${cfg.interval} bulan dipertahankan.`;
        break;
    }

    const dataPoints = genPoints(cfg.min, cfg.max, steps, curErrFunc, s > 0 ? prevErrFunc : () => 0);
    prevErrFunc = curErrFunc;

    sessions.push({
      calibration_id: cfg.id * 10 + s + 1,
      calibration_date: dateStr,
      technician_name: cfg.technician,
      calibrator_standard_id: cfg.standard,
      calibration_type: s % 2 === 0 ? 'Field' : 'Workshop',
      environment_temperature: Number((23 + (s * 0.8) % 4).toFixed(1)),
      environment_humidity: Number((50 + (s * 2.5) % 15).toFixed(1)),
      as_found_status: status,
      as_left_status: status === 'Marginal' ? 'Adjusted' : 'Not Adjusted',
      decision_action: action,
      previous_interval_months: s === 0 ? cfg.interval : sessions[s - 1].recommended_interval_months,
      recommended_interval_months: recInterval,
      notes: notes,
      data_points: dataPoints
    });
  }

  return sessions;
}

function createInst(cfg: InstrumentConfig): Instrument {
  return {
    instrument_id: cfg.id,
    tag_number: cfg.tag,
    description: cfg.desc,
    location: cfg.loc,
    process_variable: cfg.pv,
    range_min: cfg.min,
    range_max: cfg.max,
    engineering_unit: cfg.unit,
    process_tolerance: cfg.procTol,
    vendor_tolerance_percent: cfg.vendorTol,
    current_interval_months: cfg.interval,
    next_due_date: cfg.nextDue,
    created_at: cfg.created,
    rcm_profile: cfg.rcm,
    calibration_history: build5Sessions(cfg)
  };
}

// 80 Instrument Configurations (10 for each of the 8 Physical Quantities)
const rawConfigs: InstrumentConfig[] = [
  // ── 1. PRESSURE (PT-101 .. PT-110) ──
  {
    id: 101, tag: 'PT-101', desc: 'Boiler Main Steam Header Pressure', loc: 'Boiler House Unit 1', pv: 'Pressure',
    min: 0, max: 25, unit: 'bar', procTol: 0.3, vendorTol: 0.20, interval: 18, nextDue: '2027-04-15', created: '2022-04-15T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Tekanan steam utama boiler bertekanan tinggi.' },
    standard: 'DPI-620-GENII', technician: 'Ahmad Fauzi', pattern: 'stable'
  },
  {
    id: 102, tag: 'PT-102', desc: 'Reactor Vessel N2 Blanketing Pressure', loc: 'Production Building Area A', pv: 'Pressure',
    min: 0, max: 50, unit: 'psig', procTol: 0.3, vendorTol: 0.25, interval: 18, nextDue: '2027-08-15', created: '2022-02-15T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: false, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Tekanan reaktor krusial mencegah ledakan overpressure.' },
    standard: 'CAL-STD-PRESS-01', technician: 'Budi Santoso', pattern: 'stable'
  },
  {
    id: 103, tag: 'PT-103', desc: 'Hydraulic Power Unit Discharge Line', loc: 'Press Machine Bay 3', pv: 'Pressure',
    min: 0, max: 250, unit: 'bar', procTol: 1.5, vendorTol: 0.50, interval: 6, nextDue: '2026-11-20', created: '2022-05-20T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: false, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Tekanan hidrolik tinggi beresiko seal failure jika drift tidak terpantau.' },
    standard: 'FLUKE-754-HPU', technician: 'Ahmad Fauzi', pattern: 'tighten'
  },
  {
    id: 104, tag: 'PT-104', desc: 'Instrument Air Compressor Discharge', loc: 'Utility Compressor Station', pv: 'Pressure',
    min: 0, max: 10, unit: 'bar', procTol: 0.2, vendorTol: 0.25, interval: 12, nextDue: '2027-01-10', created: '2022-01-10T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Tersedia kompresor cadangan paralel dengan auto switchover.' },
    standard: 'DPI-620-GENII', technician: 'Dwi Prasetyo', pattern: 'maintain'
  },
  {
    id: 105, tag: 'PT-105', desc: 'Cleanroom HVAC Differential Pressure', loc: 'Pharma Cleanroom Class B', pv: 'Pressure',
    min: -50, max: 100, unit: 'Pa', procTol: 5.0, vendorTol: 0.50, interval: 12, nextDue: '2027-03-05', created: '2022-03-05T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Tekanan positif cleanroom wajib memenuhi regulasi cGMP BPOM.' },
    standard: 'CAL-MICROMAN-01', technician: 'Budi Santoso', pattern: 'zero_shift'
  },
  {
    id: 106, tag: 'PT-106', desc: 'Vacuum Distillation Column Top Pressure', loc: 'Refinery Distillation Bay', pv: 'Pressure',
    min: 0, max: 1000, unit: 'mbar', procTol: 5.0, vendorTol: 0.25, interval: 12, nextDue: '2026-12-15', created: '2022-06-15T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Vakum destilasi mengontrol fraksinasi fraksi minyak bumi.' },
    standard: 'DPI-620-GENII', technician: 'Ahmad Fauzi', pattern: 'span_shift'
  },
  {
    id: 107, tag: 'PT-107', desc: 'Natural Gas Custody Metering Header', loc: 'Gas Metering Station 01', pv: 'Pressure',
    min: 0, max: 400, unit: 'kPa', procTol: 1.0, vendorTol: 0.15, interval: 18, nextDue: '2027-07-22', created: '2022-07-22T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Faktur pembelian gas industri berbasis volume kompensasi tekanan.' },
    standard: 'BEAMEX-MC6-GAS', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  },
  {
    id: 108, tag: 'PT-108', desc: 'Chilled Water Pump Suction Pressure', loc: 'Chiller Plant Room B', pv: 'Pressure',
    min: 0, max: 6, unit: 'bar', procTol: 0.2, vendorTol: 0.50, interval: 24, nextDue: '2027-11-18', created: '2022-11-18T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Sensor pendukung monitoring kavitasi pompa chilled water.' },
    standard: 'DPI-620-GENII', technician: 'Dwi Prasetyo', pattern: 'maintain'
  },
  {
    id: 109, tag: 'PT-109', desc: 'Lube Oil Filter Differential Pressure', loc: 'Turbine Auxiliary Skid', pv: 'Pressure',
    min: 0, max: 2.5, unit: 'bar', procTol: 0.2, vendorTol: 1.00, interval: 36, nextDue: '2028-09-12', created: '2022-09-12T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Run-To-Failure', custom_notes: 'Hanya indikator sumbatan filter oli, dilengkapi differential switch cadangan.' },
    standard: 'DPI-620-GENII', technician: 'Dwi Prasetyo', pattern: 'run_to_failure'
  },
  {
    id: 110, tag: 'PT-110', desc: 'Autoclave Sterilizer Chamber Pressure', loc: 'Sterilization Facility Bay 4', pv: 'Pressure',
    min: 0, max: 4, unit: 'bar', procTol: 0.05, vendorTol: 0.20, interval: 12, nextDue: '2027-01-30', created: '2022-01-30T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Parameter kunci validasi sterilisasi medis siklus steam 121°C.' },
    standard: 'CAL-STD-PRESS-01', technician: 'Budi Santoso', pattern: 'maintain'
  },

  // ── 2. TEMPERATURE (TT-201 .. TT-210) ──
  {
    id: 201, tag: 'TT-201', desc: 'Reactor Core Multi-Point RTD Pt100', loc: 'Polymerization Reactor R-101', pv: 'Temperature',
    min: -20, max: 180, unit: '°C', procTol: 0.5, vendorTol: 0.15, interval: 18, nextDue: '2027-05-14', created: '2022-05-14T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Pengendalian suhu reaksi eksotermik mencegah runaway reaction.' },
    standard: 'FLUKE-9144-WELL', technician: 'Rian Gunawan', pattern: 'stable'
  },
  {
    id: 202, tag: 'TT-202', desc: 'Heat Exchanger Primary Tube Outlet', loc: 'Heat Recovery Area', pv: 'Temperature',
    min: 0, max: 150, unit: '°C', procTol: 1.0, vendorTol: 0.25, interval: 12, nextDue: '2027-02-18', created: '2022-02-18T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Tersedia sensor pembanding di sisi sekunder heat exchanger.' },
    standard: 'FLUKE-9144-WELL', technician: 'Rian Gunawan', pattern: 'maintain'
  },
  {
    id: 203, tag: 'TT-203', desc: 'Superheated Steam Line Temperature', loc: 'Turbine Hall Steam Ingress', pv: 'Temperature',
    min: 0, max: 450, unit: '°C', procTol: 2.0, vendorTol: 0.50, interval: 6, nextDue: '2026-10-10', created: '2022-04-10T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: false, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Termokopel Type K beroperasi pada suhu tinggi kontinu.' },
    standard: 'CAL-DRYBLOCK-02', technician: 'Rian Gunawan', pattern: 'tighten'
  },
  {
    id: 204, tag: 'TT-204', desc: 'Cold Storage Vaccine Freezing Zone', loc: 'Warehouse Cold Chain Room 1', pv: 'Temperature',
    min: -40, max: 10, unit: '°C', procTol: 0.5, vendorTol: 0.20, interval: 12, nextDue: '2026-11-05', created: '2022-11-05T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Regulasi rantai dingin vaksin dan produk biologi (BPOM).' },
    standard: 'FLUKE-9144-WELL', technician: 'Ahmad Fauzi', pattern: 'maintain'
  },
  {
    id: 205, tag: 'TT-205', desc: 'Cooling Jacket Outlet Temperature', loc: 'Utility Chiller Station 1', pv: 'Temperature',
    min: -20, max: 100, unit: '°C', procTol: 1.0, vendorTol: 0.50, interval: 24, nextDue: '2027-10-01', created: '2022-10-01T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Suhu pendingin memiliki sensor sekunder dan alarm otomatis.' },
    standard: 'CAL-DRYBLOCK-02', technician: 'Rian Gunawan', pattern: 'stable'
  },
  {
    id: 206, tag: 'TT-206', desc: 'Rotary Kiln Burning Zone Pyrometer', loc: 'Cement Clinker Line 2', pv: 'Temperature',
    min: 200, max: 1200, unit: '°C', procTol: 15.0, vendorTol: 1.00, interval: 12, nextDue: '2027-01-20', created: '2022-01-20T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Pirometer optik non-kontak suhu 1100°C.' },
    standard: 'CAL-BLACKBODY-SOURCE', technician: 'Hendro (Lead Metrologist)', pattern: 'span_shift'
  },
  {
    id: 207, tag: 'TT-207', desc: 'AHU Supply Air Temperature Sensor', loc: 'Office Building HVAC Deck', pv: 'Temperature',
    min: 0, max: 50, unit: '°C', procTol: 1.0, vendorTol: 0.50, interval: 36, nextDue: '2028-08-10', created: '2022-08-10T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Run-To-Failure', custom_notes: 'Sensor kenyamanan ruangan kantor.' },
    standard: 'FLUKE-9144-WELL', technician: 'Dwi Prasetyo', pattern: 'run_to_failure'
  },
  {
    id: 208, tag: 'TT-208', desc: 'CIP Sanitization Return Line Temp', loc: 'Food Bottling Plant', pv: 'Temperature',
    min: 0, max: 120, unit: '°C', procTol: 0.8, vendorTol: 0.25, interval: 12, nextDue: '2027-03-25', created: '2022-03-25T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Siklus sanitasi panas higienitas pangan.' },
    standard: 'FLUKE-9144-WELL', technician: 'Budi Santoso', pattern: 'zero_shift'
  },
  {
    id: 209, tag: 'TT-209', desc: 'Transformer Oil Top Monitor Sensor', loc: 'Main Substation Trafo 1', pv: 'Temperature',
    min: 0, max: 120, unit: '°C', procTol: 1.5, vendorTol: 0.50, interval: 18, nextDue: '2027-06-12', created: '2022-06-12T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Mencegah degradasi dielektrik oli trafo.' },
    standard: 'CAL-DRYBLOCK-02', technician: 'Rian Gunawan', pattern: 'stable'
  },
  {
    id: 210, tag: 'TT-210', desc: 'Cryogenic Liquid Nitrogen Tank Temp', loc: 'Cryogenic Tank Yard', pv: 'Temperature',
    min: -200, max: 20, unit: '°C', procTol: 1.0, vendorTol: 0.30, interval: 12, nextDue: '2026-12-08', created: '2022-12-08T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Sensor kriogenik nitrogen cair -196°C.' },
    standard: 'FLUKE-9144-WELL', technician: 'Hendro (Lead Metrologist)', pattern: 'maintain'
  },

  // ── 3. WEIGHT (WT-301 .. WT-310) ── (All 10-Point Spans!)
  {
    id: 301, tag: 'WT-301', desc: 'Silo Batching Hopper Load Cell', loc: 'Raw Material Batching Bay 2', pv: 'Weight',
    min: 0, max: 2000, unit: 'kg', procTol: 2.0, vendorTol: 0.10, interval: 3, nextDue: '2026-11-10', created: '2022-05-10T09:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Menimbang bahan baku formula produk farmasi dan makanan.' },
    standard: 'STD-WEIGHT-M1-SET', technician: 'Hendro (Lead Metrologist)', pattern: 'tighten'
  },
  {
    id: 302, tag: 'WT-302', desc: 'Finished Goods Truck Weighbridge', loc: 'Main Logistics Weighbridge', pv: 'Weight',
    min: 0, max: 60, unit: 'ton', procTol: 0.03, vendorTol: 0.05, interval: 6, nextDue: '2026-12-15', created: '2022-06-15T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Jembatan timbang legal metrologi sertifikasi tera ulang.' },
    standard: 'TRUCK-TEST-WEIGHTS-M1', technician: 'Hendro (Lead Metrologist)', pattern: 'maintain'
  },
  {
    id: 303, tag: 'WT-303', desc: 'Analytical Micro-Dosing Powder Feeder', loc: 'Pharma Formulation Suite 3', pv: 'Weight',
    min: 0, max: 5000, unit: 'g', procTol: 1.0, vendorTol: 0.02, interval: 6, nextDue: '2027-01-20', created: '2022-01-20T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Penakaran zat aktif obat dosis tinggi presisi mikro.' },
    standard: 'STD-WEIGHT-E2-SET', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  },
  {
    id: 304, tag: 'WT-304', desc: 'IBC Tank Filling Platform Scale', loc: 'Liquid Filling Line B', pv: 'Weight',
    min: 0, max: 1500, unit: 'kg', procTol: 1.5, vendorTol: 0.10, interval: 12, nextDue: '2027-02-14', created: '2022-02-14T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Pengisian kontainer IBC cairan kimia.' },
    standard: 'STD-WEIGHT-M1-SET', technician: 'Ahmad Fauzi', pattern: 'zero_shift'
  },
  {
    id: 305, tag: 'WT-305', desc: 'Automated Checkweigher Conveyor Scale', loc: 'Packaging Line Conveyor 1', pv: 'Weight',
    min: 0, max: 50, unit: 'kg', procTol: 0.05, vendorTol: 0.05, interval: 12, nextDue: '2026-11-28', created: '2022-11-28T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Menyortir karton produk under-weight/over-weight dinamis.' },
    standard: 'STD-WEIGHT-F1-SET', technician: 'Hendro (Lead Metrologist)', pattern: 'span_shift'
  },
  {
    id: 306, tag: 'WT-306', desc: 'Molten Metal Ladle Crane Scale', loc: 'Steel Smelter Crane Bay', pv: 'Weight',
    min: 0, max: 30, unit: 'ton', procTol: 0.1, vendorTol: 0.20, interval: 6, nextDue: '2026-10-15', created: '2022-04-15T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: false, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Memonitor beban kran cairan baja panas.' },
    standard: 'TRUCK-TEST-WEIGHTS-M1', technician: 'Hendro (Lead Metrologist)', pattern: 'maintain'
  },
  {
    id: 307, tag: 'WT-307', desc: 'Bulk Bag Discharge Station Load Cell', loc: 'Dry Bulk Material Unloading', pv: 'Weight',
    min: 0, max: 1000, unit: 'kg', procTol: 2.0, vendorTol: 0.15, interval: 18, nextDue: '2027-04-05', created: '2022-04-05T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Memonitor sisa isi karung jumbo bag curah.' },
    standard: 'STD-WEIGHT-M1-SET', technician: 'Ahmad Fauzi', pattern: 'stable'
  },
  {
    id: 308, tag: 'WT-308', desc: 'Laboratory Semi-Micro Balance', loc: 'QC Analytical Laboratory', pv: 'Weight',
    min: 0, max: 220, unit: 'g', procTol: 0.001, vendorTol: 0.01, interval: 12, nextDue: '2027-03-10', created: '2022-03-10T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Timbangan laboratorium standar pengujian rilis produk.' },
    standard: 'STD-WEIGHT-E1-SET', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  },
  {
    id: 309, tag: 'WT-309', desc: 'Warehouse Receiving Pallet Scale', loc: 'Warehouse Goods Inward Bay', pv: 'Weight',
    min: 0, max: 3000, unit: 'kg', procTol: 5.0, vendorTol: 0.15, interval: 12, nextDue: '2027-06-25', created: '2022-06-25T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Timbangan penerimaan barang gudang umum.' },
    standard: 'STD-WEIGHT-M1-SET', technician: 'Ahmad Fauzi', pattern: 'maintain'
  },
  {
    id: 310, tag: 'WT-310', desc: 'Liquid Chemical Tank Weighing System', loc: 'Tank Farm Acid Storage Tank 4', pv: 'Weight',
    min: 0, max: 10, unit: 'ton', procTol: 0.02, vendorTol: 0.10, interval: 12, nextDue: '2027-01-15', created: '2022-01-15T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: '3 unit load cell mounting modul pada tangki asam sulfat.' },
    standard: 'TRUCK-TEST-WEIGHTS-M1', technician: 'Hendro (Lead Metrologist)', pattern: 'maintain'
  },

  // ── 4. FLOW (FT-401 .. FT-410) ──
  {
    id: 401, tag: 'FT-401', desc: 'Boiler Feedwater Coriolis Mass Flowmeter', loc: 'Boiler Water Treatment Line', pv: 'Flow',
    min: 0, max: 50, unit: 'ton/h', procTol: 0.15, vendorTol: 0.20, interval: 18, nextDue: '2027-04-20', created: '2022-04-20T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Coriolis flowmeter laju massa air umpan boiler bertekanan tinggi.' },
    standard: 'EH-FIELDCHECK-01', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  },
  {
    id: 402, tag: 'FT-402', desc: 'Natural Gas Custody Turbine Flowmeter', loc: 'Gas Fiscal Metering Station', pv: 'Flow',
    min: 0, max: 1500, unit: 'm³/h', procTol: 5.0, vendorTol: 0.25, interval: 12, nextDue: '2026-12-05', created: '2022-12-05T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Metering fiskal transaksi energi gas pipa negara.' },
    standard: 'MASTER-METER-GAS-01', technician: 'Hendro (Lead Metrologist)', pattern: 'maintain'
  },
  {
    id: 403, tag: 'FT-403', desc: 'Main Cooling Water Supply Magnetic Flow', loc: 'Circulating Water Pump House', pv: 'Flow',
    min: 0, max: 350, unit: 'm³/h', procTol: 3.0, vendorTol: 0.50, interval: 24, nextDue: '2027-08-15', created: '2022-08-15T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Debit air pendingin kondensor, memiliki sensor sekunder.' },
    standard: 'EH-FIELDCHECK-01', technician: 'Ahmad Fauzi', pattern: 'stable'
  },
  {
    id: 404, tag: 'FT-404', desc: 'Acid Dosing Micro Diaphragm Flowmeter', loc: 'Wastewater Treatment Chemical Skid', pv: 'Flow',
    min: 0, max: 120, unit: 'L/h', procTol: 1.0, vendorTol: 0.50, interval: 6, nextDue: '2026-11-20', created: '2022-05-20T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: false, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Dosis asam H2SO4 pekat ke tangki netralisasi limbah.' },
    standard: 'CAL-DOSING-BURETTE', technician: 'Ahmad Fauzi', pattern: 'tighten'
  },
  {
    id: 405, tag: 'FT-405', desc: 'Saturated Steam Vortex Flowmeter', loc: 'Process Plant Steam Distribution', pv: 'Flow',
    min: 0, max: 25, unit: 'ton/h', procTol: 0.3, vendorTol: 0.75, interval: 12, nextDue: '2027-02-10', created: '2022-02-10T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Vortex shedding sensor memonitor distribusi steam pabrik.' },
    standard: 'YOKOGAWA-CA71-PULSE', technician: 'Dwi Prasetyo', pattern: 'maintain'
  },
  {
    id: 406, tag: 'FT-406', desc: 'RO Permeate Ultrasonic Flowmeter', loc: 'Demin Plant RO Bay', pv: 'Flow',
    min: 0, max: 60, unit: 'm³/h', procTol: 0.5, vendorTol: 0.50, interval: 18, nextDue: '2027-05-18', created: '2022-05-18T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Ultrasonic clamp-on non-intrusif.' },
    standard: 'PORTABLE-ULTRASONIC-STD', technician: 'Dwi Prasetyo', pattern: 'stable'
  },
  {
    id: 407, tag: 'FT-407', desc: 'Fuel Oil Burner Supply Flowmeter', loc: 'Boiler 1 Burner Skid', pv: 'Flow',
    min: 0, max: 800, unit: 'L/h', procTol: 3.0, vendorTol: 0.30, interval: 12, nextDue: '2026-10-30', created: '2022-10-30T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Rasio stoikiometri bahan bakar solar burner.' },
    standard: 'MASTER-METER-LIQ-02', technician: 'Hendro (Lead Metrologist)', pattern: 'span_shift'
  },
  {
    id: 408, tag: 'FT-408', desc: 'Effluent Discharge Parshall Flume', loc: 'WWTP Final Outfall Canal', pv: 'Flow',
    min: 0, max: 200, unit: 'm³/h', procTol: 4.0, vendorTol: 1.00, interval: 12, nextDue: '2027-01-12', created: '2022-01-12T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Monitoring debit buangan air limbah lingkungan (KLHK).' },
    standard: 'CAL-LEVEL-STAFF-GAUGE', technician: 'Ahmad Fauzi', pattern: 'maintain'
  },
  {
    id: 409, tag: 'FT-409', desc: 'Compressed Air Consumption Flowmeter', loc: 'Plant Air Header', pv: 'Flow',
    min: 0, max: 2500, unit: 'm³/h', procTol: 30.0, vendorTol: 1.00, interval: 36, nextDue: '2028-06-20', created: '2022-06-20T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Run-To-Failure', custom_notes: 'Thermal mass flowmeter efisiensi konsumsi energi internal.' },
    standard: 'PORTABLE-PITOT-STD', technician: 'Dwi Prasetyo', pattern: 'run_to_failure'
  },
  {
    id: 410, tag: 'FT-410', desc: 'Syrup Concentrate Batching Coriolis', loc: 'Syrup Formulation Room', pv: 'Flow',
    min: 0, max: 5000, unit: 'kg/h', procTol: 5.0, vendorTol: 0.15, interval: 18, nextDue: '2027-04-10', created: '2022-04-10T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Dosis sirup kental produk minuman, kepatuhan kadar gula.' },
    standard: 'EH-FIELDCHECK-01', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  },

  // ── 5. LEVEL (LT-501 .. LT-510) ──
  {
    id: 501, tag: 'LT-501', desc: 'Boiler Steam Drum DP Level Transmitter', loc: 'Boiler Steam Drum High Deck', pv: 'Level',
    min: 0, max: 100, unit: '%', procTol: 0.5, vendorTol: 0.25, interval: 12, nextDue: '2027-02-28', created: '2022-02-28T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Level drum steam boiler; trip boiler interlock jika air surut.' },
    standard: 'DPI-620-GENII', technician: 'Budi Santoso', pattern: 'maintain'
  },
  {
    id: 502, tag: 'LT-502', desc: 'Raw Crude Oil Tank Guided Radar Level', loc: 'Tank Farm Bulk Storage T-101', pv: 'Level',
    min: 0, max: 18, unit: 'm', procTol: 0.02, vendorTol: 0.10, interval: 18, nextDue: '2027-05-15', created: '2022-05-15T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Custody transfer inventaris minyak mentah dan proteksi overfill.' },
    standard: 'CAL-RADAR-TARGET-01', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  },
  {
    id: 503, tag: 'LT-503', desc: 'Deaerator Feedwater Tank Level Sensor', loc: 'Boiler Feed Pump Skid', pv: 'Level',
    min: 0, max: 100, unit: '%', procTol: 1.0, vendorTol: 0.50, interval: 12, nextDue: '2026-11-15', created: '2022-11-15T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Level tangki deaerator penyedia air bebas gas terlarut.' },
    standard: 'DPI-620-GENII', technician: 'Budi Santoso', pattern: 'maintain'
  },
  {
    id: 504, tag: 'LT-504', desc: 'Chemical Dosing Tank Ultrasonic Level', loc: 'Cooling Tower Water Treatment', pv: 'Level',
    min: 0, max: 3000, unit: 'mm', procTol: 15.0, vendorTol: 0.50, interval: 12, nextDue: '2027-03-20', created: '2022-03-20T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Ultrasonic non-kontak tangki larutan anti-kerak.' },
    standard: 'CAL-LEVEL-TARGET-PLATE', technician: 'Dwi Prasetyo', pattern: 'zero_shift'
  },
  {
    id: 505, tag: 'LT-505', desc: 'Condensate Hotwell Magnetostrictive', loc: 'Turbine Condenser Pit', pv: 'Level',
    min: 0, max: 1500, unit: 'mm', procTol: 5.0, vendorTol: 0.25, interval: 18, nextDue: '2027-06-30', created: '2022-06-30T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Tingkat kondensat hotwell turbin uap.' },
    standard: 'CAL-MAG-BENCH-01', technician: 'Budi Santoso', pattern: 'stable'
  },
  {
    id: 506, tag: 'LT-506', desc: 'Clarifier Sludge Blanket Level Detector', loc: 'WWTP Primary Clarifier', pv: 'Level',
    min: 0, max: 5, unit: 'm', procTol: 0.1, vendorTol: 1.00, interval: 12, nextDue: '2026-10-18', created: '2022-10-18T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Ketinggian endapan lumpur bak pengolah limbah.' },
    standard: 'CAL-SLUDGE-TARGET', technician: 'Ahmad Fauzi', pattern: 'maintain'
  },
  {
    id: 507, tag: 'LT-507', desc: 'Cryogenic Liquid Nitrogen Tank DP Level', loc: 'Cryogenic Tank Yard', pv: 'Level',
    min: 0, max: 100, unit: '%', procTol: 1.0, vendorTol: 0.50, interval: 12, nextDue: '2027-01-25', created: '2022-01-25T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Mencegah tangki nitrogen cair kosong mendadak.' },
    standard: 'DPI-620-GENII', technician: 'Hendro (Lead Metrologist)', pattern: 'span_shift'
  },
  {
    id: 508, tag: 'LT-508', desc: 'Grain Silo 3D Solids Scanner Level', loc: 'Grain Elevator Silo', pv: 'Level',
    min: 0, max: 25, unit: 'm', procTol: 0.5, vendorTol: 0.50, interval: 12, nextDue: '2026-11-12', created: '2022-11-12T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Pemetaan volume butiran padat beras/jagung.' },
    standard: 'CAL-ACOUSTIC-STD', technician: 'Dwi Prasetyo', pattern: 'maintain'
  },
  {
    id: 509, tag: 'LT-509', desc: 'Turbine Lube Oil Sump Level Sensor', loc: 'Turbine Basement Lube Skid', pv: 'Level',
    min: 0, max: 500, unit: 'mm', procTol: 10.0, vendorTol: 1.00, interval: 36, nextDue: '2028-04-10', created: '2022-04-10T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Run-To-Failure', custom_notes: 'Sensor pelampung mekanik bak oli pelumas turbin.' },
    standard: 'CAL-FLOAT-RULER', technician: 'Dwi Prasetyo', pattern: 'run_to_failure'
  },
  {
    id: 510, tag: 'LT-510', desc: 'Polymer Reactor Surge Tank Radar Level', loc: 'Polymerization Process Deck', pv: 'Level',
    min: 0, max: 6, unit: 'm', procTol: 0.015, vendorTol: 0.20, interval: 18, nextDue: '2027-03-15', created: '2022-03-15T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Radar frekuensi tinggi 80GHz tahan uap kimia kondensasi.' },
    standard: 'CAL-RADAR-TARGET-01', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  },

  // ── 6. ELECTRICAL (ET-601 .. ET-610) ──
  {
    id: 601, tag: 'ET-601', desc: 'Main VFD Motor Drive Current Transducer', loc: 'Electrical VFD Room', pv: 'Electrical',
    min: 0, max: 500, unit: 'A', procTol: 1.0, vendorTol: 0.20, interval: 18, nextDue: '2027-05-10', created: '2022-05-10T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Memonitor arus motor utama 250kW extruder untuk proteksi overload.' },
    standard: 'FLUKE-5522A-MULTICAL', technician: 'Dwi Prasetyo', pattern: 'stable'
  },
  {
    id: 602, tag: 'ET-602', desc: '20kV Substation Busbar Voltage Sensor', loc: 'Medium Voltage Switchgear', pv: 'Electrical',
    min: 0, max: 25, unit: 'kV', procTol: 0.1, vendorTol: 0.20, interval: 12, nextDue: '2026-11-25', created: '2022-11-25T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Potensial transformer pengukur tegangan incoming PLN 20kV.' },
    standard: 'HV-DIVIDER-STANDARD-01', technician: 'Hendro (Lead Metrologist)', pattern: 'maintain'
  },
  {
    id: 603, tag: 'ET-603', desc: '4-20mA Signal Isolator Loop Calibrator', loc: 'Central Control Marshalling', pv: 'Electrical',
    min: 4, max: 20, unit: 'mA', procTol: 0.01, vendorTol: 0.05, interval: 18, nextDue: '2027-04-18', created: '2022-04-18T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Isolator loop arus sinyal analog keselamatan DCS.' },
    standard: 'FLUKE-754-DOCUMENTING', technician: 'Dwi Prasetyo', pattern: 'stable'
  },
  {
    id: 604, tag: 'ET-604', desc: 'Emergency Gen Frequency Transducer', loc: 'Diesel Generator DG-1', pv: 'Electrical',
    min: 45, max: 65, unit: 'Hz', procTol: 0.1, vendorTol: 0.10, interval: 12, nextDue: '2026-12-10', created: '2022-12-10T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Sinkronisasi frekuensi generator darurat.' },
    standard: 'FLUKE-5522A-MULTICAL', technician: 'Dwi Prasetyo', pattern: 'zero_shift'
  },
  {
    id: 605, tag: 'ET-605', desc: 'Plant Main Incomer Active Power Meter', loc: 'Main Substation Panel', pv: 'Electrical',
    min: 0, max: 1500, unit: 'kW', procTol: 5.0, vendorTol: 0.25, interval: 12, nextDue: '2027-02-15', created: '2022-02-15T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Power meter pemantauan pemakaian daya total pabrik.' },
    standard: 'CAL-POWER-STD-01', technician: 'Dwi Prasetyo', pattern: 'maintain'
  },
  {
    id: 606, tag: 'ET-606', desc: 'Cathodic Protection Potential Monitor', loc: 'Gas Pipeline Corridor', pv: 'Electrical',
    min: -2000, max: 2000, unit: 'mV', procTol: 20.0, vendorTol: 0.50, interval: 12, nextDue: '2026-10-25', created: '2022-10-25T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Potensial proteksi katodik pipa gas bawah tanah.' },
    standard: 'FLUKE-754-DOCUMENTING', technician: 'Ahmad Fauzi', pattern: 'tighten'
  },
  {
    id: 607, tag: 'ET-607', desc: 'Substation Grounding Earth Resistance', loc: 'Substation Ground Grid', pv: 'Electrical',
    min: 0, max: 10, unit: 'Ω', procTol: 0.5, vendorTol: 1.00, interval: 12, nextDue: '2027-01-18', created: '2022-01-18T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: false, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Resistansi pembumian keselamatan bahaya petir.' },
    standard: 'CAL-EARTH-TESTER-STD', technician: 'Dwi Prasetyo', pattern: 'maintain'
  },
  {
    id: 608, tag: 'ET-608', desc: 'UPS 24V DC Redundant Power Supply Mon', loc: 'Control Server Cabinet', pv: 'Electrical',
    min: 0, max: 30, unit: 'V', procTol: 0.2, vendorTol: 0.25, interval: 24, nextDue: '2027-07-14', created: '2022-07-14T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Power supply modul redundan 24VDC PLC.' },
    standard: 'FLUKE-754-DOCUMENTING', technician: 'Dwi Prasetyo', pattern: 'stable'
  },
  {
    id: 609, tag: 'ET-609', desc: 'Harmonic Distortion Power Analyzer', loc: 'Main Switchboard 2', pv: 'Electrical',
    min: 0, max: 50, unit: '%', procTol: 2.0, vendorTol: 0.50, interval: 36, nextDue: '2028-09-01', created: '2022-09-01T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Run-To-Failure', custom_notes: 'Pengukur Total Harmonic Distortion (THD) kabel daya.' },
    standard: 'CAL-POWER-STD-01', technician: 'Dwi Prasetyo', pattern: 'run_to_failure'
  },
  {
    id: 610, tag: 'ET-610', desc: 'Motor Insulation Resistance Mega-Ohm', loc: 'Motor Testing Workshop', pv: 'Electrical',
    min: 0, max: 5000, unit: 'MΩ', procTol: 50.0, vendorTol: 1.00, interval: 12, nextDue: '2027-03-01', created: '2022-03-01T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: false, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Pengujian ketahanan isolasi belitan stator motor 6.6kV.' },
    standard: 'CAL-MEGOHM-DECADE-01', technician: 'Dwi Prasetyo', pattern: 'maintain'
  },

  // ── 7. ANALYTICAL (AT-701 .. AT-710) ──
  {
    id: 701, tag: 'AT-701', desc: 'Neutralization Tank Online pH Sensor', loc: 'WWTP Basin 1', pv: 'Analytical',
    min: 0, max: 14, unit: 'pH', procTol: 0.1, vendorTol: 0.50, interval: 3, nextDue: '2026-10-15', created: '2022-04-15T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Baku mutu limbah cair pH 6-9 wajib regulasi KLHK.' },
    standard: 'BUFFER-SOL-NIST-4-7-10', technician: 'Rian Gunawan', pattern: 'tighten'
  },
  {
    id: 702, tag: 'AT-702', desc: 'Boiler Feedwater Conductivity Sensor', loc: 'Demin Water Header Line', pv: 'Analytical',
    min: 0, max: 20, unit: 'µS/cm', procTol: 0.2, vendorTol: 0.50, interval: 6, nextDue: '2026-11-20', created: '2022-05-20T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Mencegah pembentukan kerak silika boiler.' },
    standard: 'CAL-COND-STD-10US', technician: 'Rian Gunawan', pattern: 'maintain'
  },
  {
    id: 703, tag: 'AT-703', desc: 'Aeration Basin Dissolved Oxygen (DO)', loc: 'Activated Sludge Tank', pv: 'Analytical',
    min: 0, max: 20, unit: 'mg/L', procTol: 0.5, vendorTol: 0.50, interval: 6, nextDue: '2027-01-10', created: '2022-01-10T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Mengatur pasokan oksigen blower bakteri pengurai air limbah.' },
    standard: 'CAL-DO-AIR-SATURATED', technician: 'Rian Gunawan', pattern: 'maintain'
  },
  {
    id: 704, tag: 'AT-704', desc: 'Drinking Water Outfall Turbidity Meter', loc: 'Potable Water Distribution', pv: 'Analytical',
    min: 0, max: 100, unit: 'NTU', procTol: 0.5, vendorTol: 0.50, interval: 6, nextDue: '2026-12-05', created: '2022-12-05T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Kekeruhan air minum wajib < 1 NTU standar Permenkes.' },
    standard: 'FORMAZIN-TURB-STANDARD', technician: 'Hendro (Lead Metrologist)', pattern: 'maintain'
  },
  {
    id: 705, tag: 'AT-705', desc: 'Boiler Flue Gas Zirconia O2 Analyzer', loc: 'Boiler Exhaust Stack', pv: 'Analytical',
    min: 0, max: 25, unit: '% vol', procTol: 0.3, vendorTol: 0.50, interval: 12, nextDue: '2026-11-30', created: '2022-11-30T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Kontrol efisiensi pembakaran burner dan emisi gas buang CEMS.' },
    standard: 'SPAN-GAS-O2-CAL-CYLINDER', technician: 'Hendro (Lead Metrologist)', pattern: 'span_shift'
  },
  {
    id: 706, tag: 'AT-706', desc: 'Purified Water Total Organic Carbon', loc: 'Pharma Loop USP Water', pv: 'Analytical',
    min: 0, max: 1000, unit: 'ppb', procTol: 20.0, vendorTol: 0.50, interval: 6, nextDue: '2027-02-22', created: '2022-02-22T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Air murni farmasi (USP Purified Water TOC < 500 ppb).' },
    standard: 'TOC-USP-STANDARD-SET', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  },
  {
    id: 707, tag: 'AT-707', desc: 'Flammable Gas LEL Infrared Detector', loc: 'Solvent Storage Building', pv: 'Analytical',
    min: 0, max: 100, unit: '% LEL', procTol: 2.0, vendorTol: 1.00, interval: 6, nextDue: '2026-10-20', created: '2022-10-20T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: false, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Deteksi dini kebocoran gas mudah terbakar proteksi ledakan.' },
    standard: 'CH4-METHANE-50LEL-CYL', technician: 'Budi Santoso', pattern: 'tighten'
  },
  {
    id: 708, tag: 'AT-708', desc: 'Cooling Tower Free Chlorine Analyzer', loc: 'Biocide Dosing Skid', pv: 'Analytical',
    min: 0, max: 5, unit: 'ppm', procTol: 0.2, vendorTol: 0.50, interval: 6, nextDue: '2027-01-05', created: '2022-01-05T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Pengendalian biosida mencegah bakteri Legionella.' },
    standard: 'DPD-CHLORINE-CAL-STD', technician: 'Rian Gunawan', pattern: 'maintain'
  },
  {
    id: 709, tag: 'AT-709', desc: 'Raw Water Intake Colorimeter Analyzer', loc: 'River Water Intake', pv: 'Analytical',
    min: 0, max: 500, unit: 'unit', procTol: 10.0, vendorTol: 1.00, interval: 36, nextDue: '2028-05-12', created: '2022-05-12T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Run-To-Failure', custom_notes: 'Indikator warna air baku sungai sebelum koagulasi.' },
    standard: 'PT-CO-COLOR-STANDARD', technician: 'Dwi Prasetyo', pattern: 'run_to_failure'
  },
  {
    id: 710, tag: 'AT-710', desc: 'Fermentation Broth Redox Potential', loc: 'Biotech Fermentor F-201', pv: 'Analytical',
    min: -1000, max: 1000, unit: 'mV', procTol: 10.0, vendorTol: 0.50, interval: 6, nextDue: '2026-11-18', created: '2022-11-18T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Memonitor metabolisme anaerobik kultur sel fermentasi.' },
    standard: 'ORP-STANDARD-ZOEBELL', technician: 'Hendro (Lead Metrologist)', pattern: 'maintain'
  },

  // ── 8. DIMENSIONAL (DT-801 .. DT-810) ──
  {
    id: 801, tag: 'DT-801', desc: 'Steam Turbine Rotor Axial Displacement', loc: 'Turbine Bearing Pedestal 1', pv: 'Dimensional',
    min: -2, max: 2, unit: 'mm', procTol: 0.02, vendorTol: 0.25, interval: 18, nextDue: '2027-04-12', created: '2022-04-12T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Sensor eddy current keausan thrust bearing turbin uap.' },
    standard: 'BENTLY-MICROMETER-STD', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  },
  {
    id: 802, tag: 'DT-802', desc: 'Heavy Machine Vibration Velocity Sensor', loc: 'Boiler ID Fan', pv: 'Dimensional',
    min: 0, max: 50, unit: 'mm/s', procTol: 0.5, vendorTol: 0.50, interval: 12, nextDue: '2026-11-08', created: '2022-11-08T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Kecepatan getaran mekanik standar ISO 10816.' },
    standard: 'PORTABLE-SHAKER-TABLE-01', technician: 'Ahmad Fauzi', pattern: 'span_shift'
  },
  {
    id: 803, tag: 'DT-803', desc: 'Control Valve Stem Positioner LVDT', loc: 'Boiler Feed Valve CV-101', pv: 'Dimensional',
    min: 0, max: 100, unit: 'mm', procTol: 0.5, vendorTol: 0.20, interval: 18, nextDue: '2027-03-28', created: '2022-03-28T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Umpan balik posisi bukaan valve throttle aliran air boiler.' },
    standard: 'MITUTOYO-DIAL-CAL-01', technician: 'Budi Santoso', pattern: 'stable'
  },
  {
    id: 804, tag: 'DT-804', desc: 'Precision Digital Micrometer Calibrator', loc: 'Calibration Laboratory', pv: 'Dimensional',
    min: 0, max: 25, unit: 'mm', procTol: 0.002, vendorTol: 0.05, interval: 12, nextDue: '2027-02-12', created: '2022-02-12T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Standar primer laboratorium kalibrasi dimensi mekanik.' },
    standard: 'GAUGE-BLOCK-GRADE-0', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  },
  {
    id: 805, tag: 'DT-805', desc: 'Motor Shaft Alignment Dial Indicator', loc: 'Maintenance Workshop', pv: 'Dimensional',
    min: 0, max: 10, unit: 'mm', procTol: 0.02, vendorTol: 0.10, interval: 12, nextDue: '2026-12-18', created: '2022-12-18T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Dial indicator pemeriksaan runout kelurusan poros pompa.' },
    standard: 'MITUTOYO-CAL-TESTER', technician: 'Ahmad Fauzi', pattern: 'maintain'
  },
  {
    id: 806, tag: 'DT-806', desc: 'Flange Bolt Digital Torque Wrench', loc: 'HP Pipe Fitting Station', pv: 'Dimensional',
    min: 0, max: 500, unit: 'Nm', procTol: 5.0, vendorTol: 0.50, interval: 12, nextDue: '2026-11-30', created: '2022-11-30T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Pengencangan baut flens pipa uap bertekanan tinggi.' },
    standard: 'TORQUE-CALIBRATOR-STD-01', technician: 'Hendro (Lead Metrologist)', pattern: 'maintain'
  },
  {
    id: 807, tag: 'DT-807', desc: 'Rotating Machinery Optical Tachometer', loc: 'Condition Monitoring Skid', pv: 'Dimensional',
    min: 0, max: 10000, unit: 'rpm', procTol: 10.0, vendorTol: 0.10, interval: 12, nextDue: '2027-01-22', created: '2022-01-22T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Non-Critical', custom_notes: 'Tachometer laser non-kontak verifikasi putaran motor listrik.' },
    standard: 'CAL-TACHO-STROBE-01', technician: 'Dwi Prasetyo', pattern: 'maintain'
  },
  {
    id: 808, tag: 'DT-808', desc: 'Pipe Ultrasonic Wall Thickness Gauge', loc: 'Asset Integrity Inspection', pv: 'Dimensional',
    min: 0, max: 50, unit: 'mm', procTol: 0.1, vendorTol: 0.20, interval: 12, nextDue: '2026-10-05', created: '2022-10-05T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: false, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Pengukuran sisa ketebalan pipa uap deteksi korosi.' },
    standard: 'STEP-WEDGE-BLOCK-STD', technician: 'Hendro (Lead Metrologist)', pattern: 'maintain'
  },
  {
    id: 809, tag: 'DT-809', desc: 'Workshop Mechanical Vernier Caliper', loc: 'General Fabrication Bay', pv: 'Dimensional',
    min: 0, max: 300, unit: 'mm', procTol: 0.05, vendorTol: 0.50, interval: 36, nextDue: '2028-06-15', created: '2022-06-15T08:00:00Z',
    rcm: { is_functional: false, triggers_operator_action: false, is_redundant: true, indication_comparison_possible: true, acceptable_drift_consequence: true, final_classification: 'Run-To-Failure', custom_notes: 'Jangka sorong mekanis fabrikasi umum workshop.' },
    standard: 'GAUGE-BLOCK-GRADE-1', technician: 'Dwi Prasetyo', pattern: 'run_to_failure'
  },
  {
    id: 810, tag: 'DT-810', desc: 'CNC Machine Toolsetter Renishaw Probe', loc: 'Precision Tooling Bay', pv: 'Dimensional',
    min: 0, max: 10, unit: 'mm', procTol: 0.001, vendorTol: 0.02, interval: 12, nextDue: '2027-02-28', created: '2022-02-28T08:00:00Z',
    rcm: { is_functional: true, triggers_operator_action: true, is_redundant: false, indication_comparison_possible: true, acceptable_drift_consequence: false, final_classification: 'Critical', custom_notes: 'Probe sentuh koordinat nol mesin milling CNC.' },
    standard: 'RENISHAW-CAL-SPHERE', technician: 'Hendro (Lead Metrologist)', pattern: 'stable'
  }
];

// Generate all 80 instruments, each with 5 calibration sessions
export const ALL_SEED_INSTRUMENTS: Instrument[] = rawConfigs.map(createInst);

// Intermediate Checks (Pemeriksaan Antara)
export const ALL_SEED_INTERMEDIATE_CHECKS: IntermediateCheck[] = [
  {
    check_id: 1,
    instrument_id: 101,
    check_date: '2026-05-15',
    inspector_name: 'Budi Santoso',
    reference_value: 12.5,
    observed_value: 12.52,
    deviation: 0.02,
    status: 'OK',
    notes: 'Pemeriksaan antara titik tengah steam header normal.'
  },
  {
    check_id: 2,
    instrument_id: 301,
    check_date: '2026-07-10',
    inspector_name: 'Hendro (Lead Metrologist)',
    reference_value: 1000.0,
    observed_value: 1000.4,
    deviation: 0.4,
    status: 'OK',
    notes: 'Pemeriksaan beban uji 1000 kg anak timbangan standar kelas M1.'
  },
  {
    check_id: 3,
    instrument_id: 201,
    check_date: '2026-06-20',
    inspector_name: 'Rian Gunawan',
    reference_value: 100.0,
    observed_value: 100.1,
    deviation: 0.1,
    status: 'OK',
    notes: 'Verifikasi titik didih air 100°C RTD reaktor normal.'
  },
  {
    check_id: 4,
    instrument_id: 401,
    check_date: '2026-08-05',
    inspector_name: 'Ahmad Fauzi',
    reference_value: 25.0,
    observed_value: 25.05,
    deviation: 0.05,
    status: 'OK',
    notes: 'Pemeriksaan zero balance coriolis meter normal.'
  },
  {
    check_id: 5,
    instrument_id: 701,
    check_date: '2026-08-15',
    inspector_name: 'Rian Gunawan',
    reference_value: 7.0,
    observed_value: 7.05,
    deviation: 0.05,
    status: 'OK',
    notes: 'Uji buffer netral pH 7.00 di lapangan normal.'
  }
];

export const fullCalibrationDatabase: CalibrationDatabase = {
  metadata: {
    app_version: '2.1.0',
    last_updated: new Date().toISOString(),
    organization: 'PT. Industri Metrologi Prima Nusantara'
  },
  instruments: ALL_SEED_INSTRUMENTS,
  intermediate_checks: ALL_SEED_INTERMEDIATE_CHECKS
};
