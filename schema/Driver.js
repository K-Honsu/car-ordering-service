class Driver {
    constructor (name) {
        this.id = Math.floor(Math.random() * 1000000).toString()
        this.name = name
        this.in_ride = false
    }

    acceptOrder(order) {
        console.log(`${this.name} has accepted order ${this.id}`)
        order.assigDriver(this)
    }

    rejectOrder(order) {
        console.log(`${this.name} has rejected order ${this.id}`)
        order.assigDriver(this)
    }
}


module.exports = Driver