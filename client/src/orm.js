import { ORM } from 'redux-orm';

import {
  Activity,
  ApiClient,
  Attachment,
  Board,
  BoardMembership,
  BoardTemplate,
  Card,
  Comment,
  Core,
  Label,
  List,
  MailToken,
  Notification,
  Project,
  ProjectManager,
  Task,
  TaskList,
  User,
  UserPrefs,
} from './models';

const orm = new ORM({
  stateSelector: (state) => state.orm,
});

orm.register(User, UserPrefs, Project, ProjectManager, Board, BoardMembership, BoardTemplate, Label, List, MailToken, Card, Comment, Core, TaskList, Task, Attachment, Activity, Notification, ApiClient);

export default orm;
