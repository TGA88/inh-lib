import { LabelSet } from './labels';

export interface UnifiedGauge {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys: string[];
  
  set(value: number, labels?: LabelSet): void;
  add(value: number, labels?: LabelSet): void;
  subtract(value: number, labels?: LabelSet): void;
  get(labels?: LabelSet): number;
}

export interface GaugeOptions {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys?: string[];
}

export interface GaugeValue {
  readonly labels: LabelSet;
  readonly value: number;
  readonly timestamp: number;
}