const crypto = require('crypto');
const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { findOrCreateGuestUser } = require('../utils/findOrCreateGuestUser');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function generateCaseId() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `CASE-${year}-${random}`;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function addTimeline(caseIdString, event, description, performedBy = 'SYSTEM', metadata = null) {
  return prisma.case_timeline.create({
    data: {
      case_id: caseIdString,
      event,
      description,
      performed_by: performedBy,
      ...(metadata && { metadata }),
    },
  });
}

// ─────────────────────────────────────────────
// POST /api/cases/report
// ─────────────────────────────────────────────
exports.reportCow = asyncHandler(async (req, res) => {
  const {
    reporter_name, reporter_phone, reporter_email,
    description, animal_type, animal_condition, severity,
    address, latitude, longitude,
    state, district, city, pincode,
    photo_url, video_url,
  } = req.body;

  if (latitude === undefined || longitude === undefined) {
    throw new ApiError(400, 'latitude and longitude are required');
  }

  if (!reporter_phone) {
    throw new ApiError(400, 'Phone number is required to report a case');
  }

  const case_id = generateCaseId();

  // ─── Reporter user (logged-in ya guest) ───
  let reporterUser = null;

  if (req.user?.id) {
    // Logged-in user (future me jab auth lagega)
    reporterUser = await prisma.users.findUnique({
      where: { id: req.user.id },
    });
  }

  if (!reporterUser) {
    // Guest — phone se find-or-create
    reporterUser = await findOrCreateGuestUser({
      name: reporter_name,
      phone: reporter_phone,
      email: reporter_email,
    });
  }

  if (!reporterUser) {
    throw new ApiError(400, 'Could not identify reporter');
  }

  const newCase = await prisma.cases.create({
    data: {
      case_id,
      reporter_user_id: reporterUser.id,           // ✅ NEW
      reporter_name: reporter_name || reporterUser.name || null,
      reporter_phone: reporter_phone || reporterUser.phone || null,
      reporter_email: reporter_email || reporterUser.email || null,
      animal_type: animal_type || 'Cow',
      animal_condition: animal_condition || null,
      description: description || null,
      severity: severity || 'MEDIUM',
      address: address || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      state: state || null,
      district: district || null,
      city: city || null,
      pincode: pincode || null,
      photo_url: photo_url || null,
      video_url: video_url || null,
      status: 'REPORTED',
    },
  });

  await addTimeline(case_id, 'CASE_REPORTED', 'Case reported by user', reporter_phone || 'USER');

  res.status(201).json({
    success: true,
    message: 'Case reported successfully',
    data: newCase,
  });
});

// ─────────────────────────────────────────────
// GET /api/cases/track/:caseId
// ─────────────────────────────────────────────
exports.trackCase = asyncHandler(async (req, res) => {
  const { caseId } = req.params;

  const foundCase = await prisma.cases.findUnique({
    where: { case_id: caseId },
    include: {
      case_timeline: { orderBy: { created_at: 'asc' } },
      case_alerts:   { orderBy: { created_at: 'desc' } },
      ngos: true,
    },
  });

  if (!foundCase) throw new ApiError(404, 'Case not found');

  res.json({ success: true, data: foundCase });
});

// ─────────────────────────────────────────────
// GET /api/cases/track/:caseId/timeline
// ─────────────────────────────────────────────
exports.getTimeline = asyncHandler(async (req, res) => {
  const { caseId } = req.params;

  const foundCase = await prisma.cases.findUnique({ where: { case_id: caseId } });
  if (!foundCase) throw new ApiError(404, 'Case not found');

  const timeline = await prisma.case_timeline.findMany({
    where: { case_id: caseId },
    orderBy: { created_at: 'asc' },
  });

  res.json({ success: true, data: timeline });
});

// ─────────────────────────────────────────────
// GET /api/cases/:caseId/nearby-ngos
// ─────────────────────────────────────────────
exports.getNearbyNGOs = asyncHandler(async (req, res) => {
  const { caseId } = req.params;

  const foundCase = await prisma.cases.findUnique({ where: { case_id: caseId } });
  if (!foundCase) throw new ApiError(404, 'Case not found');

  const ngos = await prisma.ngos.findMany({
    where: {
      is_active: true,
      ...(foundCase.state && { state: foundCase.state }),
      ...(foundCase.district && { district: foundCase.district }),
    },
    take: 20,
  });

  res.json({ success: true, data: ngos });
});

// ─────────────────────────────────────────────
// GET /api/cases/:caseId/eligible-ngos
// ─────────────────────────────────────────────
exports.getEligibleNGOs = asyncHandler(async (req, res) => {
  const { caseId } = req.params;

  const foundCase = await prisma.cases.findUnique({ where: { case_id: caseId } });
  if (!foundCase) throw new ApiError(404, 'Case not found');

  const ngos = await prisma.ngos.findMany({
    where: {
      is_active: true,
      can_handle_cow_rescue: true,
      opted_in_for_alerts: true,
      ...(foundCase.state && { state: foundCase.state }),
    },
    take: 20,
  });

  res.json({ success: true, data: ngos });
});

