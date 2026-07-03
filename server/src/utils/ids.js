import { customAlphabet, nanoid } from 'nanoid';

export const newId = () => nanoid(21);

// Numeric join code that hosts share so players can sign up for a game.
const numeric = customAlphabet('0123456789', 6);
export const newJoinCode = () => numeric();

// 6-digit OTP for phone verification.
export const newOtp = () => numeric();
