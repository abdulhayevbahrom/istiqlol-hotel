import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Segmented,
  Select,
  DatePicker,
} from "antd";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpensesQuery,
  useUpdateExpenseMutation,
} from "../store/employeeApi";
import {
  blockNonIntegerKeys,
  preventInvalidAmountPaste,
} from "../utils/numberFormat";
import PageLoader from "../components/PageLoader";

const formatMoney = (value) => Number(value || 0).toLocaleString();
const paymentTypeOptions = [
  { label: "Naqd", value: "naqd" },
  { label: "Karta", value: "karta" },
  { label: "Click", value: "click" },
  { label: "Bank", value: "bank" },
];
const paymentTypeLabel = {
  naqd: "Naqd",
  karta: "Karta",
  click: "Click",
  bank: "Bank",
};
const formatCreatedBy = (createdBy) => {
  const firstname = String(createdBy?.firstname || "").trim();
  const lastname = String(createdBy?.lastname || "").trim();
  const fullName = `${firstname} ${lastname}`.trim();
  if (fullName) return fullName;
  return createdBy?.login || "-";
};

function ExpensesPage() {
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    query: "",
    category: "",
    paymentType: "",
    startDate: "",
    endDate: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isMobileFilters, setIsMobileFilters] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 900 : false,
  );
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobileFilters(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data, isLoading } = useGetExpensesQuery({
    page,
    limit: 20,
    ...filters,
  });
  const [createExpense, { isLoading: creating }] = useCreateExpenseMutation();
  const [updateExpense, { isLoading: updating }] = useUpdateExpenseMutation();
  const [deleteExpense, { isLoading: deleting }] = useDeleteExpenseMutation();

  const payload = data?.innerData || {};
  const items = payload.items || [];
  const categories = payload.categories || [];
  const summary = payload.summary || {
    totalAmount: 0,
    byCategory: {},
    byPaymentType: {},
  };
  const pagination = payload.pagination || { page: 1, total: 0, limit: 20 };
  const categoryOptions = categories.map((category) => ({
    label: category,
    value: category,
  }));

  const openCreateModal = () => {
    setEditingExpense(null);
    form.resetFields();
    form.setFieldsValue({
      category: [categories[0] || "oziq-ovqat"],
      paymentType: "naqd",
      amount: 1,
      note: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    form.setFieldsValue({
      title: expense.title || "",
      category: [expense.category || categories[0] || "oziq-ovqat"],
      paymentType: expense.paymentType || "naqd",
      amount: Number(expense.amount || 1),
      note: expense.note || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    form.resetFields();
  };

  const onSubmit = async (values) => {
    const normalizedCategory = Array.isArray(values.category)
      ? values.category[0]
      : values.category;
    const payloadBody = {
      title: String(values.title || "").trim(),
      category: String(normalizedCategory || "").trim(),
      paymentType: values.paymentType,
      amount: Number(values.amount || 0),
      note: String(values.note || "").trim(),
    };

    try {
      if (editingExpense) {
        const result = await updateExpense({
          id: editingExpense._id,
          ...payloadBody,
        }).unwrap();
        toast.success(result?.message || "Xarajat yangilandi");
      } else {
        const result = await createExpense(payloadBody).unwrap();
        toast.success(result?.message || "Xarajat qo'shildi");
      }
      closeModal();
    } catch (err) {
      toast.error(err?.data?.message || "Saqlashda xatolik");
    }
  };

  const onDelete = async (id) => {
    try {
      const result = await deleteExpense(id).unwrap();
      toast.success(result?.message || "Xarajat o'chirildi");
    } catch (err) {
      toast.error(err?.data?.message || "O'chirishda xatolik");
    }
  };

  const byPaymentTypeRows = useMemo(
    () =>
      paymentTypeOptions.map((item) => ({
        key: item.value,
        label: item.label,
        amount: Number(summary.byPaymentType?.[item.value] || 0),
      })),
    [summary.byPaymentType],
  );
  const filterRangeValue = useMemo(() => {
    if (!filters.startDate && !filters.endDate) return null;
    const start = filters.startDate ? dayjs(filters.startDate) : null;
    const end = filters.endDate ? dayjs(filters.endDate) : null;
    if (start && end && start.isValid() && end.isValid()) return [start, end];
    return null;
  }, [filters.endDate, filters.startDate]);

  return (
    <div className="employee-page expenses-page">
      <div className="page-card">
        <div className="table-toolbar">
          <h2>Xarajatlar</h2>
          <div className="toolbar-actions">
            <div className="search-filter-group">
              {isMobileFilters ? (
                <button
                  type="button"
                  className="filter-trigger-btn"
                  aria-label="Filtrlarni ochish"
                  title="Filtrlar"
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                    <path
                      d="M4 6H20M7 12H17M10 18H14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              ) : null}
              <Input
                className="search-input"
                placeholder="Qidirish: nom yoki izoh"
                value={filters.query}
                onChange={(e) => {
                  setPage(1);
                  setFilters((prev) => ({ ...prev, query: e.target.value }));
                }}
              />
            </div>
            {!isMobileFilters ? (
              <>
                <Select
                  allowClear
                  className="filter-select"
                  placeholder="Kategoriya"
                  value={filters.category || undefined}
                  options={categoryOptions.map((item) => ({
                    label: item.value,
                    value: item.value,
                  }))}
                  showSearch
                  optionFilterProp="label"
                  onChange={(value) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, category: value || "" }));
                  }}
                />
                <Select
                  allowClear
                  className="filter-select"
                  placeholder="To'lov turi"
                  value={filters.paymentType || undefined}
                  options={paymentTypeOptions}
                  onChange={(value) => {
                    setPage(1);
                    setFilters((prev) => ({ ...prev, paymentType: value || "" }));
                  }}
                />
                <DatePicker.RangePicker
                  value={filterRangeValue}
                  onChange={(values) => {
                    setPage(1);
                    setFilters((prev) => ({
                      ...prev,
                      startDate: values?.[0] ? values[0].format("YYYY-MM-DD") : "",
                      endDate: values?.[1] ? values[1].format("YYYY-MM-DD") : "",
                    }));
                  }}
                />
              </>
            ) : null}
            <Button className="hotel-primary-btn" onClick={openCreateModal}>
              + Xarajat qo'shish
            </Button>
          </div>
        </div>

        <div className="expense-summary-grid">
          <div className="expense-summary-card">
            <b>Jami xarajat</b>
            <div>{formatMoney(summary.totalAmount)} so'm</div>
          </div>
          {byPaymentTypeRows.map((row) => (
            <div
              key={row.key}
              className={`expense-summary-card expense-summary-${row.key}`}
            >
              <b>{row.label}</b>
              <div>{formatMoney(row.amount)} so'm</div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <PageLoader text="Xarajatlar ro'yxati tayyorlanmoqda" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nomi</th>
                    <th>Kategoriya</th>
                    <th>To'lov turi</th>
                    <th>Summasi</th>
                    <th>Sana</th>
                    <th>Kiritgan xodim</th>
                    <th>Izoh</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((expense) => (
                    <tr key={expense._id}>
                      <td data-label="Nomi">{expense.title}</td>
                      <td data-label="Kategoriya">{expense.category}</td>
                      <td data-label="To'lov turi">
                        {paymentTypeLabel[expense.paymentType] || "-"}
                      </td>
                      <td data-label="Summasi">{formatMoney(expense.amount)} so'm</td>
                      <td data-label="Sana">
                        {new Date(expense.spentAt).toLocaleString()}
                      </td>
                      <td data-label="Kiritgan xodim">
                        {formatCreatedBy(expense.createdBy)}
                      </td>
                      <td data-label="Izoh">{expense.note || "-"}</td>
                      <td data-label="Amal">
                        <div className="table-action-wrap">
                          <button
                            className="icon-btn"
                            onClick={() => openEditModal(expense)}
                            title="Tahrirlash"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <Popconfirm
                            title="Xarajatni o'chirish"
                            description="Rostdan ham o'chirmoqchimisiz?"
                            okText="O'chirish"
                            cancelText="Bekor"
                            okButtonProps={{ danger: true, loading: deleting }}
                            onConfirm={() => onDelete(expense._id)}
                            overlayClassName="hotel-popconfirm"
                          >
                            <button
                              className="icon-btn danger"
                              title="O'chirish"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </Popconfirm>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="table-empty">
                        Xarajatlar topilmadi
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="guests-pagination-wrap">
              <Pagination
                current={pagination.page || page}
                total={pagination.total || 0}
                pageSize={pagination.limit || 20}
                showSizeChanger={false}
                onChange={(nextPage) => setPage(nextPage)}
              />
            </div>
          </>
        )}
      </div>

      <Modal
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
        title={editingExpense ? "Xarajatni tahrirlash" : "Xarajat qo'shish"}
        rootClassName="employee-modal-theme"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
        >
          <Form.Item
            name="title"
            label="Nomi"
            rules={[{ required: true, message: "Nomi majburiy" }]}
          >
            <Input placeholder="Masalan: Oziq-ovqat xarajati" />
          </Form.Item>
          <Form.Item
            name="category"
            label="Kategoriya"
            rules={[{ required: true, message: "Kategoriya majburiy" }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              mode="tags"
              maxCount={1}
              tokenSeparators={[","]}
              options={categoryOptions}
              placeholder="Mavjudini tanlang yoki yangisini yozing"
            />
          </Form.Item>
          <Form.Item
            name="paymentType"
            label="To'lov turi"
            rules={[{ required: true, message: "To'lov turi majburiy" }]}
          >
            <Segmented
              options={paymentTypeOptions}
              block
              className="payment-type-segmented"
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Summasi"
            rules={[
              { required: true, message: "Summa majburiy" },
              { type: "number", min: 1, message: "Eng kamida 1 so'm kiriting" },
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
          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="row-actions">
            <Button
              htmlType="submit"
              className="hotel-primary-btn"
              loading={creating || updating}
            >
              Saqlash
            </Button>
            <Button onClick={closeModal}>Bekor</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        open={isFilterModalOpen}
        onCancel={() => setIsFilterModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={460}
        title="Filtrlar"
        rootClassName="room-filter-modal-theme"
      >
        <div className="room-filter-modal-body">
          <Select
            allowClear
            className="filter-select"
            placeholder="Kategoriya"
            value={filters.category || undefined}
            options={categoryOptions.map((item) => ({
              label: item.value,
              value: item.value,
            }))}
            showSearch
            optionFilterProp="label"
            onChange={(value) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, category: value || "" }));
            }}
          />
          <Select
            allowClear
            className="filter-select"
            placeholder="To'lov turi"
            value={filters.paymentType || undefined}
            options={paymentTypeOptions}
            onChange={(value) => {
              setPage(1);
              setFilters((prev) => ({ ...prev, paymentType: value || "" }));
            }}
          />
          <DatePicker.RangePicker
            style={{ width: "100%" }}
            value={filterRangeValue}
            onChange={(values) => {
              setPage(1);
              setFilters((prev) => ({
                ...prev,
                startDate: values?.[0] ? values[0].format("YYYY-MM-DD") : "",
                endDate: values?.[1] ? values[1].format("YYYY-MM-DD") : "",
              }));
            }}
          />
          <div className="row-actions">
            <Button
              className="hotel-primary-btn"
              onClick={() => setIsFilterModalOpen(false)}
            >
              Qo'llash
            </Button>
            <Button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  category: "",
                  paymentType: "",
                  startDate: "",
                  endDate: "",
                }))
              }
            >
              Tozalash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ExpensesPage;
