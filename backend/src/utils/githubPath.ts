export const normalizeGithubFilePath = (filePath: string): string => {
  return filePath
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\?.*$/, '')
}

