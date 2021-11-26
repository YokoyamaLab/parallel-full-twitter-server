import { workerData, parentPort } from 'worker_threads'
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { DateTime } from 'luxon';
import async from "async";

let fileIndex = workerData.index;
let baseDir = workerData.baseDir
let skip = workerData.skip;
const rs = fs.createReadStream(fileIndex);
const rl = readline.createInterface({ input: rs, crlfDelay: Infinity });
for await (const line of rl) {
    const servers = line.split(" ");
    const path_lz4 = path.join(baseDir, "/", servers.shift());
    if (!skip.hasOwnProperty(path_lz4)) {
        const filename = path.basename(path_lz4, '.lz4');
        const dateparts = filename.split("-");
        const date = DateTime.local(parseInt(dateparts[0]), parseInt(dateparts[1]), parseInt(dateparts[2]), parseInt(dateparts[3]), parseInt(dateparts[4]));
        //console.log(date.toString(), filename);
        await parentPort.postMessage({
            date: date.toString(),
            path: path_lz4,
            file: filename,
            servers: servers
        });
    }
}
console.log("[DONE] file_map.mjs");
process.exit();