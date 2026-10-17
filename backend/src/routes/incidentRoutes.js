const express = require('express');
const {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
} = require('../controllers/incidentController');
const { protect, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

router.use(protect); // every incident route requires a logged-in user

router.post('/', aiLimiter, createIncident);
router.get('/', getIncidents);
router.get('/:id', getIncidentById);
router.patch('/:id/status', authorize('eoc', 'admin', 'rescue_team'), updateIncidentStatus);

module.exports = router;