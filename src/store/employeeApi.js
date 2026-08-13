import { apiSlice } from "./apiSlice";

export const employeeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    employeeLogin: builder.mutation({
      query: (body) => ({
        url: "/employee/login",
        method: "POST",
        body,
      }),
    }),
    getEmployees: builder.query({
      query: () => "/employees",
      providesTags: ["Employee"],
    }),
    createEmployee: builder.mutation({
      query: (body) => ({
        url: "/employee",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Employee"],
    }),
    updateEmployee: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/employee/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Employee"],
    }),
    deleteEmployee: builder.mutation({
      query: (id) => ({
        url: `/employee/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Employee"],
    }),
    getRooms: builder.query({
      query: () => "/rooms",
      providesTags: ["Room"],
    }),
    createRoom: builder.mutation({
      query: (body) => ({
        url: "/room",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Room"],
    }),
    updateRoom: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/room/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Room"],
    }),
    deleteRoom: builder.mutation({
      query: (id) => ({
        url: `/room/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Room"],
    }),
    getGuests: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          search.set(key, String(value));
        });
        return `/guests?${search.toString()}`;
      },
      providesTags: ["Guest"],
    }),
    getOccupancy: builder.query({
      query: ({ from, to }) =>
        `/occupancy?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      providesTags: ["Guest", "Room"],
    }),
    getVipRequests: builder.query({
      query: (status = "pending") =>
        `/vip-requests?status=${encodeURIComponent(status)}`,
      providesTags: ["VipRequest"],
    }),
    getVipRequestsCount: builder.query({
      query: (status = "pending") =>
        `/vip-requests/count?status=${encodeURIComponent(status)}`,
      providesTags: ["VipRequest"],
    }),
    decideVipRequest: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/vip-request/${id}/decision`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["VipRequest", "Guest"],
    }),
    getGuestByPassport: builder.query({
      query: (passport) => `/guest/by-passport/${encodeURIComponent(passport)}`,
    }),
    createGuest: builder.mutation({
      query: (body) => ({
        url: "/guest",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Guest", "Room"],
    }),
    createGuestsBulk: builder.mutation({
      query: (body) => ({
        url: "/guests/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Guest", "Room"],
    }),
    updateGuest: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/guest/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Guest"],
    }),
    addGuestPayment: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/guest/${id}/payment`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Guest"],
    }),
    checkoutGuest: builder.mutation({
      query: (id) => ({
        url: `/guest/${id}/checkout`,
        method: "POST",
      }),
      invalidatesTags: ["Guest", "Room"],
    }),
    deleteGuest: builder.mutation({
      query: (id) => ({
        url: `/guest/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Guest", "Room"],
    }),
    addGuestService: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/guest/${id}/service`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Guest"],
    }),
    getServices: builder.query({
      query: (activeOnly = false) =>
        `/services${activeOnly ? "?activeOnly=true" : ""}`,
      providesTags: ["Service"],
    }),
    createService: builder.mutation({
      query: (body) => ({
        url: "/service",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Service"],
    }),
    updateService: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/service/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Service"],
    }),
    deleteService: builder.mutation({
      query: (id) => ({
        url: `/service/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Service"],
    }),
    getHallBookings: builder.query({
      query: (tab = "all") =>
        `/hall-bookings${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`,
      providesTags: ["HallBooking"],
    }),
    createHallBooking: builder.mutation({
      query: (body) => ({
        url: "/hall-booking",
        method: "POST",
        body,
      }),
      invalidatesTags: ["HallBooking"],
    }),
    updateHallBooking: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/hall-booking/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["HallBooking"],
    }),
    addHallBookingPayment: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/hall-booking/${id}/payment`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["HallBooking"],
    }),
    cancelHallBooking: builder.mutation({
      query: (id) => ({
        url: `/hall-booking/${id}/cancel`,
        method: "POST",
      }),
      invalidatesTags: ["HallBooking"],
    }),
    deleteHallBooking: builder.mutation({
      query: (id) => ({
        url: `/hall-booking/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["HallBooking"],
    }),
    getExpenses: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          search.set(key, String(value));
        });
        return `/expenses?${search.toString()}`;
      },
      providesTags: ["Expense"],
    }),
    getDashboardSummary: builder.query({
      query: (month) => {
        const value = String(month || "").trim();
        return value
          ? `/dashboard?month=${encodeURIComponent(value)}`
          : "/dashboard";
      },
    }),
    getReportsSummary: builder.query({
      query: (month) => {
        const value = String(month || "").trim();
        return value
          ? `/reports-summary?month=${encodeURIComponent(value)}`
          : "/reports-summary";
      },
    }),
    createExpense: builder.mutation({
      query: (body) => ({
        url: "/expense",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Expense"],
    }),
    updateExpense: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/expense/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Expense"],
    }),
    deleteExpense: builder.mutation({
      query: (id) => ({
        url: `/expense/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Expense"],
    }),
    getSettings: builder.query({
      query: () => "/settings",
      providesTags: ["Settings"],
    }),
    updateSettings: builder.mutation({
      query: (body) => ({
        url: "/settings",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Settings", "Guest"],
    }),
    sendSupportMessage: builder.mutation({
      query: (body) => ({
        url: "/support/message",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useEmployeeLoginMutation,
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetRoomsQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
  useGetGuestsQuery,
  useLazyGetGuestsQuery,
  useGetOccupancyQuery,
  useGetVipRequestsQuery,
  useGetVipRequestsCountQuery,
  useDecideVipRequestMutation,
  useLazyGetGuestByPassportQuery,
  useCreateGuestMutation,
  useCreateGuestsBulkMutation,
  useUpdateGuestMutation,
  useAddGuestPaymentMutation,
  useCheckoutGuestMutation,
  useDeleteGuestMutation,
  useAddGuestServiceMutation,
  useGetServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useGetHallBookingsQuery,
  useCreateHallBookingMutation,
  useUpdateHallBookingMutation,
  useAddHallBookingPaymentMutation,
  useCancelHallBookingMutation,
  useDeleteHallBookingMutation,
  useGetExpensesQuery,
  useGetDashboardSummaryQuery,
  useGetReportsSummaryQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useSendSupportMessageMutation,
} = employeeApi;
