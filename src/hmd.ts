/**
 * @file HMD representing a VR headset's parameters and functionalities,
 *       including setup for simulated eye cameras and their projections.
 * @author Chek
 *
 * The HMD class represents a VR headset's parameters and functionalities,
 * including setup for simulated eye cameras and their projections.
 */

import {
  FreeCamera,
  Matrix,
  Scene,
  Vector3,
  Color4,
  MeshBuilder,
  Mesh,
  Observable,
  RenderTargetTexture,
  PostProcess,
  Texture,
  Engine,
  Effect,
  StandardMaterial,
  Color3,
  Constants,
} from "@babylonjs/core";
import {
  LAYER_NONE,
  LAYER_HMD,
  LAYER_SCENE,
  CAM_SPEED,
  MESH_EDGE_WIDTH,
} from "./constants";

export class HMD {
  private scene: Scene;

  [key: string]: any; // Index signature to allow dynamic keys

  /**
   * The parameters for the VR HMD.
   *
   * Note that Cardboard 2.0's are:
   *   f: 40mm
   *   ipd: 64mm
   *   eyeRelief: 18mm
   *   distLens2Display: 39mm
   *   displayWidth: 120.96mm
   *   displayHeight: 68.03mm
   *   lensDiameter: 34mm
   *
   * The f and distLens2Display are usually determined in a manner to
   * create a distEye2Img (focal distance) of around 1-2m for a comfortable
   * viewing experience.
   */
  pos = new Vector3(0, 0.1, -0.5);
  eyeRelief = 0.018;
  displayWidth = 0.12096;
  // displayHeight = 0.06803;
  displayHeight = 0.068;
  displayDepth = 0.005;
  lensDiameter = 0.034;
  lensDepth = 0.005;
  eyeDiameter = 0.015;
  farFromNear = 1.5;
  //ipd = .06;
  //f = .04;
  //distLens2Display = .039;

  /**
   * The cardboard from shopee:
   */
  ipd = 0.065;
  f = 0.043;
  distLens2Display = 0.042;

  // Calculated values
  distEye2Display!: number;
  magnification!: number;
  imgHeight!: number;
  distLens2Img!: number;
  distEye2Img!: number;
  near!: number;
  far!: number;
  aspectRatio!: number;
  fovVertical!: number;
  fovHNasal!: number;
  fovHTemporal!: number;
  fovHorizontal!: number;
  eyePosL!: Vector3;
  eyePosR!: Vector3;

  // Calculated values for the off-axis projection
  top!: number;
  bottom!: number;
  imgWidthNasal!: number;
  imgWidthTemporal!: number;
  rightForLeftEye!: number;
  leftForLeftEye!: number;
  rightForRightEye!: number;
  leftForRightEye!: number;

  // cache the projection matrix
  projMatL = Matrix.Identity();
  projMatR = Matrix.Identity();

  // cameras for the left and right eyes
  camL: FreeCamera;
  camR: FreeCamera;

  // mock camera for user control
  isUserControlled = false;
  controlCam!: FreeCamera;

  // meshes for the display, lenses, and eyes
  // - using ! to suppress the error that the properties are not initialized
  //   since they are initialized in the constructor through another method
  private display!: Mesh;
  private lensL!: Mesh;
  private lensR!: Mesh;
  private eyeL!: Mesh;
  private eyeR!: Mesh;

  // mesh for the virtual image
  // TODO: think about how to show the virtual image
  private virtualImg!: Mesh;

  // render targets for the left and right eyes
  renderTargetL!: RenderTargetTexture;
  renderTargetR!: RenderTargetTexture;

  /**
   * Get the aspect ratio of an eye's view.
   * @returns The aspect ratio of an eye's view.
   */
  get aspectRatioEye() {
    return (
      (this.rightForLeftEye - this.leftForLeftEye) / (this.top - this.bottom)
    );
  }

  /**
   * Create a world transform matrix for the HMD.
   * @returns The world transform matrix for the HMD.
   */
  get transformMatrix() {
    return Matrix.Translation(this.pos.x, this.pos.y, this.pos.z);
  }

  /**
   * Create a view matrix for the left lens of the HMD based on the IPD.
   * @returns The view matrix for the left lens of the HMD.
   *
   */
  get viewMatrixL() {
    return this.getViewMatrix(true);
  }

