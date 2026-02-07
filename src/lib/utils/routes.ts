export const getDashboardPath = (role?: string) => {
  switch (role) {
    case "SELLER":
      return "/dashboard/seller";
    case "ADMIN":
      return "/dashboard/admin";
    case "CUSTOMER_SERVICE":
      return "/dashboard/customer-service";
    default:
      return "/dashboard";
  }
};