// ─────────────────────────────────────────────
// GET /api/cases/admin/list
// ─────────────────────────────────────────────
exports.adminListCases = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const where = status ? { status } : {};
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  const [cases, total] = await Promise.all([
    prisma.cases.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { case_timeline: { orderBy: { created_at: 'desc' }, take: 5 } },
    }),
    prisma.cases.count({ where }),
  ]);

  res.json({
    success: true,
    data: cases,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// ─────────────────────────────────────────────
// PUT /api/cases/admin/:caseId/government-route
// ─────────────────────────────────────────────
exports.adminUpdateGovernmentRoute = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const { government_route_status, note } = req.body;

  if (!government_route_status) {
    throw new ApiError(400, 'government_route_status is required');
  }

  const foundCase = await prisma.cases.findUnique({ where: { case_id: caseId } });
  if (!foundCase) throw new ApiError(404, 'Case not found');

  const updated = await prisma.cases.update({
    where: { case_id: caseId },
    data: {
      government_route_status,
      government_response_at: new Date(),
    },
  });

  await addTimeline(
    caseId,
    'GOVERNMENT_ROUTE_UPDATED',
    note || `Government route status: ${government_route_status}`,
    'ADMIN'
  );

  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────
// PUT /api/cases/admin/:caseId/status
// ─────────────────────────────────────────────
exports.adminUpdateStatus = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const { status, note } = req.body;

  if (!status) throw new ApiError(400, 'status is required');

  const foundCase = await prisma.cases.findUnique({ where: { case_id: caseId } });
  if (!foundCase) throw new ApiError(404, 'Case not found');

  const updateData = { status };
  if (status === 'COMPLETED') updateData.completed_at = new Date();

  const updated = await prisma.cases.update({
    where: { case_id: caseId },
    data: updateData,
  });

  await addTimeline(caseId, 'STATUS_CHANGED', note || `Status changed to ${status}`, 'ADMIN');

  res.json({ success: true, data: updated });
});

// ─────────────────────────────────────────────
// POST /api/cases/admin/:caseId/send-alert
// ─────────────────────────────────────────────
exports.adminSendAlert = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const { ngo_id, priority, channel, note, response_deadline_hours } = req.body;

  const foundCase = await prisma.cases.findUnique({ where: { case_id: caseId } });
  if (!foundCase) throw new ApiError(404, 'Case not found');

  const token = generateToken();
  const deadlineHours = Number(response_deadline_hours) || 24;
  const response_deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

  const alert = await prisma.case_alerts.create({
    data: {
      case_id: caseId,
      ngo_id: ngo_id || null,
      token,
      token_expires_at: response_deadline,
      response_deadline,
      priority: priority || 1,
      channel: channel || 'EMAIL',
      status: 'SENT',
      note: note || 'New case alert',
    },
  });

  await addTimeline(
    caseId,
    'ALERT_SENT',
    `Alert sent${ngo_id ? ` to NGO #${ngo_id}` : ''}`,
    'ADMIN'
  );

  res.status(201).json({ success: true, data: alert });
});

// ─────────────────────────────────────────────
// POST /api/cases/:caseId/user-action/called-1962
// ─────────────────────────────────────────────
exports.userCalled1962 = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const { note } = req.body;

  const foundCase = await prisma.cases.findUnique({ where: { case_id: caseId } });
  if (!foundCase) throw new ApiError(404, 'Case not found');

  await addTimeline(
    caseId,
    'USER_CALLED_1962',
    note || 'User called 1962 government helpline',
    'USER'
  );

  const updated = await prisma.cases.update({
    where: { case_id: caseId },
    data: { government_route_status: 'USER_CONTACTED' },
  });

  res.json({ success: true, message: '1962 call logged', data: updated });
});

// ─────────────────────────────────────────────
// POST /api/cases/:caseId/user-action/request-help
// ─────────────────────────────────────────────
exports.userRequestHelp = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const { note } = req.body;

  const foundCase = await prisma.cases.findUnique({ where: { case_id: caseId } });
  if (!foundCase) throw new ApiError(404, 'Case not found');

  await addTimeline(
    caseId,
    'USER_REQUESTED_HELP',
    note || 'User requested additional help',
    'USER'
  );

  res.json({ success: true, message: 'Help request logged' });
});

// ─────────────────────────────────────────────
// POST /api/cases/:caseId/user-action/no-response
// ─────────────────────────────────────────────
exports.userNoResponse = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const { note } = req.body;

  const foundCase = await prisma.cases.findUnique({ where: { case_id: caseId } });
  if (!foundCase) throw new ApiError(404, 'Case not found');

  await addTimeline(
    caseId,
    'USER_NO_RESPONSE',
    note || 'User reported no response from authorities',
    'USER'
  );

  res.json({ success: true, message: 'No response logged' });
});