import { permissionsModel } from './permissions.model';
import type { BulkUpsertInput, UpsertPermissionInput } from './permissions.dto';

export const permissionsService = {
  list(managerId: string) {
    return permissionsModel.listForManager(managerId);
  },
  upsert(input: UpsertPermissionInput) {
    const { managerId, screenKey, ...flags } = input;
    return permissionsModel.upsert(managerId, screenKey, flags);
  },
  bulk(input: BulkUpsertInput) {
    return permissionsModel.bulkUpsert(input.managerId, input.screens);
  },
};
