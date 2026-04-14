import { permissionsModel } from './permissions.model';
import type { BulkUpsertInput, UpsertPermissionInput } from './permissions.dto';

export const permissionsService = {
  list(managerId: string) {
    return permissionsModel.listForManager(managerId);
  },
  upsert(input: UpsertPermissionInput) {
    return permissionsModel.upsert(input.managerId, input.screenKey, input.canView, input.canEdit);
  },
  bulk(input: BulkUpsertInput) {
    return permissionsModel.bulkUpsert(input.managerId, input.screens);
  },
};
