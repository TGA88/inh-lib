import { UnifiedLabelSet } from './labels';

export interface UnifiedGauge {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys: string[];
  
  set(value: number, labels?: UnifiedLabelSet): void;
  add(value: number, labels?: UnifiedLabelSet): void;
  subtract(value: number, labels?: UnifiedLabelSet): void;
  get(labels?: UnifiedLabelSet): number;
}

export interface UnifiedGaugeOptions {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys?: string[];
}

export interface UnifiedGaugeValue {
  readonly labels: UnifiedLabelSet;
  readonly value: number;
  readonly timestamp: number;
}