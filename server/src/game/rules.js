export const MINIGAMES = ['FLOOR PANIC','MAGNET MAYHEM',"DON'T WAKE THE GIANT",'CHAOS COURIER'];
export const MAX_PLAYERS = 8;
export function scoreForPlacement(place, total, final = false) {
  if (place < 1 || place > total || total < 1) return 0;
  const base = [10,7,5,3,2,1,1,1][place-1] ?? 1;
  return final ? base + 3 : base;
}
export function validMove(data) {
  return data && Number.isFinite(data.x) && Number.isFinite(data.z) && Math.abs(data.x) <= 30 && Math.abs(data.z) <= 30 && Number.isFinite(data.yaw);
}
