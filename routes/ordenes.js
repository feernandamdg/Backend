// 📄 routes/ordenes.js
const express = require('express')
const router = express.Router()
const pool = require('../db')

// POST /api/ordenes - Crear una nueva orden
router.post('/', async (req, res) => {
  const { usuario_id, carrito } = req.body

  if (!usuario_id || !carrito || carrito.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos para crear la orden' })
  }

  try {
    const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const ordenResult = await client.query(
        'INSERT INTO ordenes (usuario_id, total) VALUES ($1, $2) RETURNING id',
        [usuario_id, total]
      )

      const orden_id = ordenResult.rows[0].id

      for (const item of carrito) {
        // Insertar en ambas tablas: orden_productos y orden_detalle
        await client.query(
          `INSERT INTO orden_productos (orden_id, producto_id, cantidad, precio)
           VALUES ($1, $2, $3, $4)`,
          [orden_id, item.id, item.cantidad, item.precio]
        )

        await client.query(
          `INSERT INTO orden_detalle (orden_id, producto_id, nombre, precio, cantidad)
           VALUES ($1, $2, $3, $4, $5)` ,
          [orden_id, item.id, item.nombre, item.precio, item.cantidad]
        )
      }

      await client.query('COMMIT')
      res.json({ success: true, orden_id })
    } catch (error) {
      await client.query('ROLLBACK')
      console.error('Error en transacción:', error)
      res.status(500).json({ error: 'Error al procesar la orden' })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Error en /api/ordenes:', err)
    res.status(500).json({ error: 'Error en el servidor' })
  }
})

module.exports = router