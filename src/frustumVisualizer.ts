/**
 * @file FrustumVisualizer class for visualizing a camera frustum using tubes.
 * @author Chek
 *
 * This class implements the frustum visualization as 3D tube meshes.
 * - calculates the frustum corners in world space from projection and view matrices
 * - constructs 12 tubes to represent the edges of the frustum
 * - uses a shared unlit emissive material to ensure visibility independent of lighting
 * - supports runtime updates:
 *   - update frustum geometry when matrices change
 *   - adjust tube thickness
 *   - change emissive color
 *   - toggle visibility
 *
 * Note:
 * - Tubes respect depth testing (if the environment writes depth).
 * - Layer mask and rendering group can be controlled for compatibility with HMD rendering
 *   and splat/primitive scenes.
 */

import {
  Color3,
  Constants,
  Matrix,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import { LAYER_FRUSTUM } from "./constants";

export class FrustumVisualizer {
  private scene: Scene;
  private tubeMeshes: Mesh[] = []; // 12 tubes, one per edge
  private material: StandardMaterial; // shared unlit emissive
  private tubeRadius = 0.0015; // default thickness (world units)

  /**
   * Constructs a frustum visualizer that renders edges as tubes.
   * @param projMat The projection matrix used to compute the frustum corners.
   * @param viewMat The view matrix used to compute the frustum corners.
   * @param scene The Babylon.js scene to attach the meshes and material to.
   */
  constructor(projMat: Matrix, viewMat: Matrix, scene: Scene) {
    this.scene = scene;

    // Unlit emissive material so it stays bright regardless of lighting
    this.material = new StandardMaterial("frustumMat", scene);
    this.material.emissiveColor = Color3.White();
    this.material.disableLighting = true;
    this.material.alphaMode = Constants.ALPHA_DISABLE;

    // Depth write ON so it can occlude/occluded normally (if splat pass writes depth)
    this.material.disableDepthWrite = false;

    // Build tubes
    const corners = this.calculateFrustumCorners(projMat, viewMat);
    this.tubeMeshes = this.buildTubes(corners);

    // Keep off HMD eye cameras
    this.setLayerMask(LAYER_FRUSTUM);
  }

  /**
   * Updates the tube geometry when the frustum matrices change.
   * @param projMat The new projection matrix.
   * @param viewMat The new view matrix.
   */
  public updateFrustumMesh(projMat: Matrix, viewMat: Matrix) {
    const corners = this.calculateFrustumCorners(projMat, viewMat);
    const edgePairs = this.getEdgePairs();

    // Update existing tubes in place
    if (this.tubeMeshes.length !== edgePairs.length) {
      this.disposeMeshesOnly();
      this.tubeMeshes = this.buildTubes(corners);
      return;
    }

    for (let i = 0; i < edgePairs.length; i++) {
      const [a, b] = edgePairs[i];
      MeshBuilder.CreateTube(
        this.tubeMeshes[i].name,
        {
          path: [corners[a], corners[b]],
          radius: this.tubeRadius,
          updatable: true,
          instance: this.tubeMeshes[i],
          tessellation: 8,
        },
        this.scene,
      );
    }
  }

  /**
   * Sets the tube thickness (world units). Call updateFrustumMesh to apply.
   * @param radius The tube radius to use for all edges.
   */
  public setThickness(radius: number) {
    this.tubeRadius = Math.max(1e-6, radius);
  }

  /**
   * Sets the emissive color of the shared frustum material.
   * @param color The color to apply as emissive.
   */
  public setEmissiveColor(color: Color3) {
    this.material.emissiveColor = color.clone();
  }

  /**
   * Sets visibility for all frustum tubes.
   * @param isVisible Whether the frustum should be visible.
   */
  public setVisibility(isVisible: boolean) {
    for (const t of this.tubeMeshes) t.isVisible = isVisible;
  }

  /**
   * Toggles visibility of the frustum tubes.
   */
  public toggleVisibility() {
    const vis = this.tubeMeshes.some((t) => t.isVisible);
    this.setVisibility(!vis);
  }

  /**
   * Assigns a rendering group ID to all frustum tubes.
   * @param id The rendering group ID to set.
   */
  public setRenderingGroupId(id: number) {
    for (const t of this.tubeMeshes) t.renderingGroupId = id;
  }

  /**
   * Sets the layer mask for all frustum tubes.
   * @param mask The layer mask to apply.
   */
  public setLayerMask(mask: number) {
    for (const t of this.tubeMeshes) t.layerMask = mask;
  }

  /**
   * Disposes the frustum meshes and shared material.
   */
  public dispose() {
    this.disposeMeshesOnly();
    this.material.dispose();
  }

  // ==== internals ===========================================================

  /**
   * Helper to dispose only the tube meshes (keeps the material alive).
   */
  private disposeMeshesOnly() {
    for (const t of this.tubeMeshes) t.dispose();
    this.tubeMeshes = [];
  }

  /**
   * Helper to build the 12 tube meshes from corner positions.
   * @param corners The eight frustum corners in world space.
   * @returns An array of tube meshes, one per edge.
   */
  private buildTubes(corners: Vector3[]) {
    const tubes: Mesh[] = [];
    let idx = 0;
    for (const [a, b] of this.getEdgePairs()) {
      const tube = MeshBuilder.CreateTube(
        `frLine_${idx++}`,
        {
          path: [corners[a], corners[b]],
          radius: this.tubeRadius,
          updatable: true,
          tessellation: 8,
        },
        this.scene,
      );
      tube.material = this.material;
      tube.isPickable = false;
      // Note: don’t force renderingGroupId; leave it to default unless you set it via setter.
      tubes.push(tube);
    }
    return tubes;
  }

  /**
   * Helper to list the 12 frustum edge index pairs.
   * @returns An array of index pairs, each referencing two corner indices.
   */
  private getEdgePairs(): Array<[number, number]> {
    // 8 corners: 0..3 near, 4..7 far (same ordering as your original)
    return [
      // near
      [0, 1],
      [1, 3],
      [3, 2],
      [2, 0],
      // far
      [4, 5],
      [5, 7],
      [7, 6],
      [6, 4],
      // connections
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];
  }

  /**
   * Helper to compute the eight frustum corners in world space.
   * @param projMat The projection matrix used to compute corners.
   * @param viewMat The view matrix used to compute corners.
   * @returns An array of eight Vector3 positions in world space.
   */
  private calculateFrustumCorners(projMat: Matrix, viewMat: Matrix) {
    const clipCorners = [
      new Vector3(-1, 1, -1),
      new Vector3(1, 1, -1),
      new Vector3(-1, -1, -1),
      new Vector3(1, -1, -1),
      new Vector3(-1, 1, 1),
      new Vector3(1, 1, 1),
      new Vector3(-1, -1, 1),
      new Vector3(1, -1, 1),
    ];
    const invProj = Matrix.Invert(projMat);
    const invView = Matrix.Invert(viewMat);

    return clipCorners.map((c) => {
      const view = Vector3.TransformCoordinates(c, invProj);
      return Vector3.TransformCoordinates(view, invView); // world space
    });
  }
}
