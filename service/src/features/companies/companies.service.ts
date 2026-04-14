import { AppError } from '@/lib/http-error';

import { companiesModel } from './companies.model';
import type { CreateBranchInput, UpdateBranchInput, UpdateCompanyInput } from './companies.dto';

export const companiesService = {
  async get(companyId: string) {
    const company = await companiesModel.get(companyId);
    if (!company) throw AppError.notFound('Company not found');
    return company;
  },
  update(companyId: string, input: UpdateCompanyInput) {
    return companiesModel.update(companyId, input);
  },
  listBranches(companyId: string) {
    return companiesModel.listBranches(companyId);
  },
  createBranch(companyId: string, input: CreateBranchInput) {
    return companiesModel.createBranch({
      companyId,
      name: input.name,
      address: input.address ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      phones: input.phones ?? [],
    });
  },
  updateBranch(id: string, input: UpdateBranchInput) {
    const { phones, ...rest } = input;
    return companiesModel.updateBranch(id, {
      ...rest,
      ...(phones !== undefined ? { phones } : {}),
    });
  },
  deleteBranch(id: string) {
    return companiesModel.deleteBranch(id);
  },
};
