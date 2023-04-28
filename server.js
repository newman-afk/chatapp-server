const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { createServer } = require("http");
const { Server } = require("socket.io");

let rooms = [];

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "https://rust-noclue.netlify.app",
  },
});

io.on("connection", (socket) => {
  socket.emit("receive_message", {
    id: uuidv4(),
    room: "open",
    avatar: null,
    sender: "bot",
    message: "Welcome back!",
  });

  socket.on("create_room", (payload, callback) => {
    // 检查房间名是否重复
    let duplicateRoom = false;
    rooms.forEach((item) => {
      if (item.room === payload.room) {
        duplicateRoom = true;
      }
    });

    // 返回房间名重复提示信息
    if (duplicateRoom) {
      callback({ ok: false, message: "房间名重复" });
      return;
    }

    // 返回OK提示并执行添加房间与返回添加成功信息
    callback({ ok: true });
    rooms.push({ room: payload.room, password: payload.password, mumbers: 1 });
    socket.join(payload.room);
    io.to(payload.room).emit("receive_message", {
      id: uuidv4(),
      room: payload.room,
      avatar: null,
      sender: "bot",
      message: `Room ${payload.room} created successfully`,
    });
  });

  socket.on("join_room", (payload, callback) => {
    // 检查房间名与密码
    let roomExist = false;
    let passwordCorrect = false;
    rooms.forEach((item) => {
      if (item.room === payload.room) {
        roomExist = true;
        if (item.password === payload.password) {
          passwordCorrect = true;
        }
      }
    });

    // 房间名不存在
    if (!roomExist) {
      callback({ ok: false, message: "房间名不存在" });
      return;
    }

    // 密码错误
    if (!passwordCorrect) {
      callback({ ok: false, message: "密码错误" });
      return;
    }

    // 房间名与密码均匹配执行加入房间操作并返回提示信息
    if (roomExist && passwordCorrect) {
      callback({ ok: true });
      socket.join(payload.room);
      rooms.forEach((item) => {
        if (item.room === payload.room) {
          item.mumbers++;
        }
      });
      socket.to(payload.room).emit("receive_message", {
        id: uuidv4(),
        room: payload.room,
        avatar: null,
        sender: "bot",
        message: `${
          payload.sender === "default" ? "Someone" : payload.sender
        } joined this room`,
      });
    }
  });

  socket.on("send_message", (payload) => {
    if (payload.room === "open") {
      socket.broadcast.emit("receive_message", payload);
    } else {
      socket.to(payload.room).emit("receive_message", payload);
    }
  });

  socket.on("disconnecting", () => {
    const joinedRooms = socket.rooms;
    if (joinedRooms.size !== 1) {
      const joinedRoomsArray = Array.from(joinedRooms);

      joinedRoomsArray.shift();

      for (const room of joinedRoomsArray) {
        rooms.forEach((item) => {
          if (item.room === room) {
            item.mumbers--;
            if (item.mumbers === 0) {
              rooms = rooms.filter((item) => item.room !== room);
            }
          }
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => console.log(`listening on port ${PORT}...`));
