import { memo, useCallback, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Popover,
  Popconfirm,
} from "antd";
import { toast } from "react-toastify";
import { navItems } from "../constants/navItems";
import {
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetEmployeesQuery,
  useUpdateEmployeeMutation,
} from "../store/employeeApi";
import {
  preventInvalidAmountPaste,
  blockNonIntegerKeys,
} from "../utils/numberFormat";
import PageLoader from "../components/PageLoader";

const initialForm = {
  firstname: "",
  lastname: "",
  position: "",
  salary: "",
  canLogin: false,
  login: "",
  password: "",
  sections: [],
};

const SECTION_LABEL_MAP = new Map(
  navItems.map((item) => [item.section, item.label]),
);

const SECTION_OPTIONS = navItems.map((item) => ({
  label: item.label,
  value: item.section,
}));

const EmployeeRow = memo(function EmployeeRow({
  employee,
  isDeleting,
  onEdit,
  onDelete,
}) {
  return (
    <tr>
      <td data-label="F.I.SH">
        {employee.firstname} {employee.lastname}
      </td>
      <td data-label="Lavozim">{employee.position}</td>
      <td data-label="Oylik">
        {employee.salary?.toLocaleString?.() || employee.salary}
      </td>
      <td data-label="Login">{employee.login || "-"}</td>
      <td data-label="Ruxsatlar">
        {(employee.sections || []).length ? (
          <Popover
            trigger="click"
            placement="left"
            overlayClassName="hotel-popover"
            content={
              <div className="sections-popover">
                {(employee.sections || []).map((section) => (
                  <div key={section} className="sections-popover-item">
                    {SECTION_LABEL_MAP.get(section) || section}
                  </div>
                ))}
              </div>
            }
          >
            <button className="section-view-btn" type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path d="M5 7H19" stroke="currentColor" strokeWidth="2" />
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" />
                <path d="M5 17H19" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span>{employee.sections.length} ta</span>
            </button>
          </Popover>
        ) : (
          "-"
        )}
      </td>
      <td data-label="Amal">
        <div className="table-action-wrap">
          <button
            className="icon-btn"
            onClick={() => onEdit(employee)}
            aria-label="Tahrirlash"
            title="Tahrirlash"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M4 20H8L18 10L14 6L4 16V20Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M12 8L16 12" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <Popconfirm
            title="Hodimni o'chirish"
            description="Ushbu amalni tasdiqlaysizmi?"
            okText="O'chirish"
            cancelText="Bekor"
            okButtonProps={{ danger: true, loading: isDeleting }}
            onConfirm={() => onDelete(employee._id)}
            overlayClassName="hotel-popconfirm"
          >
            <button
              className="icon-btn danger"
              disabled={isDeleting}
              aria-label="O'chirish"
              title="O'chirish"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path d="M4 7H20" stroke="currentColor" strokeWidth="2" />
                <path d="M9 7V5H15V7" stroke="currentColor" strokeWidth="2" />
                <path d="M7 7L8 20H16L17 7" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </Popconfirm>
        </div>
      </td>
    </tr>
  );
});

