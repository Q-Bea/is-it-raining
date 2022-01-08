import Main, { BaseManager } from "..";
import { AudioFileType } from "./SpeechRequestHandler";
import { DialogueObject } from "./speechSubRoutine/SpeechDialogueManager";

export enum RuntimeErrors {
    NoInternet = 0,
    NoIITData = 1,
    NoPropertiesForCurrentWeather = 2,
    NoPropertiesForFutureWeather = 3,
    FailedToGeneratedAudioForRequestedForcasts = 4
}

export default class RuntimeManager extends BaseManager {
    constructor(Main: Main) {
        super(Main);
    }

    async makeRequest(): Promise<void> {
        //1) Check if we have internet access

        //2) Make request to IIT

        //3) Parse IIT data into required properties

        //4) convert required properties into 1 or dialogue objects (depending on if future is enabled)

        //5) If we have the audio files, stream them, otherwise generate them and then stream them

        //$ If we fail for any reason, we jump into the fail state handler

        console.log("Launching Request!");
        const isConnected = await this.Main.checkInternetConnection();
        if (!isConnected) {
            console.error("Failed --> No internet connection");
            this.failState(RuntimeErrors.NoInternet);
            return;
        }

        const IIT = await this.Main.IITRequestManager.makeRequest();
        if (!IIT) {
            console.error("Failed --> No IIT Data");
            this.failState(RuntimeErrors.NoIITData);
            return;
        }

        const parsedIIT = await this.Main.IITRequestManager.parseIntoProperties(IIT);
        const audioObjectsToPlay: DialogueObject[] = [];

        const currentAudio = this.Main.SpeechRequestHandler.getDialogueObjectFromRequiredProperties(parsedIIT[0]);
        if (currentAudio) {
            audioObjectsToPlay.push(currentAudio);
        } else {
            this.failState(RuntimeErrors.NoPropertiesForCurrentWeather);
            return;
        }

        if (this.Main.SettingsManager.getSettings().sayFuturePrediction) {
            const futureAudio = this.Main.SpeechRequestHandler.getDialogueObjectFromRequiredProperties(parsedIIT[1]);
            if (futureAudio) {
                audioObjectsToPlay.push(futureAudio);
            } else {
                this.failState(RuntimeErrors.NoPropertiesForFutureWeather);
                return;
            }
        }

        //Generate audio
        const generateAudioPromises:Promise<boolean>[] = [];
        for (const audio of audioObjectsToPlay) {
            generateAudioPromises.push(this.Main.SpeechRequestHandler.ensureExistingAudio(audio.fileName, AudioFileType.GENERATED, audio.text));
        }

        const results = await Promise.allSettled(generateAudioPromises);

        for (let i = 0; i < results.length; i++) {
            if (results[i].status === "rejected") {
                this.failState(RuntimeErrors.FailedToGeneratedAudioForRequestedForcasts);
                return;
            } else {
                this.Main.SpeechRequestHandler.enqueuePlayingAudio(audioObjectsToPlay[i]);
            }
        }
    }

    private async failState(reason: RuntimeErrors) {
        if (reason === RuntimeErrors.NoInternet) {
            const attemptNoWifi = await this.Main.SpeechRequestHandler.streamAudio(this.Main.noConnectionFileName, AudioFileType.INTERNAL); 
            if (!attemptNoWifi) {
                await this.Main.SpeechRequestHandler.streamAudio(this.Main.randomErrorFileName, AudioFileType.INTERNAL); 
            }
        } else {
            await this.Main.SpeechRequestHandler.streamAudio(this.Main.randomErrorFileName, AudioFileType.INTERNAL); 
        }

        this.Main.StorageManager.instances.get(this.Main.config.loggingFileName)?.writeJSON([Date.now(), `Runtime Error: ${reason}`]);
    }
}