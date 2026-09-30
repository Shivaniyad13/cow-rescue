const prisma = require('../config/prisma');

/**
 * Phone se user dhoondo, agar nahi mile to naya banao.
 * Prisma cuid() se id auto-generate karega.
 *
 * @param {Object} params
 * @param {string} params.name  - Guest ka naam (optional)
 * @param {string} params.phone - Phone number (required)
 * @param {string} params.email - Email (optional)
 * @returns {Promise<Object|null>} User object ya null (agar phone nahi diya)
 */
async function findOrCreateGuestUser({ name, phone, email }) {
  if (!phone || !phone.trim()) return null;

  const cleanPhone = phone.trim();

  // 1. Pehle phone se dhoondo
  let user = await prisma.users.findFirst({
    where: { phone: cleanPhone },
  });

  // 2. Mil gaya to wahi return karo
  if (user) return user;

  // 3. Nahi mila to naya banao
  user = await prisma.users.create({
    data: {
      name: name?.trim() || 'Guest',
      phone: cleanPhone,
      email: email?.trim() || null,
      role: 'USER',
      is_active: true,
    },
  });

  return user;
}

module.exports = { findOrCreateGuestUser };