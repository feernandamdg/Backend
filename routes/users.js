const express = require('express')
const router = express.Router()
const pool = require('../db')
const bcrypt = require('bcryptjs')

// REGISTRO DE USUARIO
router.post('/register', async (req, res) => {
  const { nombre, apellido, fecha_nacimiento, email, password } = req.body

  try {
    const existe = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email])
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' })
    }

    const hash = await bcrypt.hash(password, 10)

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, fecha_nacimiento, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, email, rol`,
      [nombre, apellido, fecha_nacimiento, email, hash, 'cliente']
    )

    res.status(201).json({ success: true, user: result.rows[0] })
  } catch (error) {
    console.error('Error al registrar usuario:', error)
    res.status(500).json({ error: 'Error del servidor al registrar' })
  }
})

// INICIO DE SESIÓN
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    console.error('❌ Email o contraseña no enviados')
    return res.status(400).json({ error: 'Faltan datos' })
  }

  try {
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email])

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Correo no registrado' })
    }

    const usuario = result.rows[0]
    console.log('👤 Usuario de la BD:', usuario)

    const passwordOk = await bcrypt.compare(password, usuario.password_hash)

    if (!passwordOk) {
      return res.status(401).json({ error: 'Contraseña incorrecta' })
    }

    res.json({
      success: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol  // ✅ se incluye el rol
      }
    })
  } catch (err) {
    console.error('Error en login:', err)
    res.status(500).json({ error: 'Error del servidor' })
  }
})

module.exports = router