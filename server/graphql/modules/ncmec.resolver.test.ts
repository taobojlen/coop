import fc from 'fast-check';
import { vi } from 'vitest';

import { UserPermission } from '../../services/userManagementService/index.js';
import { resolvers } from './ncmec.js';

const Mutation = resolvers.Mutation as {
  updateNcmecOrgSettings: (
    parent: unknown,
    args: { input: Record<string, unknown> },
    ctx: unknown,
  ) => Promise<unknown>;
};

const Query = resolvers.Query as Record<
  'ncmecReportById' | 'ncmecThreads',
  (parent: unknown, args: unknown, ctx: unknown) => Promise<unknown>
>;

const VALID_INPUT = {
  username: 'cyber-user',
  password: 'cyber-pass',
  contactEmail: 'reporter@example.com',
};

function makeCtx(permissions: readonly UserPermission[]) {
  const updateNcmecOrgSettings = vi.fn(async () => undefined);
  const ctx = {
    getUser: () => ({
      id: 'user-1',
      orgId: 'org-1',
      getPermissions: () => permissions,
    }),
    services: { NcmecService: { updateNcmecOrgSettings } },
  };
  return { ctx, updateNcmecOrgSettings };
}

describe('updateNcmecOrgSettings media review policy', () => {
  it('defaults to ALL and drops any supplied threshold', async () => {
    const { ctx, updateNcmecOrgSettings } = makeCtx([
      UserPermission.MANAGE_ORG,
    ]);
    await Mutation.updateNcmecOrgSettings(
      {},
      { input: { ...VALID_INPUT, minMediaToReview: 5 } },
      ctx,
    );
    expect(updateNcmecOrgSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaReviewRequirement: 'ALL',
        minMediaToReview: null,
      }),
    );
  });

  it('persists the threshold when requirement is MINIMUM', async () => {
    const { ctx, updateNcmecOrgSettings } = makeCtx([
      UserPermission.MANAGE_ORG,
    ]);
    await Mutation.updateNcmecOrgSettings(
      {},
      {
        input: {
          ...VALID_INPUT,
          mediaReviewRequirement: 'MINIMUM',
          minMediaToReview: 3,
        },
      },
      ctx,
    );
    expect(updateNcmecOrgSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaReviewRequirement: 'MINIMUM',
        minMediaToReview: 3,
      }),
    );
  });

  it('defaults MINIMUM threshold to 1 when omitted', async () => {
    const { ctx, updateNcmecOrgSettings } = makeCtx([
      UserPermission.MANAGE_ORG,
    ]);
    await Mutation.updateNcmecOrgSettings(
      {},
      { input: { ...VALID_INPUT, mediaReviewRequirement: 'MINIMUM' } },
      ctx,
    );
    expect(updateNcmecOrgSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaReviewRequirement: 'MINIMUM',
        minMediaToReview: 1,
      }),
    );
  });

  it('rejects a non-positive MINIMUM threshold', async () => {
    const { ctx, updateNcmecOrgSettings } = makeCtx([
      UserPermission.MANAGE_ORG,
    ]);
    await expect(
      Mutation.updateNcmecOrgSettings(
        {},
        {
          input: {
            ...VALID_INPUT,
            mediaReviewRequirement: 'MINIMUM',
            minMediaToReview: 0,
          },
        },
        ctx,
      ),
    ).rejects.toThrow('minMediaToReview');
    expect(updateNcmecOrgSettings).not.toHaveBeenCalled();
  });

  it('rejects a fractional MINIMUM threshold', async () => {
    const { ctx, updateNcmecOrgSettings } = makeCtx([
      UserPermission.MANAGE_ORG,
    ]);
    await expect(
      Mutation.updateNcmecOrgSettings(
        {},
        {
          input: {
            ...VALID_INPUT,
            mediaReviewRequirement: 'MINIMUM',
            minMediaToReview: 1.5,
          },
        },
        ctx,
      ),
    ).rejects.toThrow('minMediaToReview');
    expect(updateNcmecOrgSettings).not.toHaveBeenCalled();
  });

  it('rejects an unknown requirement value', async () => {
    const { ctx, updateNcmecOrgSettings } = makeCtx([
      UserPermission.MANAGE_ORG,
    ]);
    await expect(
      Mutation.updateNcmecOrgSettings(
        {},
        { input: { ...VALID_INPUT, mediaReviewRequirement: 'SOME' } },
        ctx,
      ),
    ).rejects.toThrow('mediaReviewRequirement');
    expect(updateNcmecOrgSettings).not.toHaveBeenCalled();
  });
});

