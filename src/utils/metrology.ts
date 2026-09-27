/**
 * Metrology Calculation Utilities for Calibration Systems
 * Accurately computes Span, % Span, Errors, Drifts, and Tolerance Compliance
 */

import { DataPoint, Instrument } from '../types/schema';

export interface ToleranceEvaluation {
  status: 'Pass' | 'Fail' | 'Marginal';
  maxErrorPercent: number;
  maxDriftPercent: number;
  isWithinVendorTolerance: boolean;
  isWithinProcessTolerance: boolean;
  outOfTolerancePoints: number[];
}

/**
 * Calculate the full span of an instrument
 */
export const calculateSpan = (rangeMin: number, rangeMax: number): number => {
  return Math.abs(rangeMax - rangeMin);
};

/**
 * Calculate the ideal standard input at a specific % span
 */
export const calculateStandardInput = (rangeMin: number, rangeMax: number, percentSpan: number): number => {
  const span = calculateSpan(rangeMin, rangeMax);
  const val = rangeMin + (span * (percentSpan / 100));
  return Number(val.toFixed(4));
};

/**
 * Calculate the absolute error (Reading - Standard Input)
 */
export const calculateError = (reading: number, standardInput: number): number => {
  return Number((reading - standardInput).toFixed(4));
};

/**
 * Calculate the error as a percentage of instrument span
 * Error % = (Error / Span) * 100
 */
export const calculateErrorPercent = (error: number, span: number): number => {
  if (span === 0) return 0;
  return Number(((error / span) * 100).toFixed(4));
};

/**
 * Calculate Drift between current calibration error and previous calibration error
 * Drift = Current As-Found Error - Previous Error (or Current Reading - Previous Reading)
 */
export const calculateDrift = (currentError: number, previousError: number | null): number => {
  if (previousError === null || previousError === undefined) {
    return currentError;
  }
  return Number((currentError - previousError).toFixed(4));
};

/**
 * Calculate Drift as a percentage of instrument span
 */
export const calculateDriftPercent = (drift: number, span: number): number => {
  if (span === 0) return 0;
  return Number(((drift / span) * 100).toFixed(4));
};

/**
 * Generate standard calibration test point presets (e.g. 3-point: 0, 50, 100% or 5-point: 0, 25, 50, 75, 100%)
 */
export const generateDefaultTestPoints = (
  rangeMin: number, 
  rangeMax: number, 
  pointCount: 3 | 5 | 9 = 5
): DataPoint[] => {
  const percentages = pointCount === 3 
    ? [0, 50, 100] 
    : pointCount === 5 
      ? [0, 25, 50, 75, 100] 
      : [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];

  return percentages.map(percent => {
    const standardInput = calculateStandardInput(rangeMin, rangeMax, percent);
    return {
      percent_span: percent,
      standard_input: standardInput,
      as_found_reading: standardInput,
      as_found_error: 0,
      as_found_error_percent: 0,
      as_left_reading: null,
      as_left_error: null,
      as_left_error_percent: null,
      previous_error: 0,
      calculated_drift: 0,
      calculated_drift_percent: 0
    };
  });
};

/**
 * Comprehensive Tolerance and Drift Evaluation for a Calibration Session
 */
export const evaluateCalibrationData = (
  dataPoints: DataPoint[],
  instrument: Instrument
): ToleranceEvaluation => {
  const span = calculateSpan(instrument.range_min, instrument.range_max);
  const vendorTolPct = instrument.vendor_tolerance_percent;
  // Convert process tolerance to percentage of span if given in engineering units
  const processTolPct = span > 0 ? (instrument.process_tolerance / span) * 100 : vendorTolPct;

  let maxErrorPercent = 0;
  let maxDriftPercent = 0;
  const outOfTolerancePoints: number[] = [];

  dataPoints.forEach((pt, index) => {
    const errorPct = Math.abs(pt.as_found_error_percent);
    const driftPct = Math.abs(pt.calculated_drift_percent || 0);

    if (errorPct > maxErrorPercent) maxErrorPercent = errorPct;
    if (driftPct > maxDriftPercent) maxDriftPercent = driftPct;

    if (errorPct > vendorTolPct || errorPct > processTolPct) {
      outOfTolerancePoints.push(index);
    }
  });

  const isWithinVendorTolerance = maxErrorPercent <= vendorTolPct;
  const isWithinProcessTolerance = maxErrorPercent <= processTolPct;

  let status: 'Pass' | 'Fail' | 'Marginal' = 'Pass';
  if (!isWithinVendorTolerance || !isWithinProcessTolerance) {
    status = 'Fail';
  } else if (maxErrorPercent > vendorTolPct * 0.8 || maxDriftPercent > vendorTolPct * 0.8) {
    // Within 80% to 100% of tolerance limit
    status = 'Marginal';
  }

  return {
    status,
    maxErrorPercent: Number(maxErrorPercent.toFixed(4)),
    maxDriftPercent: Number(maxDriftPercent.toFixed(4)),
    isWithinVendorTolerance,
    isWithinProcessTolerance,
    outOfTolerancePoints
  };
};
