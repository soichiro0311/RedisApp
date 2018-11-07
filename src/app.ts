import * as _ from 'lodash';
import * as logger from 'signale';

import {DailyRanking} from './ranking';
import {RankingUser} from './ranking-user';

const grades = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
const ranking = new DailyRanking();

async function generateUsers() {
    const userIds = _.range(1, 51);
    return _.map(userIds, userId => {
      const name = `user-${userId}`;
      const grade = _.sample(grades);
      const score = 0;
      return new RankingUser(userId, name, grade, score);
    });
}

function addUsersToRanking(users: RankingUser[]) {
    users.forEach(user => {
      const score = _.random(0, 10000);
      ranking.update(user, score);
    });
}

(async () => {
    const generatedUsers = await generateUsers();
    addUsersToRanking(generatedUsers);
    logger.success(`${generatedUsers.length} users generated.`);
  
    const users = await ranking.listByHighScore(5);
    logger.success(`#listByHighScore => ${users.length} users found.`);
  
    users.forEach(user => {
      logger.debug(user.toString());
    });
    const userId = 1;
    const user = await ranking.getByUserId(userId);
    logger.success(`#getByUserId => ${userId}: ${user.toString()}`);
  
    ranking.close();
    logger.complete();
})().catch(err => logger.fatal(err));

