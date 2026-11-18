import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { offAxisProjectionLH } from '../src/offAxisProjection.ts';

const close = (actual, expected) => assert.ok(
  Math.abs(actual - expected) < 2e-6,
  `${actual} should equal ${expected}`,
);

for (const [name, l, r, b, t] of [
  ['left eye', -.039576973684, .045970394737, -.048092105263, .048092105263],
  ['right eye', -.045970394737, .039576973684, -.048092105263, .048092105263],
  ['symmetric', -.04, .04, -.03, .03],
  ['both axes asymmetric', -.03, .05, -.02, .04],
]) {
  test(`${name} maps actual bounds to clip edges and recovers its rays`, () => {
    const n = .06, f = 1.56;
    const p = offAxisProjectionLH(l, r, b, t, n, f);
    const inverse = Matrix.Invert(p);
    for (const z of [n, .4, f]) {
      for (const [x, nx] of [[l, -1], [r, 1]]) {
        for (const [y, ny] of [[b, -1], [t, 1]]) {
          const v = Vector3.TransformCoordinates(new Vector3(x*z/n, y*z/n, z), p);
          close(v.x, nx); close(v.y, ny);
          const recovered = Vector3.TransformCoordinates(v, inverse);
          close(recovered.x, x*z/n); close(recovered.y, y*z/n); close(recovered.z, z);
        }
      }
    }
    close(Vector3.TransformCoordinates(new Vector3(0, 0, n), p).z, -1);
    close(Vector3.TransformCoordinates(new Vector3(0, 0, f), p).z, 1);
    const centre = Vector3.TransformCoordinates(new Vector3((l+r)/2, (b+t)/2, n), p);
    close(centre.x, 0); close(centre.y, 0);
  });
}

test('symmetric projections retain the existing scale and clip-depth mapping', () => {
  const n=.06, f=1.56;
  const p=offAxisProjectionLH(-.04,.04,-.03,.03,n,f);
  const original=Matrix.FromValues(1.5,0,0,0,0,2,0,0,0,0,(f+n)/(f-n),1,0,0,-2*f*n/(f-n),0);
  p.m.forEach((v,i)=>close(v,original.m[i]));
});
