import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import ListNameCell from '../../components/Board/ListView/ListNameCell';
import { BoardMembershipRoles, ListTypes } from '../../constants/Enums';
import entryActions from '../../entry-actions';
import selectors from '../../selectors';

const mapStateToProps = (state, { id }) => {
  const { projectId, boardId } = selectors.selectPath(state);
  const { listId } = selectors.selectCardById(state, id);
  const allProjectsToLists = selectors.selectProjectsToListsForCurrentUser(state);
  const list = selectors.selectListById(state, listId);
  const currentUserMembership = selectors.selectCurrentUserMembershipForCurrentBoard(state);
  const isCurrentUserEditor = !!currentUserMembership && currentUserMembership.role === BoardMembershipRoles.EDITOR;

  return {
    projectId,
    boardId,
    listId,
    allProjectsToLists,
    // Archive and trash are not move targets, so their name is passed separately
    specialListName: list && list.type !== ListTypes.ACTIVE ? list.name : null,
    canEdit: isCurrentUserEditor,
  };
};

const mapDispatchToProps = (dispatch, { id }) =>
  bindActionCreators(
    {
      onMove: (listId) => entryActions.moveCard(id, listId),
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(ListNameCell);
