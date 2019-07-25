const cookie = require('cookie').parse

module.exports = function cookies (options) {
  return handler => {
    const ev = handler.event

    if (ev.headers.cookie) {
      ev.cookies = cookie(ev.headers.cookie)

      for (let key in ev.cookies) {
        if (/^\{/.test(ev.cookies[key])) {
          try {
            ev.cookies[key] = JSON.parse(ev.cookies[key])
          } catch (e) {
            ev.cookies[key] = `Cookie appeared to contain JSON, but content was malformed.`
          }
        }
      }
    }
  }
}
