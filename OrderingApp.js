const Driver = require("./schema/Driver");
const Order = require("./schema/Order");
const Sender = require("./schema/Sender");

class OrderingApp {
  constructor() {
    this.driver = [];
    this.orders = [];
    this.senders = [];
    this.socketUserMap = new Map();
  }

  assignSocket({ socket, user }) {
    console.log(`Assigning socket to ${user.name}`);
    this.socketUserMap.set(user.id, socket);
  }

  sendEvent({ socket, data, eventname }) {
    socket.emit(eventname, data);
  }

  joinSession(socket) {
    const { type, name, id, user_type } = socket.handshake.query;
    if (user_type === "driver") {
      const driver = this.driver.find((driver) => driver.id === id);
      if (driver) {
        this.assignSocket({ socket, user: driver });
        return;
      }
      this.createUser({ name, socket, user_type });
    } else if (user_type === "sender") {
      const sender = this.senders.find((sender) => sender.id === id);
      if (sender) {
        this.assignSocket({ socket, user: sender });
        return;
      }
      this.createUser({ name, socket, user_type });
    }
  }

  createUser({ name, socket, user_type }) {
    switch (user_type) {
      case "driver":
        const driver = new Driver(name);
        this.driver.push(driver);
        this.assignSocket({ socket, user: driver, user_type });
        this.sendEvent({
          socket,
          data: { driver },
          eventname: "driverCreated",
        });
        console.log("Driver created");
        return driver;
      case "sender":
        const sender = new Sender(name);
        this.senders.push(sender);
        this.assignSocket({ socket, user: sender, user_type });
        this.sendEvent({
          socket,
          data: { sender },
          eventname: "senderCreated",
        });
        console.log("sender created", this.senders);
        return sender;
      default:
        throw new Error("Invalid user_type");
    }
  }

  requestOrder({ current_location, destination, price, id }) {
    console.log("Requesting Order");
    const sender = this.senders.find((sender) => sender.id === id);
    const order = new Order({ current_location, destination, price, sender });
    const expirationTimer = setTimeout(() => {
      if (order.status === "pending") {
        order.status = "expired";
        const senderSocket = this.socketUserMap.get(sender.id);
        console.log("Notifying the sender about the expired order");
        senderSocket.emit("orderExpired", { order });
        const orderId = order.id
        console.log({orderId})
        const index = this.orders.find((o) => o.id === orderId);
        console.log({ index: index });
        if (index !== -1) {
          this.orders.splice(index, 1);
          console.log("Expired order removed from the queue");
        }
      }
    }, 60000);
    const updatedOrder = { ...order, expirationTimer };
    this.orders.push(updatedOrder);
    // notify drivers
    if (order.status !== "expired") {
      for (const driver of this.driver) {
        if (driver.in_ride) continue;
        this.sendEvent({
          socket: this.socketUserMap.get(driver.id),
          data: { order },
          eventname: "orderRequested",
        });
      }
    }
    console.log("orderRequested", order);
    return updatedOrder;
  }

  acceptOrder(order) {
    const { id, driver_id } = order;
    // get all info about order
    const driver = this.driver.find((driver) => driver.id === driver_id);
    const _order = this.orders.find((ord) => ord.id === id);
    console.log({ _order: _order });
    const sender = this.senders.find(
      (sender) => sender.id === _order.sender.id
    );
    _order.in_ride = true;
    _order.status = "accepted";
    clearTimeout(_order.expirationTimer);

    console.log("Accepting order", { _order, driver, sender });

    _order.assignDriver(driver);

    const userSocket = this.socketUserMap.get(sender.id);
    userSocket.emit("orderAccepted", { order: _order });

    const driverSocket = this.socketUserMap.get(driver.id);
    driverSocket.emit("orderAccepted", { order: _order });
  }

  rejectOrder(order) {
    const { id, driver_id } = order;
    const driver = this.driver.find((driver) => driver.id === driver_id);
    const _order = this.orders.find((order) => order.id === id);
    const sender = this.senders.find(
      (sender) => sender.id === _order.sender.id
    );

    _order.status = "rejected";
    clearTimeout(_order.timer);

    console.log("Rejecting order", { _order, driver, sender });

    const driverSocket = this.socketUserMap.get(driver.id);
    driverSocket.emit("orderRejected", { order: _order });
  }
}

module.exports = OrderingApp;
