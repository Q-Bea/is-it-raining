import type SpeechRequestHandler from "../SpeechRequestHandler";
import {SpeechConfig, AudioConfig, SpeechSynthesizer} from "microsoft-cognitiveservices-speech-sdk";
import fs from "fs";

export default class SpeechServicesAPI {
    RequestHandler: SpeechRequestHandler
    constructor(RequestHandler: SpeechRequestHandler) {
        this.RequestHandler = RequestHandler;
    }

    setupDirectories() {
        if (!fs.existsSync(process.cwd() + "/audio")) {
            fs.mkdirSync(process.cwd() + "/audio")
        }

        if (!fs.existsSync(process.cwd() + "/audio/synth")) {
            fs.mkdirSync(process.cwd() + "/audio/synth")
        }
    }

    downloadSpeechFile(text: string) {
        const speechConfig = SpeechConfig.fromSubscription(this.RequestHandler.Main.auth.speechServicesAuthToken, this.RequestHandler.Main.auth.speechServicesAuthRegion);
        const audioConfig = AudioConfig.fromAudioFileOutput(process.cwd() + "/audio/synth/path-to-file.wav");

        const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
        synthesizer.speakTextAsync(
            text,
            result => {
                synthesizer.close();
                if (result) {
                    // return result as stream
                    return fs.createReadStream(process.cwd() + "/audio/synth/path-to-file.wav");
                }
            },
            error => {
                console.log(error);
                synthesizer.close();
            }
        );
    }
}






