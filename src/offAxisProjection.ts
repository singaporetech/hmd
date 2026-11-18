import { Matrix } from "@babylonjs/core/Maths/math.vector.js";

/** Left-handed perspective with eye-space bounds on the near plane.
 * Keeps the simulator's existing -1..+1 clip-depth convention.
 */
export function offAxisProjectionLH(
  left: number, right: number, bottom: number, top: number,
  near: number, far: number,
): Matrix {
  // With w = z, these offsets must subtract the bounds' centre.
  // Positive offsets would project the mirrored interval [-right, -left].
  return Matrix.FromValues(
    2 * near / (right - left), 0, 0, 0,
    0, 2 * near / (top - bottom), 0, 0,
    -(right + left) / (right - left), -(top + bottom) / (top - bottom),
    (far + near) / (far - near), 1,
    0, 0, -2 * far * near / (far - near), 0,
  );
}
