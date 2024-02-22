const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
const OrderingApp = require("./OrderingApp");
const orderingApp = new OrderingApp();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
require("dotenv").config();

const PORT = process.env.PORT;

io.on("connection", (socket) => {
  console.log("A user connected");
  orderingApp.joinSession(socket);

  socket.on("requestOrder", (order) => {
    console.log("REquesting Order", order);
    orderingApp.requestOrder(order);
  });

  socket.on("rejectOrder", (order) => {
    orderingApp.rejectOrder(order);
  });
  socket.on("acceptOrder", (order) => {
    orderingApp.acceptOrder(order);
  });
});

app.get("/", (req, res) => {
  console.log("Ordering app");
});

app.get("/sender", (req, res) => {
  res.sendFile(__dirname + "/sender.html");
});

app.get("/driver", (req, res) => {
  res.sendFile(__dirname + "/driver.html");
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
