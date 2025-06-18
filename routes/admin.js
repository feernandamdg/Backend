// 📄 routes/admin.js
const express = require('express')
const router = express.Router()
const pool = require('../db')

// ✅ Middleware para verificar admin
function verificarAdmin(req, res, next) {
  const { rol } = req.headers
  if (rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: solo para administradores' })
  }
  next()
}

// ✅ Obtener órdenes pendientes
router.get('/ordenes', verificarAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.fecha, o.total,
             u.nombre || ' ' || u.apellido AS cliente,
             json_agg(json_build_object(
               'producto', od.nombre,
               'cantidad', od.cantidad,
               'precio', od.precio
             )) AS productos
      FROM ordenes o
      JOIN usuarios u ON o.usuario_id = u.id
      JOIN orden_detalle od ON od.orden_id = o.id
      GROUP BY o.id, u.nombre, u.apellido, o.fecha, o.total
      ORDER BY o.fecha DESC
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Error al obtener pedidos:', error)
    res.status(500).json({ error: 'Error al obtener pedidos' })
  }
})

// ✅ Agregar nuevo producto
router.post('/productos', verificarAdmin, async (req, res) => {
  const { nombre, descripcion, precio, imagen, tipo_cerveza, origen, pais } = req.body

  if (!nombre || !precio || !tipo_cerveza || !origen || !pais) {
    return res.status(400).json({ error: 'Faltan datos requeridos' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio, imagen, tipo_cerveza, origen, pais)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [nombre, descripcion, precio, imagen, tipo_cerveza, origen, pais]
    )
    res.status(201).json({ id: result.rows[0].id })
  } catch (error) {
    console.error('Error al agregar producto:', error)
    res.status(500).json({ error: 'Error al guardar el producto' })
  }
})

// ✅ Mover pedido a entregados
router.post('/ordenes/entregar/:id', verificarAdmin, async (req, res) => {
  const ordenId = parseInt(req.params.id)

  try {
    const result = await pool.query(`
      SELECT o.id, o.usuario_id, o.fecha, o.total,
             u.nombre || ' ' || u.apellido AS cliente,
             json_agg(json_build_object('producto', od.nombre, 'cantidad', od.cantidad, 'precio', od.precio)) AS productos
      FROM ordenes o
      JOIN usuarios u ON o.usuario_id = u.id
      JOIN orden_detalle od ON od.orden_id = o.id
      WHERE o.id = $1
      GROUP BY o.id, u.nombre, u.apellido, o.fecha, o.total
    `, [ordenId])

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' })
    }

    const orden = result.rows[0]

    await pool.query(`
      INSERT INTO pedidos_entregados (orden_id, usuario_id, cliente, fecha, total, productos)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      orden.id,
      orden.usuario_id,
      orden.cliente,
      orden.fecha,
      orden.total,
      JSON.stringify(orden.productos)
    ])

    await pool.query('DELETE FROM orden_detalle WHERE orden_id = $1', [ordenId])
    await pool.query('DELETE FROM ordenes WHERE id = $1', [ordenId])

    res.json({ success: true })
  } catch (err) {
    console.error('Error al entregar pedido:', err)
    res.status(500).json({ error: 'Error al entregar pedido' })
  }
})

// ✅ Obtener pedidos entregados
router.get('/ordenes/entregadas', verificarAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pedidos_entregados ORDER BY fecha DESC')
    res.json(result.rows)
  } catch (err) {
    console.error('Error al obtener entregados:', err)
    res.status(500).json({ error: 'Error al obtener entregados' })
  }
})

// ✅ Eliminar pedido entregado
router.delete('/ordenes/entregadas/:id', verificarAdmin, async (req, res) => {
  const id = parseInt(req.params.id)
  try {
    await pool.query('DELETE FROM pedidos_entregados WHERE id = $1', [id])
    res.json({ success: true })
  } catch (err) {
    console.error('Error al eliminar entrega:', err)
    res.status(500).json({ error: 'Error al eliminar entrega' })
  }
})

module.exports = router