  /**
   * Create a view matrix for the right lens of the HMD based on the IPD.
   * @returns The view matrix for the right lens of the HMD.
   */
  get viewMatrixR() {
    return this.getViewMatrix(false);
  }

  /*
   * Helper for the above getters of view matrices. The view matrix represents
   * the transformation from world space to eye (cam) space. As long as the eyePos
   * is different for the left and right eye, the view matrix will be different.
   * - use a lookat point straight in front of the lens as the target
   * @param isLeftEye Whether the eye is the left eye.
   * @returns The view matrix for the eye.
   */
  private getViewMatrix(isLeftEye: boolean) {
    // this is redundant since setTarget already sets the view matrix
    //const viewMatrix = Matrix.LookAtLH(eyePosition, lookAtPoint, up);
    const eyePos = isLeftEye ? this.eyePosL : this.eyePosR;
    //const lookAtPoint = eyePos.clone().add(new Vector3(0, 0, 1));
    //const up = Vector3.Up();

    const camera: FreeCamera = isLeftEye ? this.camL : this.camR;
    const direction = camera.getDirection(Vector3.Forward());
    const lookAtPoint = eyePos.clone().add(direction);
    //camera.setTarget(lookAtPoint);
    const up = camera.getDirection(Vector3.Up());

    const viewMat = Matrix.LookAtLH(eyePos, lookAtPoint, up);
    return viewMat;
  }

  /**
   * Create a list of the parameters for the HMD.
   * @returns The list of parameters for the HMD
   *          that can be used in a for (let key in hmd.params) loop.
   */
  get displayParams() {
    return {
      //pos: this.pos,
      f: this.f,
      ipd: this.ipd,
      eyeRelief: this.eyeRelief,
      distLens2Display: this.distLens2Display,
      displayWidth: this.displayWidth,
      displayHeight: this.displayHeight,
      //displayDepth: this.displayDepth,
      //lensDiameter: this.lensDiameter,
      //lensDepth: this.lensDepth,
      //eyeDiameter: this.eyeDiameter,
    };
  }

  /**
   * Create a list of params to be used as sliders for the HMD.
   */
  get sliderParams() {
    return {
      f: { min: 0.01, max: 0.2, step: 0.001 },
      ipd: { min: 0.0001, max: 0.2, step: 0.001 },
      eyeRelief: { min: 0.0001, max: 1, step: 0.001 },
      distLens2Display: { min: 0.01, max: 0.2, step: 0.001 },
      displayWidth: { min: 0.05, max: 0.5, step: 0.001 },
      displayHeight: { min: 0.05, max: 0.5, step: 0.001 },
    };
  }

  /**
   * Create a list of the calculated values for the HMD.
   * @returns The list of calculated values for the HMD.
   */
  get displayCalculatedVals() {
    return {
      magnification: this.magnification,
      imgHeight: this.imgHeight,
      distLens2Img: this.distLens2Img,
      distEye2Img: this.distEye2Img,
      near: this.near,
      far: this.far,
      fovVertical: this.fovVertical,
      fovHNasal: this.fovHNasal,
      fovHTemporal: this.fovHTemporal,
      fovHorizontal: this.fovHorizontal,
      aspectRatio: this.aspectRatio,
      top: this.top,
      bottom: this.bottom,
      imgWidthNasal: this.imgWidthNasal,
      imgWidthTemporal: this.imgWidthTemporal,
      leftForLeftEye: this.leftForLeftEye,
      rightForLeftEye: this.rightForLeftEye,
      leftForRightEye: this.leftForRightEye,
      rightForRightEye: this.rightForRightEye,
    };
  }

