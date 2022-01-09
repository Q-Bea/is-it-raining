//Responsible for interfacing with the GPIO pins, which control the request trigger and the volume

import Main, { BaseManager } from "..";
import {Gpio} from "onoff";

export type VolumeKnobPercent = 0|1|2|3|4|5|6|7|8|9|10

export default class GPIOInterface extends BaseManager {
    private volumeInterval?: NodeJS.Timer
    private buttonInterval?: NodeJS.Timer

    private board: any;
    private rotang?: any;

    constructor(Main: Main) {
        super(Main);
    }

    startListeners() {
        this.watchButton();
    }

    private watchButton() {
        const button = new Gpio(this.Main.config.gpioButtonPin, "in", "rising", {debounceTimeout: 100});

        button.watch((e, v) => {
            console.log("Button Pressed")
            return 
        })
    }
}