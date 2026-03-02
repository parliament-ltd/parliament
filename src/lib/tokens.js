// Token counting and cost estimation utilities

const MODEL_INFO = {
  'claude-haiku': {
    name: 'Claude Haiku',
    contextWindow: 200000,
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
  },
  'claude-sonnet': {
    name: 'Claude Sonnet',
    contextWindow: 200000,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
  },
  'claude-opus': {
    name: 'Claude Opus',
    contextWindow: 200000,
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
  },
}

export function getModelInfo(modelId) {
  return MODEL_INFO[modelId] || MODEL_INFO['claude-sonnet']
}

// Estimate cost for a given number of input and output tokens
export function estimateCost(modelId, inputTokens, outputTokens) {
  const model = getModelInfo(modelId)
  const inputCost = (inputTokens / 1000) * model.inputCostPer1k
  const outputCost = (outputTokens / 1000) * model.outputCostPer1k
  return { inputCost, outputCost, totalCost: inputCost + outputCost }
}

// Calculate context usage as a percentage
export function contextUsagePercent(tokensUsed, modelId) {
  const model = getModelInfo(modelId)
  return Math.min(100, (tokensUsed / model.contextWindow) * 100)
}

// Determine context health status based on threshold
export function contextHealthStatus(tokensUsed, modelId, warningThreshold = 80) {
  const percent = contextUsagePercent(tokensUsed, modelId)
  if (percent >= warningThreshold) return 'critical'
  if (percent >= 50) return 'warning'
  return 'healthy'
}