function maskPhone(phone) {
  if (!phone || phone.length < 4) return '***';
  return `***-***-${phone.slice(-4)}`;
}

function displayName(user) {
  return user.nickname || user.name;
}

module.exports = { maskPhone, displayName };
