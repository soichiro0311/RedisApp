export class RankingUser {
  constructor(readonly userId: number, readonly name: string, readonly grade: string, readonly score: number) {}
  
  toString() {
    return JSON.stringify(this);
  }
}