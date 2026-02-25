const mongoose = require('mongoose')

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        })

        global.mongoAvailable = true
        console.log('✅ MongoDB Connected')

    } catch (mongoErr) {
        global.mongoAvailable = false
        console.error('❌ MongoDB Failed:', mongoErr.message)
    }
}

module.exports = { connectDB }
