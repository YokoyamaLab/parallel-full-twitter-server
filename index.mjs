import fs from 'fs';
import path from 'path';
import { Server } from "socket.io";
import { Worker } from 'worker_threads';
import { DateTime } from 'luxon';
import { exec } from 'child_process';
import { Piscina } from 'piscina';
import readline from 'readline';
import cliProgress from 'cli-progress';
import _colors from 'colors';
import tar from 'tar';

let CUR_STATUS = "init";//or "running"

const HOST_NAME = process.env.HOSTNAME;
const BASE_DIR = process.env.PTWEET_BASE;
const RESULT_DIR = process.env.PTWEET_RESULT;
const ARCHIVE_DIR = process.env.PTWEET_ARCHIVE;
const PORT = process.env.PTWEET_PORT;
const SERVER = process.env.PTWEET_SERVER;
const INDEX = process.env.PTWEET_INDEX;


const piscina = new Piscina({
    filename: new URL('./workers/write_file.mjs', import.meta.url).href,
    //maxThreads: 16
});
const pisGlue = new Piscina({
    filename: new URL('./workers/glue_files.mjs', import.meta.url).href,
    //maxThreads: 10
});
const io = new Server({});

const barConnection = new cliProgress.SingleBar(
    {
        format: '#Connections |' + _colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Chunks || Speed: {speed}',
        barCompleteChar: '=',
        barIncompleteChar: '-',
        hideCursor: true
    }
);

let MAP_ServerToFile = {};
let MAP_DateToFiles = {};
let MAP_FileToServers = {};
let doneFlagSABs = {};
let hitFlagSABs = {};
const renewFileMap = async () => {
    return new Promise((resolve, reject) => {
        const worker = new Worker("./workers/file_map.mjs", {
            "workerData": {
                'index': INDEX,
                'baseDir': BASE_DIR,
                'skip': MAP_FileToServers
            }
        });
        worker.on('message', async (msg) => {
            msg.servers.forEach((server) => {
                if (!MAP_ServerToFile.hasOwnProperty(server)) {
                    MAP_ServerToFile[server] = []
                }
                MAP_ServerToFile[server].push(msg.path);
            });
            if (!MAP_DateToFiles.hasOwnProperty(msg.date)) {
                MAP_DateToFiles[msg.date] = [];
            }
            MAP_DateToFiles[msg.date].push(msg.path);
            MAP_FileToServers[msg.path] = msg.servers;
        });
        worker.on('exit', async () => {
            resolve();
        });
    });
};

await renewFileMap();

let listSockets = {
    "clients": {},
    "monitors": []
};
const isReady = (connectedClients) => {
    let listedClients = Object.keys(MAP_ServerToFile);
    if (connectedClients.length != listedClients.length) {
        return false;
    }
    connectedClients.sort();
    listedClients.sort();
    for (let i = 1; i < connectedClients.length; i++) {
        if (connectedClients[i] != listedClients[i]) {
            return false;
        }
    }
    return true;
}

