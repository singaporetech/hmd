import { Matrix } from "@babylonjs/core/Maths/math.vector.js";

/**
 * Off-axis projection matrix for one eye.
 *
 * We calculate the projection matrix manually due to the asymmetry of the
 * horizontal frustum for the left and right eyes. The bounds are in eye space,
 * on the near plane.
 *
 * The general form of the projection matrix for RHS in OpenGL is:
 * | 2n/(r-l)     0            0            0   |
 * | 0            2n/(t-b)     0            0   |
 * | (r+l)/(r-l)  (t+b)/(t-b)  -(f+n)/(f-n) -1  |
 * | 0            0            -2fn/(f-n)   0   |
 *
 * Babylon.js uses LHS axes, where the camera looks along +z, so w = z instead of
 * w = -z. Every entry in the third row changes sign, including the off-centre
 * terms:
 * | 2n/(r-l)     0            0            0   |
 * | 0            2n/(t-b)     0            0   |
 * | -(r+l)/(r-l) -(t+b)/(t-b) (f+n)/(f-n)  1   |
 * | 0            0            -2fn/(f-n)   0   |
 *
 * Keeping the RHS sign on the off-centre terms would project the mirrored
 * interval [-r, -l], swapping each eye's nasal and temporal sides.
 *
 * https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/opengl-perspective-projection-matrix.html
 * https://www.songho.ca/opengl/gl_transform.html#example2
 */
export function offAxisProjectionLH(
  left: number, right: number, bottom: number, top: number,
  near: number, far: number,
): Matrix {
  return Matrix.FromValues(
    2 * near / (right - left), 0, 0, 0,
    0, 2 * near / (top - bottom), 0, 0,
    -(right + left) / (right - left), -(top + bottom) / (top - bottom),
    (far + near) / (far - near), 1,
    0, 0, -2 * far * near / (far - near), 0,
  );
}
