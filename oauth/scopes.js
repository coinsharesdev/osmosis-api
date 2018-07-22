/*
osmosis:user:read
bitfinex:margins:write,
bitfinex:orders:write(pair:BTCUSD|max:300|min:0)
bitfinex:orders:write(max:1000)
bitfinex:orders:write:cancel(min:500|pair:BTC*)
*/
exports.scopeParser = (item) => {
  let paramRegex = /\((.+?)\)/gi
  let params = item.match(paramRegex)
  params = params ? params[0]: ''
  let replacedParams = params.replace(/:/gi, '-')
  item = item.replace(paramRegex, replacedParams)
  item = item.split(':')
  item = item.map(item => {
    let itemParams = item.match(paramRegex)
    let params = itemParams ? itemParams[0] : null
    let rule = item.replace(paramRegex, '')
    if (params) {
      params = params.replace(/[()]/gi, '')
      params = params.split('|')
      params = params.map(item => item.split('-')).reduce((acc, curr) => {
        acc[curr[0]] = curr[1]
        return acc
      }, {})
    } else {
      params = {}
    }
    return { rule, params }
  })

  return item
}


exports.isScopeValid = (scope, grants) => {
  // Remove brackets
  let paramRegex = /\((.+?)\)/gi
  let cleaned = scope.split(' ').map(item => item.replace(paramRegex, ''))

  function isPresent(scope) {
    if (grants.indexOf(scope) > -1) return true
    if (scope.indexOf(':') == -1) return false
    return isPresent(scope.split(':').slice(0, -1).join(':'))
  }

  return cleaned.map(item => isPresent(item)).indexOf(false) === -1
}

exports.isOperationAllowed = (required, users) => {
  let paramRegex = /\((.+?)\)/gi
  let _users = users.split(' ').map(item => item.replace(paramRegex, ''))

  function isPresent(requiredScope) {
    if (_users.indexOf(requiredScope) > -1) return true
    if (requiredScope.indexOf(':') == -1) return false
    return isPresent(requiredScope.split(':').slice(0, -1).join(':'))
  }
  
  return isPresent(required)
}



