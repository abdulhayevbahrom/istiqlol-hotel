import { useMemo, useState } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Tabs, Tag } from "antd";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { blockNonIntegerKeys, preventInvalidAmountPaste } from "../utils/numberFormat";
import {
  useGetStaffPeopleQuery, useGetPayrollPeopleQuery, useGetStaffAttendanceQuery, useSaveStaffAttendanceMutation,
  useUpdateStaffAttendanceMutation, useDeleteStaffAttendanceMutation, useGetStaffPayrollQuery,
  useGetStaffPayrollEntryHistoryQuery,
  useGetStaffPaymentHistoryQuery,
  useGetOutstandingPayrollMonthsQuery,
  useSaveStaffPayrollEntryMutation,
} from "../store/staffPayrollApi";

const money = (value) => `${Number(value || 0).toLocaleString("uz-UZ")} so'm`;
const tableMoney = (value) => Number(value || 0).toLocaleString("uz-UZ");
const typeLabel = { payment: "Oylik to'lovi", bonus: "Bonus", fine: "Jarima" };

export default function AttendancePage({ mode = "attendance" }) {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [attendanceDate, setAttendanceDate] = useState(dayjs());
  const [activePayrollTab, setActivePayrollTab] = useState("payroll");
  const [activeAttendanceTab, setActiveAttendanceTab] = useState("attendance");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceForm] = Form.useForm();
  const [entryForm] = Form.useForm();
  const [attendanceEdit, setAttendanceEdit] = useState(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [markingAttendance, setMarkingAttendance] = useState(null);
  const [entryOpen, setEntryOpen] = useState(false);
  const [historyEmployeeId, setHistoryEmployeeId] = useState("");
  const [historyMonth, setHistoryMonth] = useState(dayjs().format("YYYY-MM"));
  const [entryHistoryEmployee, setEntryHistoryEmployee] = useState(null);
  const [paymentHistoryEmployee, setPaymentHistoryEmployee] = useState(null);
  const role = useSelector((state) => state.auth.user?.role);
  const canDelete = role === "owner";
  const attendanceMode = mode === "attendance";
  const { data: attendancePeopleData } = useGetStaffPeopleQuery(undefined, { skip: !attendanceMode });
  const { data: payrollPeopleData } = useGetPayrollPeopleQuery(undefined, { skip: attendanceMode });
  const { data: attendanceData, isLoading: attendanceLoading } = useGetStaffAttendanceQuery(month, { skip: !attendanceMode });
  const markingMonth = attendanceDate.format("YYYY-MM");
  const { data: markingAttendanceData } = useGetStaffAttendanceQuery(markingMonth, { skip: !attendanceMode || month === markingMonth });
  const { data: payrollData, isLoading: payrollLoading } = useGetStaffPayrollQuery(month, { skip: attendanceMode });
  const { data: historyReportData, isLoading: historyLoading } = useGetStaffPayrollQuery(historyMonth, { skip: attendanceMode });
  const { data: paymentHistoryData, isLoading: paymentHistoryLoading } = useGetStaffPaymentHistoryQuery({ employeeId: paymentHistoryEmployee?.employeeId || "", targetMonth: historyMonth }, { skip: !paymentHistoryEmployee?.employeeId });
  const { data: entryHistoryData, isLoading: entryHistoryLoading } = useGetStaffPayrollEntryHistoryQuery(entryHistoryEmployee?.employeeId || "", { skip: !entryHistoryEmployee?.employeeId });
  const [saveAttendance, { isLoading: savingAttendance }] = useSaveStaffAttendanceMutation();
  const [updateAttendance, { isLoading: updatingAttendance }] = useUpdateStaffAttendanceMutation();
  const [deleteAttendance] = useDeleteStaffAttendanceMutation();
  const [saveEntry, { isLoading: savingEntry }] = useSaveStaffPayrollEntryMutation();
  const people = (attendanceMode ? attendancePeopleData : payrollPeopleData)?.innerData || [];
  const attendances = attendanceData?.innerData || [];
  const markingAttendances = month === markingMonth ? attendances : (markingAttendanceData?.innerData || []);
  const report = payrollData?.innerData || [];
  const historyRows = (historyReportData?.innerData || []).filter((row) => !historyEmployeeId || row.employeeId === historyEmployeeId);
  const paymentHistoryRows = paymentHistoryData?.innerData || [];
  const entryHistoryRows = entryHistoryData?.innerData || [];
  const peopleMap = useMemo(() => new Map(people.map((p) => [String(p._id), p])), [people]);
  const options = people.map((p) => ({ value: String(p._id), label: `${p.firstname} ${p.lastname} — ${p.position}` }));
  const attendanceByEmployeeDate = useMemo(() => new Map([...attendances, ...markingAttendances].map((item) => [`${item.employee}-${item.date}`, item])), [attendances, markingAttendances]);
  const monthDays = useMemo(() => Array.from({ length: dayjs(`${month}-01`).daysInMonth() }, (_, index) => index + 1), [month]);
  const attendanceHistoryPeople = useMemo(() => {
    const query = attendanceSearch.trim().toLowerCase();
    if (!query) return people;
    return people.filter((employee) => `${employee.firstname || ""} ${employee.lastname || ""} ${employee.position || ""}`.toLowerCase().includes(query));
  }, [attendanceSearch, people]);
  const attendanceSummary = (employeeId) => {
    const rows = attendances.filter((item) => String(item.employee) === String(employeeId));
    return {
      present: rows.filter((item) => item.status === "present").length,
      absent: rows.filter((item) => item.status === "absent").length,
      hours: rows.reduce((sum, item) => sum + Number(item.hours || 0), 0),
    };
  };
  const selectedEmployeeId = Form.useWatch("employeeId", attendanceForm);
  const selectedEntryType = Form.useWatch("type", entryForm);
  const selectedEntryEmployeeId = Form.useWatch("employeeId", entryForm);
  const { data: outstandingMonthsData, isLoading: outstandingMonthsLoading } = useGetOutstandingPayrollMonthsQuery(selectedEntryEmployeeId || "", { skip: selectedEntryType !== "payment" || !selectedEntryEmployeeId });
  const outstandingMonths = outstandingMonthsData?.innerData || [];
  const selectedEmployee = peopleMap.get(String(selectedEmployeeId));
  const selectedType = selectedEmployee?.salaryType || "fixed";
  const totals = report.reduce((result, row) => ({
    earned: result.earned + row.earned,
    paid: result.paid + row.paid,
    debt: result.debt + row.totalDebt,
    credit: result.credit + row.totalCredit,
  }), { earned: 0, paid: 0, debt: 0, credit: 0 });

  const openAttendance = (row = null) => {
    setAttendanceEdit(row);
    attendanceForm.resetFields();
    attendanceForm.setFieldsValue(row ? {
      employeeId: String(row.employee), date: dayjs(row.date), status: row.status, hours: row.hours,
    } : { date: dayjs(), status: "present" });
    setAttendanceOpen(true);
  };
  const openEmployeeAttendance = (employee, date = attendanceDate.format("YYYY-MM-DD")) => {
    const existing = attendanceByEmployeeDate.get(`${employee._id}-${date}`);
    if (existing) return openAttendance(existing);
    setAttendanceEdit(null);
    attendanceForm.resetFields();
    attendanceForm.setFieldsValue({ employeeId: String(employee._id), date: dayjs(date), status: "present" });
    setAttendanceOpen(true);
  };
  const markFixedAttendance = async (employee, status) => {
    const employeeId = String(employee._id);
    setMarkingAttendance({ employeeId, status });
    try {
      await saveAttendance({ employeeId, date: attendanceDate.format("YYYY-MM-DD"), status }).unwrap();
      toast.success(status === "present" ? "Keldi deb belgilandi" : "Kelmadi deb belgilandi");
    } catch (error) { toast.error(error?.data?.message || "Davomat saqlanmadi"); }
    finally { setMarkingAttendance(null); }
  };
  const openEntry = (employeeId, type) => {
    entryForm.resetFields();
    entryForm.setFieldsValue({ employeeId, date: dayjs(), type });
    setEntryOpen(true);
  };
  const submitAttendance = async (values) => {
    const payload = { employeeId: values.employeeId, date: values.date.format("YYYY-MM-DD") };
    if ((peopleMap.get(String(values.employeeId))?.salaryType || "fixed") === "hourly") payload.hours = Number(values.hours);
    else payload.status = values.status;
    try {
      if (attendanceEdit) await updateAttendance({ id: attendanceEdit._id, ...payload }).unwrap();
      else await saveAttendance(payload).unwrap();
      toast.success("Davomat saqlandi");
      setAttendanceOpen(false);
    } catch (error) { toast.error(error?.data?.message || "Davomat saqlanmadi"); }
  };
  const submitEntry = async (values) => {
    const payload = { employeeId: values.employeeId, date: values.date.format("YYYY-MM-DD"), targetMonth: values.type === "payment" ? values.targetMonth : undefined, type: values.type, amount: Number(values.amount), note: values.note || "" };
    try {
      await saveEntry(payload).unwrap();
      toast.success("Oylik amali saqlandi");
      setEntryOpen(false);
    } catch (error) { toast.error(error?.data?.message || "Oylik amali saqlanmadi"); }
  };
  const remove = async (fn, id) => {
    try { await fn(id).unwrap(); toast.success("Yozuv o'chirildi"); }
    catch (error) { toast.error(error?.data?.message || "O'chirishda xatolik"); }
  };
  const actions = (row, edit, del) => <div className="row-actions">
    <Button size="small" onClick={() => edit(row)}>Tahrirlash</Button>
    {canDelete && <Popconfirm title="Yozuvni o'chirasizmi?" okText="O'chirish" cancelText="Bekor" onConfirm={() => remove(del, row._id)}><Button size="small" danger>O'chirish</Button></Popconfirm>}
  </div>;

  return <div className={`employee-page ${attendanceMode ? "attendance-page" : "payroll-page"}`}>
    <div className="page-card payroll-shell">
      <Tabs
        activeKey={attendanceMode ? activeAttendanceTab : activePayrollTab}
        onChange={(key) => attendanceMode ? setActiveAttendanceTab(key) : setActivePayrollTab(key)}
        tabBarExtraContent={attendanceMode
          ? (activeAttendanceTab === "attendance" ? <DatePicker value={attendanceDate} onChange={(date) => date && setAttendanceDate(date)} allowClear={false} format="YYYY-MM-DD" /> : <DatePicker picker="month" value={dayjs(`${month}-01`)} onChange={(date) => date && setMonth(date.format("YYYY-MM"))} allowClear={false} />)
          : (activePayrollTab === "payroll" ? <DatePicker picker="month" value={dayjs(`${month}-01`)} onChange={(date) => date && setMonth(date.format("YYYY-MM"))} allowClear={false} /> : null)}
        items={[
        { key: "attendance", label: "Davomat belgilash", children: <>
          <Table size="small" className="payroll-table attendance-mark-table" rowKey="_id" loading={attendanceLoading} dataSource={people} pagination={{ pageSize: 20 }} columns={[
            { title: "Xodim", render: (_, employee) => <div className="payroll-employee-cell"><strong>{employee.firstname} {employee.lastname}</strong><span>{employee.position}</span></div> },
            { title: "Oylik turi", dataIndex: "salaryType", width: 130, render: (value) => <Tag color={value === "hourly" ? "blue" : "purple"}>{value === "hourly" ? "Soatlik" : "Doimiy"}</Tag> },
            { title: "Tanlangan sana holati", width: 170, render: (_, employee) => { const item = attendanceByEmployeeDate.get(`${employee._id}-${attendanceDate.format("YYYY-MM-DD")}`); return item ? (item.hours !== undefined && item.hours !== null ? <Tag color="blue">{item.hours} soat</Tag> : item.status === "present" ? <Tag color="green">Keldi</Tag> : <Tag color="red">Kelmadi</Tag>) : <Tag>Belgilanmagan</Tag>; } },
            { title: "Davomat", width: 260, render: (_, employee) => employee.salaryType === "hourly" ? <Button size="small" type="primary" onClick={() => openEmployeeAttendance(employee)}>Ishlagan soatni kiritish</Button> : <div className="attendance-mark-actions"><Button size="small" className="attendance-present-btn" loading={markingAttendance?.employeeId === String(employee._id) && markingAttendance?.status === "present"} disabled={Boolean(markingAttendance)} onClick={() => markFixedAttendance(employee, "present")}>Keldi</Button><Button size="small" danger loading={markingAttendance?.employeeId === String(employee._id) && markingAttendance?.status === "absent"} disabled={Boolean(markingAttendance)} onClick={() => markFixedAttendance(employee, "absent")}>Kelmadi</Button></div> },
          ]} />
        </> },
        { key: "attendance-history", label: "Davomat tarixi", children: <>
          <Input
            className="attendance-history-search"
            value={attendanceSearch}
            onChange={(event) => setAttendanceSearch(event.target.value)}
            allowClear
            placeholder="Xodim ismi yoki lavozimi bo'yicha qidirish"
            prefix={<svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2"/><path d="M16 16L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
          />
          <Table
            size="small"
            className="payroll-table attendance-history-table"
            rowKey="_id"
            loading={attendanceLoading}
            dataSource={attendanceHistoryPeople}
            scroll={{ x: 220 + monthDays.length * 30 + 180 }}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: "Xodim", fixed: "left", width: 220, render: (_, employee) => <div className="payroll-employee-cell"><strong>{employee.firstname} {employee.lastname}</strong><span>{employee.position}</span></div> },
              ...monthDays.map((day) => ({
                title: String(day),
                key: String(day),
                width: 30,
                align: "center",
                onCell: (employee) => {
                  const date = `${month}-${String(day).padStart(2, "0")}`;
                  const item = attendanceByEmployeeDate.get(`${employee._id}-${date}`);
                  const state = item?.status || (item?.hours !== undefined ? "hours" : "empty");
                  const label = item ? (item.hours !== undefined && item.hours !== null ? `${item.hours} soat` : item.status === "present" ? "Keldi" : "Kelmadi") : "Belgilanmagan";
                  return { className: `attendance-grid-cell ${state}`, title: `${date}: ${label}`, onClick: () => openEmployeeAttendance(employee, date) };
                },
                render: (_, employee) => {
                  const date = `${month}-${String(day).padStart(2, "0")}`;
                  const item = attendanceByEmployeeDate.get(`${employee._id}-${date}`);
                  return item?.hours !== undefined && item?.hours !== null ? item.hours : "";
                },
              })),
              { title: "Keldi", key: "presentTotal", className: "attendance-summary-cell", fixed: "right", width: 55, align: "center", render: (_, employee) => <Tag color="green">{attendanceSummary(employee._id).present}</Tag> },
              { title: "Kelmadi", key: "absentTotal", className: "attendance-summary-cell", fixed: "right", width: 60, align: "center", render: (_, employee) => <Tag color="red">{attendanceSummary(employee._id).absent}</Tag> },
              { title: "Jami soat", key: "hoursTotal", className: "attendance-summary-cell", fixed: "right", width: 65, align: "center", render: (_, employee) => <Tag color="blue">{attendanceSummary(employee._id).hours}</Tag> },
            ]}
          />
        </> },
        { key: "payroll", label: "Oylik", children: <>
          <div className="payroll-summary-grid">
            {[
              ["Hisoblangan", totals.earned, "earned"],
              ["Berilgan", totals.paid, "paid"],
              ["Jami qarz (hodim haqi)", totals.debt, "debt"],
              ["Jami haq (avans)", totals.credit, "credit"],
            ].map(([label, value, kind]) => <div key={label} className={`payroll-summary-card ${kind}`}><span>{label}</span><strong>{money(value)}</strong></div>)}
          </div>
          <Table size="small" className="payroll-table" rowKey="employeeId" loading={payrollLoading} dataSource={report} scroll={{ x: 1320 }} pagination={{ pageSize: 20 }} columns={[
            { title: "Hodim", dataIndex: "fullName", fixed: "left", width: 215, render: (value, row) => <div className="payroll-employee-cell"><strong>{value}</strong><span>{row.position}</span></div> },
            { title: "Oylik turi", dataIndex: "salaryType", width: 105, render: (value) => <Tag color={value === "hourly" ? "blue" : "purple"}>{value === "hourly" ? "Soatlik" : "Doimiy"}</Tag> },
            { title: "Narx", dataIndex: "rate", width: 105, render: (value) => <strong>{tableMoney(value)}</strong> },
            { title: "Hisoblangan", dataIndex: "earned", render: (v) => <strong>{tableMoney(v)}</strong> },
            { title: "Berilgan", dataIndex: "paid", render: (v) => <span className="money-paid">{tableMoney(v)}</span> },
            { title: "Bu oy qoldiq", dataIndex: "monthBalance", width: 130, render: (value) => {
              const amount = Number(value || 0);
              if (amount > 0) return <Tag color="green">+ {tableMoney(amount)}</Tag>;
              if (amount < 0) return <Tag color="red">− {tableMoney(-amount)}</Tag>;
              return <Tag>0</Tag>;
            } },
            { title: "Eski qarz", dataIndex: "previousDebt", render: tableMoney },
            { title: "Jami qarz", dataIndex: "totalDebt", render: tableMoney },
            { title: "Holat", key: "balanceStatus", width: 125, render: (_, row) => {
              if (Number(row.totalDebt || 0) > 0) return <Tag color="green">+ {tableMoney(row.totalDebt)}</Tag>;
              if (Number(row.totalCredit || 0) > 0) return <Tag color="red">− {tableMoney(row.totalCredit)}</Tag>;
              return <Tag>0</Tag>;
            } },
            { title: "Amallar", key: "actions", fixed: "right", width: 150, render: (_, row) => <div className="payroll-row-actions">
              <Button size="small" className="payroll-action icon-only payment" title="To'lov" aria-label="To'lov" onClick={() => openEntry(row.employeeId, "payment")}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                  <rect x="3.5" y="6" width="17" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
                  <path d="M3.5 10H20.5M16.5 14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Button>
              <Button size="small" className="payroll-action icon-only bonus" title="Bonus" aria-label="Bonus" onClick={() => openEntry(row.employeeId, "bonus")}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </Button>
              <Button size="small" className="payroll-action icon-only fine" title="Jarima" aria-label="Jarima" onClick={() => openEntry(row.employeeId, "fine")}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </Button>
              <Button size="small" className="payroll-action icon-only history" title="Bonus va jarimalar tarixi" aria-label="Bonus va jarimalar tarixi" onClick={() => setEntryHistoryEmployee(row)}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
                  <path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 4v4.68h4.68M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Button>
            </div> },
          ]} />
        </> },
        { key: "history", label: "Oylik tarixi", children: <>
          <div className="payroll-history-filters">
            <Select
              style={{ minWidth: 240 }}
              showSearch
              allowClear
              optionFilterProp="label"
              placeholder="Barcha xodimlar"
              options={options}
              value={historyEmployeeId || undefined}
              onChange={(value) => setHistoryEmployeeId(value || "")}
            />
            <DatePicker
              picker="month"
              value={dayjs(`${historyMonth}-01`)}
              onChange={(value) => value && setHistoryMonth(value.format("YYYY-MM"))}
              placeholder="Oyni tanlang"
              allowClear={false}
            />
            {historyEmployeeId ? <Button onClick={() => setHistoryEmployeeId("")}>Barcha xodimlar</Button> : null}
          </div>
          <Table size="small" className="payroll-table" rowKey="employeeId" loading={historyLoading} dataSource={historyRows} pagination={{ pageSize: 15 }} locale={{ emptyText: "Tanlangan oy uchun oylik ma'lumoti topilmadi" }} columns={[
            { title: "Xodim", dataIndex: "fullName", width: 220, render: (value, row) => <div className="payroll-employee-cell"><strong>{value}</strong><span>{row.position}</span></div> },
            { title: "Hisoblangan", dataIndex: "earned", render: tableMoney },
            { title: "Olgan", dataIndex: "paid", render: (value) => <strong className="money-paid">{tableMoney(value)}</strong> },
            { title: "Bonus", dataIndex: "bonus", render: (value) => <span className="money-positive">+ {tableMoney(value)}</span> },
            { title: "Jarima", dataIndex: "fine", render: (value) => <span className="money-negative">− {tableMoney(value)}</span> },
            { title: "Qolgan", dataIndex: "monthBalance", render: (value) => { const amount = Number(value || 0); return amount > 0 ? <Tag color="green">+ {tableMoney(amount)}</Tag> : amount < 0 ? <Tag color="red">− {tableMoney(-amount)}</Tag> : <Tag>0</Tag>; } },
            { title: "Amal", width: 70, align: "center", render: (_, row) => <Button size="small" className="payroll-action icon-only history" title="Berilgan oylik sanalari" aria-label="Berilgan oylik sanalari" onClick={() => setPaymentHistoryEmployee(row)}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 4v4.68h4.68M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Button> },
          ]} />
        </> },
      ].filter((item) => attendanceMode ? item.key.startsWith("attendance") : !item.key.startsWith("attendance"))} />
    </div>
    <Modal open={attendanceOpen} title={attendanceEdit ? "Davomatni tahrirlash" : "Davomat qo'shish"} footer={null} onCancel={() => setAttendanceOpen(false)} destroyOnHidden>
      <Form form={attendanceForm} layout="vertical" onFinish={submitAttendance}>
        <Form.Item name="employeeId" hidden rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="date" hidden rules={[{ required: true }]}><DatePicker /></Form.Item>
        {selectedType === "hourly" ? <Form.Item name="hours" label="Ishlagan soat" rules={[{ required: true, message: "Soatni kiriting" }]}><InputNumber min={0} max={24} step={0.5} style={{ width: "100%" }} /></Form.Item> : <Form.Item name="status" label="Davomat" rules={[{ required: true }]}><Select options={[{ value: "present", label: "Keldi" }, { value: "absent", label: "Kelmadi" }]} /></Form.Item>}
        <Button htmlType="submit" type="primary" loading={savingAttendance || updatingAttendance}>Saqlash</Button>
      </Form>
    </Modal>
    <Modal open={entryOpen} title={`${typeLabel[selectedEntryType] || "Oylik amali"} qo'shish`} footer={null} onCancel={() => setEntryOpen(false)} destroyOnHidden>
      <Form form={entryForm} layout="vertical" onFinish={submitEntry}>
        <Form.Item name="employeeId" hidden rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="date" label="Sana" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="type" hidden rules={[{ required: true }]}><Input /></Form.Item>
        {selectedEntryType === "payment" ? <Form.Item name="targetMonth" label="Qaysi oy uchun" rules={[{ required: true, message: "Qarzdor oyni tanlang" }]}>
          <Select
            loading={outstandingMonthsLoading}
            placeholder={outstandingMonthsLoading ? "Qarzlar yuklanmoqda..." : "Pul olinishi kerak bo'lgan oyni tanlang"}
            options={outstandingMonths.map((item) => ({ value: item.month, label: `${item.month} — qarz ${tableMoney(item.debt)}` }))}
            notFoundContent={outstandingMonthsLoading ? "Yuklanmoqda..." : "To'lanmagan oy mavjud emas"}
          />
        </Form.Item> : null}
        <Form.Item name="amount" label="Summa (so'm)" rules={[{ required: true, message: "Summani kiriting" }]}>
          <InputNumber
            min={1}
            precision={0}
            step={1000}
            style={{ width: "100%" }}
            formatter={(value) => String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
            parser={(value) => String(value || "").replace(/[^\d]/g, "").replace(/^0+/, "")}
            onKeyDown={blockNonIntegerKeys}
            onPaste={preventInvalidAmountPaste}
            placeholder="Summani kiriting"
          />
        </Form.Item>
        <Form.Item name="note" label="Izoh"><Input.TextArea maxLength={300} /></Form.Item>
        <Button htmlType="submit" type="primary" loading={savingEntry}>Saqlash</Button>
      </Form>
    </Modal>
    <Modal
      open={Boolean(entryHistoryEmployee)}
      title={`${entryHistoryEmployee?.fullName || "Hodim"} — bonus va jarimalar tarixi`}
      footer={null}
      width={760}
      onCancel={() => setEntryHistoryEmployee(null)}
      destroyOnHidden
    >
      <Table
        size="small"
        className="payroll-table"
        rowKey="_id"
        loading={entryHistoryLoading}
        dataSource={entryHistoryRows}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{ emptyText: "Bonus yoki jarima tarixi mavjud emas" }}
        columns={[
          { title: "Sana", dataIndex: "date", width: 120 },
          { title: "Turi", dataIndex: "type", width: 120, render: (value) => <Tag color={value === "bonus" ? "green" : "red"}>{value === "bonus" ? "+" : "−"} {typeLabel[value]}</Tag> },
          { title: "Summa", dataIndex: "amount", width: 160, render: (value, row) => <strong className={row.type === "bonus" ? "money-positive" : "money-negative"}>{tableMoney(value)}</strong> },
          { title: "Izoh", dataIndex: "note", render: (value) => value || "—" },
        ]}
      />
    </Modal>
    <Modal
      open={Boolean(paymentHistoryEmployee)}
      title={`${paymentHistoryEmployee?.fullName || "Xodim"} — ${historyMonth} oyida berilgan oylik`}
      footer={null}
      width={680}
      onCancel={() => setPaymentHistoryEmployee(null)}
      destroyOnHidden
    >
      <Table
        size="small"
        className="payroll-table"
        rowKey="_id"
        loading={paymentHistoryLoading}
        dataSource={paymentHistoryRows}
        pagination={false}
        locale={{ emptyText: "Tanlangan oy uchun oylik berilmagan" }}
        columns={[
          { title: "Berilgan sana", dataIndex: "date", width: 150 },
          { title: "Summa", dataIndex: "amount", width: 180, render: (value) => <strong className="money-paid">{tableMoney(value)}</strong> },
          { title: "Izoh", dataIndex: "note", render: (value) => value || "—" },
        ]}
      />
    </Modal>
  </div>;
}
