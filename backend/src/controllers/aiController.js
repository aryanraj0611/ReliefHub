const asyncHandler = require('express-async-handler');
const Incident = require('../models/Incident');
const Facility = require('../models/Facility');
const { analyzeIncident } = require('../services/aiService');
const { generateChatReply, parseEOCQuery } = require('../services/chatService');
const { distanceMeters } = require('../utils/geo');

// @route GET /api/ai/situation-summary
// @access eoc, admin
const getSituationSummary = asyncHandler(async (req, res) => {
  // Aggregate counts by severity in a single DB query — avoids loading all
  // incident documents into memory as the collection grows.
  const severities = ['low', 'medium', 'high', 'critical'];
  const results = await Incident.aggregate([
    { $match: { status: { $nin: ['resolved', 'merged'] } } },
    { $group: { _id: '$severity', count: { $sum: 1 } } },
  ]);

  const counts = Object.fromEntries(results.map((r) => [r._id, r.count]));
  const totalOpen = results.reduce((sum, r) => sum + r.count, 0);

  const summary =
    totalOpen === 0
      ? 'No active incidents. All clear.'
      : `${totalOpen} active incident(s): ` +
        severities
          .filter((s) => counts[s])
          .map((s) => `${counts[s]} ${s}`)
          .join(', ') +
        '. Prioritize critical and high severity reports first.';

  res.json({ success: true, summary, counts, totalOpen });
});

// @route POST /api/ai/classify
// Lets the frontend preview an AI classification before submitting a report
// (used on the "Report Incident" form for instant feedback).
const classifyDraft = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    res.status(400);
    throw new Error('title and description are required');
  }
  const result = await analyzeIncident({ title, description });
  res.json({ success: true, ...result });
});

// @route POST /api/ai/chat
// @access any authenticated user — behavior branches by role:
//   citizen/volunteer/ngo -> safety advice + nearest shelter distance
//   eoc/admin/rescue_team -> natural-language incident search
// This is the bottom-right assistant widget's single endpoint.
const chat = asyncHandler(async (req, res) => {
  const { message, lng, lat } = req.body;
  if (!message || !message.trim()) {
    res.status(400);
    throw new Error('message is required');
  }

  const isDispatcher = ['eoc', 'admin', 'rescue_team'].includes(req.user.role);

  if (isDispatcher) {
    const { filter, description } = parseEOCQuery(message);
    const incidents = await Incident.find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title severity status category verification createdAt');

    const reply =
      incidents.length === 0
        ? `No incidents match "${description}".`
        : `Found ${incidents.length} report(s) matching "${description}".`;

    return res.json({ success: true, reply, incidents, mode: 'eoc_search' });
  }

  // Citizen-facing: safety advice + nearest shelter, if we have a location.
  let reply = await generateChatReply(message, req.user.role);
  let nearestShelter = null;

  if (lng !== undefined && lat !== undefined) {
    if (isNaN(Number(lng)) || isNaN(Number(lat))) {
      res.status(400);
      throw new Error('lng and lat must be valid numbers');
    }

    const shelter = await Facility.findOne({
      type: 'shelter',
      status: { $ne: 'closed' },
      location: {
        $near: { $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] } },
      },
    });

    if (shelter) {
      const distanceKm = (distanceMeters([Number(lng), Number(lat)], shelter.location.coordinates) / 1000).toFixed(1);
      nearestShelter = { name: shelter.name, distanceKm: Number(distanceKm), address: shelter.location.address };
      reply += ` Nearest shelter: ${shelter.name} (${distanceKm} km away).`;
    }
  }

  res.json({ success: true, reply, nearestShelter, mode: 'citizen_advice' });
});

module.exports = { getSituationSummary, classifyDraft, chat };