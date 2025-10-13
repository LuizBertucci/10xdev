const { supabase } = require('../supabase');

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticação não fornecido'
      });
    }

    const token = authHeader.substring(7);

    // Verifica o token diretamente com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Token inválido ou expirado'
      });
    }

    // Adiciona o usuário ao request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({
      error: 'Erro ao validar autenticação'
    });
  }
}

module.exports = authMiddleware;