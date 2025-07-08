/** 
 * @File This is the UI "layer".
 * @author Chek
 *
 * This file contains the UI class that creates the user interface for the application.
 * It uses the Babylon.js GUI library.
 *
 * The UI includes:
 * - sliders to control the HMD parameters
 * - text blocks to display the HMD parameters and calculated values
 * - buttons to toggle the frustum visualizers and PIP viewports
 */
import { EventState, Scene, VirtualJoystick } from '@babylonjs/core';
import * as GUI from "@babylonjs/gui";
import { HMD } from './hmd';
import { LAYER_UI, VIEWPORT_BORDER_THICKNESS, DisplayMode} from './constants';
import { App } from './app';
/**
 * The UI class to add UI controls to the scene.
 */
export class UI {
    // set PIP viewport GUI to be global as we need to update it when the window is resized
    private pipViewPortBorderL!: GUI.Rectangle;
    private pipViewPortBorderR!: GUI.Rectangle;

    /**
     * Create a new UI object.
     * @param hmd The HMD object to control.
     * @param scene The scene to manipulate when callbacks are triggered.
     */
    constructor(hmd: HMD, scene: Scene, app: App) {
        // create a GUI
        const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');

        // set layerMask so that we prevent it from being rendered by the HMD cameras
        if (advancedTexture.layer) {
            advancedTexture.layer.layerMask = LAYER_UI;
        }

        // create a stack panel to hold the controls
        const userPanel = new GUI.StackPanel();
        userPanel.width = '220px';
        userPanel.fontSize = '14px';
        userPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        userPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        advancedTexture.addControl(userPanel);

        // padding
        userPanel.paddingRight = '20px';
        userPanel.paddingBottom = '20px';

        // create a stack of sliders, with the label and value on the left col, 
        // and the slider on the right col, params to change include:
        const sliders = hmd.sliderParams;
        for (const key in sliders) {
            if (sliders.hasOwnProperty(key)) {
                const slider = new GUI.Slider();
                const typedKey = key as keyof typeof sliders;
                slider.minimum = sliders[typedKey].min;
                slider.maximum = sliders[typedKey].max;
                slider.value = hmd[typedKey];
                slider.height = '20px';
                slider.width = '200px';
                slider.color = 'red';
                slider.background = 'white';
                slider.onValueChangedObservable.add((value) => {
                    hmd.setParam(key, value)
                    this.updatePIPViewPortBorder(app);
                });

                const textBlock = new GUI.TextBlock();
                textBlock.text = `${key}: ${slider.value.toFixed(3)}`;
                textBlock.height = '20px';
                textBlock.color = 'white';
                textBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

                // update the text block when the slider changes
                slider.onValueChangedObservable.add(() => {
                    textBlock.text = `${key}: ${slider.value.toFixed(3)}`;
                });

                // add the text block and slider to the stack panel
                userPanel.addControl(textBlock);
                userPanel.addControl(slider);
            }
        }

        // create a list of text blocks to show all the HMD params and calculated values
        // - make them tiny and packed so they don't take up much space
        // - place them on the left of the screen
        const statsPanel = new GUI.StackPanel();
        statsPanel.width = '220px';
        statsPanel.fontSize = '12px';
        statsPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        statsPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        advancedTexture.addControl(statsPanel);

        // reduce the line space between the text blocks
        statsPanel.paddingBottom = '20px';
        statsPanel.paddingLeft = '20px';

        let displayCalculatedVals = hmd.displayCalculatedVals;
        for (const key in displayCalculatedVals) {
            if (displayCalculatedVals.hasOwnProperty(key)) {
                const textBlock = new GUI.TextBlock();
                const typedKey = key as keyof typeof displayCalculatedVals;
                const value = displayCalculatedVals[typedKey];

                // Ensure the value is numeric before using .toFixed(3)
                if (typeof value === 'number') {
                    textBlock.text = `${key}: ${value.toFixed(3)}`;
                } else {
                    textBlock.text = `${key}: ${value}`;
                }

                textBlock.height = '12px';
                textBlock.color = 'yellow';
                textBlock.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
                statsPanel.addControl(textBlock);

                // update the text block when the param changes
                hmd.onValuesUpdatedObservable.add(() => {
                    // fetch the latest value
                    displayCalculatedVals = hmd.displayCalculatedVals;

                    // Ensure the value is numeric before using .toFixed(3)
                    const value = displayCalculatedVals[typedKey];
                    if (typeof value === 'number') {
                        textBlock.text = `${key}: ${value.toFixed(3)}`;
                    } else {
                        textBlock.text = `${key}: ${value}`;
                    }
                });
            }
        }

        // Create a horizontal StackPanel to hold both buttons side by side
        const buttonPanel = new GUI.StackPanel();
        buttonPanel.isVertical = false; // Set to horizontal layout
        buttonPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        buttonPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;

        // Add the left and right frustum toggle buttons to the buttonPanel
        const toggleFrustumL = this.createToggleButton('Frustum L', '#8B0000', () => {
            app.frustumVisualizerL?.toggleVisibility();
        });
        const toggleFrustumR = this.createToggleButton('Frustum R', '#00008B', () => {
            app.frustumVisualizerR?.toggleVisibility();
        });

        // create a toggle button to show/hide the PIP viewports
        //const togglePIPButton = this.createToggleButton('HMD View', '#008080', () => {
            //app.togglePIPViewports();
        //});
        //buttonPanel.addControl(togglePIPButton);

        // create display mode toggle button
        let currentMode = DisplayMode.Simulation;
        let toggleVRButton!: GUI.Button;
        toggleVRButton = this.createToggleButton("VR", "#008080", () => {
            currentMode = currentMode === 
                DisplayMode.Simulation ? DisplayMode.VR : DisplayMode.Simulation;
            //toggleVRButton.textBlock!.text = currentMode === 
                //DisplayMode.VR ? "Exit VR" : "Enter VR";
            app.setDisplayMode(currentMode);
            
            // need to update the PIP viewport rectangles
            this.updatePIPViewPortBorder(app);
        });
        buttonPanel.addControl(toggleVRButton);

        // Add frustum togglers
        buttonPanel.addControl(toggleFrustumL);
        buttonPanel.addControl(toggleFrustumR);

        // Add the buttonPanel to the userPanel
        advancedTexture.addControl(buttonPanel)

        // set border around PIP viewports using UI rectangles
        this.pipViewPortBorderL = new GUI.Rectangle();        
        this.pipViewPortBorderL.thickness = VIEWPORT_BORDER_THICKNESS;
        this.pipViewPortBorderL.color = 'pink';
        this.pipViewPortBorderL.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.pipViewPortBorderL.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.pipViewPortBorderR = new GUI.Rectangle();
        this.pipViewPortBorderR.thickness = VIEWPORT_BORDER_THICKNESS;
        this.pipViewPortBorderR.color = 'pink';
        this.pipViewPortBorderR.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.pipViewPortBorderR.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.pipViewPortBorderL.cornerRadius = 3;
        this.pipViewPortBorderR.cornerRadius = 3;
        advancedTexture.addControl(this.pipViewPortBorderL);
        advancedTexture.addControl(this.pipViewPortBorderR);
        this.updatePIPViewPortBorder(app);

        // TODO:
        // add PIP viewport borders layerMask so that we can toggle them on/off when we turn off the PIP viewport rendering
        // need to add a different advancedTexture for the PIP viewports

        // add some textual instructions on top left to use WASD and mouse to move the camera
        const instructions = new GUI.TextBlock();
        instructions.text = 'WASD and mouse to move camera';
        instructions.color = 'white';
        instructions.fontSize = '14px';
        instructions.top = '200px';
        instructions.left = '20px';
        instructions.width = '235px';
        instructions.height = '30px';
        instructions.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        instructions.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

        // add a background to the instructions
        const instructionsBackground = new GUI.Rectangle();
        instructionsBackground.background = 'red'; // dark red
        instructionsBackground.alpha = 0.1;
        instructionsBackground.thickness = 2;
        instructionsBackground.width = instructions.width;
        instructionsBackground.height = instructions.height;
        instructionsBackground.top = instructions.top;
        instructionsBackground.left = instructions.left;
        instructionsBackground.paddingLeft = instructions.paddingLeft;
        instructionsBackground.horizontalAlignment = instructions.horizontalAlignment;
        instructionsBackground.verticalAlignment = instructions.verticalAlignment;
        instructionsBackground.cornerRadius = 3;
        advancedTexture.addControl(instructionsBackground);
        advancedTexture.addControl(instructions);

        // add leftbutton and rightbutton to a panel 20px from the previous buttonPanell
        const envButtonPanel = new GUI.StackPanel();
        envButtonPanel.isVertical = false;
        envButtonPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        envButtonPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        envButtonPanel.width = '100px';
        envButtonPanel.height = '100px';
        envButtonPanel.paddingRight = '5px';
        envButtonPanel.paddingBottom = '40px';
        advancedTexture.addControl(envButtonPanel);

        // create a left and right button to change the loaded environment
        const leftButton = this.createToggleButton('<', '#800080', () => {
            app.loadNextEnvironment(false, scene);
        });
        const rightButton = this.createToggleButton('>', '#800080', () => {
            app.loadNextEnvironment(true, scene);
        });
        leftButton.cornerRadius = 10;
        rightButton.cornerRadius = 10;
        leftButton.width = '50px';
        rightButton.width = '50px';
        envButtonPanel.addControl(leftButton);
        envButtonPanel.addControl(rightButton);

    }

