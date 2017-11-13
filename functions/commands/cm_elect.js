const lib = require('lib')({token: process.env.STDLIB_TOKEN})
const {atHere, bold, user, url, code, quote} = require('../../utils/format')
const lowerCase = require('lodash/lowerCase')
const {trello, getSlack} = require('../../utils/api')

/**
* /cm_elect
*
*   See https://api.slack.com/slash-commands for more details.
*
* @param {string} teamId The user id of the user that invoked this command (name is usable as well)
* @param {string} userId The user id of the user that invoked this command (name is usable as well)
* @param {string} channel The channel id the command was executed in (name is usable as well)
* @param {string} text The text contents of the command
* @param {object} command The full Slack command object
* @param {string} botToken The bot token for the Slack bot you have activated
* @returns {object}
*/
module.exports = async (teamId, userId, channel, text = '', command = {}, botToken = null) => {
  const [boardId, listName, ...messageWords] = text.split(/\s/)
  const message = messageWords.join(' ')
  const lists = await trello.get(`/boards/${boardId}/lists/open`)
  const list = lists
      .find(({name}) => lowerCase(name).includes(lowerCase(listName)))

  if (!list) {
    return {
      response_type: 'ephemeral',
      text: `Can't find this "${listName}" on board ${code(boardId)}\n` +
      `Following lists are available:\n` +
      lists.map(({name}) => name).join('\n')
    }
  }
  const cards = (await trello.get(
    `/lists/${list.id}/cards`,
    {qs: {fields: ['idShort', 'name', 'shortUrl'].join(',')}}
  )).map(({idShort, name, shortUrl}) => `${bold(idShort)}: ${url(shortUrl, name)}`)
    .map(quote)
    .join('\n\n')

  const slack = await getSlack(teamId)
  const members = (await slack.get('/users.list'))
      .members
      .filter(u => !(u.isBot || u.deleted))
      .map(u => u.id)

  members.forEach(
    id => lib.utils.storage.clear(`current_election_vote_${id}`)
  )

  lib.utils.storage.set(
    'current_election',
    {userId, boardId, listId: list.id, message}
  )

  return {
    response_type: 'in_channel',
    text: `${cards}\n${user(userId)} started an election!\n` +
    (message && `Description: \n${quote(message)}\n`) +
    `Everyone ${atHere()}, please cast your votes for cards listed above by ` +
    `posting command /cm_vote followed by 5 card ids (in bold above) in order of preference, most preferred first` +
    `, for example: ${code('/cm_vote 785 385 128 343 566')}`
  }
}
