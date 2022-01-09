//Responsible for interfacing with the GPIO pins, which control the request trigger and the volume

import Main, { BaseManager } from "..";
import {Gpio} from "onoff";

export default class GPIOInterface extends BaseManager {
    constructor(Main: Main) {
        super(Main);
    }

    startListeners() {
        console.log("[Interval] Starting GPIO Interval");
        this.watchButton();
    }

    private watchButton() {
        const button = new Gpio(this.Main.config.gpioButtonPin, "in", "rising", {debounceTimeout: 100});

        button.watch(() => {
            console.log("Button Pressed. Launching Request!");

            this.Main.RuntimeManager.makeRequest();
            return;
        });
    }
}