export const normalizeAuthorName = (name: string): string => {
  return name.trim().toLowerCase()
}

const AUTHOR_SPLIT_REGEX = /,|&| and |\+|;|\/| with /i

export const splitAuthorNames = (authors: string | null | undefined): string[] => {
  if (!authors) return []

  return authors
    .split(AUTHOR_SPLIT_REGEX)
    .map(name => name.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean)
}
