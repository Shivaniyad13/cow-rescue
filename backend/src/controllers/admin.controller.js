const prisma = require('../config/prisma');

// GET /api/admin/stats
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalCases, reported, inProgress, completed,
      totalNGOs, activeNGOs, totalUsers, totalAlerts,
    ] = await Promise.all([
      prisma.cases.count(),
      prisma.cases.count({ where: { status: 'REPORTED' } }),
      prisma.cases.count({ where: { status: { in: ['NGO_ASSIGNED', 'IN_PROGRESS', 'RESCUED'] } } }),
      prisma.cases.count({ where: { status: 'COMPLETED' } }),
      prisma.ngos.count(),
      prisma.ngos.count({ where: { is_active: true } }),
      prisma.users.count(),
      prisma.case_alerts.count(),
    ]);

    res.json({
      success: true,
      data: {
        cases: { total: totalCases, reported, inProgress, completed },
        ngos: { total: totalNGOs, active: activeNGOs },
        users: { total: totalUsers },
        alerts: { total: totalAlerts },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/ngos
exports.listNGOs = async (req, res, next) => {
  try {
    const { status, state, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const where = {};
    if (status === 'verified') where.is_verified = true;
    if (status === 'pending') where.is_verified = false;
    if (state) where.state = state;

    const [ngos, total] = await Promise.all([
      prisma.ngos.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.ngos.count({ where }),
    ]);

    res.json({
      success: true,
      data: ngos,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/ngos/:id/verify
exports.verifyNGO = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { verified } = req.body;

    const ngo = await prisma.ngos.findUnique({ where: { id } });
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });

    const updated = await prisma.ngos.update({
      where: { id },
      data: {
        is_verified: verified !== false,
        kyc_status: verified !== false ? 'VERIFIED' : 'REJECTED',
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/ngos/:id/opt-in
exports.optInNGO = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { opted_in } = req.body;

    const ngo = await prisma.ngos.findUnique({ where: { id } });
    if (!ngo) return res.status(404).json({ success: false, message: 'NGO not found' });

    const updated = await prisma.ngos.update({
      where: { id },
      data: { opted_in_for_alerts: !!opted_in },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/alerts
exports.listAlerts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const where = status ? { status } : {};

    const [alerts, total] = await Promise.all([
      prisma.case_alerts.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          cases: { select: { case_id: true, status: true, state: true } },
        },
      }),
      prisma.case_alerts.count({ where }),
    ]);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/cases/:caseId/full
exports.getFullCase = async (req, res, next) => {
  try {
    const { caseId } = req.params;

    const foundCase = await prisma.cases.findUnique({
      where: { case_id: caseId },
      include: {
        case_timeline: { orderBy: { created_at: 'asc' } },
        case_alerts: { orderBy: { created_at: 'desc' } },
        ngos: true,
        users: true,
      },
    });

    if (!foundCase) return res.status(404).json({ success: false, message: 'Case not found' });

    res.json({ success: true, data: foundCase });
  } catch (err) {
    next(err);
  }
};