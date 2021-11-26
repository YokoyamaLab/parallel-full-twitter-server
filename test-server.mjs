import log from 'loglevel';
log.setLevel("trace");
//log.debug(msg)
//log.info(msg)
//log.warn(msg)
//log.error(msg)
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import async from "async";
import { Server } from "socket.io";
import { DateTime } from 'luxon';
import cliProgress from 'cli-progress';
import _colors from 'colors';
const barConnection = new cliProgress.SingleBar(
    {
        format: '#Connections |' + _colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Chunks || Speed: {speed}',
        barCompleteChar: '=',
        barIncompleteChar: '-',
        hideCursor: true
    }
);
import { Worker } from 'worker_threads';

let CUR_STATUS = "init";//or "running"

const HOST_NAME = process.env.HOSTNAME;
const BASE_DIR = process.env.PTWEET_BASE;
const PORT = process.env.PTWEET_PORT;
const SERVER = process.env.PTWEET_SERVER;
const INDEX = process.env.PTWEET_INDEX;
const io = new Server({});

// サーバリスト取得
log.info("サーバリスト取得");
let serverMap = {};
let serverList = {};
const rs = fs.createReadStream(INDEX);
const rl = readline.createInterface({ input: rs, crlfDelay: Infinity  });
for await (const line of rl) {
    const fields = line.split(" ");
    const path_lz4 = path.join(BASE_DIR, "/", fields.shift());
    const filename = path.basename(path_lz4, '.lz4');
    const dateparts = filename.split("-");
    const date = DateTime.utc(parseInt(dateparts[0]), parseInt(dateparts[1]), parseInt(dateparts[2]), parseInt(dateparts[3]), parseInt(dateparts[4]));
    if (!serverMap.hasOwnProperty(date.toString())) {
        serverMap[date.toString()] =
        {
            timestamp: date,
            files: []
        };
    }
    serverMap[date.toString()].files.push(
        {
            path: path_lz4,
            servers: fields
        });
    fields.forEach((server) => {
        if (!serverList.hasOwnProperty(server)) {
            console.log(server);
            serverList[server] = false;
        }
    });
}

//WebSocketサーバ立ち上げ
barConnection.start(Object.keys(serverList).length, 0);
let socketList = {};
io.on("connection", (socket) => {
    let checkServers = () => {
        let memo = {
            connect: 0,
            disconnect: 0
        };
        Object.keys(serverList).forEach((server) => {
            if (serverList[server]) {
                memo.connect++;
            } else {
                memo.disconnect++;
            }
        });
        return memo;
    }
    let origin = null;
    socket.on("disconnect", () => {
        serverList[origin] = false;
        barConnection.update(checkServers().connect);
    });
    socket.on("monitor", (msg) => {
        socket.emit("monitor-return", {
            server_status: CUR_STATUS
        });
    });
    socket.on("query", async (query) => {
        //期間切り出しとクエリ作成
        log.info("期間切り出し");
        query.from = DateTime.fromISO(query.from);
        query.to = DateTime.fromISO(query.to);
        let fileList = [];
        let hit = 0; let unhit = 0;
        console.log(query);
        await async.eachOf(serverMap, async (timeSlice, c) => {
            if (query.from <= timeSlice.timestamp && timeSlice.timestamp <= query.to) {
                hit += timeSlice.files.length;
                fileList.push(...timeSlice.files)
            } else {
                unhit += timeSlice.files.length;
            }
            return null;
        });
        log.info((unhit + hit) + "ファイル中、" + hit + "ファイルが対象");

        //サーバ振り分け
        log.info("サーバ振り分け");
        let serverAssign = {};
        async.each(fileList, async (file) => {
            if (!serverAssign.hasOwnProperty(file.servers[0])) {
                serverAssign[file.servers[0]] = {
                    "files": []
                };
            }
            if (!serverAssign.hasOwnProperty(file.servers[1])) {
                serverAssign[file.servers[1]] = {
                    "files": []
                };
            }
            if (serverAssign[file.servers[0]].files.length < serverAssign[file.servers[1]].length) {
                serverAssign[file.servers[0]].files.push(file.path);
            } else {
                serverAssign[file.servers[1]].files.push(file.path);
            }
        });
        log.info(Object.keys(serverList).length + "サーバ中、" + Object.keys(serverAssign).length + "サーバが対象");
    });
    socket.on("launch", (msg) => {
        origin = msg.origin;
        socketList[origin] = socket;
        if (serverList.hasOwnProperty(msg.origin)) {
            if (serverList[msg.origin]) {
                console.log("重複接続", msg.orign);
            } else {
                serverList[msg.origin] = socket;
                barConnection.update(checkServers().connect);
                msg.response = "OK!";
                socket.emit("launch-return", msg);
                if (checkServers().connect == Object.keys(serverList).length) {
                    barConnection.stop();
                    log.info("全接続完了");
                    CUR_STATUS = "running";
                }
            }
        } else {
            msg.response = "NG";
            socket.emit("launch-return", msg);
            socket.disconnect();
        }
    });
});
io.listen(PORT);

