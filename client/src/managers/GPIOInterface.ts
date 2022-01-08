//Responsible for interfacing with the GPIO pins, which control the request trigger and the volume

import Main, { BaseManager } from "..";

export type VolumeKnobPercent = 0|1|2|3|4|5|6|7|8|9|10

export default class GPIOInterface extends BaseManager {
    constructor(Main: Main) {
        super(Main);
    }

    startListener() {
        return;
    }

    readVolumeKnob(): VolumeKnobPercent {
        return 7;
    }
}