const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  refreshTokenHash: { type: String, unique: true },
  refreshTokenExpiresAt: { type: Date },
  scope: { type: [ String ] },
  used: { type: Boolean, default: false }
}, { timestamps: true });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
