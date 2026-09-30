// src/controllers/alert.controller.js
const prisma = require('../config/prisma');

// GET /api/alerts/:token
exports.getAlertPage = async (req, res, next) => {
  try {
    const { token } = req.params;

    const alert = await prisma.case_alerts.findUnique({
      where: { token },
      include: {
        cases: true,
        ngos_case_alerts_ngo_idTongos: true,
      },
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }
    if (alert.token_expires_at && alert.token_expires_at < new Date()) {
      return res.status(410).json({ success: false, message: 'Alert expired' });
    }

    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
};

// POST /api/alerts/:token/accept
exports.acceptAlert = async (req, res, next) => {
  try {
    const { token } = req.params;

    const alert = await prisma.case_alerts.findUnique({ where: { token } });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    if (alert.token_expires_at && alert.token_expires_at < new Date()) {
      return res.status(410).json({ success: false, message: 'Alert expired' });
    }
    if (alert.status !== 'SENT') {
      return res.status(400).json({ success: false, message: `Alert already ${alert.status}` });
    }

    const updated = await prisma.case_alerts.update({
      where: { token },
      data: {
        status: 'ACCEPTED',
        response: 'ACCEPTED',
        responded_at: new Date(),
      },
    });

    if (alert.case_id) {
      await prisma.cases.update({
        where: { case_id: alert.case_id },
        data: {
          assigned_ngo_id: alert.ngo_id,
          ngo_response: 'ACCEPTED',
          status: 'NGO_ASSIGNED',
        },
      });

      await prisma.case_timeline.create({
        data: {
          case_id: alert.case_id,
          event: 'ALERT_ACCEPTED',
          description: `NGO #${alert.ngo_id} accepted the case`,
          performed_by: 'NGO',
        },
      });
    }

    res.json({ success: true, message: 'Alert accepted', data: updated });
  } catch (err) {
    next(err);
  }
};

// POST /api/alerts/:token/reject
exports.rejectAlert = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const alert = await prisma.case_alerts.findUnique({ where: { token } });
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    if (alert.token_expires_at && alert.token_expires_at < new Date()) {
      return res.status(410).json({ success: false, message: 'Alert expired' });
    }

    const updated = await prisma.case_alerts.update({
      where: { token },
      data: {
        status: 'REJECTED',
        response: 'REJECTED',
        responded_at: new Date(),
        note: reason || 'Rejected by NGO',
      },
    });

    if (alert.case_id) {
      await prisma.case_timeline.create({
        data: {
          case_id: alert.case_id,
          event: 'ALERT_REJECTED',
          description: `NGO #${alert.ngo_id} rejected the case${reason ? `: ${reason}` : ''}`,
          performed_by: 'NGO',
        },
      });
    }

    res.json({ success: true, message: 'Alert rejected', data: updated });
  } catch (err) {
    next(err);
  }
};