function countActiveMembers(db, gameId) {
  const row = db.prepare(
    `SELECT COUNT(*) as count FROM game_members WHERE game_id = ? AND status = 'active'`
  ).get(gameId);
  return row.count;
}

function countWaitingMembers(db, gameId) {
  const row = db.prepare(
    `SELECT COUNT(*) as count FROM game_members WHERE game_id = ? AND status = 'waiting'`
  ).get(gameId);
  return row.count;
}

function getWaitingPosition(db, gameId, userId) {
  const waiting = db.prepare(`
    SELECT user_id FROM game_members
    WHERE game_id = ? AND status = 'waiting'
    ORDER BY joined_at ASC
  `).all(gameId);
  const index = waiting.findIndex((w) => w.user_id === userId);
  return index === -1 ? null : index + 1;
}

function joinOrWaitlist(db, game, userId, role = 'player') {
  const existing = db.prepare(
    `SELECT * FROM game_members WHERE game_id = ? AND user_id = ?`
  ).get(game.id, userId);

  if (existing?.status === 'active') {
    return { status: 'active', message: 'Already a member' };
  }

  if (existing?.status === 'waiting') {
    const position = getWaitingPosition(db, game.id, userId);
    return {
      status: 'waiting',
      waitingPosition: position,
      message: `Already on the waiting list (position #${position})`,
    };
  }

  const activeCount = countActiveMembers(db, game.id);
  const hasRoom = activeCount < game.max_seats;

  if (existing) {
    const newStatus = hasRoom ? 'active' : 'waiting';
    db.prepare(`
      UPDATE game_members SET status = ?, joined_at = datetime('now'), role = ?
      WHERE id = ?
    `).run(newStatus, role, existing.id);
    if (newStatus === 'waiting') {
      const position = getWaitingPosition(db, game.id, userId);
      return {
        status: 'waiting',
        waitingPosition: position,
        message: `Game is full. Added to waiting list (position #${position})`,
      };
    }
    return { status: 'active', message: 'Joined successfully' };
  }

  const { v4: uuidv4 } = require('uuid');
  const newStatus = hasRoom ? 'active' : 'waiting';
  db.prepare(`
    INSERT INTO game_members (id, game_id, user_id, role, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), game.id, userId, role, newStatus);

  if (newStatus === 'waiting') {
    const position = getWaitingPosition(db, game.id, userId);
    return {
      status: 'waiting',
      waitingPosition: position,
      message: `Game is full. Added to waiting list (position #${position})`,
    };
  }
  return { status: 'active', message: 'Joined successfully' };
}

function promoteFromWaitlist(db, gameId) {
  const next = db.prepare(`
    SELECT * FROM game_members
    WHERE game_id = ? AND status = 'waiting'
    ORDER BY joined_at ASC
    LIMIT 1
  `).get(gameId);

  if (!next) return null;

  db.prepare(`UPDATE game_members SET status = 'active' WHERE id = ?`).run(next.id);
  return next;
}

module.exports = {
  countActiveMembers,
  countWaitingMembers,
  getWaitingPosition,
  joinOrWaitlist,
  promoteFromWaitlist,
};
