const mongoose = require('mongoose');
const crypto = require('crypto');

const clientSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  secret: { type: String },
  name: { type: String },
  scope: { type: [ String ] },
  grants: { type: [ String ] },
  redirectUris: { type: [ String ] },
  accessTokenLifetime: { type: Number, default: 7200 },
  refreshTokenLifetime: { type: Number, default: 3600 * 24 * 30 }
}, { timestamps: true });

/**
 * Client secret generator
 */
clientSchema.pre('save', function save(next) {
  if (this.isNew) {
    this.secret = crypto.randomBytes(20).toString('hex')
  }
  next()
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
