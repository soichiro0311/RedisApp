import {UserDto} from './user-dto';
import {RankingUser} from './ranking-user';

export class RankingUtil {
  static parseMember(member: string): [number, UserDto] {
    const index = member.indexOf(':');
    const userId = Number.parseInt(member.substring(0, index), 10);
    const json = member.substring(index + 1);
    const dto = JSON.parse(json) as UserDto;
    return [userId, dto];
  }

  static createRankingUser(member: string, score: string) {
    const [userId, dto] = this.parseMember(member);
    return new RankingUser(userId, dto.name, dto.grade, Number.parseInt(score, 10));
  }
}