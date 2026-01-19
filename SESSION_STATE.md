# HMD Simulator - Session State
**Date:** January 19, 2026  
**Branch:** `migrate-webgpu`  
**Issue:** Gaussian splat black streaks in PIP viewports - **RESOLVED**

---

## ✅ ISSUE RESOLVED

**Root Cause:** Viewport aspect ratio mismatch between eye camera projection matrix and actual viewport dimensions.

**The Bug:** 
- Eye camera projection matrix was built with `aspectRatioEye = 0.8881` (from HMD frustum calculations)
- But PIP viewports had aspect ratio `0.4996` (off by **-43.8%**)
- This mismatch caused gaussian splats to render with incorrect focal length, resulting in black streaks

**The Fix (app.ts lines 317-342, 591-604):**
```typescript
// OLD (buggy):
const pipHeightPixels = pipWidthPixels / aspectRatioEye;

// NEW (fixed):
const pipHeightPixels = pipWidthPixels / (aspectRatioEye * canvasAspectRatio);
```

The key insight: When normalizing viewport dimensions, we must account for the canvas aspect ratio to maintain the correct eye frustum aspect ratio.

---

## Work Done This Session

### 1. Initial Approach: Setting `scene.activeCamera` Before Camera Renders
- Added `onBeforeCameraRenderObservable` in `src/main.ts` to set `scene.activeCamera` before each camera renders
- **Result:** Did not fix the issue

### 2. Second Approach: Per-Mesh Camera Assignment
- Added `onBeforeRenderObservable` to each gaussian splat mesh to set the correct camera before that mesh renders
- Located in `src/app.ts` around lines 506-530
- `meshMain` → sets `scene.activeCamera = this.camera`
- `meshLeft` → sets `scene.activeCamera = this.hmd.camL`
- `meshRight` → sets `scene.activeCamera = this.hmd.camR`
- **Result:** Did not fix the issue

### 3. Current Approach: Investigating Projection Matrix & Viewport
- Discovered that gaussian splat material uses `camera.getProjectionMatrix().m[5]` to calculate focal length
- Eye cameras use custom off-axis projection matrices (frozen, non-standard)
- Added debug logging to track:
  - Projection matrix [5] values per camera
  - Viewport dimensions per camera
  - When each mesh renders

---

## Current Code State

### Modified Files:
1. **src/main.ts** (lines 53-73)
   - Debug logging enabled (`DEBUG_GS_SORTING = true`)
   - Logs camera renders with frame count, camera name, layer mask, and active camera

2. **src/app.ts** (lines 506-532)
   - Per-mesh camera assignment in `onBeforeRenderObservable`
   - Debug logging for projection matrix and viewport dimensions
   - `DEBUG_MESH_RENDER = true`

3. **src/hmd.ts** (lines 131-139, 409-413)
   - Updated comments documenting render targets (not actively used)

### Key Architecture Points:
- **3 separate gaussian splat meshes** loaded per scene (meshMain, meshLeft, meshRight)
- **Layer masks isolate rendering:**
  - `LAYER_SPLAT_MAIN = 0x10` → main camera
  - `LAYER_SPLAT_LEFT = 0x20` → left eye camera
  - `LAYER_SPLAT_RIGHT = 0x40` → right eye camera
- **5 active cameras render per frame:**
  1. `camera` (main) - full viewport
  2. `camL` (left eye) - small PIP viewport, bottom-right
  3. `camR` (right eye) - small PIP viewport, bottom-right
  4. `guiCamera` (UI) - full viewport overlay
  5. `hmdControlCam` (control) - no viewport

### Render Order:
```
scene.activeCameras = [
  this.camera,          // Main camera
  this.hmd.camL,        // Left eye PIP
  this.hmd.camR,        // Right eye PIP
  guiCamera,            // UI overlay
  this.hmd.controlCam   // Control camera
];
```

---

## Technical Investigation

### Gaussian Splat Rendering Pipeline:
1. **Depth Sorting:** `_postToWorker()` uses `scene.activeCamera.getViewMatrix()` for view-dependent sorting
2. **Material Binding:** Gaussian splat material calculates focal length from `camera.getProjectionMatrix().m[5]`
3. **Viewport:** Material uses `invViewport` parameter: `effect.setFloat2("invViewport", 1 / (renderWidth / numberOfRigs), 1 / renderHeight)`

### Hypothesis:
The black streaks may be caused by:
1. **Incorrect focal length calculation** - Eye cameras use custom off-axis projection matrices, `proj.m[5]` might not represent the correct focal length
2. **Viewport mismatch** - PIP viewports are small (fraction of canvas), but gaussian splat might be using full canvas dimensions
3. **Aspect ratio issues** - Eye cameras have specific aspect ratios (`aspectRatioEye`) but projection matrices might not match viewport aspect ratios

### Eye Camera Projection Details:
- **Custom off-axis projection matrices** built in `hmd.ts` lines 780-832
- **Frozen projection matrices** - set with `freezeProjectionMatrix()` 
- **Near/far planes:** near=0.06, far=1.56 (from HMD optics calculations)
- **Aspect ratio:** Calculated from `(rightForLeftEye - leftForLeftEye) / (top - bottom)`

---

## Next Steps

### When Session Resumes:
1. **Use Chrome DevTools** to:
   - Take screenshot showing black streaks in PIP viewports
   - Capture console logs showing:
     - Camera render order and active camera per frame
     - Mesh render logs with projection matrix [5] values
     - Viewport dimensions for each camera
   - Check for any errors/warnings

2. **Analyze Console Output:**
   - Compare projection matrix [5] values between main camera and eye cameras
   - Check if viewport dimensions match expected PIP sizes
   - Verify mesh render observers are firing in correct order

3. **Potential Fixes to Try:**
   - Override focal length calculation for eye cameras
   - Ensure viewport dimensions are correctly passed to gaussian splat material
   - Check if gaussian splat shader needs modification for off-axis projections
   - Test if issue exists with standard perspective projection (disable custom projection temporarily)

---

## Files to Review:
- `src/app.ts` - Scene management, splat loading, camera setup
- `src/main.ts` - Engine init, render loop, debug logging
- `src/hmd.ts` - Eye camera setup, projection matrix calculation
- `src/constants.ts` - Layer mask definitions
- `node_modules/@babylonjs/core/Materials/GaussianSplatting/gaussianSplattingMaterial.js` - Material binding logic
- `node_modules/@babylonjs/core/Meshes/GaussianSplatting/gaussianSplattingMesh.js` - Sorting logic

---

## Dev Server:
```bash
cd /Users/chek/repos/hmd
npm run dev
# Server running on http://localhost:5173
```

---

## Changes Saved:
- Patch file: `/tmp/hmd_changes.patch`
- All changes uncommitted on branch `migrate-webgpu`
