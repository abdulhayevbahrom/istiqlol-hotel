import { useEffect, useMemo, useState } from "react";
import { Form, Tabs } from "antd";
import { toast } from "react-toastify";
import { useGetEmployeesQuery } from "../store/employeeApi";
import {
  ATTENDANCE_TOKEN_KEY,
  useAttendanceLoginMutation,
  useCreateAttendanceEmployeeMutation,
  useCreateDepartmentMutation,
  useDeleteAttendanceEmployeeMutation,
  useDeleteDepartmentMutation,
  useGetAttendanceByOrganizationQuery,
  useGetAttendanceDashboardByOrganizationQuery,
  useGetAttendanceEmployeeDashboardQuery,
  useGetAttendanceEmployeesQuery,
  useGetDepartmentsByOrganizationQuery,
  useUpdateAttendanceEmployeeMutation,
  useUpdateDepartmentByOrganizationMutation,
} from "../store/attendanceApi";
import {
  AUTO_LOGIN_PAYLOAD,
  ORGANIZATION_ID,
} from "../components/attendance/constants";
import DepartmentsTab from "../components/attendance/DepartmentsTab";
import EmployeesTab from "../components/attendance/EmployeesTab";
import AttendancesTab from "../components/attendance/AttendancesTab";
import DepartmentModal from "../components/attendance/DepartmentModal";
import EmployeeModal from "../components/attendance/EmployeeModal";
import EmployeeDashboardModal from "../components/attendance/EmployeeDashboardModal";

const generateUniqueEmployeeCode = (existingCodes = []) => {
  const used = new Set(
    existingCodes
      .map((code) => String(code || "").trim())
      .filter((code) => /^\d{4}$/.test(code)),
  );

  for (let i = 0; i < 2000; i += 1) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    if (!used.has(code)) return code;
  }

  return String(Date.now()).slice(-4);
};

