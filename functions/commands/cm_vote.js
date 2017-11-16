const lib = require('lib')({token: process.env.STDLIB_TOKEN})
const {trello, getSlack} = require('../../utils/api')
const {user, quote, bold, url} = require('../../utils/format')
const toSafeInteger = require('lodash/toSafeInteger')
/**
* /cm_vote
*
*   See https://api.slack.com/slash-commands for more details.
*
* @param {string} teamId The user id of the user that invoked this command (name is usable as well)
* @param {string} userId The user id of the user that invoked this command (name is usable as well)
* @param {string} channelId The channelId id the command was executed in (name is usable as well)
* @param {string} text The text contents of the command
* @param {object} command The full Slack command object
* @param {string} botToken The bot token for the Slack bot you have activated
* @returns {object}
*/
module.exports = async (teamId, userId, channelId, text = '', command = {}, botToken = null) => {
  const cardShortIds = text.split(/[\s,;]+/).map(toSafeInteger)
  const {listId, channelId: electionChannelId} =
    await lib.utils.storage.get('current_election')

  const allCards = (await trello.get(
    `/lists/${listId}/cards`,
    {qs: {fields: ['idShort', 'name', 'shortUrl'].join(',')}}
  ))
    .filter(({idShort}) => cardShortIds.includes(idShort))

  const votedCards = cardShortIds
    .map(idShort => allCards.find(c => c.idShort === idShort))
    .filter(Boolean)

  const votedCardIds = votedCards.map(c => c.idShort)
  try {
    await lib.utils.storage.set(`current_election_vote_${userId}`, votedCardIds)
  } catch (e) {
    console.log(e)
  }
  console.info('Accepted vote:', userId, votedCardIds)

  const cardsText = votedCards
    .map(({idShort, name, shortUrl}) => `${bold(idShort)}: ${url(shortUrl, name)}`)
    .map(quote)
    .join('\n\n')

  const slack = await getSlack(teamId)
  console.log(electionChannelId, await slack.post({
    url: '/chat.postMessage',
    body: {
      channel: electionChannelId,
      text: `Accepted vote from ${user(userId)}`
    }
  }).catch(console.error))

  return {
    response_type: 'ephemeral',
    text: `You voted for following cards (most preferred on top):\n` +
    `${cardsText}\nVote accepted!`
  }
}
