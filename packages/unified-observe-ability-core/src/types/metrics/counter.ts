import { UnifiedLabelSet } from './labels';

export interface UnifiedCounter {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys: string[];
  
  increment(labels?: UnifiedLabelSet, value?: number): void;
  get(labels?: UnifiedLabelSet): number;
}

export interface UnifiedCounterOptions {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys?: string[];
}

export interface UnifiedCounterValue {
  readonly labels: UnifiedLabelSet;
  readonly value: number;
  readonly timestamp: number;
}