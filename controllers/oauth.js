const { URL } = require('url');
const aes256 = require('aes256');
const sha256 = require('sha256');
const crypto = require('crypto');
const appendQuery = require('append-query');
const Client = require('../models/Client')
const AuthToken = require('../models/AuthToken')
const AccessToken = require('../models/AccessToken')
const RefreshToken = require('../models/RefreshToken')

// example scopes
// trade:BTCUSD:10-10000
// trade:BTCUSD:*
// trade:*
// trade:BTC*
// trade:*BTC:-10000
// trade:BTC*:10-
function scopeParser(scope) {
  const [ operation, pair, values ] = scope.split(':')
  const parsedScope = {
    operation,
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

/**
 * GET /oauth/authorize
 * Home page.
 */
exports.getAuthorize = (req, res, next) => {
  req.assert('response_type', 'response_type must be "code"').equals('code')
  req.assert('client_id', 'client_id must be provided').notEmpty()
  req.assert('redirect_uri', 'redirect_uri must be provided').notEmpty()
  req.assert('scope', 'scope must be provided').notEmpty()

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.render('oauth/error', {
      title: 'Application Error'
    })
  }

  let { client_id, redirect_uri, scope } = req.query

  Client
    .findById(req.query.client_id)
    .exec((err, client) => {
      if (err) return next(err)

      // validate client exists
      if (!client) {
        req.flash('errors', { msg: 'client_id is not valid' })
        return res.render('oauth/error', {
          title: 'Application Error'
        })
      }

      // validate redirect uri
      const redirectDomain = new URL(redirect_uri).origin
      if (client.redirectUris.indexOf(redirectDomain) === -1) {
        req.flash('errors', { msg: 'redirect_uri is not valid for client' })
        return res.render('oauth/error', {
          title: 'Application Error'
        })
      }

      // validate scope
      scope = scope.split(',')
      const parsedScope = scope.map(scopeParser)
      for (let i = 0; i < parsedScope.length; i++) {
        const activeScope = parsedScope[i]
        if (client.grants.indexOf(activeScope.operation) === -1) {
          req.flash('errors', { msg: `scope ${scope[i]} is not valid for application` })
          return res.render('oauth/error', {
            title: 'Application Error'
          })
        }
      }

      res.render('oauth/authorize', {
        title: 'OAuth Authorize',
        scopes: parsedScope,
        query: req.query,
        client
      })
  })
};

/**
 * POST /oauth/authorize
 * Authorize a new application
 */
exports.postAuthorize = (req, res, next) => {
  req.assert('client_id', 'client_id must be provided').notEmpty()
  req.assert('redirect_uri', 'redirect_uri must be provided').notEmpty()
  req.assert('scope', 'scope must be provided').notEmpty()

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.render('oauth/error', {
      title: 'Application Error'
    })
  }
 
  Client
    .findById(req.body.client_id)
    .exec((err, client) => {
      if (err) return next(err)
      // validate client exists
      if (!client) {
        req.flash('errors', { msg: 'client_id is not valid' })
        return res.render('oauth/error', {
          title: 'Application Error'
        })
      }

      if (req.body.action === 'deny') {
        return res.render('oauth/denied', {
          title: 'OAuth Denied',
          client
        })
      }

      req.user.comparePassword(req.body.password, (err, isMatch) => {
        if (err) return next(err)
        if (!isMatch) {
          req.flash('errors', { msg: `Incorrect password, please try again` })
          return res.redirect(url.format({
            pathname: '/oauth/authorize',
            query: {
              response_type: 'code',
              client_id: req.body.client_id,
              redirect_uri: req.body.redirect_uri,
              scope: req.body.scope
            }
          }))
        }

        // 1) decrypt api key and secret from user profile
        // 2) generate auth token
        // 3) encrypt api key and secret with auth token
        // 4) hash auth token
        // 5) create auth token object with hash an encrypted values
        
        // Decrypt API key
        let apiKey = aes256.decrypt(req.body.password, req.user.profile.apiKey)
        let apiSecret = aes256.decrypt(req.body.password, req.user.profile.apiSecret)
        const authToken = crypto.randomBytes(32).toString('hex')

        // Encrypt again
        apiKey = aes256.encrypt(authToken, apiKey)
        apiSecret = aes256.encrypt(authToken, apiSecret)

        // valid password, user has issued grant
        const token = new AuthToken({
          client: client._id,
          owner: req.user._id,
          scope: req.body.scope,
          apiKeyEncrypted: apiKey,
          apiSecretEncrypted: apiSecret,
          authTokenHash: sha256(authToken),
          redirectUri: req.body.redirect_uri
        })

        token.save((err, token) => {
          if (err) return next(err)

          return res.redirect(appendQuery(token.redirectUri, {
            code: authToken,
            state: req.body.state
          }))
        })
      })
  })

}


exports.postToken = (req, res, next) => {
  req.assert('grant_type', 'grant_type must be "authorization_code"').equals('authorization_code')
  req.assert('code', 'code must be provided').notEmpty()
  req.assert('redirect_uri', 'redirect_uri must be provided').notEmpty()
  req.assert('client_id', 'client_id must be provided').notEmpty()

  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ error: errors })
  }

  AuthToken
    .findOne({
      client: req.body.client_id,
      authTokenHash: sha256(req.body.code),
      redirectUri: req.body.redirect_uri,
      used: false
    })
    .exec((err, token) => {
      if (err) return next(err)
      if (!token) return res.status(400).json({ error: { msg: 'provided code is invalid' }})

      // decrypt api key and secret from token
      let apiKey = aes256.decrypt(req.body.code, token.apiKeyEncrypted)
      let apiSecret = aes256.decrypt(req.body.code, token.apiSecretEncrypted)

      // generate access and refresh token
      let accessToken = crypto.randomBytes(32).toString('hex')
      let refreshToken = crypto.randomBytes(32).toString('hex')

      // create refresh token api encrypted values
      let refreshApiKey = aes256.encrypt(refreshToken, apiKey)
      let refreshApiSecret = aes256.encrypt(refreshToken, apiSecret)

      // Encrypt api keys for access token 
      apiKey = aes256.encrypt(accessToken, apiKey)
      apiSecret = aes256.encrypt(accessToken, apiSecret)

      // create access token
      const accessTokenObj = new AccessToken({
        owner: token.owner,
        client: token.client,
        accessTokenHash: sha256(accessToken),
        scope: token.scope,
        apiKeyEncrypted: apiKey,
        apiSecretEncrypted: apiSecret
      })

      // create refresh token
      const refreshTokenObj = new RefreshToken({
        accessTokenHash: sha256(accessToken),
        refreshTokenHash: sha256(refreshToken),
        apiKeyEncrypted: refreshApiKey,
        apiSecretEncrypted: refreshApiSecret
      })

      token.used = true

      Promise.all([
        accessTokenObj.save(),
        refreshTokenObj.save(),
        token.save()
      ]).then(() => {
          res.json({
            access_token: accessToken,
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: refreshToken,
            scope: accessToken.scope
          })
      })
    })
}