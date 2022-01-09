//Responsible for interfacing with the GPIO pins, which control the request trigger and the volume

import Main, { BaseManager } from "..";
import loudness from "loudness";
import {Gpio} from "onoff";

export type VolumeKnobPercent = 0|1|2|3|4|5|6|7|8|9|10

export default class GPIOInterface extends BaseManager {
    private volumeInterval?: NodeJS.Timer
    private buttonInterval?: NodeJS.Timer

    private volumePin1?: Gpio;
    private volumePin2?: Gpio;

    constructor(Main: Main) {
        super(Main);
    }

    startListeners() {
        this.watchButton();

        this.volumePin1 = new Gpio(this.Main.config.gpioVolumePinA, "out");
        this.volumePin2 = new Gpio(this.Main.config.gpioVolumePinB, "in");
    }

    private watchButton() {
        const button = new Gpio(this.Main.config.gpioButtonPin, "in", "both", {debounceTimeout: 100});

        button.watch((e, v) => {
            return "Button Pressed!"
        })
    }

    private startVolumeInterval() {
        if (this.volumeInterval) {
            console.log("[Interval] Deleting Existing GPIO Interval")
            clearInterval(this.volumeInterval);
            this.volumeInterval = undefined;
        }
        console.log("[Interval] Starting GPIO Interval")

        this.volumeInterval = setInterval(async () => {
            const volume = this.readVolumeKnob();

            console.log(volume)
            // try {

            //     if (volume == 0) {
            //         await loudness.setVolume(0);
            //         loudness.setMuted(true)
            //     } else {
            //         if (await loudness.getMuted()) 
            //         await loudness.setMuted(false)
            //         loudness.setVolume(volume*10)
            //     }
            // } catch(e) {
            //     console.error("Failed to update sound!")
            //     this.Main.StorageManager.instances.get(this.Main.config.loggingFileName)?.writeJSON([`Volume_${Date.now()}`, "Failed to update volume level"])
            // }

        }, this.Main.SettingsManager.getSettings().GPIOPollInterval_ms)
    }

    
    private discharge() {
        
        this.volumePin1?.setDirection("in");
        this.volumePin2?.setDirection("out");
        this.volumePin2?.writeSync(0);
    }

    private charge_time() {
        this.volumePin2?.setDirection("in");
        this.volumePin1?.setDirection("out");
        let count = 0;
        this.volumePin1?.writeSync(1);
        while (this.volumePin2?.readSync() === 0) {
            count = count + 1;
        }
        return count;
    }


    private async readVolumeKnob(): Promise<number> {
        return new Promise((resolve) => {
            this.discharge();
            setTimeout(() => {
                resolve(this.charge_time());
            }, 4);
        })
    }

    private readButtonState(): boolean {
        //TODO
        return false;
    }
}