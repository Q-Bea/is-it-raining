//Responsible for interfacing with the GPIO pins, which control the request trigger and the volume

import Main, { BaseManager } from "..";
import loudness from "loudness";
import {Gpio} from "onoff";
const GrovePI = require("grovepi");

const RotaryAngleSensor = GrovePI.sensors.RotaryAnalog;
const Board = GrovePI.board;

export type VolumeKnobPercent = 0|1|2|3|4|5|6|7|8|9|10

export default class GPIOInterface extends BaseManager {
    private volumeInterval?: NodeJS.Timer
    private buttonInterval?: NodeJS.Timer

    private board: any;

    constructor(Main: Main) {
        super(Main);
    }

    startListeners() {
        this.watchButton();

        // this.startVolumeInterval();
        this.board = new Board({
            debug: true,
            onError: (err: any) => {
                console.log('Something wrong just happened')
                console.log(err)
            },
            onInit: (res: any) => {
                if (res) {
                    console.log('GrovePi Version :: ' + this.board.version())
            
                    var rotarySensor = new RotaryAngleSensor(this.Main.config.gpioVolumePin)
                    console.log('Rot Ang (start watch)')
                    rotarySensor.on('change', function(res: any) {
                        console.log('Rot onChange value=' + res)
                    })
                    rotarySensor.watch()
                }
            }
        })
    }

    private watchButton() {
        const button = new Gpio(this.Main.config.gpioButtonPin, "in", "both", {debounceTimeout: 100});

        button.watch((e, v) => {
            return "Button Pressed!"
        })
    }

    // private startVolumeInterval() {
    //     if (this.volumeInterval) {
    //         console.log("[Interval] Deleting Existing GPIO Interval")
    //         clearInterval(this.volumeInterval);
    //         this.volumeInterval = undefined;
    //     }
    //     console.log("[Interval] Starting GPIO Interval")

    //     this.volumeInterval = setInterval(async () => {
    //         const volume = await this.readVolumeKnob();

    //         console.log(volume)
    //         // try {

    //         //     if (volume == 0) {
    //         //         await loudness.setVolume(0);
    //         //         loudness.setMuted(true)
    //         //     } else {
    //         //         if (await loudness.getMuted()) 
    //         //         await loudness.setMuted(false)
    //         //         loudness.setVolume(volume*10)
    //         //     }
    //         // } catch(e) {
    //         //     console.error("Failed to update sound!")
    //         //     this.Main.StorageManager.instances.get(this.Main.config.loggingFileName)?.writeJSON([`Volume_${Date.now()}`, "Failed to update volume level"])
    //         // }

    //     }, this.Main.SettingsManager.getSettings().GPIOPollInterval_ms)
    // }

    // private readButtonState(): boolean {
    //     //TODO
    //     return false;
    // }
}