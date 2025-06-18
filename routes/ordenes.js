const express = require('express')
const router = express.Router()
const pool = require('../db')

// ✅ POST /api/ordenes - Crear orden y registrar referido si aplica
router.post('/', async (req, res) => {
  const { usuario_id, carrito, ref } = req.body

  if (!usuario_id || !carrito || carrito.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos para crear la orden' })
  }

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
      await client.query(
        `INSERT INTO orden_productos (orden_id, producto_id, cantidad, precio)
         VALUES ($1, $2, $3, $4)`,
        [orden_id, item.id, item.cantidad, item.precio]
      )

      await client.query(
        `INSERT INTO orden_detalle (orden_id, producto_id, nombre, precio, cantidad)
         VALUES ($1, $2, $3, $4, $5)`,
        [orden_id, item.id, item.nombre, item.precio, item.cantidad]
      )
    }

    // ✅ Registrar ganancias de referidos si hay código de referido
    if (ref) {
      const afiliado = await client.query(
        'SELECT id FROM usuarios WHERE codigo_afiliado = $1 LIMIT 1',
        [ref]
      )

      if (afiliado.rows.length > 0) {
        const afiliado_id = afiliado.rows[0].id

        for (const item of carrito) {
          const ganancia = (item.precio * item.cantidad) * 0.02
          await client.query(
            `INSERT INTO referidos (afiliado_id, producto_id, monto, fecha)
             VALUES ($1, $2, $3, NOW())`,
            [afiliado_id, item.id, ganancia]
          )
        }
      }
    }

    await client.query('COMMIT')
    res.json({ success: true, orden_id })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Error al procesar la orden:', err)
    res.status(500).json({ error: 'Error al procesar la orden' })
  } finally {
    client.release()
  }
})

module.exports = router