const { supabase } = require('../supabase');

class AuthController {
  async register(req, res) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email e senha são obrigatórios'
        });
      }

      // Cria o usuário no Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0]
          }
        }
      });

      if (error) {
        return res.status(400).json({
          error: error.message
        });
      }

      return res.status(201).json({
        message: 'Usuário registrado com sucesso',
        user: data.user,
        session: data.session
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      return res.status(500).json({
        error: 'Erro ao registrar usuário'
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email e senha são obrigatórios'
        });
      }

      // Autentica com Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return res.status(401).json({
          error: 'Credenciais inválidas'
        });
      }

      return res.status(200).json({
        message: 'Login realizado com sucesso',
        user: data.user,
        session: data.session,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
    } catch (error) {
      console.error('Erro no login:', error);
      return res.status(500).json({
        error: 'Erro ao realizar login'
      });
    }
  }

  async logout(req, res) {
    try {
      const token = req.token;

      // Faz logout no Supabase
      const { error } = await supabase.auth.admin.signOut(token);

      if (error) {
        console.error('Erro ao fazer logout:', error);
      }

      return res.status(200).json({
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      return res.status(500).json({
        error: 'Erro ao realizar logout'
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = req.user;

      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Erro ao obter perfil:', error);
      return res.status(500).json({
        error: 'Erro ao obter perfil do usuário'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          error: 'Refresh token não fornecido'
        });
      }

      // Renova a sessão
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token
      });

      if (error) {
        return res.status(401).json({
          error: 'Refresh token inválido'
        });
      }

      return res.status(200).json({
        message: 'Token renovado com sucesso',
        session: data.session,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      return res.status(500).json({
        error: 'Erro ao renovar token'
      });
    }
  }
}

module.exports = new AuthController();