/**
 * Object physics from the brand system: craft objects tilt between -6deg and
 * +6deg and never past the ±8deg hard limit in either direction.
 */
const ROTATION_HARD_LIMIT = 8

function clampRotation(deg: number) {
  return Math.max(-ROTATION_HARD_LIMIT, Math.min(ROTATION_HARD_LIMIT, deg))
}

export { clampRotation, ROTATION_HARD_LIMIT }
