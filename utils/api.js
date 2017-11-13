const getBotToken = require('../helpers/get_bot_token.js')
const request = require('request-promise-native')
const camelCaseKeys = require('camelcase-keys')

module.exports.trello = request.defaults({
  json: true,
  baseUrl: 'https://api.trello.com/1',
  qs: {
    key: process.env.TRELLO_API_KEY,
    token: process.env.TRELLO_AUTH_TOKEN
  }
})

module.exports.getSlack = teamId =>
  new Promise((resolve, reject) => {
    getBotToken(teamId, (err, botToken) => {
      if (err) reject(err)
      resolve(request.defaults({
        json: true,
        transform: r => camelCaseKeys(r, {deep: true}),
        baseUrl: 'https://slack.com/api',
        qs: {token: botToken}
      }))
    })
  })
