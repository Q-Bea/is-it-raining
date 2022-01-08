//Responsible for interfacing with the GPIO pins, which control the request trigger and the volume

import Main, { BaseManager } from "..";
import loudness from "loudness";

export type VolumeKnobPercent = 0|1|2|3|4|5|6|7|8|9|10

export default class GPIOInterface extends BaseManager {
    private volumeInterval?: NodeJS.Timer
    private buttonInterval?: NodeJS.Timer
    constructor(Main: Main) {
        super(Main);
    }

    startListeners() {
        this.startButtonInterval();

        this.startVolumeInterval();
    }

    private startButtonInterval() {
        if (this.buttonInterval) {
            clearInterval(this.buttonInterval);
            this.buttonInterval = undefined;
        }

        this.buttonInterval = setInterval(async () => {
            const buttonActive = this.readButtonState();

            if (buttonActive) {
                this.Main.RuntimeManager.makeRequest();
            }
        }, this.Main.SettingsManager.getSettings().GPIOPollInterval_ms)
    }

    private startVolumeInterval() {
        if (this.volumeInterval) {
            console.log("[Interval] Deleting Existing GPIO Interval")
            clearInterval(this.volumeInterval);
            this.volumeInterval = undefined;
        }
        console.log("[Interval] Starting GPIO Interval")

        this.volumeInterval = setInterval(async () => {
            try {
                const volume = this.readVolumeKnob();

                if (volume == 0) {
                    await loudness.setVolume(0);
                    loudness.setMuted(true)
                } else {
                    if (await loudness.getMuted()) 
                    await loudness.setMuted(false)
                    loudness.setVolume(volume*10)
                }
            } catch(e) {
                console.error("Failed to update sound!")
                this.Main.StorageManager.instances.get(this.Main.config.loggingFileName)?.writeJSON([`Volume_${Date.now()}`, "Failed to update volume level"])
            }

        }, this.Main.SettingsManager.getSettings().GPIOPollInterval_ms)
    }

    private readVolumeKnob(): VolumeKnobPercent {
        //TODO
        return 4;
    }

    private readButtonState(): boolean {
        //TODO
        return false;
    }
}