for (let client of Object.keys(MAP_ServerToFile)) {
    exec('ssh ' + client + ' "cd ./parallel-full-twitter-client;node index.mjs > out_' + client + '.txt 2>&1"', () => { });
}
barConnection.start(Object.keys(MAP_ServerToFile).length, 0);
io.on("connection", (socket) => {
    let origin = null;
    let monitor = null;
    socket.on("disconnect", () => {
        if (origin != null) {
            console.log("Client disconnected:", origin);
            listSockets.clients[origin] = null;
            delete listSockets.clients[origin];
            barConnection.update(Object.keys(listSockets.clients).length);
            CUR_STATUS = "init";
        } else if (monitor != null) {
            console.log("Monitor disconnected:", monitor);
            listSockets.monitors[monitor] = null;
            delete listSockets.monitors[monitor];
        }
    });
    socket.on("launch", (msg) => {
        origin = msg.origin;
        console.log("client接続",origin);
        if (listSockets.clients.hasOwnProperty(origin)) {
            throw origin + ":Already Connected:";
        } else {
            listSockets.clients[origin] = socket;
            barConnection.update(Object.keys(listSockets.clients).length);
            if (isReady(Object.keys(listSockets.clients))) {
                barConnection.stop();
                console.log("全接続完了");
                CUR_STATUS = "running";
            }
        }
    });
    socket.on("joblist", async (msg) => {
        const list_suspended = {};
        const list_done = (await fs.promises.readdir(ARCHIVE_DIR, { withFileTypes: true })).filter(
            (dirent) => {
                return dirent.isFile()
                    && dirent.name.match(new RegExp("^" + msg.monitorId));
            }
        ).map(
            (dirent) => {
                return {
                    name: dirent.name,
                    time: fs.statSync(path.join(ARCHIVE_DIR, dirent.name)).mtime.getTime()
                }
            }
        ).sort(
            (a, b) => {
                return a.time - b.time;
            }
        ).reduce(
            (memo, v) => {
                memo[(v.name.split('.'))[0]] = path.join(ARCHIVE_DIR, v.name);
                return memo;
            }, {}
        )
        const list_ongoing = (await fs.promises.readdir(path.join(RESULT_DIR), { withFileTypes: true })).filter(
            (dirent) => {
                try {
                    if (!doneFlagSABs.hasOwnProperty(dirent.name)) {
                        if (!list_done.hasOwnProperty(dirent.name)) {
                            list_suspended[dirent.name] = path.join(RESULT_DIR, dirent.name);
                        }
                        return false;
                    } else {
                        return dirent.isDirectory()
                            && dirent.name.match(new RegExp("^" + msg.monitorId))
                            && !list_done.hasOwnProperty(dirent.name);
                    }
                } catch (e) {
                    return false;
                }
            }
        ).map(
            (dirent) => {
                return {
                    name: dirent.name,
                    time: fs.statSync(path.join(RESULT_DIR, dirent.name)).mtime.getTime()
                }
            }
        ).sort(
            (a, b) => {
                return a.time - b.time;
            }
        ).reduce(
            (memo, v) => {
                if (doneFlagSABs.hasOwnProperty(v.name)) {
                    const doneFlagView = new Uint32Array(doneFlagSABs[v.name]);
                    const hitFlagView = new Uint32Array(hitFlagSABs[v.name]);
                    memo[v.name] = {
                        all: doneFlagView.length,
                        done: doneFlagView.reduce((memo, v) => {
                            return memo + (v > 0 ? 1 : 0);
                        }, 0),
                        hit: hitFlagView.reduce((memo, v) => {
                            return memo + v;
                        }, 0),
                        scaned: doneFlagView.reduce((memo, v) => {
                            return memo + v;
                        }, 0)
                    };
                } else {
                    memo[v.name] = { all: 1, done: 1 };
                }
                return memo;
            }, {}
        );
        socket.emit("joblist-return", {
            ongoing: list_ongoing,
            suspended: list_suspended,
            done: list_done
        });
    });
    socket.on("monitor", (msg) => {
        if (!listSockets.monitors.hasOwnProperty(msg.monitorId) || listSockets.monitors[msg.monitorId] == null) {
            monitor = msg.monitorId;
            listSockets.monitors[msg.monitorId] = socket;
            socket.emit("monitor-return", {
                server_status: CUR_STATUS
            });
        } else {
            socket.emit("critical-error", {
                message: "One connection par a user, s'il vous plaît."
            });
        }
    });
    socket.on("message", (msg) => {
        console.log("[MSG]", msg);
    });
    socket.on("query-finish", (msg) => {
        const filename = path.basename(msg.file, '.lz4');
        const dirname = path.dirname(msg.file).split(path.sep).pop();
        const channel = new MessageChannel();
        channel.port2.on('message', async (rtn) => {
            if (rtn.type == "finish") {
                const doneFlagView = new Uint32Array(rtn.doneFlagSAB);
                const hitFlagView = new Uint32Array(rtn.hitFlagSAB)
                let done = 0;
                let notyet = [];
                for (let i = 0; i < doneFlagView.length; i++) {
                    const f = Atomics.load(doneFlagView, i)
                    done += f > 0 ? 1 : 0;
                    if (f == 0) {
                        notyet.push(i);
                    }
                }
                console.log(done, notyet);
                if (done == doneFlagView.length) {
                    const finishTime = DateTime.now();
                    const startTime = DateTime.fromISO(rtn.startTime);
                    const execTime = finishTime.diff(startTime, 'seconds');
                    const nAllHits = hitFlagView.reduce((memo, n) => { return memo + n; }, 0);
                    const nAllTweets = doneFlagView.reduce((memo, n) => { return memo + n }, 0);
                    console.log("[[ Query FINISH! ]]", execTime.seconds, "seconds");
                    console.log(nAllHits, "of", nAllTweets);
                    const dirs = (await fs.promises.readdir(path.join(RESULT_DIR, rtn.queryId), { withFileTypes: true })).filter(
                        (dirent) => {
                            return dirent.isDirectory();
                        }
                    )
                    await Promise.all(dirs.map(
                        async (dir) => {
                            const channel = new MessageChannel();
                            channel.port2.on('message', async (rtn) => {
                                if (rtn.type == "exception") {
                                    noteException(rtn, msg.queryId);
                                }
                            });
                            return pisGlue.runTask({
                                targetDay: dir.name,
                                resultDirectory: path.join(RESULT_DIR, rtn.queryId),
                            });
                        }
                    ));
                    console.log("[[ Glue FINISH! ]]");
                    const origin = path.join(RESULT_DIR, rtn.queryId);
                    console.log(ARCHIVE_DIR + rtn.queryId + ".tgz");
                    const destination = path.join(ARCHIVE_DIR, rtn.queryId + ".tgz");
                    await tar.c(
                        {
                            gzip: true,
                            file: destination
                        },
                        [origin]
                    );
                    console.log("[[ GZip FINISH! ]]", destination);
                    doneFlagSABs[rtn.queryId] = null;
                    delete doneFlagSABs[rtn.queryId];
                    hitFlagSABs[rtn.queryId] = null;
                    delete hitFlagSABs[rtn.queryId]

                }
            } else if (rtn.type == "exception") {
                noteException(rtn, msg.queryId);
            }
        });
        console.log(msg.nHits, " / ", msg.nTweets);
        piscina.runTask({
            port: channel.port1,
            targetFile: msg.file,
            archiveFile: path.join(RESULT_DIR, msg.queryId, dirname, filename),
            jsonl: msg.result,
            queryId: msg.queryId,
            fileN: msg.fileN,
            nTweets: msg.nTweets,
            nHits: msg.nHits,
            doneFlagSAB: doneFlagSABs[msg.queryId],
            hitFlagSAB: hitFlagSABs[msg.queryId],
            startTime: msg.startTime
        }, [channel.port1]);
    });
    socket.on("query", async (query) => {
        query.from = DateTime.fromISO(query.from);
        query.to = DateTime.fromISO(query.to);
        const startTime = DateTime.now();
        //console.log(query);
        let targetFiles = [];
        for (let [filedate, files] of Object.entries(MAP_DateToFiles)) {
            filedate = DateTime.fromISO(filedate);
            if (query.from <= filedate.minus({ minutes: 15 }) && filedate.plus({ minutes: 15 }) <= query.to) {
                targetFiles.push(...files);
            }
        }
        console.log(targetFiles.length, "/", Object.keys(MAP_FileToServers).length);
        let NJobsClient = {};
        targetFiles = (([...array]) => {//シャッフル
            for (let i = array.length - 1; i >= 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        })(targetFiles);
        await fs.promises.mkdir(path.join(RESULT_DIR, query.queryId));
        const queryHandle = await fs.promises.open(path.join(RESULT_DIR, query.queryId, "_query"), "w+");
        await queryHandle.write(JSON.stringify(query, null, "\t"));
        await queryHandle.close();
        for (let i = 0; i < targetFiles.length; i++) {
            if (!NJobsClient.hasOwnProperty(MAP_FileToServers[targetFiles[i]][0])) {
                NJobsClient[MAP_FileToServers[targetFiles[i]][0]] = 0;
            }
            if (!NJobsClient.hasOwnProperty(MAP_FileToServers[targetFiles[i]][1])) {
                NJobsClient[MAP_FileToServers[targetFiles[i]][1]] = 0;
            }
            let c = null;
            if (NJobsClient[MAP_FileToServers[targetFiles[i]][0]] < NJobsClient[MAP_FileToServers[targetFiles[i]][1]]) {
                NJobsClient[MAP_FileToServers[targetFiles[i]][0]]++;
                c = MAP_FileToServers[targetFiles[i]][0];
            } else {
                NJobsClient[MAP_FileToServers[targetFiles[i]][1]]++;
                c = MAP_FileToServers[targetFiles[i]][1];
            }
            //console.log(targetFiles[i], c);
            targetFiles[i] = {
                file: targetFiles[i],
                query: query,
                client: c,
                fileN: i,
                startTime: startTime
            };
            const filename = path.basename(targetFiles[i].file, '.lz4');
            const dirname = path.dirname(targetFiles[i].file).split(path.sep).pop();
            //console.log(dirname, filename);
            try {
                await fs.promises.mkdir(path.join(RESULT_DIR, query.queryId, dirname));
            } catch (e) { }
            const resumeHandle = await fs.promises.open(path.join(RESULT_DIR, query.queryId, dirname, filename), "w+");
            resumeHandle.close();
        }
        doneFlagSABs[query.queryId] = new SharedArrayBuffer(Object.keys(targetFiles).length * 4);
        hitFlagSABs[query.queryId] = new SharedArrayBuffer(Object.keys(targetFiles).length * 4);
        for (let queryTask of targetFiles) {
            console.log("[QUERY]", queryTask.client, queryTask.file);
            listSockets.clients[queryTask.client].emit("query", queryTask);
        }
    });
});

io.listen(PORT);
process.on('SIGINT', function () {
    console.log("Caught interrupt signal");
    for (let [client, socket] of Object.entries(listSockets.clients)) {
        console.log("[KILL]", client);
        socket.emit("kill", {});
    }
    process.exit();
});

const noteException = (e, queryId) => {
    const fd = fs.openSync(path.join(RESULT_DIR, queryId, "_error"), "a+");
    fs.writeSync(fd, "AT: " + e.at + "\n");
    fs.writeSync(fd, "CODE: " + e.code + "\n");
    fs.writeSync(fd, "MESSAGE: " + e.message + "\n");
    fs.writeSync(fd, e.stack + "\n\n");
    fs.closeSync(fd);
}