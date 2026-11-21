export const MIN_PASSWORD_LENGTH = 6
export const MAX_PASSWORD_LENGTH = 128

export function isValidNewPassword(value:unknown): value is string {
  return typeof value==='string' && value.length>=MIN_PASSWORD_LENGTH && value.length<=MAX_PASSWORD_LENGTH
}

export const passwordLengthMessage = `Use a password of ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`