  /**
   * Set a particular param value from the UI sliders.
   * - update the projection matrix and other values
   * - update the visual representation of the HMD
   * - notify observers that the values have been updated
   * @param key The key of the param to set.
   * @param value The value to set the param to.
   */
  public setParam(key: string, value: number) {
    this[key] = value;

    // need to recalculate the projection matrix and all the other values
    this.calcProjectionMatrix();

    // update camera projection matrices
    this.camL.freezeProjectionMatrix(this.projMatL);
    this.camR.freezeProjectionMatrix(this.projMatR);

    // update the eye positions
    this.updateEyePos();

    // update the eye mesh positions (these were relative to display)
    this.eyeL.position.z = -this.distEye2Display;
    this.eyeR.position.z = -this.distEye2Display;
    this.eyeL.position.x = -this.ipd / 2;
    this.eyeR.position.x = this.ipd / 2;

    // update the lens positions
    this.lensL.position.z = -this.distLens2Display;
    this.lensR.position.z = -this.distLens2Display;
    this.lensL.position.x = -this.ipd / 2;
    this.lensR.position.x = this.ipd / 2;

    // update the display size with affecting the children
    this.updateDisplaySize();

    // notify observers that the values have been updated
    this.notifyValuesUpdated();
  }

  /**
   * Update the eye positions based on the IPD and eye relief.
   * - this is called when the IPD or eye relief is changed
   * - also called when user controls the HMD
   *
   * Note that we need to compute the offsets based on the position and orientation
   * of the HMD, so that the eye positions are correct in world space.
   */
  private updateEyePos() {
    // compute local right and forward directions based on orientation of control camera
    const right = this.controlCam.getDirection(Vector3.Right());
    const forward = this.controlCam.getDirection(Vector3.Forward());

    // compute eye offsets in local HMD space
    const offsetRight = right.scale(this.ipd / 2);
    const offsetForward = forward.scale(-this.distEye2Display);

    // set the eye positions based on the offsets
    this.eyePosL = this.pos
      .clone()
      .add(offsetRight.negate())
      .add(offsetForward);
    this.eyePosR = this.pos.clone().add(offsetRight).add(offsetForward);
  }

  /**
   * Update the display size without affecting the children.
   * - temporarily detach children, update the display size,
   *   and reattach children
   */
  private updateDisplaySize() {
    // get the current width and height of the display
    const boundingInfo = this.display.getBoundingInfo().boundingBox;
    const currWidth = boundingInfo.maximumWorld.x - boundingInfo.minimumWorld.x;
    const currHeight =
      boundingInfo.maximumWorld.y - boundingInfo.minimumWorld.y;

    // only update if the width or height has changed
    if (this.displayWidth === currWidth && this.displayHeight === currHeight) {
      return;
    }

    const scalingFactorX = this.displayWidth / currWidth;
    const scalingFactorY = this.displayHeight / currHeight;

    // detach children
    const children = this.display.getChildMeshes();
    children.forEach((child) => {
      child.setParent(null);
    });

    // update the display size
    this.display.scaling.x *= scalingFactorX;
    this.display.scaling.y *= scalingFactorY;

    // reattach children
    children.forEach((child) => {
      child.setParent(this.display);
    });
  }

