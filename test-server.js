const { Server } = require("socket.io");
const PORT = 3000;
const io = new Server({});

io.on("connection", (socket) => {
    socket.on("launch", (msg) => {
        console.log(msg);
        msg.response = "OK!"
        io.emit("launch-ok", msg);
    });
});

io.listen(PORT);