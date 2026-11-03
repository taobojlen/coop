import fc from 'fast-check';
import { vi } from 'vitest';

import { UserPermission } from '../../services/userManagementService/index.js';
import {
  Mutation as MutationResolvers,
  Query as QueryResolvers,
} from './apiKey.js';

const Query = QueryResolvers as {
  apiKey: (
    parent: unknown,
    args: Record<string, never>,
    ctx: unknown,
  ) => Promise<string>;
};

const Mutation = MutationResolvers as {
  rotateApiKey: (
    parent: unknown,
    args: { input: { name: string; description?: string | null } },
    ctx: unknown,
  ) => Promise<unknown>;
  rotateWebhookSigningKey: (
    parent: unknown,
    args: Record<string, never>,
    ctx: unknown,
  ) => Promise<unknown>;
};

describe('apiKey resolvers', () => {
  const unrelatedPermissions = Object.values(UserPermission).filter(
    (permission) => permission !== UserPermission.MANAGE_ORG,
  );

  function makeCtx(permissions: readonly UserPermission[]) {
    const getActiveApiKeyForOrg = vi.fn(async () => ({ key: 'secret' }));
    const rotateApiKey = vi.fn(async () => ({
      apiKey: 'new-secret',
      record: {
        id: 'key-1',
        name: 'k',
        description: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        lastUsedAt: null,
        createdBy: 'user-1',
      },
    }));
    const rotateWebhookSigningKey = vi.fn(async () => 'public-key');
    const ctx = {
      getUser: () => ({
        id: 'user-1',
        orgId: 'org-1',
        getPermissions: () => permissions,
      }),
      services: {
        ApiKeyService: { getActiveApiKeyForOrg, rotateApiKey },
      },
      dataSources: { orgAPI: { rotateWebhookSigningKey } },
    };
    return {
      ctx,
      getActiveApiKeyForOrg,
      rotateApiKey,
      rotateWebhookSigningKey,
    };
  }

  describe('Query.apiKey', () => {
    it('throws unauthenticatedError when caller is not authenticated', async () => {
      const { ctx, getActiveApiKeyForOrg } = makeCtx([
        UserPermission.MANAGE_ORG,
      ]);
      const unauthenticatedCtx = { ...ctx, getUser: () => null };
      await expect(Query.apiKey({}, {}, unauthenticatedCtx)).rejects.toThrow(
        'Authenticated user required',
      );
      expect(getActiveApiKeyForOrg).not.toHaveBeenCalled();
    });

    it('requires MANAGE_ORG regardless of unrelated permissions and never returns the key', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.subarray(unrelatedPermissions),
          async (permissions) => {
            const denied = makeCtx(permissions);
            await expect(Query.apiKey({}, {}, denied.ctx)).rejects.toThrow(
              'User does not have permission to view the org API key',
            );
            expect(denied.getActiveApiKeyForOrg).not.toHaveBeenCalled();

            const allowed = makeCtx([
              ...permissions,
              UserPermission.MANAGE_ORG,
            ]);
            await expect(Query.apiKey({}, {}, allowed.ctx)).resolves.toBe(
              'API key exists (hidden for security)',
            );
            expect(allowed.getActiveApiKeyForOrg).toHaveBeenCalledWith('org-1');
          },
        ),
        { examples: [[[]], [unrelatedPermissions]] },
      );
    });
  });

  describe('Mutation.rotateApiKey', () => {
    it('throws unauthenticatedError when caller is not authenticated', async () => {
      const { ctx, rotateApiKey } = makeCtx([UserPermission.MANAGE_ORG]);
      const unauthenticatedCtx = { ...ctx, getUser: () => null };
      await expect(
        Mutation.rotateApiKey(
          {},
          { input: { name: 'k', description: null } },
          unauthenticatedCtx,
        ),
      ).rejects.toThrow('Authenticated user required');
      expect(rotateApiKey).not.toHaveBeenCalled();
    });

    it('requires MANAGE_ORG regardless of unrelated permissions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.subarray(unrelatedPermissions),
          async (permissions) => {
            const args = { input: { name: 'k', description: null } };
            const denied = makeCtx(permissions);
            await expect(
              Mutation.rotateApiKey({}, args, denied.ctx),
            ).rejects.toThrow(
              'User does not have permission to rotate the API key',
            );
            expect(denied.rotateApiKey).not.toHaveBeenCalled();

            const allowed = makeCtx([
              ...permissions,
              UserPermission.MANAGE_ORG,
            ]);
            await expect(
              Mutation.rotateApiKey({}, args, allowed.ctx),
            ).resolves.toMatchObject({
              __typename: 'RotateApiKeySuccessResponse',
              apiKey: 'new-secret',
            });
            expect(allowed.rotateApiKey).toHaveBeenCalledWith(
              'org-1',
              'k',
              null,
              'user-1',
            );
          },
        ),
        { examples: [[[]], [unrelatedPermissions]] },
      );
    });
  });

  describe('Mutation.rotateWebhookSigningKey', () => {
    it('throws unauthenticatedError when caller is not authenticated', async () => {
      const { ctx, rotateWebhookSigningKey } = makeCtx([
        UserPermission.MANAGE_ORG,
      ]);
      const unauthenticatedCtx = { ...ctx, getUser: () => null };
      await expect(
        Mutation.rotateWebhookSigningKey({}, {}, unauthenticatedCtx),
      ).rejects.toThrow('Authenticated user required');
      expect(rotateWebhookSigningKey).not.toHaveBeenCalled();
    });

    it('requires MANAGE_ORG regardless of unrelated permissions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.subarray(unrelatedPermissions),
          async (permissions) => {
            const denied = makeCtx(permissions);
            await expect(
              Mutation.rotateWebhookSigningKey({}, {}, denied.ctx),
            ).rejects.toThrow(
              'User does not have permission to rotate the webhook signing key',
            );
            expect(denied.rotateWebhookSigningKey).not.toHaveBeenCalled();

            const allowed = makeCtx([
              ...permissions,
              UserPermission.MANAGE_ORG,
            ]);
            await expect(
              Mutation.rotateWebhookSigningKey({}, {}, allowed.ctx),
            ).resolves.toEqual({
              __typename: 'RotateWebhookSigningKeySuccessResponse',
              publicSigningKey: 'public-key',
            });
            expect(allowed.rotateWebhookSigningKey).toHaveBeenCalledWith(
              'org-1',
            );
          },
        ),
        { examples: [[[]], [unrelatedPermissions]] },
      );
    });
  });
});
