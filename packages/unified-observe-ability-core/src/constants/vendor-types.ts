export const UnifiedMetricsVendorType = {
  PROMETHEUS: 'prometheus',
  DATADOG: 'datadog',
  NEWRELIC: 'newrelic',
  CLOUDWATCH: 'cloudwatch',
  OPENTELEMETRY: 'opentelemetry'
} as const;

export type UnifiedMetricsVendorType = typeof UnifiedMetricsVendorType[keyof typeof UnifiedMetricsVendorType];

export const UnifiedTracingVendorType = {
  JAEGER: 'jaeger',
  AWSXRAY: 'awsxray',
  DATADOG: 'datadog',
  NEWRELIC: 'newrelic',
  CLOUDTRACE: 'cloudtrace',
  OPENTELEMETRY: 'opentelemetry'
} as const;

export type UnifiedTracingVendorType = typeof UnifiedTracingVendorType[keyof typeof UnifiedTracingVendorType];

export const UnifiedLoggingVendorType = {
  WINSTON: 'winston',
  PINO: 'pino',
  BUNYAN: 'bunyan',
  DATADOG: 'datadog',
  CLOUDWATCH: 'cloudwatch',
  OPENTELEMETRY: 'opentelemetry'
} as const;

export type UnifiedLoggingVendorType = typeof UnifiedLoggingVendorType[keyof typeof UnifiedLoggingVendorType];

export const UnifiedAuthType = {
  API_KEY: 'api_key',
  BEARER_TOKEN: 'bearer_token',
  BASIC: 'basic',
  AWS_SIGNATURE: 'aws_signature',
  OAUTH: 'oauth'
} as const;

export type UnifiedAuthType = typeof UnifiedAuthType[keyof typeof UnifiedAuthType];

export const UnifiedLogFormat = {
  JSON: 'json',
  TEXT: 'text',
  STRUCTURED: 'structured'
} as const;

export type UnifiedLogFormat = typeof UnifiedLogFormat[keyof typeof UnifiedLogFormat];

export const UnifiedLogTransportType = {
  CONSOLE: 'console',
  FILE: 'file',
  HTTP: 'http',
  TCP: 'tcp',
  UDP: 'udp',
  CLOUDWATCH: 'cloudwatch',
  CUSTOM: 'custom'
} as const;

export type UnifiedLogTransportType = typeof UnifiedLogTransportType[keyof typeof UnifiedLogTransportType];

export const UnifiedResourceDetectorType = {
  ENV: 'env',
  HOST: 'host',
  OS: 'os',
  PROCESS: 'process',
  CONTAINER: 'container',
  K8S: 'k8s',
  AWS_EC2: 'aws_ec2',
  AWS_ECS: 'aws_ecs',
  AWS_EKS: 'aws_eks',
  GCP: 'gcp',
  AZURE: 'azure'
} as const;

export type UnifiedResourceDetectorType = typeof UnifiedResourceDetectorType[keyof typeof UnifiedResourceDetectorType];

export const UnifiedLabelMatchOperator = {
  EQUAL: '=',
  NOT_EQUAL: '!=',
  REGEX_MATCH: '=~',
  REGEX_NOT_MATCH: '!~'
} as const;

export type UnifiedLabelMatchOperator = typeof UnifiedLabelMatchOperator[keyof typeof UnifiedLabelMatchOperator];