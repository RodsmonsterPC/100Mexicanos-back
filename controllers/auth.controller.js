const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        avatarColor: newUser.avatarColor,
        victorias: newUser.victorias
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al registrar usuario', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        avatarColor: user.avatarColor,
        victorias: user.victorias
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el perfil', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { avatarColor, username } = req.body;
    
    if (username) {
        const existingUser = await User.findOne({ username, _id: { $ne: req.userId }});
        if (existingUser) return res.status(400).json({ message: 'Ese nombre de usuario ya está tomado' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { 
         ...(avatarColor && { avatarColor }),
         ...(username && { username })
      },
      { new: true }
    ).select('-password');

    res.json({ user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar perfil', error: error.message });
  }
};

exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Fallback en caso de que no existan las variables (solo para dev)
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    if (username === adminUser && password === adminPass) {
      const token = jwt.sign({ isAdmin: true, username }, JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token, user: { username, isAdmin: true } });
    }
    
    return res.status(401).json({ message: 'Credenciales de administrador inválidas' });
  } catch (error) {
    res.status(500).json({ message: 'Error en login de administrador', error: error.message });
  }
};
