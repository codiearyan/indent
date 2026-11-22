// Written for you: the sessions that are signed in, kept in memory while the server runs. Each
// session is saved under its token. Every method hands out copies.
export function createSessionStore() {
  const sessions = new Map()

  return {
    save(token, session) {
      sessions.set(token, { ...session })
    },
    get(token) {
      const session = sessions.get(token)
      return session && { ...session }
    },
    remove(token) {
      return sessions.delete(token)
    }
  }
}
