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

    // VR centre line
    private vrCenterMarker!: GUI.Rectangle;

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
                    app.updateHMDEyeCameraViewports();
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

        // create a rectangle to represent the VR centre lines
        this.vrCenterMarker = new GUI.Rectangle("vrCenterMarker");
        this.vrCenterMarker.width = "2px";
        this.vrCenterMarker.height = "70px";
        this.vrCenterMarker.thickness = 0;
        this.vrCenterMarker.background = "pink";
        this.vrCenterMarker.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.vrCenterMarker.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        this.vrCenterMarker.top = "-98px"; // adjust if needed
        this.vrCenterMarker.isVisible = false; // hidden by default
        advancedTexture.addControl(this.vrCenterMarker);

        // Create a horizontal StackPanel to hold both buttons side by side
        const buttonPanel = new GUI.StackPanel();
        buttonPanel.isVertical = false; // Set to horizontal layout
        buttonPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        buttonPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;

        // create display mode toggle button
        let currentMode = DisplayMode.Simulation;
        let toggleVRButton!: GUI.Button;
        toggleVRButton = this.createToggleButton("VR", "#008080", () => {
            currentMode = currentMode === DisplayMode.Simulation 
                                          ? DisplayMode.VR 
                                          : DisplayMode.Simulation;
            app.setDisplayMode(currentMode);
            
            // update the viewports
            app.updateHMDEyeCameraViewports();

            // also update the VR centre line visibility
            this.vrCenterMarker.isVisible = app.currDisplayMode === DisplayMode.VR;
        });
        buttonPanel.addControl(toggleVRButton);

        // Add frustum togglers
        // - the left and right frustum toggle buttons to the buttonPanel
        const toggleFrustumL = this.createToggleButton('Frustum L', '#8B0000', () => {
            app.frustumVisualizerL?.toggleVisibility();
            hmd.debugPrintPositions();
        });
        const toggleFrustumR = this.createToggleButton('Frustum R', '#00008B', () => {
            app.frustumVisualizerR?.toggleVisibility();
        });
        buttonPanel.addControl(toggleFrustumL);
        buttonPanel.addControl(toggleFrustumR);

        // Add the buttonPanel to the userPanel
        advancedTexture.addControl(buttonPanel)

        // add some textual instructions at bottom  to use WASD and 
        // mouse to move the camera
        const instructions = new GUI.TextBlock();
        instructions.text = 'WASD and mouse to move camera or HMD';
        instructions.color = 'white';
        instructions.fontSize = '12px';
        instructions.width = '250px';
        instructions.height = '18px';
        instructions.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        instructions.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;

        // add a background to the instructions
        const instructionsBackground = new GUI.Rectangle();
        instructionsBackground.background = 'red'; // dark red
        instructionsBackground.alpha = 0.2;
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

        // add leftbutton and rightbutton to a panel 20px from the previous buttonPanel
        const envButtonPanel = new GUI.StackPanel();
        envButtonPanel.isVertical = false;
        envButtonPanel.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        envButtonPanel.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
        envButtonPanel.width = '100px';
        envButtonPanel.height = '100px';
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

        // create a button to toggle whether HMD is controlled by user
        const toggleHMDControlButton = this.createToggleButton('Move HMD', '#008000', () => {
            app.toggleHMDControl();
        });
        buttonPanel.addControl(toggleHMDControlButton);
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
        button.paddingLeft = '3px'
        button.paddingRight = '3px'
        button.paddingBottom = '20px'

        const textBlock = new GUI.TextBlock();
        textBlock.text = text;
        textBlock.fontSize = '14px';
        button.addControl(textBlock);

        button.onPointerClickObservable.add(onClickHandler);

        return button;
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
