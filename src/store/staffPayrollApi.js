import { apiSlice } from "./apiSlice";

export const staffPayrollApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStaffPeople: builder.query({ query: () => "/staff-people", providesTags: ["Employee"] }),
    getPayrollPeople: builder.query({ query: () => "/staff-payroll/people", providesTags: ["Employee"] }),
    getStaffAttendance: builder.query({ query: (month) => `/staff-attendance?month=${encodeURIComponent(month)}`, providesTags: ["StaffAttendance"] }),
    saveStaffAttendance: builder.mutation({ query: (body) => ({ url: "/staff-attendance", method: "POST", body }), invalidatesTags: ["StaffAttendance", "StaffPayroll"] }),
    updateStaffAttendance: builder.mutation({ query: ({ id, ...body }) => ({ url: `/staff-attendance/${id}`, method: "PUT", body }), invalidatesTags: ["StaffAttendance", "StaffPayroll"] }),
    deleteStaffAttendance: builder.mutation({ query: (id) => ({ url: `/staff-attendance/${id}`, method: "DELETE" }), invalidatesTags: ["StaffAttendance", "StaffPayroll"] }),
    getStaffPayroll: builder.query({ query: (month) => `/staff-payroll?month=${encodeURIComponent(month)}`, providesTags: ["StaffPayroll"] }),
    getStaffPayrollHistory: builder.query({ query: (employeeId) => `/staff-payroll/history?employeeId=${encodeURIComponent(employeeId)}`, providesTags: ["StaffPayroll"] }),
    getStaffPayrollEntries: builder.query({ query: (month) => `/staff-payroll/entries?month=${encodeURIComponent(month)}`, providesTags: ["StaffPayrollEntry"] }),
    getStaffPayrollEntryHistory: builder.query({ query: (employeeId) => `/staff-payroll/entry-history?employeeId=${encodeURIComponent(employeeId)}`, providesTags: ["StaffPayrollEntry"] }),
    getStaffPaymentHistory: builder.query({ query: (params = {}) => { const search = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); }); return `/staff-payroll/payment-history?${search.toString()}`; }, providesTags: ["StaffPayrollEntry"] }),
    getOutstandingPayrollMonths: builder.query({ query: (employeeId) => `/staff-payroll/outstanding-months?employeeId=${encodeURIComponent(employeeId)}`, providesTags: ["StaffPayroll", "StaffPayrollEntry"] }),
    saveStaffPayrollEntry: builder.mutation({ query: (body) => ({ url: "/staff-payroll/entries", method: "POST", body }), invalidatesTags: ["StaffPayrollEntry", "StaffPayroll"] }),
    updateStaffPayrollEntry: builder.mutation({ query: ({ id, ...body }) => ({ url: `/staff-payroll/entries/${id}`, method: "PUT", body }), invalidatesTags: ["StaffPayrollEntry", "StaffPayroll"] }),
    deleteStaffPayrollEntry: builder.mutation({ query: (id) => ({ url: `/staff-payroll/entries/${id}`, method: "DELETE" }), invalidatesTags: ["StaffPayrollEntry", "StaffPayroll"] }),
  }),
});
export const { useGetStaffPeopleQuery, useGetPayrollPeopleQuery, useGetStaffAttendanceQuery, useSaveStaffAttendanceMutation, useUpdateStaffAttendanceMutation, useDeleteStaffAttendanceMutation, useGetStaffPayrollQuery, useGetStaffPayrollHistoryQuery, useGetStaffPayrollEntriesQuery, useGetStaffPayrollEntryHistoryQuery, useGetStaffPaymentHistoryQuery, useGetOutstandingPayrollMonthsQuery, useSaveStaffPayrollEntryMutation, useUpdateStaffPayrollEntryMutation, useDeleteStaffPayrollEntryMutation } = staffPayrollApi;