    /** 
     * Helper UI function to create toggle buttons
     */
    private createToggleButton(text: string, backgroundColor: string, 
        onClickHandler:(eventData: GUI.Vector2WithInfo, eventState: EventState) => void
    ) {       
        const button = new GUI.Button();
        button.width = '100px';
        button.height = '50px';
        button.color = 'white';
        button.background = backgroundColor;
        button.cornerRadius = 3;
        button.thickness = 2;
        button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        button.paddingRight = '5px'
        button.paddingBottom = '20px'

        const textBlock = new GUI.TextBlock();
        textBlock.text = text;
        button.addControl(textBlock);

        button.onPointerClickObservable.add(onClickHandler);

        return button;
    }

    /**
     * Update the PIP viewport border when the window (browser) is resized.
     * - if isPIPEnabled, update the PIP viewport rectangles
     * - else hide the PIP viewport rectangles
     */
    updatePIPViewPortBorder(app: App) {
        if (app.currDisplayMode === DisplayMode.Simulation) {
            // update the actual viewports first
            app.updateHMDEyeCameraViewports();

            // update the GUI rectangles
            this.pipViewPortBorderL.width = `${app.pipViewPortWidth * 100}%`;
            this.pipViewPortBorderL.height = `${app.pipViewPortHeight * 100}%`;
            this.pipViewPortBorderL.left = `${app.pipViewPortX * 100}%`;
            this.pipViewPortBorderR.width = `${app.pipViewPortWidth * 100}%`;
            this.pipViewPortBorderR.height = `${app.pipViewPortHeight * 100}%`;
            this.pipViewPortBorderR.left = `${app.pipViewPortX * 100 + app.pipViewPortWidth * 100}%`;

            // show the PIP viewport rectangles
            this.pipViewPortBorderL.isVisible = true;
            this.pipViewPortBorderR.isVisible = true;
        }
        else {
            // hide the PIP viewport rectangles
            this.pipViewPortBorderL.isVisible = false;
            this.pipViewPortBorderR.isVisible = false;
        }
    }

    /**
     * Create a virtual joystick to control the camera.
     * - on moving, the main camera will be translated
     * @returns The virtual joystick.
     */
    createVirtualJoystick() {
        // create a virtual joystick to control the camera
        const joystick = new VirtualJoystick();
        joystick.setJoystickSensibility(0.5);
        joystick.setJoystickColor('red');
        return joystick;
    }

}
