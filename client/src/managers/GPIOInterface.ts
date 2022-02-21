//Responsible for interfacing with the GPIO pins, which control the request trigger and the volume

import Main, { BaseManager } from "..";
import {Gpio} from "onoff";
import loudness from "loudness";
import { AudioFileType } from "./SpeechRequestHandler";

export default class GPIOInterface extends BaseManager {
    private currentVolume = 50;

    private vUpPressed = false;
    private vDownPressed = false;

    constructor(Main: Main) {
        super(Main);
    }
    startListeners() {
        loudness.getVolume().then((volumeLevel) => this.currentVolume = volumeLevel).catch(() => {/* */});
        console.log("[Interval] Starting GPIO Interval");
        this.watchButton();
    }

    private watchButton() {
        const requestButton = new Gpio(this.Main.config.gpioRequestPin, "in", "rising", {debounceTimeout: 100});

        requestButton.watch(() => {
            console.log("Button Pressed. Launching Request!");

            this.Main.RuntimeManager.makeRequest();
            return;
        });

        const vUpButton = new Gpio(this.Main.config.gpioVolumeUpPin, "in", "both", {debounceTimeout: 100});

        vUpButton.watch((e, v) => {

            this.vUpPressed = v == 1;

            if (v == 1) {
                this.currentVolume = this.currentVolume + 5;
                if (this.currentVolume > 100) this.currentVolume = 100;
                console.log(`Volume Up --> At ${this.currentVolume}`);
    
                loudness.setVolume(this.currentVolume).catch(() => {/* */});

                this.checkForBothVPressed();
                return;
            }
        });

        const vDownButton = new Gpio(this.Main.config.gpioVolumeDownPin, "in", "both", {debounceTimeout: 100});

        vDownButton.watch((e, v) => {

            this.vDownPressed = v == 1;
            
            if (v == 1) {
                this.currentVolume = this.currentVolume - 5;
                if (this.currentVolume < 0) this.currentVolume = 0;
                console.log(`Volume Down --> At ${this.currentVolume}`);
    
                loudness.setVolume(this.currentVolume).catch(() => {/* */});

                this.checkForBothVPressed();
                return;
            }
        });
    }

    //This is used for the secret reset
    private async checkForBothVPressed() {

        if (this.vDownPressed && this.vUpPressed) {
            //The goal here is to make stuff work, which means we will unsafely delete as much stuff as possible because any of it could be corrupted

            await this.Main.SpeechRequestHandler.streamAudio(this.Main.internalSoundFileNames.reset, AudioFileType.INTERNAL);

            this.Main.SpeechRequestHandler.FileManager.absolutePurge("both");

            this.Main.generateInternalAudio();
        }
    }
}