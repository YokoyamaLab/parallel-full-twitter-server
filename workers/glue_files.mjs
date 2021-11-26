import fs from 'fs-extra';
import readline from 'readline/promises';
import path from 'path';

export default async ({ port, targetDay, resultDirectory }) => {
    try {
        const inputFiles = (await fs.promises.readdir(path.join(resultDirectory, targetDay), { withFileTypes: true })).filter(
            (dirent) => {
                return dirent.isFile() && dirent.name.match(/\.tweets$/);
            }
        )
        let counter = 0;
        const limit = 1000000;
        let daylyTweetFileHandler = null;
        for await (let inputFile of inputFiles) {
            const rs = fs.createReadStream(path.join(resultDirectory, targetDay, inputFile.name));
            const rl = readline.createInterface({ input: rs });
            for await (const line of rl) {
                if (counter++ % limit == 0) {
                    if (daylyTweetFileHandler != null) {
                        daylyTweetFileHandler.close();
                    }
                    daylyTweetFileHandler = await fs.promises.open(path.resolve(resultDirectory + "/" + targetDay + "." + (Math.floor(counter / limit)) + ".tweets"), "w+");
                }
                await daylyTweetFileHandler.write(line + "\n");
            }
        }
        await fs.remove(path.join(resultDirectory, targetDay));
    } catch (e) {
        port.postMessage({
            type: "exception",
            at: url.fileURLToPath(import.meta.url),
            code: e.code,
            message: e.message,
            stack: e.stack
        });
    }
}