  /**
   * Create a new HMD with the given scene.
   * @param scene The scene to create the HMD in.
   */
  constructor(scene: Scene, engine: Engine) {
    this.scene = scene;

    // create the control camera
    this.controlCam = new FreeCamera("hmdControlCam", this.pos.clone(), scene);
    //this.controlCam.attachControl(this.engine.getRenderingCanvas(), true);
    //this.controlCam.speed = 0.02; // set a slow speed for control
    this.controlCam.layerMask = LAYER_NONE;

    // do first calculation of the projection matrix as it is needed
    this.calcProjectionMatrix();

    // setup the meshes for the HMD
    this.setupMeshes();

    // update eye positions
    this.updateEyePos();

    // setup the eye cameras
    this.camL = new FreeCamera("camL", this.eyePosL, scene);
    this.camR = new FreeCamera("camR", this.eyePosR, scene);

    // set eye cameras to render only the scene
    this.camL.layerMask = LAYER_SCENE;
    this.camR.layerMask = LAYER_SCENE;

    // set the projection matrix for the cameras
    this.camL.freezeProjectionMatrix(this.projMatL);
    this.camR.freezeProjectionMatrix(this.projMatR);
    this.updateCamera2EyePos(this.camL, true);
    this.updateCamera2EyePos(this.camR, false);

    // set meshes layer mask to not be rendered in the HMD eye cameras
    this.display.layerMask = LAYER_HMD;
    this.lensL.layerMask = LAYER_HMD;
    this.lensR.layerMask = LAYER_HMD;
    this.eyeL.layerMask = LAYER_HMD;
    this.eyeR.layerMask = LAYER_HMD;
    //this.virtualImg.layerMask = LAYER_HMD;

    // create render targets for the left and right eyes
    this.renderTargetL = new RenderTargetTexture(
      "renderTargetL",
      { width: 512, height: 512 },
      scene,
      false,
    );
    this.renderTargetR = new RenderTargetTexture(
      "renderTargetR",
      { width: 512, height: 512 },
      scene,
      false,
    );
    this.renderTargetL.activeCamera = this.camL;
    this.renderTargetR.activeCamera = this.camR;

    // Register the shader source in Babylon.js' Effect store
    // - this is GLSL code for the distortion shader
    // TODO expose the distortion parameters in the UI
    Effect.ShadersStore["distortionFragmentShader"] = `

          // Use high precision for float calculations (important for distortion)
          precision highp float;

          // Interpolated UV coordinates passed from vertex shader
          varying vec2 vUV;

          // Sampler for the original rendered texture
          uniform sampler2D textureSampler;

          // --- Distortion Parameters ---

          // Barrel distortion coefficients based on cardboard v2
          const float k1 = 0.34;
          const float k2 = 0.55;
          //const float k1 = 0.2;
          //const float k2 = 0.15;

          // Center of the lens distortion (typically center of screen or viewport)
          const vec2 center = vec2(0.5, 0.5);

          void main() {
              // Get the current UV coordinate
              vec2 uv = vUV;

              // Compute offset from the distortion center
              vec2 delta = uv - center;

              // Compute squared radius (distance from center)
              float r2 = dot(delta, delta);

              // Apply radial distortion model: r * (1 + k1*r^2 + k2*r^4)
              vec2 distorted = delta * (1.0 + k1 * r2 + k2 * r2 * r2);

              // Shift distorted delta back to UV space
              vec2 corrected = center + distorted;

              // If corrected coordinate is out of bounds, draw a fallback color
              if (corrected.x < 0.0 || corrected.x > 1.0 || 
                  corrected.y < 0.0 || corrected.y > 1.0) {
                  // Fallback color (greyish pink), used beyond the warped area
                  gl_FragColor = vec4(0.55, 0.38, 0.4, 1.0);
              } else {
                  // Sample the distorted texture normally
                  gl_FragColor = texture2D(textureSampler, corrected);
              }
          }
        `;

    // create post process for the left cam using the distortion shader
    new PostProcess(
      "camLDistortion",
      "distortion", // must match the key used in ShadersStore *without* 'FragmentShader'
      null,
      null,
      1.0,
      this.camL,
      Texture.BILINEAR_SAMPLINGMODE,
      engine,
    );

    // create post process for the right cam using the distortion shader
    new PostProcess(
      "camLDistortion",
      "distortion", // must match the key used in ShadersStore *without* 'FragmentShader'
      null,
      null,
      1.0,
      this.camR,
      Texture.BILINEAR_SAMPLINGMODE,
      engine,
    );

    // TODO adjustable uniforms for distortion
    //camLDistortion.onApply = (effect: Effect) => {
    //effect.setFloat2("center", 0.5, 0.5); // center of the texture
    //effect.setFloat("k1", 0.2); // distortion coefficient
    //effect.setFloat("k2", 0.15); // distortion coefficient
    //};
  }

