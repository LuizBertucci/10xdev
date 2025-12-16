import { Request, Response } from 'express'
import { supabaseAdmin } from '../database/supabase'

export class CardShareController {
  /**
   * POST /api/card-features/:id/share
   * Compartilhar card privado com lista de emails
   */
  static async shareWithEmails(req: Request, res: Response) {
    try {
      const { id: cardId } = req.params
      const { emails } = req.body // Array ou string separada por vírgula
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' })
      }

      if (!emails || (Array.isArray(emails) && emails.length === 0)) {
        return res.status(200).json({ message: 'Nenhum email para compartilhar' })
      }

      // Normalizar emails (aceitar array ou string separada por vírgula)
      const emailList = Array.isArray(emails)
        ? emails
        : emails.split(',').map((e: string) => e.trim()).filter(Boolean)

      if (emailList.length === 0) {
        return res.status(200).json({ message: 'Nenhum email válido' })
      }

      // Verificar se o card existe e se o usuário é o criador
      const { data: card } = await supabaseAdmin
        .from('card_features')
        .select('id, created_by, is_private')
        .eq('id', cardId)
        .single()

      if (!card) {
        return res.status(404).json({ error: 'Card não encontrado' })
      }

      if (card.created_by !== userId) {
        return res.status(403).json({ error: 'Apenas o criador pode compartilhar' })
      }

      if (!card.is_private) {
        return res.status(400).json({ error: 'Apenas cards privados podem ser compartilhados' })
      }

      // Buscar usuários pelos emails
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .in('email', emailList)

      if (!users || users.length === 0) {
        return res.status(404).json({ error: 'Nenhum usuário encontrado com os emails fornecidos' })
      }

      // Criar compartilhamentos (ignorar duplicados via UNIQUE constraint)
      const shares = users.map(user => ({
        card_feature_id: cardId,
        shared_with_user_id: user.id
      }))

      const { data, error } = await supabaseAdmin
        .from('card_shares')
        .insert(shares)
        .select()

      if (error && !error.message.includes('duplicate')) {
        console.error('Erro ao compartilhar:', error)
        return res.status(500).json({ error: 'Erro ao compartilhar card' })
      }

      return res.status(200).json({
        message: `Card compartilhado com ${users.length} usuário(s)`,
        shared: data || []
      })
    } catch (error) {
      console.error('Erro no CardShareController.shareWithEmails:', error)
      return res.status(500).json({ error: 'Erro interno do servidor' })
    }
  }
}
