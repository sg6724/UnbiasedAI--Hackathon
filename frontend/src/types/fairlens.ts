export interface UploadResponse {
  file_id: string
  columns: string[]
  shape: [number, number]
  auto_detected_sensitive: string[]
  sample: Record<string, unknown[]>
}

export interface GroupMetrics {
  count: number
  positive_prediction_rate: number
  selection_rate: number
  accuracy: number
  tpr: number
}

export interface Metrics {
  demographic_parity_difference: number
  disparate_impact_ratio: number
  equalized_odds_difference: number
  mean_difference: number
  by_group: Record<string, GroupMetrics>
  overall_accuracy: number
}

export interface ProxyFeature {
  column: string
  chi2: number
  p_value: number
}

export interface AnalyzeResponse {
  metrics: Metrics
  proxy_features: ProxyFeature[]
  verdict: Verdict
  report: string
  warnings: string[]
}

export interface ScalarMetrics {
  demographic_parity_difference: number
  disparate_impact_ratio: number
  equalized_odds_difference: number
  mean_difference: number
}

export interface MitigateResponse {
  before: ScalarMetrics
  after: ScalarMetrics
  improvement: string
}

export type ModelType = 'random_forest' | 'logistic_regression' | 'decision_tree'
export type Verdict = 'biased' | 'borderline' | 'fair'
export type MitigationTechnique = 'reweighing' | 'threshold'

export interface ConfigureState {
  fileId: string
  columns: string[]
  autoDetectedSensitive: string[]
  fileName: string
}

export interface ResultsState extends ConfigureState {
  analyzeResult: AnalyzeResponse
  sensitiveCol: string
  targetCol: string
  modelType: ModelType
}