  /**
   * Create the meshes for the display, lenses (and eyes) of the HMD.
   * - the whole HMD is anchored at the position of the display
   * - we treat the eyes as part of the HMD
   */
  private setupMeshes() {
    // create persistent materials to survive scene reloads
    const matDisp = new StandardMaterial("hmdDispMat", this.scene);
    matDisp.disableLighting = true;
    matDisp.emissiveColor = new Color3(0.9, 0.85, 1.0); // soft whitish-purple
    matDisp.alpha = 0.5; // more solid so it pops

    const matLens = new StandardMaterial("hmdLensMat", this.scene);
    matLens.disableLighting = true;
    matLens.emissiveColor = new Color3(1.0, 0.95, 0.75); // warm yellowish-white
    matLens.alpha = 0.6; // translucent but still bright

    const matEye = new StandardMaterial("hmdEyeMat", this.scene);
    matEye.disableLighting = true;
    matEye.emissiveColor = new Color3(0.8, 0.9, 1.0); // bluish-white, bright
    matEye.alpha = 0.5;

    // Optional: premultiplied alpha for cleaner blending
    matDisp.alphaMode = Engine.ALPHA_PREMULTIPLIED;
    matLens.alphaMode = Engine.ALPHA_PREMULTIPLIED;
    matEye.alphaMode = Engine.ALPHA_PREMULTIPLIED;

    this.display = MeshBuilder.CreateBox(
      "display",
      {
        width: this.displayWidth,
        height: this.displayHeight,
        depth: this.displayDepth,
      },
      this.scene,
    );
    this.display.material = matDisp;
    this.display.position.copyFrom(this.pos); // this the anchor

    this.lensL = MeshBuilder.CreateCylinder(
      "lensL",
      { diameter: this.lensDiameter, height: this.lensDepth, tessellation: 24 },
      this.scene,
    );
    this.lensL.material = matLens;
    this.lensL.rotation.x = Math.PI / 2;
    this.lensL.parent = this.display;
    this.lensL.position.x -= this.ipd / 2;
    this.lensL.position.z -= this.distLens2Display;

    this.lensR = MeshBuilder.CreateCylinder(
      "lensR",
      { diameter: this.lensDiameter, height: this.lensDepth, tessellation: 24 },
      this.scene,
    );
    this.lensR.material = matLens;
    this.lensR.rotation.x = Math.PI / 2;
    this.lensR.parent = this.display;
    this.lensR.position.x += this.ipd / 2;
    this.lensR.position.z -= this.distLens2Display;

    this.eyeL = MeshBuilder.CreateSphere(
      "eyeL",
      { diameter: this.eyeDiameter, segments: 16 },
      this.scene,
    );
    this.eyeL.material = matEye;
    this.eyeL.parent = this.display;
    this.eyeL.position.x -= this.ipd / 2;
    this.eyeL.position.z -= this.distEye2Display;

    this.eyeR = MeshBuilder.CreateSphere(
      "eyeR",
      { diameter: this.eyeDiameter, segments: 16 },
      this.scene,
    );
    this.eyeR.material = matEye;
    this.eyeR.parent = this.display;
    this.eyeR.position.x += this.ipd / 2;
    this.eyeR.position.z -= this.distEye2Display;

    //// create a virtual image mesh
    //const imgWidth = 2 * (this.imgWidthNasal + this.imgWidthTemporal);
    //this.virtualImg = MeshBuilder.CreatePlane('virtualImg',
    //{ width: imgWidth, height: this.imgHeight }, this.scene);
    ////this.virtualImg.enableEdgesRendering();
    ////this.virtualImg.edgesWidth = 1;
    //this.virtualImg.visibility = 0.1;
    //this.virtualImg.parent = this.display;
    //this.virtualImg.position.z = (this.distEye2Img - this.distEye2Display);
  }

