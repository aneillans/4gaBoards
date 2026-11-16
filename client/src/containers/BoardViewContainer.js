import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import BoardView from '../components/Board/BoardView';
import { BoardContexts, BoardMembershipRoles } from '../constants/Enums';
import entryActions from '../entry-actions';
import selectors from '../selectors';

const mapStateToProps = (state) => {
  const currentUserMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
  const listIds = selectors.selectListIdsForCurrentBoard(state);
  const { context } = selectors.selectCurrentBoard(state);

  const isCurrentUserEditor = !!currentUserMembership && currentUserMembership.role === BoardMembershipRoles.EDITOR;

  return {
    listIds,
    // Archive and trash are a single fixed list: no adding or reordering lists
    canEdit: isCurrentUserEditor && context === BoardContexts.BOARD,
  };
};

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    {
      onListCreate: entryActions.createListInCurrentBoard,
      onListMove: entryActions.moveList,
      onCardMove: entryActions.moveCard,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(BoardView);
