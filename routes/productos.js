const express = require('express')
const router = express.Router()
const pool = require('../db')

// Ruta principal con filtros múltiples
router.get('/', async (req, res) => {
  try {
    let { tipo_cerveza, origen } = req.query

    // Asegurarse de que tipo_cerveza y origen sean arrays
    tipo_cerveza = Array.isArray(tipo_cerveza) ? tipo_cerveza : tipo_cerveza ? [tipo_cerveza] : []
    origen = Array.isArray(origen) ? origen : origen ? [origen] : []

    let query = 'SELECT * FROM productos WHERE 1=1'
    const params = []

    if (tipo_cerveza.length) {
      const placeholders = tipo_cerveza.map((_, i) => `$${params.length + i + 1}`).join(',')
      query += ` AND tipo_cerveza IN (${placeholders})`
      params.push(...tipo_cerveza)
    }

    if (origen.length) {
      const placeholders = origen.map((_, i) => `$${params.length + i + 1}`).join(',')
      query += ` AND origen IN (${placeholders})`
      params.push(...origen)
    }

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('Error al obtener productos filtrados:', error)
    res.status(500).json({ error: 'Error al obtener productos' })
  }
})

// 🔍 NUEVA RUTA: Búsqueda por nombre, tipo, origen o país
router.get('/buscar', async (req, res) => {
  const { q } = req.query

  if (!q) {
    return res.status(400).json({ error: 'Falta parámetro de búsqueda' })
  }

  try {
    const result = await pool.query(
      `SELECT * FROM productos 
       WHERE LOWER(nombre) LIKE $1 
          OR LOWER(tipo_cerveza) LIKE $1 
          OR LOWER(origen) LIKE $1 
          OR LOWER(pais) LIKE $1`,
      [`%${q.toLowerCase()}%`]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('Error al buscar productos:', err)
    res.status(500).json({ error: 'Error al buscar productos' })
  }
})

// Obtener producto por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query('SELECT * FROM productos WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error al obtener producto por ID:', error)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

module.exports = router