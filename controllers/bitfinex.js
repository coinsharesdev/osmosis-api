const request = require('request-promise')
const crypto = require('crypto')

function routeIsAuthenticated(method, url) {
  if (method === 'POST') return true
  return false
}

exports.proxy = (req, res, next) => {
  const baseUrl = `https://hackathon.bitfinex.com`
  const requestUrl = req.originalUrl.replace('/api/bitfinex/', '/') 
  const data = {
    json: true,
    method: req.method,
    uri: baseUrl + requestUrl,
    headers: {
      'X-Forwarded-For': req.get('CF-Connecting-IP')
    }
  }

  if (data.method === 'POST') {
    data.formData = JSON.parse(JSON.stringify(req.body))
  }

  if(routeIsAuthenticated(req.method, requestUrl)) {
    const nonce = Date.now().toString()
    const body = {
      request: requestUrl,
      nonce
    }
    const payload = new Buffer(JSON.stringify(body)).toString('base64')
    const signature = crypto.createHmac('sha384', req.locals.__apiSecret).update(payload).digest('hex')

    data.headers['X-BFX-APIKEY'] = req.locals.__apiKey
    data.headers['X-BFX-PAYLOAD'] = payload
    data.headers['X-BFX-SIGNATURE'] = signature
  }

  console.log(data)
  request(data).then(response => {   
    console.log(response)
    res.pipe(response)
  })
   
}