import { and, eq, inArray } from 'drizzle-orm';
import { markAchievementsAsDisplayed } from '../gamification';
import { executeDbOperation } from '../db';
import { userAchievements } from '@shared/schema';

jest.mock('../db');

describe('markAchievementsAsDisplayed', () => {
  let capturedWhere: any;
  const where = jest.fn((arg) => { capturedWhere = arg; });
  const set = jest.fn(() => ({ where }));
  const update = jest.fn(() => ({ set, where }));

  const fakeDb = { update } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedWhere = undefined;
    (executeDbOperation as jest.Mock).mockImplementation(async (fn: any) => {
      await fn(fakeDb);
    });
  });

  it('updates only specified achievement IDs', async () => {
    await markAchievementsAsDisplayed(5, [1, 2, 3]);

    expect(update).toHaveBeenCalledWith(userAchievements);
    expect(set).toHaveBeenCalledWith({ displayed: true });
    const expected = and(
      eq(userAchievements.userId, 5),
      inArray(userAchievements.id, [1, 2, 3])
    );
    expect(capturedWhere).toEqual(expected);
  });

  it('does nothing when ID list is empty', async () => {
    await markAchievementsAsDisplayed(5, []);

    expect(executeDbOperation).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(where).not.toHaveBeenCalled();
  });
});
