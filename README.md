# HMD Simulator

This a web-based VR head-mounted display (HMD) simulator that helps to interactively understand the optical and graphical concepts behind VR HMDs.

![demo](https://github.com/user-attachments/assets/dcddccde-f353-4098-9406-416448b85bfd)

One of the current motivation is to support the YouTube tutorial: https://youtu.be/OKD4jrnn4WE , but you play with it regardless of the tutorial.

# Project Status

## Current Features
- Simulate a VR HMD's rendering of a scene in the two eye cameras
- Visualize the frustum of the eye cameras
- Adjust the HMD parameters (IPD, eye relief, lens-to-display distance, etc.)
- View how various calculated parameters (e.g., width/height of virtual image, FOVs, etc.) change as the HMD parameters change
- Switch scenes across primitive scenes and open source gaussian splats
- Enter into a "VR" mode that simulates the actual HMD view, allowing the user, when using a mobile device, to see the actual outputs in a Google Cardboard or similar HMD enclosure
- Basic WASD + mouse camera movement

## Known Issues
- Gaussian splats are rendering blurry in the viewports
- Large gaussian splats may not get cleared properly when rapidly switching scenes
- etc.

## Roadmap

### Short-term
- Fix critical bugs
- Add rendering of the virtual image planes
- Add lens distortion shader to counteract the real lens's barrel distortion (using lens params from Cardboard spec)

### Mid-term
- Create a VR mode that renders the HMD View prior to applying real lens optics. This will allow user to see the actual outputs in a Google Cardboard or similar HMD.

### Long-term
- Transition into a platform of multiple implementation-focused learning resources for developing immersive applications

# How to run

Just go to the live page built from the latest version that is served via GitHub pages: https://diaversity.org

### Some interesting things to try
- Increase the distLens2Display until it is greater than the focal length, f, of the lens. Something will flip...
- Increase the IPD until the frustum do not overlap anymore.
- Reduce the eyeRelief to see how the frustum changes.
- etc...

# How to build and run locally

## Prerequisites

This is a TypeScript project that uses npm for package management. You need to have Node.js installed to run npm. You can install Node.js from https://nodejs.org/en/download/

## Steps

1. Clone the repository and `cd` into the cloned directory
2. Run `npm i` to install the dependencies as specified in `package.json`
3. Run `npm run dev` to start the development server
4. Open your browser and navigate to `http://localhost:5173/` or the URL shown in the terminal if it is different

You can inspect the `package.json` file to see other available scripts.
- note that the `npm run build` script prepares the project for deployment on github pages

# Architecture

The application simply uses a 2-layer architecture: App and UI:

```
 +-----------------+         +-----------------+
 |       App       | ---o)---|        UI       |
 +-----------------+         +-----------------+
   o
   |
   |
   |    +-----------------+
   -----|       HMD       |
   |    +-----------------+
   |
   |    +------------------+
   -----| FrustumVisualizer|
        +------------------+
```

The HMD class represents a VR headset's parameters and functionalities, including setup for simulated eye cameras and their projections.

The FrustumVisualizer class is used to visualize the frustum of a camera in the scene.

The App class is responsible for creating the scene and updating the scene based on the HMD.
- App owns the HMD and the FrustumVisualizer.
- App provides APIs for the UI to interact with the scene.

The UI class is responsible for handling user interactions and use the App to update the scene.
- UI knows about the App but App does not know about the UI.

# References

The rendering framework is primarily based on Babylon.js:
https://doc.babylonjs.com/

The math and implementation were studied from the following sources:
- HMD concepts: https://youtu.be/OKD4jrnn4WE
- lens optics math: http://hyperphysics.phy-astr.gsu.edu/hbase/geoopt/lenseq.html
- image formation math: https://stanford.edu/class/ee267/lectures/lecture7.pdf
- perspective projection math: https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/opengl-perspective-projection-matrix.html
- perspective projection implementation: https://www.songho.ca/opengl/gl_transform.html
- perspective projection code: https://threejs.org/docs/#api/en/math/Matrix4.makePerspective

Gaussian splats were kindly provided at 
- https://github.com/BabylonJS/Assets/tree/master/splats
- https://huggingface.co/VladKobranov/splats

All rights to the gaussian splats are reserved to their respective owners/authors.

# Contributions
We welcome contributions from the community! Whether it's improving documentation, enhancing features, or fixing bugs, your input is valuable. To get started:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes with clear messages (`git commit -m "Your message"`).
4. Push to the branch and open a Pull Request.

Join us in our mission to democratize immersive education! 🚀

## Naming Conventions

Files are named using camelCase. For example, `myModule.ts`, to follow Babylon.js naming conventions.

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
