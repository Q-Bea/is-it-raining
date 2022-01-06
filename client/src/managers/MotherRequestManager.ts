import Main, { BaseManager } from "..";
import axios from "axios";

export default class MotherRequestManager extends BaseManager {
    checkInDownloadInterval?: NodeJS.Timer
    constructor(Main: Main) {
        super(Main);
    }

    startInterval() {
        if (this.checkInDownloadInterval) {
            clearInterval(this.checkInDownloadInterval);
            this.checkInDownloadInterval = undefined;
        }
        this.checkInDownloadInterval = setInterval(async () => {
            const fileData = await this.checkInDownload(true);
            console.log(fileData);
        }, this.Main.config.motherCheckInInterval_ms)
    }

    async checkInDownload(intervalBased = false) {
        let wasError = false;
        let data = undefined;
        try {
            const fileDataResponse = await axios({
                url: `https://mother.beamacdonald.ca/config/${this.Main.auth.motherAuthToken}`,
                method: "GET",
                timeout: 5000
            })

            if (fileDataResponse.status === 200) {
                data = fileDataResponse.data;
            }
        } catch (e) {
            //This probably means that the config file is not available on the server, 
            //if this is the case, mother won't have acknowledged our request so we should try to check in
            wasError = true;
        } finally {
            if (intervalBased && (wasError || !this.Main.config.motherDownloadAlsoChecksIn)) {
                axios({
                    url: `https://mother.beamacdonald.ca/checkin/${this.Main.auth.motherAuthToken}`,
                    method: "GET",
                    timeout: 5000
                }).catch(() => {/* */})
            }

            if (data !== undefined) {
                return data;
            }
        }
    }
}