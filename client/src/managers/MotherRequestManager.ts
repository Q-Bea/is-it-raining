import Main, { BaseManager, IntervalIDs } from "..";
import axios from "axios";
import { DialogueObject } from "./speechSubRoutine/SpeechDialogueManager";
import { AudioFileType } from "./SpeechRequestHandler";
import { isEqual } from "lodash";

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
    }
    internalDialogue: {
        noInternet: string
        randomError: string
        unknownWeatherFile: string
    }
    failOnNoFuture: boolean
    savePreviousAudioFiles: boolean
    location: locationObject_latlng|locationObject_locationQuery
    coldFeelThreshold_c: number
    windThreshold_kph: number
    sayFuturePrediction: boolean
    connectivityIP: `${number}.${number}.${number}.${number}`
    motherCheckInInterval_ms: number
    motherDownloadAlsoChecksIn: boolean
    githubUpdateCheckInterval_ms: number
    deleteAllDialogueOnBoot: boolean
}

export default class MotherRequestManager extends BaseManager {
    checkInDownloadInterval?: NodeJS.Timer;
    constructor(Main: Main) {
        super(Main);
    }

    startInterval() {
        if (this.checkInDownloadInterval) {
            console.log("[Interval] Deleting Existing Mother Interval");

            clearInterval(this.checkInDownloadInterval);
            this.checkInDownloadInterval = undefined;
        }
        console.log("[Interval] Starting Mother Interval");

        this.checkInDownloadInterval = setInterval(async () => {
            const fileData = await this.checkInDownload(true);
            const existingSettings = this.Main.SettingsManager.getSettings();
            if (fileData) {
                if (fileData.motherCheckInInterval_ms !== existingSettings.motherCheckInInterval_ms) {
                    console.log("New interval time for check Mother. Interval will restart!");
                    this.Main.stageIntervalToRestart(IntervalIDs.Mother);
                }
                if (fileData.githubUpdateCheckInterval_ms !== existingSettings.githubUpdateCheckInterval_ms) {
                    console.log("New interval time for check Github. Interval will restart!");
                    this.Main.stageIntervalToRestart(IntervalIDs.Github);
                }

                let purged = false;
                if (fileData.dialogueOptions && !isEqual(existingSettings.dialogueOptions, fileData.dialogueOptions)) {
                    console.log("New dialogue options for all generated texting, running full purge!");

                    this.Main.SpeechRequestHandler.FileManager.absolutePurge("both");
                    purged = true;
                }

                //We also want to check if new dialogue overrides were created and delete generated audio if so
                if (!purged && fileData.dialogue) {
                    //If we purged, there's no point doing this, the file don't exist
                    for (const object of fileData.dialogue) {
                        const existingObject = this.Main.SpeechRequestHandler.DialogueManager.getObjectByFilename(object.fileName);
                        if (existingObject) {
                            if (object.text !== existingObject.text) {
                                console.log(`New dialogue for generated file ${existingObject.fileName}. Purging old...`);

                                this.Main.SpeechRequestHandler.FileManager.deleteSpecificFile(object.fileName, AudioFileType.GENERATED);
                            }
                        }
                    }
                }

                //internal audio, similar to above
                if (!purged) {
                    if (fileData.internalDialogue) {
                        for (const dialogue in fileData.internalDialogue) {
                            const typecast = dialogue as keyof MotherSettings["internalDialogue"];
                            if (fileData.internalDialogue[typecast] !== existingSettings.internalDialogue[typecast]) {
                                console.log(`Regenerating internal ${typecast} dialogue file`);
                                this.Main.SpeechRequestHandler.createOverrideAudio(this.Main.internalSoundFileNames[typecast], AudioFileType.INTERNAL, fileData.internalDialogue[typecast]);
                            }
                        }
                    }
                } else {
                    console.log("Recreating internal audio post purge!");
                    this.Main.generateInternalAudio();
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