function AttendancePage() {
  const [activeTab, setActiveTab] = useState("departments");
  const [departmentForm] = Form.useForm();
  const [employeeForm] = Form.useForm();

  const [attendanceReady, setAttendanceReady] = useState(false);

  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isEmployeeStatsOpen, setIsEmployeeStatsOpen] = useState(false);
  const [statsEmployee, setStatsEmployee] = useState(null);
  const [statsYear, setStatsYear] = useState(new Date().getFullYear());
  const [statsMonth, setStatsMonth] = useState(new Date().getMonth() + 1);

  const [attendanceLogin, { isLoading: loggingIn }] =
    useAttendanceLoginMutation();

  const [createDepartment, { isLoading: creatingDepartment }] =
    useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: updatingDepartment }] =
    useUpdateDepartmentByOrganizationMutation();
  const [deleteDepartment, { isLoading: deletingDepartment }] =
    useDeleteDepartmentMutation();

  const [createEmployee, { isLoading: creatingEmployee }] =
    useCreateAttendanceEmployeeMutation();
  const [updateEmployee, { isLoading: updatingEmployee }] =
    useUpdateAttendanceEmployeeMutation();
  const [deleteEmployee, { isLoading: deletingEmployee }] =
    useDeleteAttendanceEmployeeMutation();
  const { data: localEmployeesResponse } = useGetEmployeesQuery();

  const {
    data: departmentsResponse,
    isLoading: loadingDepartments,
    refetch: refetchDepartments,
  } = useGetDepartmentsByOrganizationQuery(ORGANIZATION_ID, {
    skip: !attendanceReady,
  });

  const {
    data: employeesResponse,
    isLoading: loadingEmployees,
    refetch: refetchEmployees,
  } = useGetAttendanceEmployeesQuery(ORGANIZATION_ID, {
    skip: !attendanceReady,
  });

  const {
    data: attendancesResponse,
    isLoading: loadingAttendances,
    refetch: refetchAttendances,
  } = useGetAttendanceByOrganizationQuery(ORGANIZATION_ID, {
    skip: !attendanceReady,
  });

  const { data: orgDashboardResponse } =
    useGetAttendanceDashboardByOrganizationQuery(ORGANIZATION_ID, {
      skip: !attendanceReady,
    });

  const employeeStatsArg = useMemo(
    () => ({
      employeeId: statsEmployee?.id || "",
      year: statsYear,
      month: statsMonth,
    }),
    [statsEmployee, statsYear, statsMonth],
  );

  const {
    data: employeeDashboardResponse,
    isLoading: loadingEmployeeDashboard,
    refetch: refetchEmployeeDashboard,
  } = useGetAttendanceEmployeeDashboardQuery(employeeStatsArg, {
    skip: !attendanceReady || !statsEmployee?.id,
  });

  const departments = useMemo(() => {
    const list =
      departmentsResponse?.data || departmentsResponse?.innerData || [];
    return list.map((item) => ({
      id: item?._id || item?.id || "",
      name: item?.name || "",
      checkInTime: item?.checkInTime || "",
      checkOutTime: item?.checkOutTime || "",
      lateAfterMinutes: Number(item?.lateAfterMinutes || 0),
      earlyLeaveMinutes: Number(item?.earlyLeaveMinutes || 0),
    }));
  }, [departmentsResponse]);

  const employees = useMemo(() => {
    const list = employeesResponse?.data || employeesResponse?.innerData || [];
    return list.map((item) => ({
      id: item?._id || item?.id || "",
      fullName: item?.fullName || "",
      employeeCode: item?.employeeCode || "",
      departmentId:
        item?.department?._id || item?.department || item?.departmentId || "",
      departmentName: item?.department?.name || item?.departmentName || "-",
    }));
  }, [employeesResponse]);

  const attendances = attendancesResponse?.data || [];
  const orgSummary = orgDashboardResponse?.data || {};
  const employeeSummary = employeeDashboardResponse?.data?.summary || {};
  const employeeDailyDetails =
    employeeDashboardResponse?.data?.dailyDetails || [];
  const localEmployees = localEmployeesResponse?.innerData || [];

  const presentAttendances = useMemo(
    () =>
      attendances.filter(
        (item) => String(item.status || "").toLowerCase() === "present",
      ),
    [attendances],
  );
  const lateAttendances = useMemo(
    () =>
      attendances.filter(
        (item) => String(item.status || "").toLowerCase() === "late",
      ),
    [attendances],
  );
  const absentAttendances = useMemo(
    () =>
      attendances.filter(
        (item) => String(item.status || "").toLowerCase() === "absent",
      ),
    [attendances],
  );

  const departmentOptions = useMemo(
    () =>
      departments.map((item) => ({
        label: item.name,
        value: item.id,
      })),
    [departments],
  );

  const employeeNameOptions = useMemo(() => {
    const seen = new Set();
    return localEmployees
      .map((item) => `${item?.firstname || ""} ${item?.lastname || ""}`.trim())
      .filter((fullName) => {
        if (!fullName || seen.has(fullName)) return false;
        seen.add(fullName);
        return true;
      })
      .map((fullName) => ({
        label: fullName,
        value: fullName,
      }));
  }, [localEmployees]);

  useEffect(() => {
    const ensureAttendanceToken = async () => {
      try {
        const savedToken = localStorage.getItem(ATTENDANCE_TOKEN_KEY);
        if (savedToken) {
          setAttendanceReady(true);
          return;
        }

        const result = await attendanceLogin(AUTO_LOGIN_PAYLOAD).unwrap();
        const token = result?.token || "";
        if (!token) throw new Error("Attendance token kelmadi");

        localStorage.setItem(ATTENDANCE_TOKEN_KEY, token);
        setAttendanceReady(true);
      } catch (error) {
        setAttendanceReady(false);
        toast.error(
          error?.data?.message || error?.message || "Davomat login xatolik",
        );
      }
    };

    ensureAttendanceToken();
  }, [attendanceLogin]);

  const openCreateDepartmentModal = () => {
    setEditingDepartment(null);
    departmentForm.resetFields();
    departmentForm.setFieldsValue({
      checkInTime: "08:00",
      checkOutTime: "17:00",
      lateAfterMinutes: 10,
      earlyLeaveMinutes: 10,
    });
    setIsDepartmentModalOpen(true);
  };

  const openEditDepartmentModal = (department) => {
    setEditingDepartment(department);
    departmentForm.setFieldsValue({
      name: department.name,
      checkInTime: department.checkInTime,
      checkOutTime: department.checkOutTime,
      lateAfterMinutes: department.lateAfterMinutes,
      earlyLeaveMinutes: department.earlyLeaveMinutes,
    });
    setIsDepartmentModalOpen(true);
  };

  const closeDepartmentModal = () => {
    setIsDepartmentModalOpen(false);
    setEditingDepartment(null);
    departmentForm.resetFields();
  };

  const onDepartmentSubmit = async (values) => {
    const payload = {
      name: String(values.name || "").trim(),
      checkInTime: String(values.checkInTime || "").trim(),
      checkOutTime: String(values.checkOutTime || "").trim(),
      lateAfterMinutes: Number(values.lateAfterMinutes || 0),
      earlyLeaveMinutes: Number(values.earlyLeaveMinutes || 0),
    };

    try {
      if (editingDepartment) {
        await updateDepartment({
          departmentId: editingDepartment.id,
          payload,
        }).unwrap();
        toast.success("Bo'lim yangilandi");
      } else {
        await createDepartment({
          organizationId: ORGANIZATION_ID,
          ...payload,
        }).unwrap();
        toast.success("Bo'lim yaratildi");
      }

      closeDepartmentModal();
      refetchDepartments();
    } catch (error) {
      toast.error(error?.data?.message || "Bo'limni saqlashda xatolik");
    }
  };

  const onDeleteDepartment = async (departmentId) => {
    try {
      await deleteDepartment(departmentId).unwrap();
      toast.success("Bo'lim o'chirildi");
      refetchDepartments();
    } catch (error) {
      toast.error(error?.data?.message || "Bo'limni o'chirishda xatolik");
    }
  };

  const openCreateEmployeeModal = () => {
    setEditingEmployee(null);
    employeeForm.resetFields();
    employeeForm.setFieldsValue({
      employeeCode: generateUniqueEmployeeCode(
        employees.map((e) => e.employeeCode),
      ),
    });
    setIsEmployeeModalOpen(true);
  };

  const openEditEmployeeModal = (employee) => {
    setEditingEmployee(employee);
    employeeForm.setFieldsValue({
      department: employee.departmentId || undefined,
      fullName: employee.fullName,
      employeeCode: employee.employeeCode,
    });
    setIsEmployeeModalOpen(true);
  };

  const closeEmployeeModal = () => {
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
    employeeForm.resetFields();
  };

  const onEmployeeSubmit = async (values) => {
    const payload = {
      organizationId: ORGANIZATION_ID,
      department: values.department,
      fullName: String(values.fullName || "").trim(),
      employeeCode: String(values.employeeCode || "").trim(),
    };

    try {
      if (editingEmployee) {
        await updateEmployee({
          employeeId: editingEmployee.id,
          ...payload,
        }).unwrap();
        toast.success("Hodim yangilandi");
      } else {
        await createEmployee(payload).unwrap();
        toast.success("Hodim yaratildi");
      }

      closeEmployeeModal();
      refetchEmployees();
    } catch (error) {
      toast.error(error?.data?.message || "Hodimni saqlashda xatolik");
    }
  };

  const onDeleteEmployee = async (employeeId) => {
    try {
      await deleteEmployee(employeeId).unwrap();
      toast.success("Hodim o'chirildi");
      refetchEmployees();
    } catch (error) {
      toast.error(error?.data?.message || "Hodimni o'chirishda xatolik");
    }
  };

  const openEmployeeStats = (employee) => {
    setStatsEmployee(employee);
    setIsEmployeeStatsOpen(true);
  };

  const closeEmployeeStats = () => {
    setIsEmployeeStatsOpen(false);
    setStatsEmployee(null);
  };

  return (
    <div className="employe-page">
      <h1>Davomatni ishlatish uchun ozingizga mos usulni tanlang</h1>
      <ol>
        <li>Face ID</li>
        <li>NFS karta orqali</li>
        <li>Qr-kod orqali</li>
        <li>Qo'lda</li>
      </ol>
      <i style={{ color: "red" }}>Batafsil ma'lumot uchun supportga yozing!</i>
    </div>
    // <div className="employee-page">
    //   <div className="page-card">
    //     {!attendanceReady || loggingIn ? (
    //       <p>Davomat tizimiga ulanmoqda...</p>
    //     ) : (
    //       <Tabs
    //         activeKey={activeTab}
    //         onChange={setActiveTab}
    //         items={[
    //           {
    //             key: "departments",
    //             label: "Bo'limlar",
    //             children: (
    //               <DepartmentsTab
    //                 departments={departments}
    //                 loading={loadingDepartments}
    //                 deleting={deletingDepartment}
    //                 onRefresh={refetchDepartments}
    //                 onCreate={openCreateDepartmentModal}
    //                 onEdit={openEditDepartmentModal}
    //                 onDelete={onDeleteDepartment}
    //               />
    //             ),
    //           },
    //           {
    //             key: "employees",
    //             label: "Hodimlar",
    //             children: (
    //               <EmployeesTab
    //                 employees={employees}
    //                 loading={loadingEmployees}
    //                 deleting={deletingEmployee}
    //                 onRefresh={refetchEmployees}
    //                 onCreate={openCreateEmployeeModal}
    //                 onEdit={openEditEmployeeModal}
    //                 onDelete={onDeleteEmployee}
    //                 onStats={openEmployeeStats}
    //               />
    //             ),
    //           },
    //           {
    //             key: "attendances",
    //             label: "Attendancelar",
    //             children: (
    //               <AttendancesTab
    //                 presentAttendances={presentAttendances}
    //                 lateAttendances={lateAttendances}
    //                 absentAttendances={absentAttendances}
    //                 loading={loadingAttendances}
    //                 onRefresh={refetchAttendances}
    //                 orgSummary={orgSummary}
    //               />
    //             ),
    //           },
    //         ]}
    //       />
    //     )}
    //   </div>

    //   <DepartmentModal
    //     open={isDepartmentModalOpen}
    //     form={departmentForm}
    //     editingDepartment={editingDepartment}
    //     loading={creatingDepartment || updatingDepartment}
    //     onCancel={closeDepartmentModal}
    //     onSubmit={onDepartmentSubmit}
    //   />

    //   <EmployeeModal
    //     open={isEmployeeModalOpen}
    //     form={employeeForm}
    //     editingEmployee={editingEmployee}
    //     departmentOptions={departmentOptions}
    //     employeeNameOptions={employeeNameOptions}
    //     loading={creatingEmployee || updatingEmployee}
    //     onCancel={closeEmployeeModal}
    //     onSubmit={onEmployeeSubmit}
    //   />

    //   <EmployeeDashboardModal
    //     open={isEmployeeStatsOpen}
    //     employee={statsEmployee}
    //     year={statsYear}
    //     month={statsMonth}
    //     onYearChange={setStatsYear}
    //     onMonthChange={setStatsMonth}
    //     onClose={closeEmployeeStats}
    //     onRefresh={refetchEmployeeDashboard}
    //     loading={loadingEmployeeDashboard}
    //     summary={employeeSummary}
    //     dailyDetails={employeeDailyDetails}
    //   />
    // </div>
  );
}

export default AttendancePage;
