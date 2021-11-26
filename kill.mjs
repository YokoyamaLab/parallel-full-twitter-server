import { Server } from "socket.io";

const PORT = process.env.PTWEET_PORT;

const io = new Server({});
io.on("connection", (socket) => {
    socket.on("launch", (msg) => {
        console.log("[KILL] ", msg.origin);
        socket.emit("kill", {});
    });
});
io.listen(PORT);