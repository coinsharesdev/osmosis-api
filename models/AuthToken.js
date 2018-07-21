const mongoose = require('mongoose');
const moment = require('moment');

const authTokenSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  authTokenHash: { type: String, unique: true },
  authTokenExpiresAt: { type: Date },
  apiKeyEncrypted: { type: String },
  apiSecretEncrypted: { type: String },
  scope: { type: String },
  redirectUri: { type: String },
  used: { type: Boolean, default: false }
}, { timestamps: true });

/**
 * Expiration
 */
authTokenSchema.pre('save', function save(next) {
  if (this.isNew) {
    this.authTokenExpiresAt = moment().add(1, 'minute')
  }
  next()
});

const AuthToken = mongoose.model('AuthToken', authTokenSchema);

module.exports = AuthToken;