  /**
   * Calculate the projection matrix for the HMD for an eye.
   *
   * Overview:
   * This method determines the projection matrix for the eye's camera, enabling accurate
   * rendering of the 3D scene from that eye's perspective. A separate method will later
   * set the eye's view matrix. The goal is to simulate a realistic depth perception based
   * on HMD parameters.
   *
   * Concept of the Virtual Image:
   * The eye perceives a virtual image formed by light from the display passing through the lens.
   * In optical terms, the display is the "real" object, and the virtual image is what the eye
   * "sees" through the lens, effectively becoming our screen for rendering 3D objects.
   * Note that in traditional optics, you think about a projector shooting light through a lens
   * to form a real image on a screen. If shown raw, the real image would be inverted. This effect
   * is only achieved when f < distLens2Display, which is not the case for HMDs. In HMDs, the
   * virtual image is on the same side as the object, similar to a magnifying glass. This is achieved
   * by setting f > distLens2Display, resulting in a -ve distLens2Img (i.e., the virtual image is
   * on the same side as the object) and with the image being upright.
   *
   * Frustum Setup:
   * We define a frustum that spans this virtual image (it's like placing the virtual image
   * as a slice in the frustum that originates from the eye position) to render the correct
   * perspective on the near plane. Importantly, the frustum is based on the virtual image's
   * dimensions, which is in turn based on the physical display's dimensions.
   *
   * Near and Far Planes:
   * - Set the near plane at or beyond the eye-to-display distance to avoid rendering objects
   *   unrealistically close.
   * - Set the far plane far enough to encompass objects in the scene.
   * - The aim is to simulate a natural first-person perspective from where the real eyes are.
   *
   * Real-World Scaling:
   * To achieve realistic depth perception, the frustum should be configured so that the
   * virtual image translates real-world HMD parameters (e.g., display dimensions, focal
   * length, IPD, eye relief) into scene distances. For instance, a cube placed 1m away
   * in the scene should appear at 1m on the virtual image.
   * - we accomplish this by first deriving the virtual image's dimensions and distance from
   *  the lens based on the HMD parameters.
   * - then we derive the frustum's near plane dimensions from the virtual image.
   *
   * Common Misunderstandings:
   * The virtual image itself is not an object rendered on the near plane; it serves as a reference
   * to set up the frustum correctly. Only 3D scene objects are rendered. The virtual image
   * guides the frustum so that objects are rendered at correct distances, providing the illusion
   * of depth when viewed through the lens. Imagine that when you're looking at things in the
   * virtual image, the scale and distances feel realistic, and the way to achieve this is by
   * using the dimensions of the virtual image to set up the frustum.
   *
   * Virtual Image Distance vs. Depth Perception:
   * The distance of the virtual image from the eye is a result of lens optics and HMD settings,
   * which determine the eye focus point. Depth perception within the scene, however, is
   * established by the frustum, which scales 3D objects based on their positions. The frustum
   * setup ensures that virtual distances match real-world proportions, enhancing depth realism.
   *
   * @returns The projection matrix for the HMD.
   */
  public calcProjectionMatrix() {
    // update eye to display distance in case something changed
    // - TODO: this causes the frustum to increase when eyeRelief is increased which
    //   may not be not correct
    this.distEye2Display = this.eyeRelief + this.distLens2Display;

    // calculate magnification factor
    // - for HMD, the f needs to be > distLens2Display (or the object distance) so that
    //   an upright virtual image is formed on the same side as the object (the display)
    // - note that if f < distLens2Display, then it will be -ve, i.e.,
    //   a real inverted image will be formed that should be projected on a screen
    // - else it will be +ve, i.e., a virtual image will be formed in the lens
    // - when f = distLens2Display, the magFactor will be infinite
    // - TODO: think about making magnification abs for viewing non-inverted images
    // - TODO: show inversion notice in UI
    this.magnification = this.f / (this.f - this.distLens2Display);

    // calculate the full height of the virtual image for the particular eye
    this.imgHeight = this.displayHeight * this.magnification;

    // aspect ratio just for display info
    this.aspectRatio = this.displayWidth / this.displayHeight;

    // calculate the distance from the lens to the virtual image
    // - for HMD, the f needs to be > distLens2Display (or the object distance)
    // - this results in a -ve value for distLens2Img
    //   which means the virtual image is on the same side as the object
    // - this is similar to a magnifying glass (as opposed to a projector)
    // - make distLens2Img abs for calculations, as -ve value here is conceptual
    this.distLens2Img = Math.abs(1 / (1 / this.f - 1 / this.distLens2Display));

    // calculate the distance from the eye to the virtual image
    // - it is -ve in conceptual terms but we use the abs value for calculations
    this.distEye2Img = this.distLens2Img + this.eyeRelief;

    // calculate the near plane distance
    // - this should start at minimum the position of the display
    this.near = this.distEye2Display;

    // calculate the far plane distance
    // - this does not have to be exact, but should be far enough to encompass the scene
    // - for testing purposes, set it to be 5 units away from the near plane
    this.far = this.near + this.farFromNear;

    // set params for setting a camera
    // - the fov is the vertical FOV
    // - the aspect ratio is the display's aspect ratio
    // - the near and far planes are set to the calculated values
    this.fovVertical = 2 * Math.atan(this.imgHeight / 2 / this.distEye2Img);
    this.fovHNasal = Math.atan(
      (this.magnification * this.ipd) / 2 / this.distEye2Img,
    );
    this.fovHTemporal = Math.atan(
      (this.magnification * (this.displayWidth - this.ipd)) /
        2 /
        this.distEye2Img,
    );
    this.fovHorizontal = this.fovHNasal + this.fovHTemporal;

    // convert to degrees
    this.fovVertical = (this.fovVertical * 180) / Math.PI;
    this.fovHorizontal = (this.fovHorizontal * 180) / Math.PI;
    this.fovHNasal = (this.fovHNasal * 180) / Math.PI;
    this.fovHTemporal = (this.fovHTemporal * 180) / Math.PI;

    // calculate the left, right, top, and bottom values for the off-axis projection
    // - this was adapted from THREE.js's Matrix4.makePerspective function
    // - the built-in Babylon.js function does not allow for off-axis projection
    // - this is a manual calculation of the projection Matrix
    this.top = (this.near * this.imgHeight) / (2 * this.distEye2Img);
    this.bottom = -this.top;
    this.imgWidthNasal = (this.magnification * this.ipd) / 2;
    this.imgWidthTemporal =
      (this.magnification * (this.displayWidth - this.ipd)) / 2;

    // calculate the left and right values based on the eye
    this.rightForLeftEye =
      (this.distEye2Display * this.imgWidthNasal) / this.distEye2Img;
    this.leftForLeftEye =
      (-this.distEye2Display * this.imgWidthTemporal) / this.distEye2Img;
    this.rightForRightEye =
      (this.distEye2Display * this.imgWidthTemporal) / this.distEye2Img;
    this.leftForRightEye =
      (-this.distEye2Display * this.imgWidthNasal) / this.distEye2Img;

    ////////////////////////////////
    // Off-axis projection matrix //
    // This means we need to calculate the projection matrix manually due to the asymmetry
    // of the horizontal frustum for the left and right eyes.
    // The general form of the projection matrix for RHS in OpenGL is:
    // | 2n/(r-l)     0            0            0   |
    // | 0            2n/(t-b)     0            0   |
    // | (r+l)/(r-l)  (t+b)/(t-b)  -(f+n)/(f-n) -1  |
    // | 0            0            -2fn/(f-n)   0   |
    // HOWEVER and HOWEVER (yes this took me ages to debug)...
    // In Babylon.js, it is LHS axes, the the matrix becomes:
    // | 2n/(r-l)     0            0            0   |
    // | 0            2n/(t-b)     0            0   |
    // | (r+l)/(r-l)  (t+b)/(t-b)  (f+n)/(f-n)  1   |
    // | 0            0            -2fn/(f-n)   0   |
    // https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/opengl-perspective-projection-matrix.html
    // https://www.songho.ca/opengl/gl_transform.html#example2
    // The code is adapted from THREE.js's Matrix4.makePerspective function but with the
    // signs changed to match Babylon.js's LHS axes.

    // TODO: try to use PerspectiveLH to create the projection matrix with projectionPlaneTilt
    //       - calculate the projectionPlaneTilt
    //const projectionPlaneTilt = Math.atan(this.distEye2Display / this.distEye2Img);
    //const projMatL = Matrix.PerspectiveLH(this.rightForLeftEye - this.leftForLeftEye,
    //                 this.top - this.bottom, this.near, this.far, false);

    // do left eye calculations
    let x = (2 * this.near) / (this.rightForLeftEye - this.leftForLeftEye);
    const y = (2 * this.near) / (this.top - this.bottom);
    let a =
      (this.rightForLeftEye + this.leftForLeftEye) /
      (this.rightForLeftEye - this.leftForLeftEye);
    const b = (this.top + this.bottom) / (this.top - this.bottom);
    const c = (this.far + this.near) / (this.far - this.near);
    const d = (-2 * this.far * this.near) / (this.far - this.near);
    // if ( coordinateSystem === WebGPUCoordinateSystem )
    //     c = - far / ( far - near );
    //     d = ( - far * near ) / ( far - near );
    this.projMatL = Matrix.FromValues(
      x,
      0,
      0,
      0,
      0,
      y,
      0,
      0,
      a,
      b,
      c,
      1,
      0,
      0,
      d,
      0,
    );

    // now do right eye calculations
    x = (2 * this.near) / (this.rightForRightEye - this.leftForRightEye);
    a =
      (this.rightForRightEye + this.leftForRightEye) /
      (this.rightForRightEye - this.leftForRightEye);
    this.projMatR = Matrix.FromValues(
      x,
      0,
      0,
      0,
      0,
      y,
      0,
      0,
      a,
      b,
      c,
      1,
      0,
      0,
      d,
      0,
    );
  }

