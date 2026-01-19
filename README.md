# HMD Simulator

This is a web-based VR head-mounted display (HMD) simulator that helps to interactively understand the optical and graphical concepts behind VR HMDs.

[![Live Demo](https://img.shields.io/badge/demo-live-green)](https://hmd.diaversity.org)

https://github.com/user-attachments/assets/5743b082-1396-4f69-91ba-68134cd0c647

## Features

- Simulate a VR HMD's rendering of a scene in the two eye cameras
- Visualize the frustum of the eye cameras
- Adjust the HMD parameters (IPD, eye relief, lens-to-display distance, etc.)
- View how various calculated parameters (e.g., width/height of virtual image, FOVs, etc.) change as the HMD parameters change
- Switch scenes across primitive scenes and open source gaussian splats
- Enter into a "VR" mode that simulates the actual HMD view, allowing the user, when using a mobile device, to see the actual outputs in a Google Cardboard or similar HMD enclosure
- Basic WASD + mouse camera movement

## Quick Start

Visit the live demo: **https://hmd.diaversity.org**

> **Note**: The name "Diaversity" represents our goal to create a diverse platform of learning resources for immersive development education.

<details>
<summary>Interesting things to try</summary>

- Increase the distLens2Display until it is greater than the focal length, f, of the lens. Something will flip...
- Increase the IPD until the frustum do not overlap anymore.
- Reduce the eyeRelief to see how the frustum changes.

</details>

## Local Development

### Prerequisites

This is a TypeScript project that uses npm for package management. You need to have Node.js installed to run npm. You can install Node.js from https://nodejs.org/en/download/

### Steps

1. Clone the repository and `cd` into the cloned directory
2. Run `npm i` to install the dependencies as specified in `package.json`
3. Run `npm run dev` to start the development server
4. Open your browser and navigate to `http://localhost:5173/` or the URL shown in the terminal if it is different

You can inspect the `package.json` file to see other available scripts.
- note that the `npm run build` script prepares the project for deployment on github pages

## Tech Stack

- [Babylon.js](https://www.babylonjs.com/) 8.x - 3D rendering engine
- TypeScript - Type-safe JavaScript
- [Vite](https://vitejs.dev/) - Build tool and dev server
- GitHub Pages - Hosting

## Project Status

Do note that this is a project meant for learning and experimentation. There are many assumptions and simplifications made in the implementation.
- The lens is a simple uniform shape on both sides (for a more realistic lens, refer to Meta's ancient [DK2 specification](https://github.com/facebookarchive/RiftDK2/blob/master/Headset/Optical/DK2_Optical_Design.pdf))
- The lens distortion is a fixed shader that does not take into account the actual lens parameters (this is on the roadmap)

## Roadmap

### Short-term
- Add rendering of the virtual image planes
- Expose lens distortion parameters (k1, k2 coefficients) in UI
- Add visual overlays that update live on HMD model when adjusting parameters (e.g., IPD, FOV)
- Enhance scene interactivity with manipulable or animated objects
- Add head/gesture tracking for improved VR mode stereo experience
- Show inversion notice when virtual image flips

### Long-term
- **Gaussian Splat Rendering Optimization** - Current implementation uses 3x memory to avoid multi-camera flickering. Future improvements could include:
  - Implement O(n) bucket sort (vs current O(n log n) Timsort) - requires Babylon.js contribution
  - Add worker pool for parallel camera sorting - requires Babylon.js refactor
  - Evaluate Three.js/Spark migration for better multi-camera support via SparkViewpoint API

### Known Bugs to Fix
- Large gaussian splats may not get cleared properly when rapidly switching scenes

## Architecture

The application simply uses a 2-layer architecture: App and UI:

```
 +---------------------+         +------------------+
 |   App (src/app.ts)  | ---o)---|  UI (src/ui.ts)  |
 +---------------------+         +------------------+
   o
   |
   |
   |    +---------------------+
   -----|  HMD (src/hmd.ts)   |
   |    +---------------------+
   |
   |    +------------------------------------------------+
   -----| FrustumVisualizer (src/frustumVisualizer.ts)   |
        +------------------------------------------------+
```

The HMD class represents a VR headset's parameters and functionalities, including setup for simulated eye cameras and their projections.

The FrustumVisualizer class is used to visualize the frustum of a camera in the scene.

The App class is responsible for creating the scene and updating the scene based on the HMD.
- App owns the HMD and the FrustumVisualizer.
- App provides APIs for the UI to interact with the scene.

The UI class is responsible for handling user interactions and use the App to update the scene.
- UI knows about the App but App does not know about the UI.

## Contributing

We welcome contributions from the community! Whether it's improving documentation, enhancing features, or fixing bugs, your input is valuable.

### Branch Workflow

This project uses a two-tier branch strategy:
- **`main`** - Production-ready code, protected branch
- **`dev`** - Integration branch for ongoing development (default branch for PRs)

### Contributing Steps

1. **Fork the repository**
2. **Create a feature branch from `dev`**:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature
   ```
3. **Make your changes** with clear, descriptive commits
4. **Push to your fork** and open a Pull Request **targeting the `dev` branch**
5. **Request review** - At least 1 reviewer approval is recommended before merging
6. Once approved, your changes will be merged to `dev`
7. Periodically, `dev` will be merged to `main` for releases

### PR Guidelines
- Target the **`dev`** branch (not `main`) for all pull requests
- Write clear commit messages describing what and why
- Update documentation if you're changing functionality
- Test your changes locally before submitting

Join us in our mission to democratize immersive education! 🚀

### Naming Conventions

Files are named using camelCase (e.g., `myModule.ts`).

## References

### Learning Resources

The rendering framework is primarily based on Babylon.js:
- [Babylon.js Documentation](https://doc.babylonjs.com/)

The math and implementation were studied from the following sources:
- HMD concepts: https://youtu.be/OKD4jrnn4WE
- lens optics math: http://hyperphysics.phy-astr.gsu.edu/hbase/geoopt/lenseq.html
- image formation math: https://stanford.edu/class/ee267/lectures/lecture7.pdf
- perspective projection math: https://www.scratchapixel.com/lessons/3d-basic-rendering/perspective-and-orthographic-projection-matrix/opengl-perspective-projection-matrix.html
- perspective projection implementation: https://www.songho.ca/opengl/gl_transform.html
- perspective projection code: https://threejs.org/docs/#api/en/math/Matrix4.makePerspective

### Assets

Gaussian splats were kindly provided by:
- [BabylonJS Assets](https://github.com/BabylonJS/Assets/tree/master/splats)
- [VladKobranov on HuggingFace](https://huggingface.co/VladKobranov/splats)

All rights to the gaussian splats are reserved to their respective owners/authors.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
