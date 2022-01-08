import type SpeechRequestHandler from "../SpeechRequestHandler";
import { SpeechConfig, AudioConfig, SpeechSynthesizer } from "microsoft-cognitiveservices-speech-sdk";
import { type AudioFileType } from "../SpeechRequestHandler";
import { type ValidAudioFileName } from "./SpeechFileManager";

export interface VoiceSSMLSettings {
    speaker?: string
    pitch?: number
    rate?: number
    style?: string
}

export default class SpeechServicesAPI {
    protected RequestHandler: SpeechRequestHandler;
    constructor(RequestHandler: SpeechRequestHandler) {
        this.RequestHandler = RequestHandler;
    }

    async downloadSpeechFile(text: string, fileNameWAV: ValidAudioFileName, audioFileType: AudioFileType, overrides?: VoiceSSMLSettings): Promise<boolean> {
        const isConnected = await this.RequestHandler.Main.checkInternetConnection();

        if (!isConnected) return false;

        const speechConfig = SpeechConfig.fromSubscription(this.RequestHandler.Main.auth.speechServicesAuthToken, this.RequestHandler.Main.auth.speechServicesAuthRegion);
        const audioConfig = AudioConfig.fromAudioFileOutput(this.RequestHandler.FileManager.getFilePathForSaving(fileNameWAV, audioFileType));

        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
            synthesizer.speakSsmlAsync(
                this.mergeWithSSML(text, overrides),
                result => {
                    synthesizer.close();
                    if (result) {
                        resolve(true);
                    }//     // return result as stream                    }
                },
                error => {
                    console.log(error);
                    synthesizer.close();
                    resolve(false);
                }
            );
        });
    }

    private mergeWithSSML(text: string, options?: VoiceSSMLSettings) {
        const motherSettings = this.RequestHandler.Main.SettingsManager.getSettings().dialogueOptions;
        const settings = {
            speaker: options?.speaker ?? motherSettings.speaker,
            pitch: options?.pitch ?? motherSettings.pitch,
            rate: options?.rate ?? motherSettings.rate,
            style: options?.style ?? motherSettings.style
        }

        return `
        <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">
            <voice name="${settings.speaker}" style="${settings.style}">
                <prosody rate="${settings.rate}%" pitch="${settings.pitch}%">${text}</prosody>
            </voice>
        </speak>`
    }
}