  /**
   * Update the HMD position and everything that depends on it.
   * Also update the mesh positions by updating the display position, since
   * the display is the parent of the lenses and eyes.
   * @param newPos The new position to set the HMD to.
   */
  public updatePosition(newPos: Vector3) {
    this.pos.copyFrom(newPos);

    // Update the display position
    this.display.position.copyFrom(this.pos);

    // Update the eye positions
    this.updateEyePos();

    // Update the camera positions
    this.updateCamera2EyePos(this.camL, true);
    this.updateCamera2EyePos(this.camR, false);
  }

  /**
   * Update the HMD orientation.
   */
  public updateOrientation(newRot: Vector3) {
    // Update the display rotation
    this.display.rotation.copyFromFloats(newRot.x, newRot.y, newRot.z);

    // Update the camera rotations
    this.camL.rotation.copyFromFloats(newRot.x, newRot.y, newRot.z);
    this.camR.rotation.copyFromFloats(newRot.x, newRot.y, newRot.z);

    this.updateCamera2EyePos(this.camL, true);
    this.updateCamera2EyePos(this.camR, false);
  }

  /**
   * Update the HMD position based on the control camera.
   * - This is used when the HMD is in user control mode.
   */
  public updateTransformByUser() {
    // update the HMD position based on the control camera position
    this.updatePosition(this.controlCam.position);
    //console.log("HMD position updated by user control camera:", this.pos);

    // update the HMD orientation based on the control camera rotation
    this.updateOrientation(this.controlCam.rotation);
  }

