const AWS = require('aws-sdk')

async function getSsmParameters(names, options = {}) {
  const ssm = new AWS.SSM()
  const params = {
    Names: names,
    WithDecryption: options.withDecryption !== false
  }
  const result = await ssm.getParameters(params).promise()
  const values = {}
  const requestedKeys = names.map(name => name.substring(name.lastIndexOf('/') + 1))
  const returnedKeys = result.Parameters.map(param => param.Name.substring(param.Name.lastIndexOf('/') + 1))
  for (const param of result.Parameters) {
    // Use only the last segment after the last slash as the config key
    const key = param.Name.substring(param.Name.lastIndexOf('/') + 1);
    values[key] = param.Value;
  }
  // If any requested keys are missing, throw a clear error
  const missingKeys = requestedKeys.filter(key => !returnedKeys.includes(key))
  if (missingKeys.length > 0) {
    throw new Error(`Missing SSM Parameters (by config key): ${missingKeys.join(', ')}`)
  }
  if (result.InvalidParameters && result.InvalidParameters.length > 0) {
    throw new Error(`Invalid SSM Parameters: ${result.InvalidParameters.join(', ')}`)
  }
  return values
}

/**
 * Decorates config with values from AWS SSM Parameter Store.
 * If SSM_PARAMETER_NAMES is present and valid, fetches and merges those values.
 * SSM values are overridden by direct event fields.
 * @param {object} baseConfig
 * @returns {Promise<object>} decorated config
 */
async function decorateWithSsmParameters(baseConfig) {
  if (
    baseConfig.SSM_PARAMETER_NAMES &&
    Array.isArray(baseConfig.SSM_PARAMETER_NAMES) &&
    baseConfig.SSM_PARAMETER_NAMES.length > 0
  ) {
    try {
      const ssmValues = await getSsmParameters(baseConfig.SSM_PARAMETER_NAMES)
      return { ...ssmValues, ...baseConfig }
    } catch (error) {
      console.log('Error fetching SSM parameters:', error)
      return baseConfig
    }
  }
  return baseConfig
}

module.exports = decorateWithSsmParameters
