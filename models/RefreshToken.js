const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  accessTokenHash: { type: String, unique: true },
  refreshTokenHash: { type: String, unique: true },
  refreshTokenExpiresAt: { type: Date },
  apiKeyEncrypted: { type: String },
  apiSecretEncrypted: { type: String },
}, { timestamps: true });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
