const sha256 = require('sha256')
const AccessToken = require('../models/AccessToken')
const Client = require('../models/Client')
const RefreshToken = require('../models/RefreshToken')
const User = require('../models/User')

module.exports.getAccessToken = function(bearerToken) {
  const accessTokenHash = sha256(bearerToken)
  return AccessToken.findOne({ accessTokenHash }).lean();
};

/**
 * Get client.
 */
module.exports.getClient = function(_id, secret) {
  return Client.findOne({ _id, secret }).lean();
};

/**
 * Get refresh token.
 */
module.exports.getRefreshToken = function(refreshToken) {
  const refreshTokenHash = sha256(refreshToken)
  return RefreshToken.findOne({ refreshTokenHash }).lean();
};

/**
 * Get user.
 */
module.exports.getUser = function(username, password) {
  return OAuthUsersModel.findOne({ username: username, password: password }).lean();
};

/**
 * Save token.
 */

module.exports.saveToken = function(token, client, user) {
  const accessTokenHash = sha256(token.accessToken)
  const refreshTokenHash = sha256(token.refreshToken)
  const accessToken = new AccessToken({
    accessTokenHash,
    accessTokenExpiresAt: token.accessTokenExpiresOn,
    scope: token.scope,
    client: client._id,
    owner: user._id,
  });
  const refreshToken = new RefreshToken({
    refreshTokenHash,
    accessTokenExpiresAt: token.refreshTokenExpiresOn,
    scope: token.scope,
    client: client._id,
    owner: user._id
  })

  return Promise.all([
    accessToken.save(),
    refreshToken.save()    
  ]).then(([accessToken, refreshToken]) => {
    return {
      client: client._id,
      user: user._id
    }
  })
};