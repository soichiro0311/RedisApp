import * as IORedis from 'ioredis';
import {DateTime} from 'luxon';
import {RankingUser} from './ranking-user';
import {UserDto} from './user-dto';
import {RankingUtil} from './ranking-util';

export class DailyRanking {
    private readonly redis: IORedis.Redis;

    constructor(options?: IORedis.RedisOptions) {
        this.redis = new IORedis(options);
    }

    static createKey(): string {
        return DateTime.utc().toFormat("'RANKING_DAILY_'yyyyMMdd");
    }

    update(user: RankingUser, score: number): void {
        const key = DailyRanking.createKey();
        const dto: UserDto = {name: user.name, grade: user.grade}; // ignore userId, score
        const json = JSON.stringify(dto);
        this.redis.zadd(key, `${score}`, `${user.userId}:${json}`);
    }

    async listByHighScore(limit: number): Promise<RankingUser[]> {
        const key = DailyRanking.createKey();
        const max = '+inf';
        const min = '-inf';
        const args = ['LIMIT', '0', `${limit}`, 'WITHSCORES'];
        const result = await this.redis.zrevrangebyscore(key, max, min, ...args);
        const users: RankingUser[] = [];
        for (let i = 0, len = result.length; i < len; i++) {
          if (i % 2 === 1) {
            const member = result[i - 1];
            const score = result[i];
            const user = RankingUtil.createRankingUser(member, score);
            users.push(user)
          }
        }
        return users;
    }

    async getByUserId(userId: number): Promise<RankingUser> {
        const key = DailyRanking.createKey();
        const args = ['MATCH', `${userId}:*`];
        const [cursol, result] = await this.redis.zscan(key, 0, ...args);
        const [member, score] = result;
        return RankingUtil.createRankingUser(member, score);
    }

    close(): void {
        this.redis.disconnect();
    }
}

