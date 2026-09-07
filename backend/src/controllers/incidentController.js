const asyncHandler = require('express-async-handler');
const Incident = require('../models/Incident');
const { analyzeIncident } = require('../services/aiService');
const { findDuplicate } = require('../services/duplicateService');
const { getIO } = require('../services/socketService');

// @route POST /api/incidents
// @access citizen (or anyone reporting an SOS)
const createIncident = asyncHandler(async (req, res) => {
  const { type, title, description, category, lng, lat, address, imageUrl } = req.body;

  if (!title || !description || lng === undefined || lat === undefined) {
    res.status(400);
    throw new Error('title, description, lng and lat are required');
  }

  if (isNaN(Number(lng)) || isNaN(Number(lat))) {
    res.status(400);
    throw new Error('lng and lat must be valid numbers');
  }

  // Build in memory so _id exists for duplicate detection after a single save.
  const incident = new Incident({
    type: type || 'incident_report',
    title,
    description,
    category: category || 'other',
    location: { coordinates: [Number(lng), Number(lat)], address },
    reportedBy: req.user?._id,
    imageUrl,
    timeline: [{ status: 'reported', note: 'Report submitted by citizen', actor: req.user?._id }],
  });

  // AI classification needs no DB — run it while the document is still in memory.
  const aiResult = await analyzeIncident({ title, description });

  incident.aiAnalysis = {
    summary: aiResult.summary,
    suggestedSeverity: aiResult.suggestedSeverity,
    suggestedCategory: aiResult.suggestedCategory,
    suggestedResources: aiResult.suggestedResources || [],
    recommendedResources: aiResult.recommendedResources,
    etaMinutes: aiResult.etaMinutes,
    confidence: aiResult.confidence,
    generatedAt: new Date(),
    source: aiResult.source,
  };

  // Never downgrade urgency if the citizen already flagged it critical.
  if (incident.severity !== 'critical') {
    incident.severity = aiResult.suggestedSeverity || incident.severity;
  }

  // Single DB write — complete document, no partial state window.
  await incident.save();

  // Duplicate detection queries the DB, so it must run after the save.
  const duplicateId = await findDuplicate(incident);
  if (duplicateId) {
    incident.duplicateOf = duplicateId;
    incident.status = 'merged';
    await incident.save();
  }

  getIO().emit('incident:new', incident);

  res.status(201).json({ success: true, incident });
});

// @route GET /api/incidents
const getIncidents = asyncHandler(async (req, res) => {
  const { status, severity, category, mine } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (category) filter.category = category;
  if (mine === 'true' && req.user) filter.reportedBy = req.user._id;

  const incidents = await Incident.find(filter)
    .sort({ createdAt: -1 })
    .populate('reportedBy', 'name role')
    .populate('assignedTeam', 'name organizationName');

  res.json({ success: true, count: incidents.length, incidents });
});

// @route GET /api/incidents/:id
const getIncidentById = asyncHandler(async (req, res) => {
  const incident = await Incident.findById(req.params.id)
    .populate('reportedBy', 'name role phone')
    .populate('assignedTeam', 'name organizationName');

  if (!incident) {
    res.status(404);
    throw new Error('Incident not found');
  }
  res.json({ success: true, incident });
});

// @route PATCH /api/incidents/:id/status
// @access eoc, admin, rescue_team
const updateIncidentStatus = asyncHandler(async (req, res) => {
  const { status, note, assignedTeam } = req.body;
  const incident = await Incident.findById(req.params.id);

  if (!incident) {
    res.status(404);
    throw new Error('Incident not found');
  }

  if (status) incident.status = status;
  if (assignedTeam) incident.assignedTeam = assignedTeam;
  incident.timeline.push({ status: status || incident.status, note, actor: req.user._id });

  await incident.save();
  await incident.populate('reportedBy', 'name role phone');
  await incident.populate('assignedTeam', 'name organizationName');

  getIO().emit('incident:update', incident);

  res.json({ success: true, incident });
});

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
};