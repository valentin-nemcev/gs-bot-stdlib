const lib = require('lib')({token: process.env.STDLIB_TOKEN})
// const {trello} = require('../../utils/api')
// const {quote, bold, url} = require('../../utils/format')
// const toSafeInteger = require('lodash/toSafeInteger')
// const random = require('lodash/random')
const isEmpty = require('lodash/isEmpty')
const update = require('lodash/update')
const dropWhile = require('lodash/dropWhile')
const sumBy = require('lodash/sumBy')
const minBy = require('lodash/minBy')
const mapValues = require('lodash/mapValues')
const orderBy = require('lodash/orderBy')
const range = require('lodash/range')
const groupBy = require('lodash/groupBy')
const pull = require('lodash/pull')
const pickBy = require('lodash/pickBy')
const union = require('lodash/union')
const uniq = require('lodash/uniq')

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
  // const cardShortIds = text.split(/[\s,;]+/).map(toSafeInteger)
  // const {members} =
  //   await lib.utils.storage.get('current_election')

  // const votes = await Promise.all(members.map(
  //   id => lib.utils.storage.get(`current_election_vote_${id}`)
  // ))

  // const allCards = (await trello.get(
  //   `/lists/${listId}/cards`,
  //   {qs: {fields: ['idShort', 'name', 'shortUrl'].join(',')}}
  // ))
  //   .filter(({idShort}) => cardShortIds.includes(idShort))

  // const votedCards = cardShortIds
  //   .map(idShort => allCards.find(c => c.idShort === idShort))
  //   .filter(Boolean)

  // const votedCardIds = votedCards.map(c => c.idShort)
  // lib.utils.storage.set(`current_election_vote_${userId}`, votedCardIds)
  //   .then(() => console.info('Accepted vote:', userId, votedCards))

  // const cardsText = votedCards
  //   .map(({idShort, name, shortUrl}) => `${bold(idShort)}: ${url(shortUrl, name)}`)
  //   .map(quote)
  //   .join('\n\n')
  //
  // const votes = Array(8).fill(null).map(
  //   () => Array(3).fill(null).map(() => random(1, 20))
  // )
  const votes = [
    [ 20, 10, 20 ],
    [ 13, 12, 6 ],
    [ 9, 17, 16 ],
    [ 18, 1, 17 ],
    [ 17, 9, 16 ],
    [ 17, 12, 20 ],
    [ 9, 13, 10 ],
    [ 10, 10, 9 ]
  ]
  // console.log(votes)

  return {
    response_type: 'ephemeral',
    test: STV(5, votes)
    // text: `You voted for following cards (most preferred on top):\n` +
    // `${cardsText}\nVote accepted!`
  }
}

// https://en.wikipedia.org/wiki/Single_transferable_vote
function STV (seatsCount, initialBallots) {
  initialBallots = initialBallots.filter(b => !isEmpty(b)).map(uniq)
  const candidates = union(...initialBallots).map(String)
  let candidateToValueOfVotes

  elimination: // eslint-disable-line no-labels
  for (let eliminationRound = 0; eliminationRound <= candidates.length; eliminationRound++) {
    console.debug('eliminationRound', eliminationRound)

    const ballots = initialBallots
      .map(ballot => ballot
        .map(String)
        .filter(candidate => candidates.includes(candidate))
      )
      .filter(b => !isEmpty(b))
    ballots.forEach(ballot => { ballot.voteValue = 1 })

    const quota = ballots.length / (seatsCount + 1)
    console.debug('quota', quota)

    const candidateBallots = groupBy(ballots, 0)

    let provisionalWinners = {}

    for (const distributionRound of range(candidates.length)) {
      console.debug('distributionRound', distributionRound)

      candidateToValueOfVotes = mapValues(
        candidateBallots,
        ballots => sumBy(ballots, 'voteValue')
      )
      console.debug('candidateToValueOfVotes\n', candidateToValueOfVotes)

      const newWinners = pickBy(
        candidateToValueOfVotes,
        (valueOfVotes, candidate) =>
          valueOfVotes > quota && !provisionalWinners[candidate]
      )
      console.debug('newWinners', newWinners)

      provisionalWinners = pickBy(
        candidateToValueOfVotes,
        (valueOfVotes, candidate) => valueOfVotes >= quota
      )

      if (Object.keys(provisionalWinners).length >= seatsCount) {
        console.debug('provisionalWinners', provisionalWinners)
        break elimination // eslint-disable-line no-labels
      }

      if (Object.keys(newWinners).length === 0) {
        const loser = minBy(
          Object.entries(candidateToValueOfVotes),
          ([candidate, valueOfVotes]) => valueOfVotes
        )
        pull(candidates, loser[0])
        console.debug('eliminated', loser)
        break
      }

      Object.entries(newWinners).forEach(([candidate, valueOfVotes]) => {
        const surplusTransferValue = (valueOfVotes - quota) / valueOfVotes
        candidateBallots[candidate].forEach(ballot => {
          const transferredBallot = dropWhile(
            ballot,
            candidate => provisionalWinners[candidate]
          )
          if (isEmpty(transferredBallot)) return
          transferredBallot.voteValue = ballot.voteValue * surplusTransferValue
          update(
            candidateBallots,
            transferredBallot[0],
            (ballots = []) => {
              console.debug(
                'transfer', transferredBallot.voteValue,
                'from', candidate,
                'to', transferredBallot[0]
              )
              ballots.push(transferredBallot)
              return ballots
            }
          )
        })
      })
    }
  }

  return orderBy(Object.entries(candidateToValueOfVotes), [1], ['desc'])
    .map(([candidate]) => candidate)
    .slice(0, seatsCount)
}