function EmployeesPage() {
  const [form] = Form.useForm();
  const { employees, isLoading } = useGetEmployeesQuery(undefined, {
    selectFromResult: ({ data, isLoading: queryLoading }) => ({
      employees: data?.innerData || [],
      isLoading: queryLoading,
    }),
  });
  const [createEmployee, { isLoading: isCreating }] =
    useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] =
    useUpdateEmployeeMutation();
  const [deleteEmployee, { isLoading: isDeleting }] =
    useDeleteEmployeeMutation();
  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");
  const canLogin = Form.useWatch("canLogin", form);

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((employee) => {
      const fullName =
        `${employee.firstname || ""} ${employee.lastname || ""}`.toLowerCase();
      const position = String(employee.position || "").toLowerCase();
      const login = String(employee.login || "").toLowerCase();
      return fullName.includes(q) || position.includes(q) || login.includes(q);
    });
  }, [employees, query]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId("");
    form.resetFields();
    setError("");
  }, [form]);

  const onSubmit = useCallback(async (values) => {
    setError("");

    const payload = {
      firstname: String(values.firstname || "").trim(),
      lastname: String(values.lastname || "").trim(),
      position: String(values.position || "").trim(),
      salary: Number(values.salary),
      canLogin: Boolean(values.canLogin),
      sections: values.sections || [],
    };

    if (payload.canLogin) {
      payload.login = String(values.login || "").trim();
      if (values.password) payload.password = values.password;
    }

    try {
      if (editingId) {
        const result = await updateEmployee({
          id: editingId,
          ...payload,
        }).unwrap();
        toast.success(result?.message || "Hodim yangilandi");
      } else {
        const result = await createEmployee(payload).unwrap();
        toast.success(result?.message || "Hodim qo'shildi");
      }

      form.resetFields();
      setEditingId("");
      setIsModalOpen(false);
    } catch (err) {
      const message = err?.data?.message || "Saqlashda xatolik";
      setError(message);
      toast.error(message);
    }
  }, [createEmployee, editingId, form, updateEmployee]);

  const openCreateModal = useCallback(() => {
    setError("");
    setEditingId("");
    form.setFieldsValue(initialForm);
    setIsModalOpen(true);
  }, [form]);

  const openEditModal = useCallback((employee) => {
    setError("");
    setEditingId(employee._id);
    form.setFieldsValue({
      firstname: employee.firstname || "",
      lastname: employee.lastname || "",
      position: employee.position || "",
      salary: Number(employee.salary ?? 0),
      canLogin: Boolean(employee.canLogin),
      login: employee.login || "",
      password: "",
      sections: employee.sections || [],
    });
    setIsModalOpen(true);
  }, [form]);

  const onDelete = useCallback(async (id) => {
    try {
      const result = await deleteEmployee(id).unwrap();
      toast.success(result?.message || "Hodim o'chirildi");
      if (editingId === id) closeModal();
    } catch (err) {
      const message = err?.data?.message || "O'chirishda xatolik";
      setError(message);
      toast.error(message);
    }
  }, [closeModal, deleteEmployee, editingId]);

  return (
    <div className="employee-page employees-page">
      <div className="page-card">
        <div className="table-toolbar">
          <h2>Hodimlar ro'yxati</h2>
          <div className="toolbar-actions">
            <input
              className="search-input"
              placeholder="Qidirish: ism, login, lavozim"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="primary-btn" onClick={openCreateModal}>
              + Yangi hodim
            </button>
          </div>
        </div>
        {isLoading ? (
          <PageLoader text="Hodimlar ro'yxati tayyorlanmoqda" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>F.I.SH</th>
                  <th>Lavozim</th>
                  <th>Oylik</th>
                  <th>Login</th>
                  <th>Ruxsatlar</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <EmployeeRow
                    key={employee._id}
                    employee={employee}
                    isDeleting={isDeleting}
                    onEdit={openEditModal}
                    onDelete={onDelete}
                  />
                ))}
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-empty">
                      Hech narsa topilmadi
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen ? (
        <Modal
          open={isModalOpen}
          onCancel={closeModal}
          footer={null}
          destroyOnHidden
          width={760}
          rootClassName="employee-modal-theme"
          title={editingId ? "Hodimni tahrirlash" : "Yangi hodim qo'shish"}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={initialForm}
            onFinish={onSubmit}
            onValuesChange={(changedValues) => {
              if (
                Object.prototype.hasOwnProperty.call(changedValues, "canLogin")
              ) {
                if (!changedValues.canLogin) {
                  form.setFieldsValue({
                    login: "",
                    password: "",
                    sections: [],
                  });
                }
              }
            }}
            requiredMark={false}
          >
            <Form.Item
              name="firstname"
              label="Ism"
              rules={[
                { required: true, whitespace: true, message: "Ism majburiy" },
              ]}
            >
              <Input placeholder="Ism kiriting" />
            </Form.Item>

            <Form.Item
              name="lastname"
              label="Familiya"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Familiya majburiy",
                },
              ]}
            >
              <Input placeholder="Familiya kiriting" />
            </Form.Item>

            <Form.Item
              name="position"
              label="Lavozim"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Lavozim majburiy",
                },
              ]}
            >
              <Input placeholder="Lavozim kiriting" />
            </Form.Item>

            {/* <Form.Item
              name="salary"
              label="Oylik"
              rules={[
                { required: true, message: "Oylik majburiy" },
                {
                  validator: (_, value) =>
                    Number(value) >= 0
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(
                            "Oylik 0 dan katta yoki teng bo'lishi kerak",
                          ),
                        ),
                },
              ]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                placeholder="Oylik kiriting"
              />
            </Form.Item> */}
            <Form.Item
              name="salary"
              label="Oylik"
              rules={[
                { required: true, message: "Oylik majburiy" },
                {
                  type: "number",
                  min: 1,
                  message: "Eng kamida 1 so'm kiriting",
                },
              ]}
            >
              <InputNumber
                min={1}
                precision={0}
                style={{ width: "100%" }}
                formatter={(value) =>
                  String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                }
                parser={(value) => {
                  const digits = String(value || "").replace(/[^\d]/g, "");
                  const withoutLeadingZeros = digits.replace(/^0+/, "");
                  return withoutLeadingZeros;
                }}
                onKeyDown={blockNonIntegerKeys}
                onPaste={preventInvalidAmountPaste}
              />
            </Form.Item>

            <Form.Item
              name="canLogin"
              valuePropName="checked"
              className="hotel-checkbox-line"
            >
              <Checkbox>Dasturga kira oladi</Checkbox>
            </Form.Item>

            {canLogin ? (
              <>
                <Form.Item
                  name="login"
                  label="Login"
                  rules={[
                    {
                      validator: (_, value) => {
                        if (!canLogin) return Promise.resolve();
                        const normalized = String(value || "").trim();
                        if (!normalized)
                          return Promise.reject(new Error("Login majburiy"));
                        if (normalized.length < 3) {
                          return Promise.reject(
                            new Error(
                              "Login kamida 3 ta belgidan iborat bo'lishi kerak",
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input placeholder="Login kiriting" />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={editingId ? "Yangi parol (ixtiyoriy)" : "Parol"}
                  rules={[
                    {
                      validator: (_, value) => {
                        if (!canLogin) return Promise.resolve();
                        const text = String(value || "");
                        if (!editingId && !text) {
                          return Promise.reject(new Error("Parol majburiy"));
                        }
                        if (text && text.length < 4) {
                          return Promise.reject(
                            new Error(
                              "Parol kamida 4 ta belgidan iborat bo'lishi kerak",
                            ),
                          );
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input.Password placeholder="Parol kiriting" />
                </Form.Item>
                <Form.Item name="sections" label="Qaysi qismlarga kiradi">
                  <Checkbox.Group options={SECTION_OPTIONS} />
                </Form.Item>
              </>
            ) : null}

            {error ? <div className="form-error">{error}</div> : null}

            <div className="row-actions">
              <Button
                htmlType="submit"
                loading={isCreating || isUpdating}
                className="hotel-primary-btn"
              >
                {editingId ? "Yangilash" : "Saqlash"}
              </Button>
              <Button onClick={closeModal}>Yopish</Button>
            </div>
          </Form>
        </Modal>
      ) : null}
    </div>
  );
}

export default memo(EmployeesPage);
