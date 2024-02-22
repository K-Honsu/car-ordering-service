class Sender {
    constructor(name) {
        this.name = name
        this.id = Math.floor(Math.random() * 1000000).toString()
    }

    requestOrder(order) {
        console.log(`${this.name} has requested an order with ${order.id}`)
    }
}

module.exports = Sender