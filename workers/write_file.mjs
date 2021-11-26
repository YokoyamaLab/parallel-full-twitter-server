import * as fs from 'fs';
import url from "url";

export default async ({ port, targetFile, archiveFile, jsonl, queryId, fileN, nTweets, nHits, doneFlagSAB, hitFlagSAB, startTime }) => {
    try {
        const doneFlagView = new Uint32Array(doneFlagSAB);
        const hitFlagView = new Uint32Array(hitFlagSAB);
        const fh = await fs.promises.open(archiveFile, 'w');
        for await (const line of jsonl) {
            const lineString = JSON.stringify(line) + "\n";
            await fh.write(lineString);
        }
        await fh.close();
        fs.promises.rename(archiveFile, archiveFile + ".tweets");
        Atomics.store(doneFlagView, fileN, nTweets);
        Atomics.store(hitFlagView, fileN, nHits);
        port.postMessage({
            type: "finish",
            targetFile: targetFile,
            archiveFile: archiveFile,
            queryId: queryId,
            fileN: fileN,
            doneFlagSAB: doneFlagSAB,
            hitFlagSAB:hitFlagSAB,
            startTime: startTime
        });
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
