import { LabelSet } from './labels';

export interface UnifiedCounter {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys: string[];
  
  increment(labels?: LabelSet, value?: number): void;
  get(labels?: LabelSet): number;
}

export interface CounterOptions {
  readonly name: string;
  readonly description: string;
  readonly unit?: string;
  readonly labelKeys?: string[];
}

export interface CounterValue {
  readonly labels: LabelSet;
  readonly value: number;
  readonly timestamp: number;
}