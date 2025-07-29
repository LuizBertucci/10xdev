export interface CodeScreen {
  name: string
  description: string
  code: string
}

export interface CodeSnippet {
  id: string
  title: string
  tech: string
  language: string
  description: string
  screens: CodeScreen[]
}