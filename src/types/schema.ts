/**
 * Schema Definitions for RCM-Based Instrument Calibration System
 * Based on Neil Bloom's Reliability Centered Maintenance logic and system.md blueprint
 */

export type RCMClassification = 'Critical' | 'Non-Critical' | 'Run-To-Failure' | 'Redesign';

export type RCMDecisionAction = 'EXTEND' | 'MAINTAIN' | 'SHORTEN' | 'RUN-TO-FAILURE' | 'REDESIGN';

export type CalibrationStatus = 'Pass' | 'Fail' | 'Marginal' | 'Not Adjusted' | 'Adjusted';

export type ProcessVariableType = 
  | 'Pressure' 
  | 'Temperature' 
  | 'Weight' 
  | 'Flow' 
  | 'Level' 
  | 'Electrical' 
  | 'Analytical' 
  | 'Dimensional' 
  | 'Custom' 
  | string;

export interface Metadata {
  app_version: string;
  last_updated: string;
  organization: string;
}

export interface RcmProfile {
  is_functional: boolean;
  triggers_operator_action: boolean;
  is_redundant: boolean;
  indication_comparison_possible: boolean;
  acceptable_drift_consequence: boolean;
  final_classification: RCMClassification;
  custom_notes?: string;
}

export interface DataPoint {
  percent_span: number;
  standard_input: number;
  as_found_reading: number;
  as_found_error: number;
  as_found_error_percent: number;
  as_left_reading: number | null;
  as_left_error: number | null;
  as_left_error_percent: number | null;
  previous_error: number | null;
  calculated_drift: number | null;
  calculated_drift_percent: number | null;
}

export interface CalibrationSession {
  calibration_id: number;
  calibration_date: string;
  technician_name: string;
  calibrator_standard_id: string;
  calibration_type: 'Field' | 'Workshop' | 'Bench' | string;
  environment_temperature: number;
  environment_humidity: number;
  as_found_status: CalibrationStatus;
  as_left_status: CalibrationStatus;
  decision_action: RCMDecisionAction;
  previous_interval_months: number;
  recommended_interval_months: number;
  notes: string;
  data_points: DataPoint[];
}

export interface Instrument {
  instrument_id: number;
  tag_number: string;
  description: string;
  location: string;
  process_variable: ProcessVariableType;
  range_min: number;
  range_max: number;
  engineering_unit: string;
  process_tolerance: number;
  vendor_tolerance_percent: number;
  current_interval_months: number;
  next_due_date: string;
  created_at: string;
  rcm_profile: RcmProfile;
  calibration_history: CalibrationSession[];
}

export interface IntermediateCheck {
  check_id: number;
  instrument_id: number;
  check_date: string;
  inspector_name: string;
  reference_value: number;
  observed_value: number;
  deviation: number;
  status: 'OK' | 'Warning' | 'Fail';
  notes: string;
}

export interface CalibrationDatabase {
  metadata: Metadata;
  instruments: Instrument[];
  intermediate_checks: IntermediateCheck[];
}

/**
 * Storage state result and backup metadata
 */
export interface StorageStatus {
  source: 'tauri-fs' | 'browser-storage' | 'memory';
  lastSaved: string;
  itemCount: number;
  isDirty: boolean;
  storageKey: string;
}
