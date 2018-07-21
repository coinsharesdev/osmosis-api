
function parseTradeScope(pair, value) {
  const parsedScope = {
    operation: 'trade',
    pairA: null,
    pairB: null,
    minValue: null,
    maxValue: null,
    definition: ''
  }

  // trading pairs
  if (pair === '*') {
    parsedScope.pairA = parsedScope.pairB = '*'
  } else if (pair.charAt(0) === '*') {
    parsedScope.pairA = '*'
    parsedScope.pairB = pair.substr(1)
  } else if (pair.charAt(3) === '*') {
    parsedScope.pairA = pair.substr(0, 3)
    parsedScope.pairB = '*'
  } else {
    parsedScope.pairA = pair.substr(0, 3)
    parsedScope.pairB = pair.substr(3, 3)
  }

  // max values
  if (!values || values === '*') {
    parsedScope.minValue = parsedScope.maxValue = -1
  } else {
    const splitV = values.split('-')
    if (splitV.length === 2) {
      parsedScope.minValue = splitV[0]
      parsedScope.maxValue = splitV[1]
    } else if (values.indexOf('-') === 0) {
      parsedScope.minValue = -1
      parsedScope.maxValue = splitV[0]
    } else if (values.indexOf('-') === (values.length - 1)) {
      parsedScope.maxValue = -1
      parsedScope.minValue = splitV[0]
    }
  }

  // build definition
  const operationMap = { trade: 'Trade (buy & sell)', buy: 'Buy', sell: 'Sell' }
  const pairA = parsedScope.pairA === '*' ? 'any currency' : parsedScope.pairA
  const pairB = parsedScope.pairB === '*' ? 'any currency' : parsedScope.pairB
  if (pairA === pairB) {
    parsedScope.definition += `${operationMap[parsedScope.operation]} ${pairA}`
  } else {
    parsedScope.definition += `${operationMap[parsedScope.operation]} ${pairA} using ${pairB}`
  }

  if (parsedScope.minValue > 0 || parsedScope.maxValue > 0) {
    parsedScope.definition += `, limited to trades`
    if (parsedScope.minValue) {
      parsedScope.definition += ` from ${parsedScope.minValue}`
    }
    if (parsedScope.maxValue) {
      parsedScope.definition += ` up to ${parsedScope.maxValue}`
    }
  } else {
    parsedScope.definition += ` up to any amount`
  }

  return parsedScope
}

function parseOsmosisScope(resource, permission) {
  const parsedScope = {
    operation: 'osmosis',
    resource,
    permission,
    definition: ''
  }

  const resourceMap = {
    user: 'your Osmosis account'
  }
  const permissionMap = {
    read: 'View',
    write: 'View and modify'
  }

  parsedScope.definition = `${permissionMap[permission]} ${resourceMap[resource]}`

  return parsedScope
}

// example scopes
// trade:BTCUSD:10-10000
// trade:BTCUSD:*
// trade:*
// trade:BTC*
// trade:*BTC:-10000
// trade:BTC*:10-
exports.scopeParser = (scope) => {
  const [ operation, ...rest ] = scope.split(':')
  const operationParsers = {
    trade: parseTradeScope,
    osmosis: parseOsmosisScope
  }

  return operationParsers[operation](...rest)
}