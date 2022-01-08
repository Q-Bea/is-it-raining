import type SpeechRequestHandler from "../SpeechRequestHandler";
import { SpeechConfig, AudioConfig, SpeechSynthesizer } from "microsoft-cognitiveservices-speech-sdk";
import { type AudioFileType } from "../SpeechRequestHandler";
import { type ValidAudioFileName } from "./SpeechFileManager";

export default class SpeechServicesAPI {
    protected RequestHandler: SpeechRequestHandler;
    constructor(RequestHandler: SpeechRequestHandler) {
        this.RequestHandler = RequestHandler;
    }

    async downloadSpeechFile(text: string, fileNameWAV: ValidAudioFileName, audioFileType: AudioFileType): Promise<boolean> {
        const isConnected = await this.RequestHandler.Main.checkInternetConnection();

        if (!isConnected) return false;

        const speechConfig = SpeechConfig.fromSubscription(this.RequestHandler.Main.auth.speechServicesAuthToken, this.RequestHandler.Main.auth.speechServicesAuthRegion);
        const audioConfig = AudioConfig.fromAudioFileOutput(this.RequestHandler.FileManager.getFilePathForSaving(fileNameWAV, audioFileType));

        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
            synthesizer.speakTextAsync(
                text,
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
}






