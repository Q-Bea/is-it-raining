import Main, { BaseManager, IntervalIDs } from "..";
import axios from "axios";
import { DialogueObject } from "./speechSubRoutine/SpeechDialogueManager";

export interface locationObject_latlng {
    type: "latlng",
    value: [lat: number, long: number]
}

export interface locationObject_locationQuery {
    type: "location",
    value: "string"
}

export interface MotherSettings {
    dialogue: DialogueObject[]
    dialogueOptions: {
        pitch: number,
        rate: number,
        speaker: string,
        style: "assistant"|"chat"|"newscast"|"customerservice"
    },
    failOnNoFuture: boolean
    savePreviousAudioFiles: boolean
    location: locationObject_latlng|locationObject_locationQuery
    coldFeelThreshold_c: number
    windThreshold_kph: number
    sayFuturePrediction: boolean
    connectivityIP: `${number}.${number}.${number}.${number}`
    GPIOPollInterval_ms: number
    motherCheckInInterval_ms: number
    motherDownloadAlsoChecksIn: boolean
    githubUpdateCheckInterval_ms: number

}

export default class MotherRequestManager extends BaseManager {
    checkInDownloadInterval?: NodeJS.Timer;
    constructor(Main: Main) {
        super(Main);
    }

    startInterval() {
        if (this.checkInDownloadInterval) {
            console.log("[Interval] Deleting Existing Mother Interval")

            clearInterval(this.checkInDownloadInterval);
            this.checkInDownloadInterval = undefined;
        }
        console.log("[Interval] Starting Mother Interval")

        this.checkInDownloadInterval = setInterval(async () => {
            const fileData = await this.checkInDownload(true);
            const existingSettings = this.Main.SettingsManager.getSettings();
            if (fileData) {
                if (fileData.motherCheckInInterval_ms !== existingSettings.motherCheckInInterval_ms) {
                    this.Main.stageIntervalToRestart(IntervalIDs.Mother)
                }
                if (fileData.GPIOPollInterval_ms !== existingSettings.GPIOPollInterval_ms) {
                    this.Main.stageIntervalToRestart(IntervalIDs.GPIO)
                }
                if (fileData.githubUpdateCheckInterval_ms !== existingSettings.githubUpdateCheckInterval_ms) {
                    this.Main.stageIntervalToRestart(IntervalIDs.Github)
                }
                this.Main.StorageManager.LocalInterfaceManager.instances.get(this.Main.config.motherDownloadedConfigFilename)?.writeRawJSON(fileData);

                this.Main.executeIntervalRestart();
            }

        }, this.Main.SettingsManager.getSettings().motherCheckInInterval_ms);
    }

    async checkInDownload(intervalBased = false): Promise<MotherSettings|undefined> {
        let wasError = false;
        let data = undefined;
        try {
            const fileDataResponse = await axios({
                url: `https://mother.beamacdonald.ca/config/${this.Main.auth.motherAuthToken}`,
                method: "GET",
                timeout: 5000
            });

            if (fileDataResponse.status === 200) {
                data = fileDataResponse.data;
            }
        } catch (e) {
            //This probably means that the config file is not available on the server, 
            //if this is the case, mother won't have acknowledged our request so we should try to check in
            wasError = true;
        } finally {
            if (intervalBased && (wasError || !this.Main.SettingsManager.getSettings().motherDownloadAlsoChecksIn)) {
                axios({
                    url: `https://mother.beamacdonald.ca/checkin/${this.Main.auth.motherAuthToken}`,
                    method: "GET",
                    timeout: 5000
                }).catch(() => {/* */});
            }
        }

        if (data !== undefined) {
            return data;
        }
    }
}