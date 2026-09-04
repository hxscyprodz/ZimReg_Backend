import { IUserDashboardApplication } from "../types/types";

const applicationStatistics = (applications: IUserDashboardApplication[]) => {
  const stats = applications.reduce(
    (acc, application) => {
      switch (application.status) {
        case "APPROVED":
          acc.approved++;
          break;
        case "COLLECTED":
          acc.collected++;
          break;
        case "PENDING_REVIEW":
          acc.pendingReview++;
          break;
        case "REJECTED":
          acc.rejected++;
          break;
        default:
          break;
      }
      return acc;
    },
    {
      approved: 0,
      collected: 0,
      rejected: 0,
      pendingReview: 0,
    },
  );

  return {
    stats,
  };
};

export default applicationStatistics;
