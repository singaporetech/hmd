/**
 * @file Constants used throughout the application
 * @author Chek
 */

import {Vector3} from "@babylonjs/core";

// Use layer masks to control what is rendered by the cameras
// - this is a bit mask, so we can combine the layers with bitwise OR
//   e.g., to render the Scene and UI, we set the layerMask to 0x1 | 0x2 = 0x3
//   - in case you forgot the bitwise OR: 0001 | 0010 = 0011
// - 0x1: render the Scene (primitives only)
// - 0x2: render the HMD
// - 0x4: render the Frustum
// - 0x8: render the UI
// - 0x10: render Gaussian Splat for main camera
// - 0x20: render Gaussian Splat for left eye camera
// - 0x40: render Gaussian Splat for right eye camera
export const LAYER_NONE = 0x0;
export const LAYER_SCENE = 0x1;
export const LAYER_HMD = 0x2;
export const LAYER_FRUSTUM = 0x4;
export const LAYER_UI = 0x8;
export const LAYER_SPLAT_MAIN = 0x10;
export const LAYER_SPLAT_LEFT = 0x20;
export const LAYER_SPLAT_RIGHT = 0x40;
export const LAYER_SCENE_HMD_FRUSTUM = LAYER_SCENE | LAYER_HMD | LAYER_FRUSTUM;
export const LAYER_SCENE_FRUSTUM = LAYER_SCENE | LAYER_FRUSTUM;

// Configuration for the main camera
export const MAIN_CAM_POS = new Vector3(0.7, 0.7, -1);
export const CAM_SPEED = 0.03;

// Configuration for visualizations
export const MESH_EDGE_WIDTH = 0.1;
export const VIEWPORT_BORDER_THICKNESS = 3;

// Configuration for the PIP view
export const PIP_VIEWPORT_WIDTH = 0.25; // 25% of the screen width (deprecated, use BASE_PIP_WIDTH_FRACTION)
export const BASE_PIP_WIDTH_FRACTION = 0.20; // Base PIP viewport width as fraction of canvas (20%)
export const MAX_PIP_WIDTH_FRACTION = 0.45; // Maximum PIP viewport width (45% per viewport, 90% total for two)
export const MAX_PIP_HEIGHT_FRACTION = 0.9; // Maximum PIP viewport height (90% of canvas)

// Base HMD display dimensions for scaling calculations (Cardboard 2.0)
export const BASE_DISPLAY_WIDTH = 0.121; // meters (120.96mm)
export const BASE_DISPLAY_HEIGHT = 0.068; // meters (68.03mm)

// Display mode
export enum DisplayMode {
    Simulation = "simulation",
    VR = "vr",
}
