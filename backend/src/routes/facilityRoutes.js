const express = require('express');
const { getFacilities, getMyFacility, createFacility, updateCapacity } = require('../controllers/facilityController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect); // all facility routes require a logged-in user
router.get('/', getFacilities);
router.get('/mine', authorize('hospital', 'shelter'), getMyFacility);
router.post('/', authorize('eoc', 'admin', 'hospital', 'shelter'), createFacility);
router.patch('/:id/capacity', authorize('eoc', 'admin', 'shelter', 'hospital'), updateCapacity);

module.exports = router;