describe('NCMEC read surfaces require VIEW_CHILD_SAFETY_DATA', () => {
  const unrelatedPermissions = Object.values(UserPermission).filter(
    (permission) => permission !== UserPermission.VIEW_CHILD_SAFETY_DATA,
  );
  const report = {
    id: 'report-1',
    userItemTypeId: 'user-type-1',
    additionalFiles: [],
    reportedMessages: ['m-1'],
  };
  const itemType = { id: 'user-type-1', kind: 'USER' };
  const threads = [
    { threadId: 'thread-1', threadTypeId: 'thread-type-1', messages: [] },
  ];

  function makeReadCtx(permissions: readonly UserPermission[] | null) {
    const getNcmecReportById = vi.fn(async () => report);
    const getNcmecMessages = vi.fn(async () => threads);
    const ctx = {
      getUser: () =>
        permissions === null
          ? null
          : {
              id: 'user-1',
              orgId: 'org-1',
              getPermissions: () => permissions,
            },
      services: {
        NcmecService: { getNcmecReportById, getNcmecMessages },
        ModerationConfigService: { getItemType: vi.fn(async () => itemType) },
      },
    };
    return { ctx, getNcmecReportById, getNcmecMessages };
  }

  describe('Query.ncmecReportById', () => {
    it('requires VIEW_CHILD_SAFETY_DATA regardless of unrelated permissions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.subarray(unrelatedPermissions),
          async (permissions) => {
            const denied = makeReadCtx(permissions);
            await expect(
              Query.ncmecReportById({}, { reportId: 'report-1' }, denied.ctx),
            ).rejects.toThrow('VIEW_CHILD_SAFETY_DATA permission required');
            expect(denied.getNcmecReportById).not.toHaveBeenCalled();

            const allowed = makeReadCtx([
              ...permissions,
              UserPermission.VIEW_CHILD_SAFETY_DATA,
            ]);
            await expect(
              Query.ncmecReportById({}, { reportId: 'report-1' }, allowed.ctx),
            ).resolves.toEqual({ ...report, userItemType: itemType });
            expect(allowed.getNcmecReportById).toHaveBeenCalledWith({
              orgId: 'org-1',
              reportId: 'report-1',
            });
          },
        ),
        { examples: [[[]], [unrelatedPermissions]] },
      );
    });

    it('throws unauthenticatedError when there is no user', async () => {
      const { ctx, getNcmecReportById } = makeReadCtx(null);
      await expect(
        Query.ncmecReportById({}, { reportId: 'report-1' }, ctx),
      ).rejects.toThrow('User required.');
      expect(getNcmecReportById).not.toHaveBeenCalled();
    });
  });

  describe('Query.ncmecThreads', () => {
    it('requires VIEW_CHILD_SAFETY_DATA regardless of unrelated permissions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.subarray(unrelatedPermissions),
          async (permissions) => {
            const args = { userId: 'user-9', reportedMessages: ['m-1'] };
            const denied = makeReadCtx(permissions);
            await expect(
              Query.ncmecThreads({}, args, denied.ctx),
            ).rejects.toThrow('VIEW_CHILD_SAFETY_DATA permission required');
            expect(denied.getNcmecMessages).not.toHaveBeenCalled();

            const allowed = makeReadCtx([
              ...permissions,
              UserPermission.VIEW_CHILD_SAFETY_DATA,
            ]);
            await expect(
              Query.ncmecThreads({}, args, allowed.ctx),
            ).resolves.toEqual(threads);
            expect(allowed.getNcmecMessages).toHaveBeenCalledWith(
              'org-1',
              'user-9',
              ['m-1'],
            );
          },
        ),
        { examples: [[[]], [unrelatedPermissions]] },
      );
    });

    it('throws unauthenticatedError when there is no user', async () => {
      const { ctx, getNcmecMessages } = makeReadCtx(null);
      await expect(
        Query.ncmecThreads({}, { userId: 'user-9' }, ctx),
      ).rejects.toThrow('User required.');
      expect(getNcmecMessages).not.toHaveBeenCalled();
    });
  });
});
