// 📄 routes/admin.js
const express = require('express')
const router = express.Router()
const pool = require('../db')

// Middleware para verificar admin
function verificarAdmin(req, res, next) {
  const { rol } = req.headers
  if (rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: solo para administradores' })
  }
  next()
}

// ✅ Obtener órdenes desde orden_detalle
router.get('/ordenes', verificarAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.id, o.fecha, u.nombre AS cliente, o.total,
        json_agg(json_build_object(
          'producto', od.nombre,
          'cantidad', od.cantidad,
          'precio', od.precio
        )) AS productos
      FROM ordenes o
      JOIN usuarios u ON o.usuario_id = u.id
      JOIN orden_detalle od ON od.orden_id = o.id
      GROUP BY o.id, u.nombre
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

module.exports = router