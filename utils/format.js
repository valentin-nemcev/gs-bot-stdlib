module.exports = {
  // emphasis
  italic: s => '_' + s + '_',
  bold: s => '*' + s + '*',
  code: s => '`' + s + '`',
  pre: s => '```' + s + '```',
  strike: s => '~' + s + '~',
  quote: s => '> ' + s,
  paragraph: s => '>>> ' + s,
  emoji: s => ':' + s.toLowerCase().split(' ').join('_').trim() + ':',

  // types of selectors
  // e.g. <@U123456>
  user: s => '<@' + s.trim() + '>',
  // basically a alias for user
  channel: s => '<@' + s.trim() + '>',
  // e.g. <!subteam^123456|sub-team>
  subteam: (s, handle) => {
    if (!handle) throw Error('Parameter "handle" is required for s =>.')
    return '<!subteam^' + s.trim() + '|' + handle + '>'
  },

  // links
  url: (s, handle) => {
    if (handle) return '<' + s.trim() + '|' + handle + '>'
    return '<' + s.trim() + '>'
  },
  // e.g. <mailto:test@email.com|test>
  email: (s, handle) => {
    if (handle) return '<mailto:' + s.trim() + '|' + handle + '>'
    return '<mailto:' + s.trim() + '>'
  },

  // variables
  atHere: s => '<!here|here>',
  atEveryone: s => '<!everyone>',
  atGroup: s => '<!group>',
  atChannel: s => '<!channel>',

  html: s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

}
