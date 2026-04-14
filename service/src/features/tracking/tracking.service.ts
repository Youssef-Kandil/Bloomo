import { trackingModel } from './tracking.model';
import type { PingInput } from './tracking.dto';

export const trackingService = {
  async ping(employeeId: string, input: PingInput) {
    await trackingModel.addPing(employeeId, input.lat, input.lng);
  },
  current(companyId: string) {
    return trackingModel.current(companyId);
  },
  history(employeeId: string, minutes = 60) {
    return trackingModel.recentFor(employeeId, minutes);
  },
};
