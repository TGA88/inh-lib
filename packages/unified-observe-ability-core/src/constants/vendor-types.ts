export const MetricsVendorType = {
  PROMETHEUS: 'prometheus',
  DATADOG: 'datadog',
  NEWRELIC: 'newrelic',
  CLOUDWATCH: 'cloudwatch',
  OPENTELEMETRY: 'opentelemetry'
} as const;

export type MetricsVendorType = typeof MetricsVendorType[keyof typeof MetricsVendorType];

export const TracingVendorType = {
  JAEGER: 'jaeger',
  AWSXRAY: 'awsxray',
  DATADOG: 'datadog',
  NEWRELIC: 'newrelic',
  CLOUDTRACE: 'cloudtrace',
  OPENTELEMETRY: 'opentelemetry'
} as const;

export type TracingVendorType = typeof TracingVendorType[keyof typeof TracingVendorType];

export const LoggingVendorType = {
  WINSTON: 'winston',
  PINO: 'pino',
  BUNYAN: 'bunyan',
  DATADOG: 'datadog',
  CLOUDWATCH: 'cloudwatch',
  OPENTELEMETRY: 'opentelemetry'
} as const;

export type LoggingVendorType = typeof LoggingVendorType[keyof typeof LoggingVendorType];

export const AuthType = {
  API_KEY: 'api_key',
  BEARER_TOKEN: 'bearer_token',
  BASIC: 'basic',
  AWS_SIGNATURE: 'aws_signature',
  OAUTH: 'oauth'
} as const;

export type AuthType = typeof AuthType[keyof typeof AuthType];

export const LogFormat = {
  JSON: 'json',
  TEXT: 'text',
  STRUCTURED: 'structured'
} as const;

export type LogFormat = typeof LogFormat[keyof typeof LogFormat];

export const LogTransportType = {
  CONSOLE: 'console',
  FILE: 'file',
  HTTP: 'http',
  TCP: 'tcp',
  UDP: 'udp',
  CLOUDWATCH: 'cloudwatch',
  CUSTOM: 'custom'
} as const;

export type LogTransportType = typeof LogTransportType[keyof typeof LogTransportType];

export const ResourceDetectorType = {
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

export type ResourceDetectorType = typeof ResourceDetectorType[keyof typeof ResourceDetectorType];

export const LabelMatchOperator = {
  EQUAL: '=',
  NOT_EQUAL: '!=',
  REGEX_MATCH: '=~',
  REGEX_NOT_MATCH: '!~'
} as const;

export type LabelMatchOperator = typeof LabelMatchOperator[keyof typeof LabelMatchOperator];