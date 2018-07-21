const AccessToken = require('../models/AccessToken')

/**
 * GET /apps
 * List of apps user has authenticated
 */
exports.getApps = (req, res, next) => {

  AccessToken
    .find({
      owner: req.user.id,
    })
    .populate('')
    .exec((err, apps) => {

      res.render('apps/list', {
        title: 'Your Apps',
        apps
      })

    })
  
};

/**
 * GET /apps/:id
 * Get app by ID
 */
exports.getAppById = (req, res, next) => {
 
};