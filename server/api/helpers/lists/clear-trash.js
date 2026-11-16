// Permanently deletes cards in a board's trash list, through the normal card delete so every card
// gets its broadcast and activity. With olderThan, only cards that entered the trash before then.

module.exports = {
  inputs: {
    list: {
      type: 'ref',
      required: true,
    },
    olderThan: {
      type: 'ref',
    },
    currentUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { list, olderThan, currentUser } = inputs;

    if (list.type !== List.Types.TRASH) {
      throw new Error('Only a trash list can be emptied');
    }

    const criteria = { listId: list.id };
    if (olderThan) {
      criteria.listChangedAt = { '<': olderThan };
    }

    const cards = await Card.find(criteria);

    // eslint-disable-next-line no-restricted-syntax
    for (const card of cards) {
      // eslint-disable-next-line no-await-in-loop
      await sails.helpers.cards.deleteOne.with({ record: card, currentUser, request: inputs.request });
    }

    return cards.length;
  },
};
