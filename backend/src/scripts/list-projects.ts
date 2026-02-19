#!/usr/bin/env ts-node

import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath, override: true })

import { supabaseAdmin } from '@/database/supabase'

async function listProjects() {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, name, description')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error(error)
  } else {
    console.log('Projetos encontrados:')
    console.log(JSON.stringify(data, null, 2))
  }
}

listProjects().catch(console.error)