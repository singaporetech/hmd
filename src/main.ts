/**
 * @file Main entry point for the application.
 * @author Chek
 *
 * Here, we initialize the Babylon engine, create the scene (via App), 
 * create the UI and run the render loop.
 */
import { Engine } from '@babylonjs/core';
import { App } from './app';
import { UI } from './ui';

// get the canvas element
const canvas = document.getElementById('renderCanvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element not found or is not a canvas');
}

// initialize babylon engine
const engine = new Engine(canvas, true);

// UI to be initialized after the scene is created
let ui: UI;

// create the scene and run the render loop
const app = new App(engine);
app.createScene().then(scene => {
    ui = new UI(app.hmd, scene, app);
    app.setUI(ui); // Pass UI reference to App for loading indicator
    engine.runRenderLoop(() => {
        scene.render();
    })
});

// resize the canvas when the window is resized
window.addEventListener('resize', function () {
    engine.resize();
});
