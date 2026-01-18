/**
 * @file Main entry point for the application.
 * @author Chek
 *
 * Here, we initialize the Babylon engine, create the scene (via App), 
 * create the UI and run the render loop.
 */
import { Engine, WebGPUEngine } from '@babylonjs/core';
import { App } from './app';
import { UI } from './ui';

// get the canvas element
const canvas = document.getElementById('renderCanvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element not found or is not a canvas');
}

// UI to be initialized after the scene is created
let ui: UI;

/**
 * Initialize the engine with WebGPU if available, fallback to WebGL
 */
async function initializeEngine(canvasElement: HTMLCanvasElement): Promise<Engine | WebGPUEngine> {
    // Check if WebGPU is available
    if (navigator.gpu) {
        try {
            console.log('WebGPU is available. Attempting to initialize WebGPU engine...');
            const webgpuEngine = new WebGPUEngine(canvasElement);
            await webgpuEngine.initAsync();
            console.log('✓ WebGPU engine initialized successfully');
            return webgpuEngine;
        } catch (error) {
            console.warn('WebGPU initialization failed, falling back to WebGL:', error);
        }
    } else {
        console.log('WebGPU not available in this browser, using WebGL');
    }
    
    // Fallback to WebGL
    const webglEngine = new Engine(canvasElement, true);
    console.log('✓ WebGL engine initialized');
    return webglEngine;
}

// Initialize engine and start the app
initializeEngine(canvas).then(engine => {
    // create the scene and run the render loop
    const app = new App(engine as Engine);
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
}).catch(error => {
    console.error('Failed to initialize engine:', error);
    document.body.innerHTML = `
        <div style="color: white; padding: 20px; font-family: monospace;">
            <h2>Initialization Error</h2>
            <p>Failed to initialize graphics engine.</p>
            <p>Error: ${error.message}</p>
            <p>Please try using a modern browser with WebGL support.</p>
        </div>
    `;
});
