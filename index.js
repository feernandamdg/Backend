const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express() // 👈 Primero creamos la instancia de Express

const PORT = process.env.PORT || 3001

// Middlewares
app.use(cors())
app.use(express.json())

// Rutas
const userRoutes = require('./routes/users')
app.use('/api/users', userRoutes)
const ordenRoutes = require('./routes/ordenes')
app.use('/api/ordenes', ordenRoutes)
const adminRoutes = require('./routes/admin')
app.use('/api/admin', adminRoutes)
const productosRoutes = require('./routes/productos')
app.use('/api/productos', productosRoutes)


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`)
})