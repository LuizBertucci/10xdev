#!/usr/bin/env ts-node

import dotenv from 'dotenv'
import path from 'path'

const envPath = path.resolve(__dirname, '../../.env')
dotenv.config({ path: envPath, override: true })

import { supabaseAdmin } from '@/database/supabase'

async function checkProjectCategories() {
  const { data, error } = await supabaseAdmin
    .from('card_features')
    .select('id, title, category, tags')
    .eq('created_in_project_id', '132f016e-a328-46fc-9483-ac1329b4e90f')
    .order('title')
  
  if (error) {
    console.error(error)
  } else {
    console.log('Cards do projeto 132f016e-a328-46fc-9483-ac1329b4e90f:')
    console.log(JSON.stringify(data, null, 2))
  }
}

checkProjectCategories().catch(console.error)