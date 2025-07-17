import { LabelValue } from '../../utils/type.utils';
import { LabelMatchOperator } from '../../constants/vendor-types';

export interface LabelSet {
  readonly [key: string]: LabelValue;
}

export interface LabelMatcher {
  readonly key: string;
  readonly value: LabelValue;
  readonly operator: LabelMatchOperator;
}

export interface LabelSelector {
  readonly matchers: LabelMatcher[];
}