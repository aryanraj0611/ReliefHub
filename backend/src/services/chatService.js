// chatService.js — role-aware chat replies.
// Strategy: keyword rules first (zero latency), Gemini fallback for anything
// that doesn't match, safe hardcoded fallback if Gemini fails.

// ── Citizen keyword rules (unchanged) ────────────────────────────────────────
const CITIZEN_ADVICE_RULES = [
  {
    keywords: ['water', 'flood', 'flooding', 'drowning'],
    reply: 'Move to higher ground immediately. Avoid walking or driving through moving water — 15cm can knock you off your feet.',
  },
  {
    keywords: ['fire', 'smoke', 'burning'],
    reply: 'Evacuate immediately. Do not use elevators. Stay low if there is smoke, and cover your nose and mouth with a damp cloth.',
  },
  {
    keywords: ['earthquake', 'shaking', 'building collapse', 'collapsed', 'trapped'],
    reply: 'Take cover under sturdy furniture and stay away from windows. Do not use elevators. If trapped, tap on a pipe or wall to signal your location.',
  },
  {
    keywords: ['injured', 'bleeding', 'unconscious', 'medical', 'heart attack', 'labor', 'pregnant'],
    reply: 'Call for medical help immediately using the SOS button. Keep the person still, calm, and warm while help is on the way.',
  },
];

const SAFE_FALLBACK =
  "I'm having trouble processing that — please use the SOS button if this is an emergency, or check the live map for current incidents.";

// ── EOC / rescue keyword rules ────────────────────────────────────────────────
// These cover the most common dispatcher queries without an API call.
const DISPATCHER_RULES = [
  {
    keywords: ['how many', 'count', 'total incidents', 'active incidents'],
    reply: 'Check the live map or the Incidents sidebar for a real-time count filtered by severity and status.',
  },
  {
    keywords: ['shelter', 'hospital', 'capacity', 'beds', 'facility'],
    reply: 'Open the Facilities tab in the EOC Dashboard to see live capacity for all registered shelters and hospitals.',
  },
  {
    keywords: ['assign', 'dispatch', 'send team', 'rescue team'],
    reply: 'Use the Rescue Teams tab to see available teams, then update the incident status to Dispatched from the incident sidebar.',
  },
  {
    keywords: ['broadcast', 'alert', 'notify', 'warn'],
    reply: 'Use the Broadcast bar at the top of the dashboard to send an alert to all users. Choose a severity level before sending.',
  },
];

// ── System prompts per role group ─────────────────────────────────────────────
const SYSTEM_PROMPTS = {
  citizen: `You are ReliefHub Assistant, an AI helper for citizens during emergency situations.
The user is a civilian who may be scared or in danger. Keep replies calm, short (2-4 sentences), and practical.
Give safety guidance based on established emergency protocols. Never invent specific incident data,
facility names, or statistics you were not given. If the user asks about nearby incidents or shelters,
tell them to check the live map in the app. If they may be in immediate danger, always recommend the SOS button.`,

  dispatcher: `You are ReliefHub Assistant, an AI helper for emergency operations center staff and rescue teams.
The user is a trained emergency responder. Keep replies concise (2-4 sentences) and operational.
You can explain how to use the platform's features (map, filters, dispatch, broadcast) but do NOT
invent incident counts, team locations, or facility data you were not given. For real-time data,
direct them to the relevant dashboard tab.`,

  facility: `You are ReliefHub Assistant, an AI helper for hospital and shelter staff.
Keep replies short (2-4 sentences) and focused on capacity management and coordination.
Do not invent statistics. For real-time incident data, direct the user to the EOC or
the live map. If there is an emergency at the facility, instruct them to use the SOS button.`,
};

function roleToSystemPrompt(role) {
  if (['eoc', 'admin', 'rescue_team'].includes(role)) return SYSTEM_PROMPTS.dispatcher;
  if (['hospital', 'shelter'].includes(role))          return SYSTEM_PROMPTS.facility;
  return SYSTEM_PROMPTS.citizen; // citizen, volunteer, ngo
}

