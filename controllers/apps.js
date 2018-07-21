/**
 * GET /apps
 * List of apps user has authenticated
 */
exports.getApps = (req, res, next) => {
  res.render('apps/list', {
    title: 'Your Apps'
  })
};

/**
 * GET /apps/:id
 * Get app by ID
 */
exports.getAppById = (req, res, next) => {
 
};