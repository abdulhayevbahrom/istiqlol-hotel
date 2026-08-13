import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import API_CONFIG from "../config/apiConfig";

const ATTENDANCE_TOKEN_KEY = "attendance_token";

export const attendanceApi = createApi({
  reducerPath: "attendanceApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_CONFIG.ATTENDANCE_API.baseUrl,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem(ATTENDANCE_TOKEN_KEY);
      if (token) headers.set("authorization", `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ["AttendanceDepartment", "AttendanceEmployee", "AttendanceRecord"],

  endpoints: (builder) => ({
    attendanceLogin: builder.mutation({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
    getDepartmentsByOrganization: builder.query({
      query: (organizationId) => `/departments/${organizationId}`,
      providesTags: ["AttendanceDepartment"],
    }),
    createDepartment: builder.mutation({
      query: (body) => ({
        url: "/departments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AttendanceDepartment"],
    }),
    updateDepartmentByOrganization: builder.mutation({
      query: ({ departmentId, payload }) => ({
        url: `/departments/${departmentId}`,
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["AttendanceDepartment"],
    }),
    deleteDepartment: builder.mutation({
      query: (departmentId) => ({
        url: `/departments/${departmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AttendanceDepartment"],
    }),
    createAttendanceEmployee: builder.mutation({
      query: (body) => ({
        url: "/employee/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AttendanceEmployee"],
    }),
    getAttendanceEmployees: builder.query({
      query: (organizationId) =>
        `/employee/list?organizationId=${organizationId}`,
      providesTags: ["AttendanceEmployee"],
    }),
    updateAttendanceEmployee: builder.mutation({
      query: ({ employeeId, ...body }) => ({
        url: `/employee/${employeeId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["AttendanceEmployee"],
    }),
    deleteAttendanceEmployee: builder.mutation({
      query: (employeeId) => ({
        url: `/employee/${employeeId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AttendanceEmployee"],
    }),
    getAttendanceByOrganization: builder.query({
      query: (organizationId) => `/attendance/${organizationId}`,
      providesTags: ["AttendanceRecord"],
    }),
    getAttendanceDashboardByOrganization: builder.query({
      query: (organizationId) => `/dashboard/${organizationId}`,
    }),
    getAttendanceEmployeeDashboard: builder.query({
      query: ({ employeeId, year, month }) =>
        `/dashboard/employee/${employeeId}?year=${year}&month=${month}`,
    }),
  }),
});

export const {
  useAttendanceLoginMutation,
  useGetDepartmentsByOrganizationQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentByOrganizationMutation,
  useDeleteDepartmentMutation,
  useCreateAttendanceEmployeeMutation,
  useGetAttendanceEmployeesQuery,
  useUpdateAttendanceEmployeeMutation,
  useDeleteAttendanceEmployeeMutation,
  useGetAttendanceByOrganizationQuery,
  useGetAttendanceDashboardByOrganizationQuery,
  useGetAttendanceEmployeeDashboardQuery,
} = attendanceApi;

export { ATTENDANCE_TOKEN_KEY };