// ── Gemini fallback (same fetch setup as aiService.geminiAnalyze) ─────────────
async function geminiChatFallback(message, role) {
  const systemPrompt = roleToSystemPrompt(role);
  const fullPrompt   = `${systemPrompt}\n\nUser message: ${message}\n\nReply (plain text, 2-4 sentences):`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000); // 5 s — tighter than incident analysis

  let res;
  try {
    res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: 150, // hard cap — keep replies short
            temperature: 0.3,     // low temperature for consistent, factual tone
          },
        }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`Gemini chat responded with status ${res.status}`);
  }

  const data    = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini chat returned empty response');

  return rawText.trim();
}

// ── Public entry point for citizen-facing chat ────────────────────────────────
/**
 * Replaces the old generateCitizenAdvice for use in aiController.chat.
 * Keyword match → instant reply. No match → Gemini. Gemini fails → safe fallback.
 *
 * @param {string} message
 * @param {string} role  — user's role from req.user
 * @returns {Promise<string>}
 */
async function generateChatReply(message, role) {
  const text = (message || '').toLowerCase();

  // ── 1. Keyword rules (zero latency) ─────────────────────────────────────
  if (['citizen', 'volunteer', 'ngo'].includes(role)) {
    const citizenMatch = CITIZEN_ADVICE_RULES.find((rule) =>
      rule.keywords.some((kw) => text.includes(kw))
    );
    if (citizenMatch) return citizenMatch.reply;
  }

  if (['eoc', 'admin', 'rescue_team'].includes(role)) {
    const dispatchMatch = DISPATCHER_RULES.find((rule) =>
      rule.keywords.some((kw) => text.includes(kw))
    );
    if (dispatchMatch) return dispatchMatch.reply;
  }

  // ── 2. Gemini fallback ───────────────────────────────────────────────────
  const useGemini = process.env.DEMO_MODE !== 'true' && !!process.env.GEMINI_API_KEY;

  if (useGemini) {
    try {
      return await geminiChatFallback(message, role);
    } catch (err) {
      console.warn(`[chatService] Gemini chat fallback failed: ${err.message}`);
    }
  }

  // ── 3. Safe hardcoded fallback ───────────────────────────────────────────
  return SAFE_FALLBACK;
}

// ── Keep the old exports so nothing else breaks ───────────────────────────────
// generateCitizenAdvice is still exported for any call-sites that use it directly
// (aiController.chat calls it — we'll update that separately).
function generateCitizenAdvice(message) {
  const text = (message || '').toLowerCase();
  const match = CITIZEN_ADVICE_RULES.find((rule) =>
    rule.keywords.some((kw) => text.includes(kw))
  );
  return match ? match.reply : SAFE_FALLBACK;
}

const CATEGORY_SYNONYMS = {
  flood:      ['flood', 'water', 'flooding'],
  fire:       ['fire', 'burning', 'blaze'],
  earthquake: ['earthquake', 'quake'],
  medical:    ['medical', 'injury', 'injured'],
  structural: ['structural', 'collapse', 'collapsed', 'building'],
};

function parseEOCQuery(message) {
  const text = (message || '').toLowerCase();
  const filter = {};
  const descriptionParts = [];

  for (const severity of ['critical', 'high', 'medium', 'low']) {
    if (text.includes(severity)) {
      filter.severity = severity;
      descriptionParts.push(`${severity} severity`);
      break;
    }
  }

  for (const [category, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some((s) => text.includes(s))) {
      filter.category = category;
      descriptionParts.push(category);
      break;
    }
  }

  if (/\bresolved\b/.test(text)) {
    filter.status = 'resolved';
    descriptionParts.push('resolved');
  } else if (/\brejected\b|\bfake reports?\b/.test(text)) {
    filter.status = 'rejected';
    descriptionParts.push('rejected');
  } else if (/\bactive\b|\bopen\b|\bongoing\b/.test(text)) {
    filter.status = { $nin: ['resolved', 'rejected', 'merged'] };
    descriptionParts.push('active');
  }

  const description = descriptionParts.length ? descriptionParts.join(', ') : 'all incidents';
  return { filter, description };
}

module.exports = { generateChatReply, generateCitizenAdvice, parseEOCQuery };
