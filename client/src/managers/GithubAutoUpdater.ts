/* eslint-disable no-async-promise-executor */
//Check the git status to see if this build is behind, if it is, git pull, tsc, and reboot
import Main, { BaseManager } from "..";
import { exec } from "child_process";

export default class GithubAutoUpdateManager extends BaseManager {
    gitUrl: string;
    updateCheckInterval?: NodeJS.Timer;

    constructor(Main: Main) {
        super(Main);

        this.gitUrl = "git@github.com:Quantum158/is-it-raining.git";
    }

    private async checkUpToDate(): Promise<boolean> {
        return new Promise(async (resolve) => {
            console.log("Checking if up to date...");
            const fetch = exec("git fetch", () => {
                return;
            });
            fetch.on("close", () => {
                exec("git status", (err, stdout) => {
                    if (err) {
                        // node couldn't execute the command
                        console.error("Couldn't check status, oh well.");
                        resolve(true);
                        return;
                    }
                    
                    // the *entire* stdout and stderr (buffered)
                    resolve(this.getStatusFromRaw(stdout));
                    // console.log(`stderr: ${stderr}`);
                });
            });
        });
    }

    private getStatusFromRaw(stdout: string): boolean {
        const toDateString = stdout.split("\n")[1];

        if (toDateString.includes("up to date")) {
            console.log("Congrats! You are up to date. No action is needed.");
            return true;
        }

        console.log("You are not up to date! Updating recommended...");
        return false;
    }

    private async pull() {
        return new Promise(async (resolve) => {
            console.log("Forcefully downloading latest update...");
            exec("git pull --force", (err, stdout) => {
                if (err) {
                    // node couldn't execute the command
                    console.log("Could not update! Oh well...");
                    console.error(err);
                    resolve(false);
                    return;
                }
                
                // the *entire* stdout and stderr (buffered)
                resolve(this.getPullStatus(stdout));
                // console.log(`stderr: ${stderr}`);
            });
        });
    }

    private getPullStatus(stdout: string) {
        if (stdout.split("\n")[0].includes("Already up to date")) return true;

        if (stdout.split("\n")[0].includes("Updating")) return true;

        return false;
    }

    private runTSC() {
        return new Promise(async (resolve) => {
            console.log("Running TSC!");
            exec("tsc", {cwd: this.Main.ensureCorrectCWD()}, (err) => {
                if (err) {
                    // node couldn't execute the command
                    console.log("Could not compile!");
                    console.error(err);
                    resolve(false);
                    return;
                }
                
                // the *entire* stdout and stderr (buffered)
                resolve(true);
                // console.log(`stderr: ${stderr}`);
            });
        });
    }

    async fullUpdateRoutine() {
        const connected = await this.Main.checkInternetConnection();
        if (!connected) {
            console.log("Wanted to check for updates but I don't have internet connection :(");
        }
        const res = await this.checkUpToDate();
        if (!res) {
            if (await this.pull()) {
                console.log("Successfully downloaded latest build. Recompiling and restarting!");
                if (await this.runTSC()) {
                    console.log("Successfully compiled! Rebooting...");
                    process.kill(0);
                }
            }

        }
    }

    startInterval() {
        if (this.updateCheckInterval) {
            console.log("[Interval] Deleting Existing Github Interval");
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = undefined;
        }

        console.log("[Interval] Starting Github Interval");

        this.updateCheckInterval = setInterval(async () => {
            try {
                await this.fullUpdateRoutine();
            } catch(e) {
                //
            }
        }, this.Main.SettingsManager.getSettings().githubUpdateCheckInterval_ms);
    }
}
