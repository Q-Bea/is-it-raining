import Main, { BaseManager } from "./..";
import SpeechDialogueManager, { type DialogueObject, KnownProperties } from "./speechSubRoutine/SpeechDialogueManager";
import SpeechFileManager, { type ValidAudioFileName } from "./speechSubRoutine/SpeechFileManager";
import SpeechServicesAPI, { VoiceSSMLSettings } from "./speechSubRoutine/SpeechServicesAPI";
import Speaker from "speaker";

export enum AudioFileType {
    INTERNAL = 0,
    GENERATED = 1
}

const BUFFER_END_TO_SPEAKER_FINISH_DELAY = 800; //Guesstimate

export default class SpeechRequestHandler extends BaseManager {
    FileManager: SpeechFileManager;
    ServiceAPI: SpeechServicesAPI; 
    DialogueManager: SpeechDialogueManager;

    private playQueue: DialogueObject[] = [];
    private isPlaying = false;

    constructor(Main: Main) {
        super(Main);

        this.FileManager = new SpeechFileManager(this);
        this.ServiceAPI = new SpeechServicesAPI(this);
        this.DialogueManager = new SpeechDialogueManager(this);
    }

    setup() {
        this.FileManager.setupDirectories();
        this.FileManager.possiblePurge();
    }

    //Here's how this works. Dialogue strings are stored along with a list of properties describing what types of whether they cover
    //The script should pick the the dialogue line that matches the largest number of provided properties

    //Example 1, A dialogue line with 'Rain', 'Wind', and 'Cold' properties and a dialogue line with 'Rain' and 'Wind' properties.
    //The request asks for a dialogue line with 'Rain' 'Wind' and 'Cold' --> Dialogue line 1 will be chosen as it matches 3 of those, the largest number
    //The request asks for a dialogue line with 'Rain' and 'Wind' --> Dialogue line 2 will be chosen because it matches the request exactly (in other words, the percentage of properties it contains to the properties requested is the largest)

    //We should never select a dialogue line containing properties that weren't included in the request
    
    //In the event that there are multiple matches of equal representation, we pick randomly

    //Then, we check if the audio file has already been generated, if it has, we stream it, otherwise we generate with speech services, then stream it.
    //If saving is turned off in mother, we can just stream it directly


    /**
     * If the file name doesn't exist, the audio file will be regenerated now.
     */
    async ensureExistingAudio(fileName: ValidAudioFileName, type: AudioFileType, dialogue: string, dialogueOverrides?: VoiceSSMLSettings): Promise<boolean> {
        if (!this.FileManager.checkIfFileExists(fileName, type)) {
            return await this.ServiceAPI.downloadSpeechFile(dialogue, fileName, type, dialogueOverrides);
        } else {
            return true;
        }
    }

    async createOverrideAudio(fileName: ValidAudioFileName, type: AudioFileType, dialogue: string, dialogueOverrides?: VoiceSSMLSettings): Promise<boolean> {
        return await this.ServiceAPI.downloadSpeechFile(dialogue, fileName, type, dialogueOverrides);
    }

    /**
     * Promise resolves when audio is done playing 
     */
    async streamAudio(fileName: ValidAudioFileName, type: AudioFileType): Promise<boolean> {
        return new Promise((resolve) => {
            const stream = this.FileManager.streamFromFile(fileName, type);
            if (stream) {
                const speaker = new Speaker({
                    channels: 1,
                    bitDepth: 16,
                    sampleRate: 16000
                });
    
                stream.pipe(speaker);
    
                stream.on("end", () => {
                    setTimeout(() => {
                        resolve(true);
                    }, BUFFER_END_TO_SPEAKER_FINISH_DELAY);
                });
                stream.on("error", () => {
                    resolve(false);
                });
            } else {
                resolve(false);
            }
        });
    }

    getDialogueObjectFromRequiredProperties(requiredProperties: KnownProperties[], ) {
        return this.DialogueManager.requestDialogueObject(requiredProperties);
    }

    enqueuePlayingAudio(dialogueObject: DialogueObject) {
        this.playQueue.push(dialogueObject);

        if (!this.isPlaying) this.runPlayer();
    }

    async waitForNoAudioPlaying(): Promise<void> {
        return new Promise(resolve => {
            if (!this.isPlaying && this.playQueue.length == 0) {
                resolve();
                return;
            }
    
            setInterval(() => {
                if (!this.isPlaying && this.playQueue.length == 0) {
                    resolve();
                    return;
                }
            }, 250);
        });
    }
    
    private async runPlayer() {
        this.isPlaying = true;

        while (this.playQueue.length > 0) {
            const nextUp = this.playQueue.shift()!;
            console.log(`Now Playing: ${nextUp.fileName}`);

            try {
                await this.streamAudio(nextUp?.fileName, AudioFileType.GENERATED);
            } catch(e) {
                //
            }
        }

        this.isPlaying = false;
        this.Main.SpeechRequestHandler.FileManager.possiblePurge();
    }
}
