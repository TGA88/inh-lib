import { UnifiedLabelValue } from '../../utils/type.utils';
import { UnifiedLabelMatchOperator } from '../../constants/vendor-types';

export interface UnifiedLabelSet {
  readonly [key: string]: UnifiedLabelValue;
}

export interface UnifiedLabelMatcher {
  readonly key: string;
  readonly value: UnifiedLabelValue;
  readonly operator: UnifiedLabelMatchOperator;
}

export interface UnifiedLabelSelector {
  readonly matchers: UnifiedLabelMatcher[];
}