  /**
   * Update the eye position and target for the given camera.
   * @param camera The camera to update.
   * @param isLeftEye Whether the camera is the left eye.
   */
  private updateCamera2EyePos(camera: FreeCamera, isLeftEye: boolean) {
    // update position
    const eyePosition = isLeftEye ? this.eyePosL : this.eyePosR;
    camera.position.copyFrom(eyePosition);
  }

  /**
   * Notify observers that the values have been updated.
   */
  onValuesUpdatedObservable = new Observable<void>();
  public notifyValuesUpdated() {
    this.onValuesUpdatedObservable.notifyObservers();
  }

  /**
   * Set the user control mode for the HMD.
   * @param isUserControlled Whether the HMD is in user control mode.
   */
  public setUserControl(isUserControlled: boolean, engine: Engine) {
    this.isUserControlled = isUserControlled;
    if (isUserControlled) {
      this.controlCam.attachControl(engine.getRenderingCanvas(), true);
      this.controlCam.keysUp = [87]; // W
      this.controlCam.keysDown = [83]; // S
      this.controlCam.keysLeft = [65]; // A
      this.controlCam.keysRight = [68]; // D
      this.controlCam.speed = CAM_SPEED; // slow down the camera movement
      this.controlCam.minZ = 0.01; // prevent camera from going to 0
      this.controlCam.maxZ = 100;
    } else {
      this.controlCam.detachControl();
      //// reset the control camera position to the HMD position
      //this.controlCam.position.copyFrom(this.pos);
      //// also reset the control camera rotation to the HMD rotation
      //this.controlCam.rotation.copyFromFloats(0, 0, 0);
    }
  }

  /**
   * Debug function to print the position of the HMD, the control camera,
   * and the eye positions.
   */
  public debugPrintPositions() {
    console.log("HMD position:", this.pos.toString());
    console.log(
      "Control camera position:",
      this.controlCam.position.toString(),
    );
    //console.log("Left eye position:", this.eyePosL);
    //console.log("Right eye position:", this.eyePosR);
  }

  /**
   * Get projection matrices for the left and right eyes.
   * @param isLeftEye Whether to get the left eye projection matrix.
   * @return The projection matrix for the left or right eye.
   */
  public getProjectionMatrix(isLeftEye: boolean): Matrix {
    return isLeftEye ? this.projMatL : this.projMatR;
  }

  /**
   * Get view matrices for the left and right eyes.
   * @param isLeftEye Whether to get the left eye view matrix.
   * @return The view matrix for the left or right eye.
   */
  //public getViewMatrix(isLeftEye: boolean): Matrix {
  //return isLeftEye ? this.viewMatrixL : this.viewMatrixR;
  //}
}
