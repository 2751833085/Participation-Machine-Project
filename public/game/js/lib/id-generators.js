/** Friends app — client-side id / code generation. */

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function generateRoomCode() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function generateFriendCode() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function generateQrToken() {
  let token = "";
  for (let i = 0; i < 24; i++) token += Math.floor(Math.random() * 36).toString(36);
  return token.toUpperCase();
}
