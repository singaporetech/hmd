# Projection regression checks

Run `npm run test:projection` with Node.js 22.18 or newer. The command uses native TypeScript stripping and Node’s test runner, independently of the older Vitest browser-test setup.

The checks project the supplied eye-space bounds onto all four clip edges, recover those bounds through the inverse matrix, check intermediate depths and retain the existing near/far depth mapping. Both asymmetric eyes, symmetric bounds and vertically asymmetric bounds are covered.

The frozen eye matrices keep their existing minus-one-to-plus-one clip depth. This change corrects off-centre shifts, not depth-buffer conventions or optical calibration.
