const mongoose = require('mongoose');

const accessTokenSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  accessTokenHash: { type: String, unique: true },
  accessTokenExpiresAt: { type: Date },
  apiKeyEncrypted: { type: String },
  apiSecretEncrypted: { type: String },
  scope: { type: [ String ] }
}, { timestamps: true });

const AccessToken = mongoose.model('AccessToken', accessTokenSchema);

module.exports = AccessToken;
