const request = require('request-promise')
const crypto = require('crypto')
const { isOperationAllowed, scopeParser, mergeParams } = require('../oauth/scopes')

function routeIsAuthenticated(method, url) {
  if (method === 'POST') return true
  return false
}

/**
bitfinex:margins:read
bitfinex:margins:write
bitfinex:positions:read
bitfinex:positions:write
bitfinex:withdraw:read
bitfinex:withdraw:write
bitfinex:orders:read
bitfinex:orders:write
bitfinex:orders:write:cancel
bitfinex:balance:read
bitfinex:fees:read
bitfinex:summary:read
bitfinex:deposit:write
bitfinex:transfer:write
*/

function getRequiredScope(method, url) {
  const requestMap = {
    '/v1/account_infos': 'bitfinex:fees:read',
    '/v1/account_fees': 'bitfinex:fees:read',
    '/v1/summary': 'bitfinex:summary:read',
    '/v1/deposit/new': 'bitfinex:deposit:write',
    '/v1/margin_infos': 'bitfinex:margins:read',
    '/v1/balances': 'bitfinex:balance:read',
    '/v1/transfer': 'bitfinex:transfer:write',
    '/v1/withdraw': 'bitfinex:withdraw:write',
    '/v1/order/new': 'bitfinex:orders:write',
    '/v1/order/new/multi': 'bitfinex:orders:write',
    '/v1/order/cancel': 'bitfinex:orders:write:cancel',
    '/v1/order/cancel/multi': 'bitfinex:orders:write:cancel',
    '/v1/order/cancel/all': 'bitfinex:orders:write:cancel',
    '/v1/order/cancel/replace': 'bitfinex:orders:write',
    '/v1/order/status': 'bitfinex:orders:read',
    '/v1/orders': 'bitfinex:orders:read',
    '/v1/orders/hist': 'bitfinex:orders:read',
    '/v1/positions': 'bitfinex:positions:read',
    '/v1/position/claim': 'bitfinex:positions:write',
    '/v1/history': 'bitfinex:balance:read',
    '/v1/history/movements': 'bitfinex:withdraw:read',
    '/v1/mytrades': 'bitfinex:orders:read',
    '/v1/offer/new': 'bitfinex:margins:write',
    '/v1/offer/cancel': 'bitfinex:margins:write',
    '/v1/offer/status': 'bitfinex:margins:read',
    '/v1/credits': 'bitfinex:margins:read',
    '/v1/offers': 'bitfinex:margins:read',
    '/v1/offers/hist': 'bitfinex:margins:read',
    '/v1/mytrades_funding': 'bitfinex:orders:read',
    '/v1/taken_funds': 'bitfinex:margins:read',
    '/v1/unused_taken_funds': 'bitfinex:margins:read',
    '/v1/total_taken_funds': 'bitfinex:margins:read',
    '/v1/funding/close': 'bitfinex:margins:write',
    '/v1/basket_manage': 'bitfinex:orders:write',
    '/v1/position/close': 'bitfinex:orders:write'
  }

  return requestMap[url]
}

exports.proxy = (req, res, next) => {
  const baseUrl = `https://hackathon.bitfinex.com`
  const requestUrl = req.originalUrl.replace('/api/bitfinex/', '/') 
  const requestScope = getRequiredScope(req.method, requestUrl)

  console.log('GOT REQUEST - ' + requestUrl)
  console.log('DATA - ' + JSON.stringify(req.body, null, 2))

  if (requestScope) {
    const matchedScope = isOperationAllowed(requestScope, req.token.scope)
    const parsedScope = scopeParser(matchedScope)
    const params = mergeParams(parsedScope)

    if (!matchedScope) {
      return res.status(400).json({
        error: {
          msg: `you must have the ${requestScope} scope to make this request`
        }
      })
    }

    if (params.pair) {
      params.pair = params.pair.toLowerCase()
      req.assert('symbol', 'this token does not have access to that symbol pair').equals(params.pair)
    }

    const errors = req.validationErrors();

    if (errors) {
      return res.status(400).json({ errors })
    }

  }

  const data = {
    json: true,
    method: req.method,
    uri: baseUrl + requestUrl,
    proxy: process.env.FIXIE_URL,
    headers: {
      'X-Forwarded-For': req.get('CF-Connecting-IP')
    }
  }

  if(routeIsAuthenticated(req.method, requestUrl)) {
    const nonce = Date.now().toString()
    const body = Object.assign({}, {
      request: requestUrl,
      nonce
    }, JSON.parse(JSON.stringify(req.body)))

    const payload = new Buffer(JSON.stringify(body)).toString('base64')
    const signature = crypto.createHmac('sha384', req.locals.__apiSecret).update(payload).digest('hex')

    data.headers['X-BFX-APIKEY'] = req.locals.__apiKey
    data.headers['X-BFX-PAYLOAD'] = payload
    data.headers['X-BFX-SIGNATURE'] = signature
  }

  request(data).pipe(res)
   
}