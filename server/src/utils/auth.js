const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, phone: user.phone, isHost: !!user.is_host },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateJoinCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizePhone(phone) {
  return phone.replace(/\D/g, '');
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  generateOtp,
  generateJoinCode,
  normalizePhone,
};
