const crypto = require('crypto');
const { URL } = require('url');
const Client = require('../models/Client')

/**
 * GET /clients
 * List of users own clients
 */
exports.getOwnClients = (req, res, next) => {
  Client
    .find({ owner: req.user.id })
    .exec((err, clients) => {
      if (err) return next(err)

      res.render('clients/list', {
        title: 'Your Clients',
        clients
      })
    })
};

/**
 * GET /clients/:id
 * Get individual client
 */
exports.getClientById = (req, res, next) => {
  Client
    .findOne({
      _id: req.params.id,
      owner: req.user.id
    })
    .exec((err, client) => {
      if (err) return next(err)

      res.render('clients/client', {
        title: client.name,
        client
      })
    })
};


/**
 * POST /clients/:id
 * Updates an existing client
 */
exports.postUpdateClient = (req, res, next) => {
  req.assert('name', 'You must provide a client name').notEmpty();
  req.assert('redirectUris', 'You must provide at least one redirect URL').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/clients/new');
  }

  const redirectUris = req.body.redirectUris
    .split(',')
    .map(item => new URL(item).origin)

  Client
    .updateOne({
      _id: req.params.id,
      owner: req.user.id
    }, {
      name: req.body.name,
      redirectUris
    })
    .exec((err, client) => {
      if (err) return next(err)

      req.flash('success', { msg: 'Updated client' });
      return res.redirect('/clients/' + req.params.id);
    })
};

/**
 * POST /clients/:id/secret
 * Updates an existing client secret
 */
exports.postUpdateClientSecret = (req, res, next) => {
  Client
    .updateOne({
      _id: req.params.id,
      owner: req.user.id
    }, {
      secret: crypto.randomBytes(20).toString('hex')
    })
    .exec((err, client) => {
      if (err) return next(err)

      req.flash('success', { msg: 'Updated client secret' });
      return res.redirect('/clients/' + req.params.id);
    })
};


/**
 * GET /clients/new
 * Create a new client
 */
exports.getNewClient = (req, res, next) => {
  res.render('clients/new', {
    title: 'New Client'
  })
};

/**
 * POST /clients/new
 * Create a new client
 */
exports.postNewClient = (req, res, next) => {
  req.assert('name', 'You must provide a client name').notEmpty();
  req.assert('redirectUris', 'You must provide at least one redirect URL').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/clients/new');
  }

  const redirectUris = req.body.redirectUris.split(',').map(item => item.trim())
  const client = new Client({
    owner: req.user.id,
    name: req.body.name,
    redirectUris
  })

  client.save((err, client) => {
    if (err) return next(err)

    req.flash('success', { msg: 'Created client' });
    return res.redirect('/clients/' + client.id);
  })
};
