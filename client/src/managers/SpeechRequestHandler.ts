import Main, { BaseManager } from "./..";
import SpeechFileManager from "./speechSubRoutine/SpeechFileManager";
import SpeechServicesAPI from "./speechSubRoutine/SpeechServicesAPI";


export default class SpeechRequestHandler extends BaseManager {
    FileManager: SpeechFileManager
    ServiceAPI: SpeechServicesAPI 
    constructor(Main: Main) {
        super(Main);

        this.FileManager = new SpeechFileManager(this);
        this.ServiceAPI = new SpeechServicesAPI(this);
    }

    setup() {
        this.ServiceAPI.setupDirectories();
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
}